import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test, { type TestContext } from 'node:test';
import pg from 'pg';
import { createConnection } from 'node:net';
import { createServerAuthClient } from '../../../storefront/lib/server-auth-client.js';
import { createAuthService } from '../../src/auth/service.js';
import { makeFlow, digest } from '../../src/auth/crypto.js';
import { authFixture } from '../helpers/auth.js';
import { createCatalog, parseCatalogQuery } from '../../src/business/catalog.js';
import { createCartRepository } from '../../src/business/cart.js';
import { readConfig } from '../../src/config.js';
import { createLogger } from '../../src/logger.js';
import { createApiServer } from '../../src/server.js';
import { readDatabaseConfig } from '../../src/database/config.js';
import { createDatabase } from '../../src/database/connection.js';
import { migrate, migrationDirectory } from '../../src/database/migrations.js';

const source = process.env.DATABASE_TEST_URL;
if (process.env.BAZAR_INTEGRATION_TEST !== '1' || !source || new URL(source).hostname !== '127.0.0.1' || new URL(source).pathname !== '/bazar_f2_test') throw new Error('Use the isolated test:integration runner');
const adminUrl = source;

async function database(t: TestContext) {
  const admin = new pg.Pool({ connectionString: adminUrl });
  const name = `bazar_f2_case_${randomBytes(10).toString('hex')}`;
  await admin.query(`CREATE DATABASE "${name}"`);
  const url = new URL(adminUrl); url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  const beforeDrop: (() => Promise<void>)[] = [];
  t.after(async () => {
    try {
      for (const close of beforeDrop) await close();
      await pool.end();
      // Pool clients discarded after expected constraint errors may still be completing TCP close.
      // Wait for real disconnects rather than terminating them with DROP DATABASE ... FORCE.
      for (let attempt = 0; attempt < 150; attempt++) {
        const sessions = await admin.query<{ n: number }>('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1', [name]);
        if (sessions.rows[0].n === 0) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await admin.query(`DROP DATABASE "${name}"`);
    } finally { await admin.end(); }
  });
  const config = readDatabaseConfig({ DATABASE_URL: url.toString(), NODE_ENV: 'test' })!;
  return { pool, admin, url: url.toString(), config, beforeDrop };
}

async function seed(pool: pg.Pool) {
  const user = (await pool.query("INSERT INTO bazar.users(first_name,last_name) VALUES ('Synthetic','Example') RETURNING id")).rows[0].id;
  const other = (await pool.query("INSERT INTO bazar.users(first_name,last_name) VALUES ('Synthetic','Other') RETURNING id")).rows[0].id;
  const category = (await pool.query("INSERT INTO bazar.categories(handle,title) VALUES ('synthetic','Synthetic category') RETURNING id")).rows[0].id;
  const product = (await pool.query("INSERT INTO bazar.products(category_id,handle,title) VALUES ($1,'synthetic','Synthetic product') RETURNING id", [category])).rows[0].id;
  const variant = (await pool.query("INSERT INTO bazar.variants(product_id,sku,price_minor,stock) VALUES ($1,'SYNTHETIC-1',12345,5) RETURNING id", [product])).rows[0].id;
  const address = (await pool.query("INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref,is_default) VALUES ($1,'meest','synthetic-city','synthetic-location',true) RETURNING id", [user])).rows[0].id;
  const cart = (await pool.query('INSERT INTO bazar.carts(user_id) VALUES ($1) RETURNING id', [user])).rows[0].id;
  const order = (await pool.query('INSERT INTO bazar.orders(user_id,address_id,total_minor) VALUES ($1,$2,24690) RETURNING id', [user,address])).rows[0].id;
  const line = (await pool.query("INSERT INTO bazar.order_lines(order_id,user_id,product_id,variant_id,title_snapshot,quantity,unit_price_minor,line_total_minor) VALUES ($1,$2,$3,$4,'Synthetic snapshot',2,12345,24690) RETURNING id", [order,user,product,variant])).rows[0].id;
  return { user, other, product, variant, address, cart, order, line };
}

test('fresh database, previous schema upgrade, rerun and concurrent migrators are safe', async (t) => {
  const db = await database(t);
  const dir = mkdtempSync(`${tmpdir()}/bazar-prior-`);
  t.after(() => rmSync(dir, { recursive: true }));
  cpSync(`${migrationDirectory}/0001_core.sql`, `${dir}/0001_core.sql`);
  assert.equal(await migrate(db.config, dir), 1);
  assert.deepEqual((await Promise.all([migrate(db.config), migrate(db.config)])).sort(), [0, 3]);
  assert.equal(await migrate(db.config), 0);
  assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM bazar_meta.schema_migrations')).rows[0].n, 4);
  assert.ok((await db.pool.query("SELECT indexname FROM pg_indexes WHERE schemaname='bazar' AND indexname='variants_available_idx'")).rowCount);
});

test('modified/unknown migrations are rejected and failed DDL rolls back without recording success', async (t) => {
  const db = await database(t); await migrate(db.config);
  const dir = mkdtempSync(`${tmpdir()}/bazar-migrations-`); t.after(() => rmSync(dir, { recursive: true }));
  cpSync(migrationDirectory, dir, { recursive: true });
  const first = readFileSync(`${dir}/0001_core.sql`, 'utf8');
  writeFileSync(`${dir}/0001_core.sql`, first + '\n-- modified\n');
  await assert.rejects(migrate(db.config, dir), /Database migration failed/);
  writeFileSync(`${dir}/0001_core.sql`, first);
  writeFileSync(`${dir}/0005_failure.sql`, 'CREATE TABLE bazar.must_rollback(id integer); SELECT definitely_missing_column;');
  await assert.rejects(migrate(db.config, dir), /Database migration failed/);
  assert.equal((await db.pool.query("SELECT to_regclass('bazar.must_rollback') AS name")).rows[0].name, null);
  assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM bazar_meta.schema_migrations')).rows[0].n, 4);
  await db.pool.query("INSERT INTO bazar_meta.schema_migrations(version,checksum) VALUES ('9999',repeat('0',64))");
  await assert.rejects(migrate(db.config), /Database migration failed/);
});

test('core reads/writes enforce money, foreign keys, quantity, defaults, wishlist and review ownership', async (t) => {
  const db = await database(t); await migrate(db.config); const s = await seed(db.pool);
  await db.pool.query('INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,2)', [s.cart,s.variant]);
  await db.pool.query('INSERT INTO bazar.wishlist_items(user_id,product_id) VALUES ($1,$2)', [s.user,s.product]);
  await assert.rejects(db.pool.query('INSERT INTO bazar.wishlist_items(user_id,product_id) VALUES ($1,$2)', [s.user,s.product]), { code: '23505' });
  await assert.rejects(db.pool.query('UPDATE bazar.cart_lines SET quantity=0'), { code: '23514' });
  await assert.rejects(db.pool.query('UPDATE bazar.variants SET price_minor=-1'), { code: '23514' });
  await assert.rejects(db.pool.query('UPDATE bazar.variants SET price_minor=9007199254740992'), { code: '23514' });
  await assert.rejects(db.pool.query("UPDATE bazar.variants SET currency='USD'"), { code: '23514' });
  await assert.rejects(db.pool.query('UPDATE bazar.variants SET stock=-1'), { code: '23514' });
  await assert.rejects(db.pool.query("INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref,is_default) VALUES ($1,'meest','x','x',true)", [s.user]), { code: '23505' });
  await assert.rejects(db.pool.query('INSERT INTO bazar.orders(user_id,address_id,total_minor) VALUES ($1,$2,0)', [s.other,s.address]), { code: '23503' });
  await assert.rejects(db.pool.query('DELETE FROM bazar.users WHERE id=$1', [s.user]), { code: '23503' });
  await assert.rejects(db.pool.query("INSERT INTO bazar.reviews(user_id,product_id,order_line_id,rating,body) VALUES ($1,$2,$3,5,'Synthetic')", [s.other,s.product,s.line]), { code: '23503' });
  await assert.rejects(db.pool.query("INSERT INTO bazar.reviews(user_id,product_id,order_line_id,rating,body) VALUES ($1,$2,$3,6,'Synthetic')", [s.user,s.product,s.line]), { code: '23514' });
  await db.pool.query("INSERT INTO bazar.reviews(user_id,product_id,order_line_id,rating,body) VALUES ($1,$2,$3,5,'Synthetic')", [s.user,s.product,s.line]);
  assert.equal((await db.pool.query('SELECT price_minor FROM bazar.variants WHERE id=$1', [s.variant])).rows[0].price_minor, '12345');
});

test('messages enforce membership, deduplication and same-conversation read cursors', async (t) => {
  const db = await database(t); await migrate(db.config); const s = await seed(db.pool);
  const conversation = (await db.pool.query('INSERT INTO bazar.conversations DEFAULT VALUES RETURNING id')).rows[0].id;
  const second = (await db.pool.query('INSERT INTO bazar.conversations DEFAULT VALUES RETURNING id')).rows[0].id;
  await db.pool.query('INSERT INTO bazar.conversation_members(conversation_id,user_id) VALUES ($1,$2),($3,$2)', [conversation,s.user,second]);
  const clientId = randomUUID();
  const sql = "INSERT INTO bazar.messages(conversation_id,sender_id,client_message_id,body) VALUES ($1,$2,$3,'Synthetic message') RETURNING id";
  await assert.rejects(db.pool.query(sql, [conversation,s.other,clientId]), { code: '23503' });
  const message = (await db.pool.query(sql, [conversation,s.user,clientId])).rows[0].id;
  await assert.rejects(db.pool.query(sql, [conversation,s.user,clientId]), { code: '23505' });
  await assert.rejects(db.pool.query('UPDATE bazar.conversation_members SET last_read_message_id=$1 WHERE conversation_id=$2', [message,second]), { code: '23503' });
  await db.pool.query('UPDATE bazar.conversation_members SET last_read_message_id=$1,pinned=true WHERE conversation_id=$2', [message,conversation]);
});

test('support, payments, delivery and idempotency enforce owner and state invariants', async (t) => {
  const db = await database(t); await migrate(db.config); const s = await seed(db.pool);
  const ticket = (await db.pool.query("INSERT INTO bazar.support_tickets(user_id,subject,category) VALUES ($1,'Synthetic question','other') RETURNING id", [s.user])).rows[0].id;
  await assert.rejects(db.pool.query("INSERT INTO bazar.support_messages(ticket_id,user_id,body) VALUES ($1,$2,'Synthetic')", [ticket,s.other]), { code: '23503' });
  await db.pool.query("INSERT INTO bazar.support_messages(ticket_id,user_id,body) VALUES ($1,$2,'Synthetic')", [ticket,s.user]);
  await assert.rejects(db.pool.query("INSERT INTO bazar.payment_attempts(order_id,user_id,provider,amount_minor) VALUES ($1,$2,'synthetic',100)", [s.order,s.other]), { code: '23503' });
  await db.pool.query("INSERT INTO bazar.payment_attempts(order_id,user_id,provider,amount_minor,status) VALUES ($1,$2,'synthetic',100,'unknown')", [s.order,s.user]);
  await assert.rejects(db.pool.query("UPDATE bazar.payment_attempts SET status='paid'"), { code: '23514' });
  await db.pool.query("INSERT INTO bazar.delivery_quotes(user_id,cart_id,address_id,carrier,cost_minor,expires_at) VALUES ($1,$2,$3,'meest',NULL,now()+interval '1 hour')", [s.user,s.cart,s.address]);
  await db.pool.query("INSERT INTO bazar.shipments(order_id,user_id,carrier) VALUES ($1,$2,'meest')", [s.order,s.user]);
  const key = randomUUID();
  const insert = "INSERT INTO bazar.idempotency_records(actor_id,operation,key,request_digest,expires_at) VALUES ($1,'synthetic',$2,$3,now()+interval '1 hour')";
  await db.pool.query(insert, [s.user,key,Buffer.alloc(32,1)]);
  await assert.rejects(db.pool.query(insert, [s.user,key,Buffer.alloc(32,1)]), { code: '23505' });
  await db.pool.query("INSERT INTO bazar.provider_events(provider,event_ref,payload_digest) VALUES ('synthetic','event-1',$1)", [Buffer.alloc(32,1)]);
  await assert.rejects(db.pool.query("INSERT INTO bazar.provider_events(provider,event_ref,payload_digest) VALUES ('synthetic','event-1',$1)", [Buffer.alloc(32,1)]), { code: '23505' });
});

test('real PostgreSQL readiness fails closed for missing, stale and unavailable database and uses restricted credentials', async (t) => {
  const db = await database(t);
  const runtime = createDatabase(db.config);
  try {
    assert.equal(await runtime.check(), false);
    await migrate(db.config);
    assert.equal(await runtime.check(), true);
    await db.pool.query("UPDATE bazar_meta.schema_migrations SET checksum=repeat('0',64) WHERE version='0002'");
    assert.equal(await runtime.check(), false);
  } finally { await runtime.close(); }
  // Restore exact schema before a separate restricted-login probe.
  await db.pool.query('UPDATE bazar_meta.schema_migrations SET checksum=$1 WHERE version=$2', [(await import('../../src/database/migrations.js')).readMigrations()[1].checksum,'0002']);
  const role = `bazar_runtime_${randomBytes(8).toString('hex')}`; const password = randomBytes(32).toString('hex');
  const ddl = (await db.pool.query("SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', $1::text,$2::text) AS sql", [role,password])).rows[0].sql;
  await db.pool.query(ddl);
  await db.pool.query(`GRANT USAGE ON SCHEMA bazar_meta TO "${role}"`);
  await db.pool.query(`GRANT SELECT ON bazar_meta.schema_migrations TO "${role}"`);
  const url = new URL(db.url); url.username=role; url.password=password;
  const config = { ...readDatabaseConfig({ DATABASE_URL: url.toString(), NODE_ENV: 'test' })!, requireRestrictedRole: true };
  const ownerProbe = createDatabase({ ...db.config, requireRestrictedRole: true });
  try { assert.equal(await ownerProbe.check(), false); } finally { await ownerProbe.close(); }
  const limited = createDatabase(config);
  const app = createApiServer(readConfig({ NODE_ENV:'test' }), createLogger('error', () => {}), { isReady: limited.check });
  app.server.listen(0,'127.0.0.1'); await once(app.server,'listening');
  try {
    assert.equal(await limited.check(), true);
    const address=app.server.address(); assert.ok(address && typeof address!=='string');
    const response=await fetch(`http://127.0.0.1:${address.port}/ready`);
    assert.equal(response.status,200); const body=await response.json();
    assert.deepEqual(body.data.dependencies,[{name:'postgresql',status:'ready'}]);
    assert.equal(body.data.businessModulesAvailable,false);
    const client = new pg.Client({ connectionString:url.toString() }); await client.connect();
    try { await assert.rejects(client.query('CREATE TABLE bazar.must_not_create(id int)'), {code:'42501'}); } finally { await client.end(); }
    await db.pool.query(`REVOKE SELECT ON bazar_meta.schema_migrations FROM "${role}"`);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/ready`)).status,503);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/health`)).status,200);
  } finally {
    await app.shutdown(); await limited.close();
    await db.pool.query(`DROP OWNED BY "${role}"`); await db.pool.query(`DROP ROLE "${role}"`);
  }
  const offline = createDatabase({ ...db.config, connectionString:'postgresql://synthetic:synthetic@127.0.0.1:1/missing', timeoutMs:100 });
  try { assert.equal(await offline.check(),false); } finally { await offline.close(); }
});

test('compiled API reads environment database config, never auto-migrates and closes its real pool on SIGTERM', { timeout: 8000 }, async (t) => {
  const db = await database(t);
  const child = spawn(process.execPath, ['dist/main.js'], { env: { PATH:process.env.PATH, NODE_ENV:'test', PORT:'0', HOST:'127.0.0.1', CORS_ORIGINS:'', DATABASE_URL:db.url, DATABASE_TIMEOUT_MS:'500', SHUTDOWN_TIMEOUT_MS:'1000' }, stdio:['ignore','pipe','pipe'] });
  db.beforeDrop.push(async () => {
    if (child.exitCode===null && child.signalCode===null) {
      const exit=once(child,'exit'); child.kill('SIGKILL'); await exit;
    }
  });
  let output=''; let errors=''; child.stderr.on('data',(data) => { errors+=data; });
  const port = await new Promise<number>((resolve,reject) => {
    child.stdout.on('data',(data) => { output+=data; const line=output.split('\n').find((line)=>line.includes('"event":"startup"')); if(line) resolve(JSON.parse(line).port); });
    child.once('error',reject); child.once('exit',()=>reject(new Error('Compiled API exited before startup')));
  });
  const endpoint=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(endpoint+'/ready')).status,503);
  assert.equal((await db.pool.query("SELECT to_regclass('bazar.users') AS name")).rows[0].name,null);
  await migrate(db.config);
  const ready=await fetch(endpoint+'/ready'); assert.equal(ready.status,200);
  assert.equal((await ready.json()).data.businessModulesAvailable,false);
  await seed(db.pool);
  // Actual storefront adapter -> compiled API -> disposable PostgreSQL, without switching any UI.
  const adapterUrl=new URL('../../../storefront/lib/catalog-api-client.ts',import.meta.url).href;
  const adapterCode=`import {createCatalogApiClient} from ${JSON.stringify(adapterUrl)}; const client=createCatalogApiClient({baseUrl:${JSON.stringify(endpoint)},timeoutMs:1000}); const page=await client.list(); if(page.items.length!==1 || page.items[0].price.amountMinor!==12345) throw new Error('Catalog adapter mismatch'); const detail=await client.get('synthetic'); if(detail.variants[0].stock!==5) throw new Error('Variant mismatch'); const categories=await client.categories(); if(categories.length!==1) throw new Error('Categories mismatch');`;
  const adapter=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',adapterCode],{encoding:'utf8',timeout:5000});
  assert.equal(adapter.status,0,adapter.stderr);

  const exit=once(child,'exit'); child.kill('SIGTERM'); assert.equal((await exit)[0],0);
  assert.equal(output.includes(new URL(db.url).password),false); assert.equal(errors,'');
});

test('hashed session/OTP storage rejects invalid lifetimes and exhausted attempts', async (t) => {
  const db=await database(t); await migrate(db.config); const s=await seed(db.pool);
  await db.pool.query("INSERT INTO bazar.sessions(user_id,token_digest,expires_at) VALUES ($1,$2,now()+interval '1 hour')",[s.user,Buffer.alloc(32,2)]);
  await assert.rejects(db.pool.query("INSERT INTO bazar.sessions(user_id,token_digest,expires_at) VALUES ($1,$2,now()-interval '1 hour')",[s.user,Buffer.alloc(32,3)]),{code:'23514'});
  await db.pool.query("INSERT INTO bazar.otp_challenges(subject_digest,code_digest,max_attempts,expires_at) VALUES ($1,$2,3,now()+interval '5 minutes')",[Buffer.alloc(32,1),Buffer.alloc(32,2)]);
  await assert.rejects(db.pool.query('UPDATE bazar.otp_challenges SET attempts=4'),{code:'23514'});
});

test('catalog HTTP reads real PostgreSQL with Ukrainian search, subtree filters, stable pagination and sanitized failures', async (t) => {
  const db = await database(t);
  await migrate(db.config);
  const s = await seed(db.pool);
  const parent = (
    await db.pool.query(
      "INSERT INTO bazar.categories(handle,title) VALUES ('electronics','Електроніка') RETURNING id",
    )
  ).rows[0].id;
  await db.pool.query(
    'UPDATE bazar.categories SET parent_id=$1 WHERE id=(SELECT category_id FROM bazar.products WHERE id=$2)',
    [parent, s.product],
  );
  await db.pool.query(
    "UPDATE bazar.products SET title='Телефон тестовий',description='Український опис' WHERE id=$1",
    [s.product],
  );
  const second = (
    await db.pool.query(
      "INSERT INTO bazar.products(category_id,handle,title) VALUES ($1,'unavailable','Телефон інший') RETURNING id",
      [parent],
    )
  ).rows[0].id;
  await db.pool.query(
    "INSERT INTO bazar.variants(product_id,sku,price_minor,stock) VALUES ($1,'SECOND',999,0)",
    [second],
  );
  const catalog = createCatalog(db.pool);
  const app = createApiServer(
    readConfig({ NODE_ENV: 'test' }),
    createLogger('error', () => {}),
    { isReady: async () => true, catalog },
  );
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.shutdown());
  const addr = app.server.address();
  assert.ok(addr && typeof addr !== 'string');
  const base = `http://127.0.0.1:${addr.port}`;
  const get = async (path: string) => {
    const r = await fetch(base + path);
    return { status: r.status, body: await r.json() };
  };
  const first = await get(
    `/api/v1/products?query=${encodeURIComponent('Телефон')}&categoryId=${parent}&limit=1&sort=price-asc`,
  );
  assert.equal(first.status, 200);
  assert.equal(first.body.data.items[0].id, second);
  assert.equal(first.body.data.items[0].price.amountMinor, 999);
  const cursor = first.body.data.nextCursor;
  assert.ok(cursor);
  const next = await get(
    `/api/v1/products?query=${encodeURIComponent('Телефон')}&categoryId=${parent}&limit=1&sort=price-asc&cursor=${cursor}`,
  );
  assert.equal(next.body.data.items[0].id, s.product);
  assert.equal(next.body.data.nextCursor, null);
  assert.equal((await get(`/api/v1/products?cursor=${cursor}`)).status, 400);
  const available = await get(
    '/api/v1/products?available=true&minPrice=1000&maxPrice=20000',
  );
  assert.equal(available.body.data.items.length, 1);
  const detail = await get('/api/v1/products/synthetic');
  assert.equal(detail.body.data.variants[0].stock, 5);
  assert.equal((await get('/api/v1/products/missing')).status, 404);
  assert.equal(
    (await get('/api/v1/products?query=%27%20OR%201=1--')).body.data.items
      .length,
    0,
  );
  assert.equal(
    (await get('/api/v1/categories?parentId=root')).body.data.length,
    1,
  );
  assert.equal(
    (await get(`/api/v1/categories?parentId=${parent}`)).body.data.length,
    1,
  );
  assert.equal((await get('/api/v1/categories?unknown=1')).status, 400);
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const r = await fetch(base + '/api/v1/cart/lines/' + s.variant, {
      method,
      headers: {
        'x-user-id': s.user,
        authorization: 'Bearer invented',
        'content-type': 'application/json',
      },
      ...(method === 'GET'
        ? {}
        : { body: JSON.stringify({ userId: s.user, price: 1 }) }),
    });
    assert.equal(r.status, 401);
  }
  await db.pool.query(
    'ALTER TABLE bazar.products RENAME TO temporarily_missing',
  );
  const failed = await get('/api/v1/products');
  assert.equal(failed.status, 503);
  assert.doesNotMatch(
    JSON.stringify(failed),
    /temporarily_missing|SELECT|relation/,
  );
});

test('cart repository enforces owners, atomic versions, stock, authoritative prices and integer totals', async (t) => {
  const db = await database(t);
  await migrate(db.config);
  const s = await seed(db.pool);
  const carts = createCartRepository(db.pool);
  assert.equal((await carts.get(s.user, s.cart)).subtotal.amountMinor, 0);
  await assert.rejects(carts.get(s.other, s.cart), { status: 404 });
  await assert.rejects(
    carts.mutate(s.other, s.cart, {
      operation: 'add',
      variantId: s.variant,
      quantity: 1,
      expectedVersion: 1,
    }),
    { status: 404 },
  );
  for (const quantity of [0, -1, 1.5, 2147483648, NaN])
    await assert.rejects(
      carts.mutate(s.user, s.cart, {
        operation: 'add',
        variantId: s.variant,
        quantity,
        expectedVersion: 1,
      }),
      { status: 400 },
    );
  const op = {
    operation: 'add' as const,
    variantId: s.variant,
    quantity: 2,
    expectedVersion: 1,
  };
  const results = await Promise.allSettled([
    carts.mutate(s.user, s.cart, op),
    carts.mutate(s.user, s.cart, op),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (results.find((r) => r.status === 'rejected') as PromiseRejectedResult)
      .reason.status,
    409,
  );
  let cart = await carts.get(s.user, s.cart);
  assert.equal(cart.lines[0].quantity, 2);
  assert.equal(cart.subtotal.amountMinor, 24690);
  await assert.rejects(
    carts.mutate(s.user, s.cart, {
      ...op,
      quantity: 6,
      expectedVersion: cart.version,
    }),
    { status: 409 },
  );
  assert.equal((await carts.get(s.user, s.cart)).version, cart.version);
  await db.pool.query(
    'UPDATE bazar.variants SET price_minor=20000 WHERE id=$1',
    [s.variant],
  );
  cart = await carts.mutate(s.user, s.cart, {
    operation: 'set',
    variantId: s.variant,
    quantity: 3,
    expectedVersion: cart.version,
  });
  assert.equal(cart.subtotal.amountMinor, 60000);
  await db.pool.query('UPDATE bazar.variants SET stock=1 WHERE id=$1', [
    s.variant,
  ]);
  await assert.rejects(
    carts.mutate(s.user, s.cart, {
      operation: 'set',
      variantId: s.variant,
      quantity: 2,
      expectedVersion: cart.version,
    }),
    { status: 409 },
  );
  await db.pool.query(
    'UPDATE bazar.variants SET price_minor=9007199254740991,stock=5 WHERE id=$1',
    [s.variant],
  );
  await assert.rejects(
    carts.mutate(s.user, s.cart, {
      operation: 'set',
      variantId: s.variant,
      quantity: 2,
      expectedVersion: cart.version,
    }),
    { status: 409 },
  );
  cart = await carts.mutate(s.user, s.cart, {
    operation: 'remove',
    variantId: s.variant,
    expectedVersion: cart.version,
  });
  assert.equal(cart.subtotal.amountMinor, 0);
  assert.equal(cart.lines.length, 0);
});

test('catalog runtime works with read-only catalog grants and cannot access carts or modify prices', async (t) => {
  const db = await database(t);
  await migrate(db.config);
  await seed(db.pool);
  const role = `bazar_catalog_${randomBytes(8).toString('hex')}`;
  const password = randomBytes(32).toString('hex');
  const ddl = (
    await db.pool.query(
      "SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',$1::text,$2::text) AS sql",
      [role, password],
    )
  ).rows[0].sql;
  await db.pool.query(ddl);
  await db.pool.query(`GRANT USAGE ON SCHEMA bazar,bazar_meta TO "${role}"`);
  await db.pool.query(
    `GRANT SELECT ON bazar_meta.schema_migrations,bazar.products,bazar.categories,bazar.variants TO "${role}"`,
  );
  const url = new URL(db.url);
  url.username = role;
  url.password = password;
  const runtime = createDatabase({
    ...readDatabaseConfig({ DATABASE_URL: url.toString(), NODE_ENV: 'test' })!,
    requireRestrictedRole: true,
  });
  try {
    assert.equal(await runtime.check(), true);
    const catalog = createCatalog(runtime.pool);
    assert.equal(
      (await catalog.list(parseCatalogQuery(new URLSearchParams()))).items
        .length,
      1,
    );
    assert.equal((await catalog.get('synthetic'))?.variants.length, 1);
    assert.equal((await catalog.categories()).length, 1);
    await assert.rejects(runtime.pool.query('SELECT * FROM bazar.carts'), {
      code: '42501',
    });
    await assert.rejects(runtime.pool.query('SELECT * FROM bazar.sessions'), {code:'42501'});
    await assert.rejects(
      runtime.pool.query('UPDATE bazar.variants SET price_minor=0'),
      { code: '42501' },
    );
  } finally {
    await runtime.close();
    await db.pool.query(`DROP OWNED BY "${role}"`);
    await db.pool.query(`DROP ROLE "${role}"`);
  }
});

// F4 tests use real PostgreSQL and an adapter that exists only in tests/helpers.
async function authentication(
  t: TestContext,
  policy: Parameters<typeof authFixture>[0] = {},
) {
  const db = await database(t);
  await migrate(db.config);
  const fixture = authFixture(policy);
  const auth = createAuthService(db.pool, fixture.config, fixture.sms);
  return { ...db, ...fixture, auth };
}
async function registered(
  a: Awaited<ReturnType<typeof authentication>>,
  number = '+380671234567',
) {
  const flow = makeFlow(a.config),
    challenge = await a.auth.challenge(
      { phone: number, intent: 'register' },
      flow,
      'test-client',
    );
  const code = a.sent.get(challenge.challengeId)!.code;
  const session = await a.auth.verify(
    {
      challengeId: challenge.challengeId,
      code,
      profile: { firstName: 'Синтетичний', lastName: 'Приклад', consent: true },
    },
    flow,
    'test-client',
    '',
  );
  return { session, challenge, code, flow };
}

test('F4 registration consumes the isolated OTP once, stores only HMAC/digests, rotates flow and creates no cart', async (t) => {
  const a = await authentication(t);
  const r = await registered(a);
  const principal = await a.auth.principal(r.session.token, r.session.flow);
  assert.equal(principal.userId, r.session.data.user.id);
  assert.equal(principal.data.mode, 'test-only');
  assert.notEqual(r.session.flow, r.flow);
  assert.equal(
    (await a.pool.query('SELECT count(*)::int AS n FROM bazar.carts')).rows[0]
      .n,
    0,
  );
  const stored = JSON.stringify(
    (await a.pool.query('SELECT row_to_json(c) FROM bazar.otp_challenges c'))
      .rows,
  );
  assert.equal(stored.includes(r.code), false);
  assert.equal(stored.includes('+380671234567'), false);
  assert.equal(stored.includes(r.flow), false);
  const row = (
    await a.pool.query(
      'SELECT code_digest,attempts,consumed_at FROM bazar.otp_challenges',
    )
  ).rows[0];
  assert.notDeepEqual(row.code_digest, digest(r.code));
  assert.equal(row.attempts, 1);
  assert.ok(row.consumed_at);
  await assert.rejects(
    a.auth.verify(
      { challengeId: r.challenge.challengeId, code: r.code },
      r.flow,
      'test-client',
      '',
    ),
    { status: 401 },
  );
  await assert.rejects(a.auth.principal(r.session.token, makeFlow(a.config)), {
    status: 401,
  });
  await assert.rejects(a.auth.principal('invented', r.session.flow), {
    status: 401,
  });
});

test('F4 attempt exhaustion, expiry, binding, resend invalidation and concurrent verification fail closed', async (t) => {
  const a = await authentication(t, { otpAttempts: 3 });
  const flow = makeFlow(a.config);
  const challenge = await a.auth.challenge(
    { phone: '+380671234567', intent: 'register' },
    flow,
    'client',
  );
  const code = a.sent.get(challenge.challengeId)!.code;
  await assert.rejects(
    a.auth.challenge(
      { phone: '+380671234567', intent: 'register' },
      flow,
      'other-client',
    ),
    { status: 429 },
  );
  await assert.rejects(
    a.auth.verify(
      { challengeId: challenge.challengeId, code },
      makeFlow(a.config),
      'client',
      '',
    ),
    { status: 401 },
  );
  const wrong = code === '000000' ? '000001' : '000000';
  for (let i = 0; i < 3; i++)
    await assert.rejects(
      a.auth.verify(
        { challengeId: challenge.challengeId, code: wrong },
        flow,
        'client',
        '',
      ),
      { status: 401 },
    );
  await assert.rejects(
    a.auth.verify(
      {
        challengeId: challenge.challengeId,
        code,
        profile: { firstName: 'Тест', lastName: 'Тест', consent: true },
      },
      flow,
      'client',
      '',
    ),
    { status: 401 },
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT attempts FROM bazar.otp_challenges WHERE id=$1',
        [challenge.challengeId],
      )
    ).rows[0].attempts,
    3,
  );
  await a.pool.query(
    "UPDATE bazar.auth_rate_limits SET next_allowed_at=clock_timestamp()-interval '1 second'",
  );
  const replacement = await a.auth.challenge(
    { phone: '+380671234567', intent: 'register' },
    flow,
    'client',
  );
  assert.ok(
    (
      await a.pool.query(
        'SELECT consumed_at FROM bazar.otp_challenges WHERE id=$1',
        [challenge.challengeId],
      )
    ).rows[0].consumed_at,
  );
  await a.pool.query(
    "UPDATE bazar.otp_challenges SET created_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
    [replacement.challengeId],
  );
  await assert.rejects(
    a.auth.verify(
      {
        challengeId: replacement.challengeId,
        code: a.sent.get(replacement.challengeId)!.code,
      },
      flow,
      'client',
      '',
    ),
    { status: 401 },
  );
  const fresh = await a.auth.challenge(
    { phone: '+380501234567', intent: 'register' },
    flow,
    'client',
  );
  const input = {
    challengeId: fresh.challengeId,
    code: a.sent.get(fresh.challengeId)!.code,
    profile: { firstName: 'Тест', lastName: 'Тест', consent: true as const },
  };
  const results = await Promise.allSettled([
    a.auth.verify(input, flow, 'client', ''),
    a.auth.verify(input, flow, 'client', ''),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (await a.pool.query('SELECT count(*)::int AS n FROM bazar.sessions'))
      .rows[0].n,
    1,
  );
});

test('F4 login rotates existing browser session and logout-all revokes only the verified owner', async (t) => {
  const a = await authentication(t);
  const r = await registered(a);
  const other = await registered(a, '+380501234567');
  await a.pool.query(
    "UPDATE bazar.auth_rate_limits SET next_allowed_at=clock_timestamp()-interval '1 second'",
  );
  const challenge = await a.auth.challenge(
    { phone: '+380671234567', intent: 'login' },
    r.session.flow,
    'client',
  );
  const login = await a.auth.verify(
    {
      challengeId: challenge.challengeId,
      code: a.sent.get(challenge.challengeId)!.code,
    },
    r.session.flow,
    'client',
    r.session.token,
  );
  assert.equal(login.data.user.id, r.session.data.user.id);
  await assert.rejects(a.auth.principal(r.session.token, r.session.flow), {
    status: 401,
  });
  await a.pool.query(
    "UPDATE bazar.auth_rate_limits SET next_allowed_at=clock_timestamp()-interval '1 second'",
  );
  const separateFlow = makeFlow(a.config),
    secondChallenge = await a.auth.challenge(
      { phone: '+380671234567', intent: 'login' },
      separateFlow,
      'second-browser',
    );
  const secondSession = await a.auth.verify(
    {
      challengeId: secondChallenge.challengeId,
      code: a.sent.get(secondChallenge.challengeId)!.code,
    },
    separateFlow,
    'second-browser',
    '',
  );
  const owner = await a.auth.principal(login.token, login.flow);
  await a.auth.revoke(owner, true);
  await assert.rejects(
    a.auth.principal(secondSession.token, secondSession.flow),
    { status: 401 },
  );
  await assert.rejects(a.auth.principal(login.token, login.flow), {
    status: 401,
  });
  assert.equal(
    (await a.auth.principal(other.session.token, other.session.flow)).userId,
    other.session.data.user.id,
  );
  const unknownFlow = makeFlow(a.config);
  const unknown = await a.auth.challenge(
    { phone: '+380931234567', intent: 'login' },
    unknownFlow,
    'client',
  );
  await assert.rejects(
    a.auth.verify(
      {
        challengeId: unknown.challengeId,
        code: a.sent.get(unknown.challengeId)!.code,
      },
      unknownFlow,
      'client',
      '',
    ),
    { status: 401 },
  );
  assert.equal(
    (await a.pool.query('SELECT count(*)::int AS n FROM bazar.users')).rows[0]
      .n,
    2,
  );
});

test('F4 durable client/global budgets survive service recreation; provider failure/timeout never issues usable OTP', async (t) => {
  const a = await authentication(t, { challengeClientLimit: 2 });
  for (const number of ['+380671234567', '+380501234567'])
    await a.auth.challenge(
      { phone: number, intent: 'login' },
      makeFlow(a.config),
      'same-client',
    );
  const another = createAuthService(a.pool, a.config, a.sms);
  await assert.rejects(
    another.challenge(
      { phone: '+380931234567', intent: 'login' },
      makeFlow(a.config),
      'same-client',
    ),
    { status: 429 },
  );
  a.setFailure(true);
  await assert.rejects(
    a.auth.challenge(
      { phone: '+380631234567', intent: 'login' },
      makeFlow(a.config),
      'different-client',
    ),
    { status: 503 },
  );
  a.setFailure(false);
  a.setStall(true);
  await assert.rejects(
    a.auth.challenge(
      { phone: '+380681234567', intent: 'login' },
      makeFlow(a.config),
      'different-client-2',
    ),
    { status: 503 },
  );
  const states = (
    await a.pool.query(
      "SELECT delivery_state,consumed_at FROM bazar.otp_challenges WHERE delivery_state='failed'",
    )
  ).rows;
  assert.equal(states.length, 2);
  assert.ok(states.every((r) => r.consumed_at));
  assert.equal(
    (await a.pool.query('SELECT count(*)::int AS n FROM bazar.sessions'))
      .rows[0].n,
    0,
  );
});

test('F4 HTTP security: host cookies, pre-auth/session CSRF, origin, strict JSON, no identity spoofing or secret logs', async (t) => {
  const a = await authentication(t);
  const lines: string[] = [];
  const app = createApiServer(
    readConfig({ NODE_ENV: 'test', CORS_ORIGINS: a.config.publicOrigin }),
    createLogger('info', (line) => lines.push(line)),
    { isReady: async () => true, auth: a.auth },
  );
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.shutdown());
  const addr = app.server.address();
  assert.ok(addr && typeof addr !== 'string');
  const base = `http://127.0.0.1:${addr.port}`;
  let jar = '',
    csrfToken = '';
  const call = async (
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) => {
    const r = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        origin: a.config.publicOrigin,
        cookie: jar,
        'x-csrf-token': csrfToken,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { response: r, data: await r.json() };
  };
  const boot = await call('/api/v1/auth/csrf');
  assert.equal(boot.response.status, 200);
  jar = boot.response.headers.getSetCookie()[0].split(';')[0];
  csrfToken = boot.data.data.csrfToken;
  assert.match(
    boot.response.headers.getSetCookie()[0],
    /HttpOnly; Secure; SameSite=Strict/,
  );
  assert.equal(boot.response.headers.get('access-control-allow-origin'), null);
  for (const headers of [
    { 'x-csrf-token': '' },
    { origin: 'https://evil.invalid' },
    { 'sec-fetch-site': 'cross-site' },
  ] as Record<string, string>[])
    assert.equal(
      (
        await call(
          '/api/v1/auth/otp/challenges',
          { phone: '+380671234567', intent: 'register' },
          headers,
        )
      ).response.status,
      403,
    );
  assert.equal(
    (
      await call('/api/v1/auth/otp/challenges', {
        phone: '+380671234567',
        intent: 'register',
        userId: randomUUID(),
      })
    ).response.status,
    400,
  );
  assert.equal(
    (
      await call(
        '/api/v1/auth/otp/challenges',
        { phone: '+380671234567', intent: 'register' },
        { 'content-type': 'text/plain' },
      )
    ).response.status,
    400,
  );
  const challenge = await call('/api/v1/auth/otp/challenges', {
    phone: '+380671234567',
    intent: 'register',
  });
  assert.equal(challenge.response.status, 200);
  assert.equal(challenge.data.data.delivery, 'test-only');
  const retry = await call('/api/v1/auth/otp/challenges', {
    phone: '+380671234567',
    intent: 'register',
  });
  assert.equal(retry.response.status, 429);
  assert.ok(Number(retry.response.headers.get('retry-after')) > 0);
  const id = challenge.data.data.challengeId;
  const code = a.sent.get(id)!.code;
  assert.equal(
    (
      await call('/api/v1/auth/otp/verify', {
        challengeId: id,
        code,
        profile: { firstName: 'Тест', lastName: 'Приклад', consent: false },
      })
    ).response.status,
    400,
  );
  assert.equal(
    (
      await call('/api/v1/auth/otp/challenges', {
        phone: '+380501234567',
        intent: 'login',
        padding: 'x'.repeat(5000),
      })
    ).response.status,
    400,
  );
  const socket = createConnection({ host: '127.0.0.1', port: addr.port });
  socket.on('error', () => {});
  await once(socket, 'connect');
  socket.write(
    `POST /api/v1/auth/otp/challenges HTTP/1.1\r\nHost: local\r\nOrigin: ${a.config.publicOrigin}\r\nCookie: ${jar}\r\nX-CSRF-Token: ${csrfToken}\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{`,
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  socket.destroy();
  assert.equal((await fetch(base + '/health')).status, 200);
  const verified = await call('/api/v1/auth/otp/verify', {
    challengeId: id,
    code,
    profile: { firstName: 'Тест', lastName: 'Приклад', consent: true },
  });
  assert.equal(verified.response.status, 200);
  const set = verified.response.headers.getSetCookie();
  assert.equal(set.length, 2);
  for (const value of set) {
    assert.match(value, /^__Host-bazar-/);
    assert.match(value, /Path=\//);
    assert.match(value, /HttpOnly; Secure; SameSite=Strict/);
    assert.doesNotMatch(value, /Domain=/);
  }
  assert.equal(
    JSON.stringify(verified.data).includes(set[0].split(';')[0].split('=')[1]),
    false,
  );
  const oldJar = jar,
    oldCsrf = csrfToken;
  jar = set.map((v) => v.split(';')[0]).join('; ');
  csrfToken = verified.data.data.csrfToken;
  const current = await call('/api/v1/users/me');
  assert.equal(current.data.data.id, verified.data.data.user.id);
  assert.equal(
    (await call('/api/v1/users/me?userId=' + randomUUID())).response.status,
    400,
  );
  assert.equal(
    (await call('/api/v1/users/' + randomUUID())).response.status,
    404,
  );
  assert.equal(
    (
      await call('/api/v1/auth/session', undefined, {
        'x-user-id': randomUUID(),
        authorization: 'Bearer invented',
        cookie: '',
      })
    ).response.status,
    401,
  );
  assert.equal(
    (
      await call('/api/v1/auth/session', undefined, {
        cookie: jar + '; ' + jar.split(';')[0],
      })
    ).response.status,
    403,
  );
  assert.equal((await call('/api/v1/cart')).response.status, 503); // No invented current-cart selection.
  assert.equal(
    (await call('/api/v1/auth/logout', {}, { 'x-csrf-token': oldCsrf }))
      .response.status,
    403,
  );
  assert.equal(
    (
      await call(
        '/api/v1/auth/logout',
        {},
        { cookie: oldJar, 'x-csrf-token': oldCsrf },
      )
    ).response.status,
    401,
  );
  const loggedOut = await call('/api/v1/auth/logout', {});
  assert.equal(loggedOut.response.status, 200);
  assert.ok(
    loggedOut.response.headers
      .getSetCookie()
      .every((c) => c.includes('Max-Age=0')),
  );
  assert.equal((await call('/api/v1/auth/session')).response.status, 401);
  a.setFailure(true);
  const providerFailure = await call(
    '/api/v1/auth/otp/challenges',
    { phone: '+380501234567', intent: 'login' },
    { 'x-forwarded-for': '203.0.113.9', 'x-real-ip': '203.0.113.9' },
  );
  assert.equal(providerFailure.response.status, 503);
  assert.doesNotMatch(JSON.stringify(providerFailure.data), /provider-secret/);
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int AS n FROM bazar.auth_rate_limits WHERE scope='challenge-client'",
      )
    ).rows[0].n,
    1,
  );
  assert.doesNotMatch(
    lines.join('\n'),
    new RegExp(code + '|380671234567|' + csrfToken),
  );
});

test('F4 expired sessions fail closed and persistent global verification budgets block brute force across clients', async (t) => {
  const a = await authentication(t, { verifyGlobalLimit: 2 });
  const r = await registered(a);
  await a.pool.query(
    "UPDATE bazar.sessions SET created_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 second'",
  );
  await assert.rejects(a.auth.principal(r.session.token, r.session.flow), {
    status: 401,
  });
  for (const client of ['one', 'two']) {
    const input = { challengeId: randomUUID(), code: '123456' };
    await assert.rejects(a.auth.verify(input, makeFlow(a.config), client, ''), {
      status: client === 'one' ? 401 : 429,
    });
  }
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.sessions WHERE revoked_at IS NULL AND expires_at>clock_timestamp()',
      )
    ).rows[0].n,
    0,
  );
});

test('F4 authentication works under restricted table grants without DDL, cart or financial access', async (t) => {
  const a = await authentication(t);
  const role = `bazar_auth_${randomBytes(8).toString('hex')}`,
    password = randomBytes(32).toString('hex');
  const ddl = (
    await a.pool.query(
      "SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',$1::text,$2::text) AS sql",
      [role, password],
    )
  ).rows[0].sql;
  await a.pool.query(ddl);
  await a.pool.query(`GRANT USAGE ON SCHEMA bazar,bazar_meta TO "${role}"`);
  await a.pool.query(
    `GRANT SELECT ON bazar_meta.schema_migrations TO "${role}"`,
  );
  await a.pool.query(
    `GRANT SELECT,INSERT ON bazar.users,bazar.auth_phone_identities TO "${role}"`,
  );
  await a.pool.query(
    `GRANT SELECT,INSERT,UPDATE ON bazar.otp_challenges,bazar.sessions,bazar.auth_rate_limits TO "${role}"`,
  );
  const url = new URL(a.url);
  url.username = role;
  url.password = password;
  const limited = createDatabase({
    ...readDatabaseConfig({ DATABASE_URL: url.toString(), NODE_ENV: 'test' })!,
    requireRestrictedRole: true,
  });
  try {
    assert.equal(await limited.check(), true);
    const auth = createAuthService(limited.pool, a.config, a.sms),
      flow = makeFlow(a.config);
    const challenge = await auth.challenge(
      { phone: '+380671234567', intent: 'register' },
      flow,
      'client',
    );
    const session = await auth.verify(
      {
        challengeId: challenge.challengeId,
        code: a.sent.get(challenge.challengeId)!.code,
        profile: {
          firstName: 'Синтетичний',
          lastName: 'Приклад',
          consent: true,
        },
      },
      flow,
      'client',
      '',
    );
    const principal = await auth.principal(session.token, session.flow);
    await auth.revoke(principal, true);
    await assert.rejects(auth.principal(session.token, session.flow), {
      status: 401,
    });
    for (const sql of [
      'SELECT * FROM bazar.carts',
      'SELECT * FROM bazar.payment_attempts',
      'TRUNCATE bazar.sessions',
      'CREATE TABLE bazar.forbidden(id integer)',
    ])
      await assert.rejects(limited.pool.query(sql), { code: '42501' });
  } finally {
    await limited.close();
    await a.pool.query(`DROP OWNED BY "${role}"`);
    await a.pool.query(`DROP ROLE "${role}"`);
  }
});

test('F4 rejects weak/missing policy, shared keys, provider impersonation and non-test HTTP composition',async(t)=>{
  const a=await authentication(t);
  assert.throws(()=>createAuthService(a.pool,{...a.config,otpKey:a.config.phoneKey},a.sms),/key configuration/);
  assert.throws(()=>createAuthService(a.pool,{...a.config,policy:{...a.config.policy,otpAttempts:0}},a.sms),/policy/);
  assert.throws(()=>createAuthService(a.pool,{...a.config,policy:{...a.config.policy,verifyClientLimit:undefined} as never},a.sms),/policy/);
  assert.throws(()=>createAuthService(a.pool,a.config,{...a.sms,kind:'provider'}),{status:503});
  assert.throws(()=>createApiServer(readConfig({NODE_ENV:'production',CORS_ORIGINS:''}),createLogger('error',()=>{}),{auth:a.auth}),/isolated test server/);
  assert.equal(a.sent.size,0);
});

test('F4 typed storefront adapter completes isolated registration/session/revocation against real HTTP and PostgreSQL',async(t)=>{
  const a=await authentication(t);
  const app=createApiServer(readConfig({NODE_ENV:'test'}),createLogger('error',()=>{}),{auth:a.auth,isReady:async()=>true});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.shutdown());
  const address=app.server.address();assert.ok(address&&typeof address!=='string');let jar='';
  const client=createServerAuthClient(async(path,init)=>{
    assert.equal(init?.credentials,'same-origin');const headers=new Headers(init?.headers);headers.set('origin',a.config.publicOrigin);headers.set('cookie',jar);
    const response=await fetch(`http://127.0.0.1:${address.port}${path}`,{...init,headers});
    const set=response.headers.getSetCookie();if(set.length)jar=set.map(c=>c.split(';')[0]).join('; ');return response;
  });
  await client.bootstrap();const challenge=await client.start({phone:'+380671234567',intent:'register'});
  const session=await client.verify({challengeId:challenge.challengeId,code:a.sent.get(challenge.challengeId)!.code,profile:{firstName:'Синтетичний',lastName:'Приклад',consent:true}});
  assert.equal(session.mode,'test-only');assert.equal((await client.getCurrentUser()).id,session.user.id);
  assert.equal((await client.getSession()).user.id,session.user.id);await client.logout(true);
  await assert.rejects(client.getSession(),{code:'http-error',status:401});
});
