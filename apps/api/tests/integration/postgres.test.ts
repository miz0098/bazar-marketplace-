import {createOrderLifecycleService} from '../../src/lifecycle/service.js';
import {lifecycleFixture} from '../helpers/lifecycle.js';
import {createOrderLifecycleClient} from '../../../storefront/lib/order-lifecycle-client.js';
import {createCommunicationService} from '../../src/communication/service.js';
import {createCommunicationBusinessClient} from '../../../storefront/lib/communication-business-client.js';
import {createCustomerService} from '../../src/customer/service.js';
import {createCustomerBusinessClient} from '../../../storefront/lib/customer-business-client.js';
import { createCheckoutIntegrationServices } from '../../src/integration/checkout.js';
import { createCurrentCartService } from '../../src/cart/service.js';
import { createServerCheckoutIntegrationClients } from '../../../storefront/lib/server-checkout-integration.js';
import { createPaymentService } from '../../src/payments/service.js';
import { paymentFixture } from '../helpers/payments.js';
import { createPaymentBusinessClient } from '../../../storefront/lib/payment-business-client.js';
import { createUkrposhtaTestAdapter } from '../../src/shipping/ukrposhta.js';
import { createShippingService } from '../../src/shipping/service.js';
import { shippingFixture } from '../helpers/shipping.js';
import { createShippingBusinessClient } from '../../../storefront/lib/shipping-business-client.js';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test, { type TestContext } from 'node:test';
import pg from 'pg';
import { createCheckoutBusinessClient } from '../../../storefront/lib/checkout-business-client.js';
import { createCheckoutBusinessService } from '../../src/checkout/service.js';
import { createPromotionPricingClient } from '../../../storefront/lib/promotion-pricing-client.js';
import { createPromotionService } from '../../src/promotions/service.js';
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
import { discountedTestPlan } from '../../src/payments/test-pricing.js';
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
  assert.deepEqual((await Promise.all([migrate(db.config), migrate(db.config)])).sort(), [0, 13]);
  assert.equal(await migrate(db.config), 0);
  assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM bazar_meta.schema_migrations')).rows[0].n, 14);
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
  writeFileSync(`${dir}/0015_failure.sql`, 'CREATE TABLE bazar.must_rollback(id integer); SELECT definitely_missing_column;');
  await assert.rejects(migrate(db.config, dir), /Database migration failed/);
  assert.equal((await db.pool.query("SELECT to_regclass('bazar.must_rollback') AS name")).rows[0].name, null);
  assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM bazar_meta.schema_migrations')).rows[0].n, 14);
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
    await assert.rejects(runtime.pool.query('SELECT * FROM bazar.promotions'), {code:'42501'});
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

// F5 pricing/usage fixtures are synthetic and never activate the storefront or real redemption.
async function promotionFixture(
  t: TestContext,
  rule: {
    kind: 'fixed' | 'percentage';
    amount?: number;
    basisPoints?: number;
    max?: number;
    perUser?: number;
  } = { kind: 'fixed', amount: 2000 },
) {
  const db = await database(t);
  await migrate(db.config);
  const s = await seed(db.pool);
  await db.pool.query(
    'UPDATE bazar.variants SET price_minor=10000,stock=100 WHERE id=$1',
    [s.variant],
  );
  await db.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,2)',
    [s.cart, s.variant],
  );
  const promotion = (
    await db.pool.query(
      "INSERT INTO bazar.promotions(code,kind,percentage_basis_points,fixed_minor,currency,min_subtotal_minor,starts_at,ends_at,enabled,max_uses,per_user_limit) VALUES ('SYNTHETIC-PROMO',$1,$2,$3,'UAH',10000,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour',true,$4,$5) RETURNING id",
      [
        rule.kind,
        rule.basisPoints ?? null,
        rule.amount ?? null,
        rule.max ?? 10,
        rule.perUser ?? 10,
      ],
    )
  ).rows[0].id;
  await db.pool.query(
    'INSERT INTO bazar.promotion_products(promotion_id,product_id) VALUES ($1,$2)',
    [promotion, s.product],
  );
  const service = createPromotionService(db.pool),
    input = { cartId: s.cart, expectedCartVersion: 1, code: 'SYNTHETIC-PROMO' };
  return { ...db, s, promotion, service, input };
}
test('F5 PostgreSQL prices, product eligibility and integer totals are authoritative; evaluation consumes no usage', async (t) => {
  const a = await promotionFixture(t, {
    kind: 'percentage',
    basisPoints: 1000,
  });
  const quote = await a.service.evaluate(a.s.user, a.input);
  assert.equal(quote.subtotal.amountMinor, 20000);
  assert.equal(quote.discount.amountMinor, 2000);
  assert.equal(quote.merchandiseTotal.amountMinor, 18000);
  assert.equal(quote.checkoutAvailable, false);
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.promotion_usage_claims',
      )
    ).rows[0].n,
    0,
  );
  await assert.rejects(a.service.evaluate(a.s.other, a.input), { status: 404 });
  await assert.rejects(
    a.service.evaluate(a.s.user, { ...a.input, subtotal: 1 } as never),
    { status: 400 },
  );
  await assert.rejects(
    a.service.evaluate(a.s.user, { ...a.input, expectedCartVersion: 2 }),
    { code: 'PRICING_CHANGED' },
  );
  await a.pool.query(
    'UPDATE bazar.variants SET price_minor=15000 WHERE id=$1',
    [a.s.variant],
  );
  assert.equal(
    (await a.service.evaluate(a.s.user, a.input)).merchandiseTotal.amountMinor,
    27000,
  );
  await a.pool.query('UPDATE bazar.variants SET stock=1 WHERE id=$1', [
    a.s.variant,
  ]);
  await assert.rejects(a.service.evaluate(a.s.user, a.input), {
    code: 'PROMOTION_REJECTED',
  });
});
test('F5 rejects invalid, disabled, future, expired, minimum and ineligible promotions without changing cart/orders', async (t) => {
  const a = await promotionFixture(t);
  for (const code of ['MISSING', 'synthetic-promo', "' OR 1=1--"])
    await assert.rejects(a.service.evaluate(a.s.user, { ...a.input, code }), {
      code: 'PROMOTION_REJECTED',
    });
  for (const sql of [
    'UPDATE bazar.promotions SET enabled=false',
    "UPDATE bazar.promotions SET enabled=true,starts_at=clock_timestamp()+interval '10 minutes'",
    "UPDATE bazar.promotions SET starts_at=clock_timestamp()-interval '2 hours',ends_at=clock_timestamp()-interval '1 hour'",
    "UPDATE bazar.promotions SET ends_at=clock_timestamp()+interval '1 hour',min_subtotal_minor=20001",
  ]) {
    await a.pool.query(sql);
    await assert.rejects(a.service.evaluate(a.s.user, a.input), {
      code: 'PROMOTION_REJECTED',
    });
  }
  await a.pool.query('UPDATE bazar.promotions SET min_subtotal_minor=0');
  await a.pool.query('DELETE FROM bazar.promotion_products');
  await assert.rejects(a.service.evaluate(a.s.user, a.input), {
    code: 'PROMOTION_REJECTED',
  });
  assert.equal(
    (
      await a.pool.query('SELECT version::text FROM bazar.carts WHERE id=$1', [
        a.s.cart,
      ])
    ).rows[0].version,
    '1',
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT total_minor::text FROM bazar.orders WHERE id=$1',
        [a.s.order],
      )
    ).rows[0].total_minor,
    '24690',
  );
});
test('F5 fractional rounding, oversized fixed discounts and multiple lines remain policy-blocked', async (t) => {
  const a = await promotionFixture(t, {
    kind: 'percentage',
    basisPoints: 1000,
  });
  await a.pool.query(
    'UPDATE bazar.cart_lines SET quantity=1 WHERE cart_id=$1',
    [a.s.cart],
  );
  await a.pool.query(
    'UPDATE bazar.variants SET price_minor=12345 WHERE id=$1',
    [a.s.variant],
  );
  await assert.rejects(a.service.evaluate(a.s.user, a.input), {
    code: 'PROMOTION_POLICY_REQUIRED',
  });
  await a.pool.query(
    "UPDATE bazar.promotions SET kind='fixed',percentage_basis_points=NULL,fixed_minor=50000",
  );
  await assert.rejects(a.service.evaluate(a.s.user, a.input), {
    code: 'PROMOTION_POLICY_REQUIRED',
  });
  const variant = (
    await a.pool.query(
      "INSERT INTO bazar.variants(product_id,sku,price_minor,stock) VALUES ($1,'SECOND-PRICING',10000,10) RETURNING id",
      [a.s.product],
    )
  ).rows[0].id;
  await a.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,1)',
    [a.s.cart, variant],
  );
  await assert.rejects(a.service.evaluate(a.s.user, a.input), {
    code: 'PROMOTION_POLICY_REQUIRED',
  });
});
test('F5 usage claims are durable/idempotent; mismatches, repeat snapshots and stale prices cannot consume twice', async (t) => {
  const a = await promotionFixture(t);
  const quote = await a.service.evaluate(a.s.user, a.input);
  const input = {
    ...a.input,
    idempotencyKey: randomUUID(),
    expectedFingerprint: quote.pricingFingerprint,
  };
  const results = await Promise.all([
    a.service.claimForTest(a.s.user, input),
    a.service.claimForTest(a.s.user, input),
  ]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(results.filter((r) => r.replayed).length, 1);
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.promotion_usage_claims',
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(
    a.service.claimForTest(a.s.user, {
      ...input,
      expectedFingerprint: '0'.repeat(64),
    }),
    { code: 'CONFLICT' },
  );
  await assert.rejects(
    a.service.claimForTest(a.s.user, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
    { code: 'CONFLICT' },
  );
  await a.pool.query('UPDATE bazar.carts SET version=2 WHERE id=$1', [
    a.s.cart,
  ]);
  const fresh = await a.service.evaluate(a.s.user, {
    ...a.input,
    expectedCartVersion: 2,
  });
  await a.pool.query(
    'UPDATE bazar.variants SET price_minor=15000 WHERE id=$1',
    [a.s.variant],
  );
  await assert.rejects(
    a.service.claimForTest(a.s.user, {
      ...input,
      idempotencyKey: randomUUID(),
      expectedCartVersion: 2,
      expectedFingerprint: fresh.pricingFingerprint,
    }),
    { code: 'PRICING_CHANGED' },
  );
  assert.equal(
    (await a.service.claimForTest(a.s.user, input)).id,
    results[0].id,
  ); // Historical replay, not current pricing.
  await assert.rejects(
    a.pool.query('UPDATE bazar.promotion_usage_claims SET discount_minor=1'),
    { code: '23514' },
  );
  await assert.rejects(
    a.pool.query('DELETE FROM bazar.promotion_usage_claims'),
    { code: '23514' },
  );
});
test('F5 concurrent claims from different carts obey one global cap and explicit per-user cap', async (t) => {
  const a = await promotionFixture(t, {
    kind: 'fixed',
    amount: 1000,
    max: 1,
    perUser: 1,
  });
  const cart = (
    await a.pool.query(
      'INSERT INTO bazar.carts(user_id) VALUES ($1) RETURNING id',
      [a.s.other],
    )
  ).rows[0].id;
  await a.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,2)',
    [cart, a.s.variant],
  );
  const otherInput = { ...a.input, cartId: cart },
    one = await a.service.evaluate(a.s.user, a.input),
    two = await a.service.evaluate(a.s.other, otherInput);
  const results = await Promise.allSettled([
    a.service.claimForTest(a.s.user, {
      ...a.input,
      idempotencyKey: randomUUID(),
      expectedFingerprint: one.pricingFingerprint,
    }),
    a.service.claimForTest(a.s.other, {
      ...otherInput,
      idempotencyKey: randomUUID(),
      expectedFingerprint: two.pricingFingerprint,
    }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.promotion_usage_claims',
      )
    ).rows[0].n,
    1,
  );
  await a.pool.query('UPDATE bazar.promotions SET max_uses=10');
  const winner =
    results[0].status === 'fulfilled'
      ? { user: a.s.user, input: a.input }
      : { user: a.s.other, input: otherInput };
  await a.pool.query('UPDATE bazar.carts SET version=2 WHERE id=$1', [
    winner.input.cartId,
  ]);
  await assert.rejects(
    a.service.evaluate(winner.user, {
      ...winner.input,
      expectedCartVersion: 2,
    }),
    { code: 'PROMOTION_REJECTED' },
  );
});
test('F5 HTTP evaluation requires the verified owner and CSRF; typed checkout client uses database totals only', async (t) => {
  const a = await promotionFixture(t);
  const fixture = authFixture(),
    auth = createAuthService(a.pool, fixture.config, fixture.sms);
  const registration = await registered({ ...a, ...fixture, auth });
  await a.pool.query('UPDATE bazar.carts SET user_id=$1 WHERE id=$2', [
    registration.session.data.user.id,
    a.s.cart,
  ]);
  const lines: string[] = [];
  const app = createApiServer(
    readConfig({ NODE_ENV: 'test', CORS_ORIGINS: fixture.config.publicOrigin }),
    createLogger('info', (line) => lines.push(line)),
    { auth, promotions: a.service, isReady: async () => true },
  );
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.shutdown());
  const address = app.server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`,
    path = '/api/v1/pricing/promotions/evaluate';
  const cookie = `__Host-bazar-session=${registration.session.token}; __Host-bazar-flow=${registration.session.flow}`;
  const call = (body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + path, {
      method: 'POST',
      headers: {
        origin: fixture.config.publicOrigin,
        cookie,
        'x-csrf-token': registration.session.data.csrfToken,
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  const valid = await call(a.input);
  assert.equal(valid.status, 200);
  const result = await valid.json();
  assert.equal(result.data.merchandiseTotal.amountMinor, 18000);
  assert.equal(valid.headers.get('access-control-allow-origin'), null);
  assert.equal(
    (
      await call(a.input, {
        cookie: '',
        'x-user-id': a.s.user,
        authorization: 'Bearer invented',
      })
    ).status,
    403,
  );
  assert.equal((await call(a.input, { 'x-csrf-token': '' })).status, 403);
  assert.equal(
    (
      await call(a.input, {
        cookie: `__Host-bazar-flow=${registration.session.flow}`,
      })
    ).status,
    401,
  );
  assert.equal(
    (await call(a.input, { origin: 'https://evil.invalid' })).status,
    403,
  );
  for (const extra of [
    { subtotal: 1 },
    { price: 0 },
    { discount: 20000 },
    { userId: a.s.other },
    { codes: ['ONE', 'TWO'] },
  ])
    assert.equal((await call({ ...a.input, ...extra })).status, 400);
  const foreign = (
    await a.pool.query(
      'INSERT INTO bazar.carts(user_id) VALUES ($1) RETURNING id',
      [a.s.other],
    )
  ).rows[0].id;
  assert.equal((await call({ ...a.input, cartId: foreign })).status, 404);
  const client = createPromotionPricingClient(
    () => registration.session.data.csrfToken,
    async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set('origin', fixture.config.publicOrigin);
      headers.set('cookie', cookie);
      return fetch(base + input, { ...init, headers });
    },
  );
  assert.equal((await client.evaluate(a.input)).discount.amountMinor, 2000);
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.promotion_usage_claims',
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await fetch(base + '/api/v1/pricing/promotions/claim', {
        method: 'POST',
        headers: { origin: fixture.config.publicOrigin },
      })
    ).status,
    404,
  );
  assert.doesNotMatch(
    lines.join('\n'),
    /SYNTHETIC-PROMO|Bearer invented|subtotal|discount/,
  );
});
test('F5 migration constraints and database trigger reject invalid campaigns, foreign claims and cap bypass', async (t) => {
  const a = await promotionFixture(t, {
    kind: 'fixed',
    amount: 1000,
    max: 1,
    perUser: 1,
  });
  for (const sql of [
    "UPDATE bazar.promotions SET kind='percentage',fixed_minor=NULL,percentage_basis_points=NULL",
    'UPDATE bazar.promotions SET fixed_minor=-1',
    'UPDATE bazar.promotions SET ends_at=starts_at',
    'UPDATE bazar.promotions SET max_uses=0',
    "UPDATE bazar.promotions SET currency='USD'",
  ])
    await assert.rejects(a.pool.query(sql), { code: '23514' });
  const quote = await a.service.evaluate(a.s.user, a.input);
  await a.service.claimForTest(a.s.user, {
    ...a.input,
    expectedFingerprint: quote.pricingFingerprint,
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(
    a.pool.query(
      "INSERT INTO bazar.promotion_usage_claims(promotion_id,user_id,cart_id,cart_version,idempotency_key,request_digest,pricing_fingerprint,subtotal_minor,discount_minor,merchandise_total_minor,currency,mode) VALUES ($1,$2,$3,2,$4,$5,$6,20000,1000,19000,'UAH','integration-test')",
      [
        a.promotion,
        a.s.user,
        a.s.cart,
        randomUUID(),
        Buffer.alloc(32),
        quote.pricingFingerprint,
      ],
    ),
    { code: '23514' },
  );
  await a.pool.query(
    'UPDATE bazar.promotions SET max_uses=10,per_user_limit=10',
  );
  await assert.rejects(
    a.pool.query(
      "INSERT INTO bazar.promotion_usage_claims(promotion_id,user_id,cart_id,cart_version,idempotency_key,request_digest,pricing_fingerprint,subtotal_minor,discount_minor,merchandise_total_minor,currency,mode) VALUES ($1,$2,$3,2,$4,$5,$6,20000,1000,19000,'UAH','integration-test')",
      [
        a.promotion,
        a.s.other,
        a.s.cart,
        randomUUID(),
        Buffer.alloc(32),
        quote.pricingFingerprint,
      ],
    ),
    { code: '23503' },
  );
});
test('F5 concurrent per-user claims on separate carts cannot exceed the configured user limit', async (t) => {
  const a = await promotionFixture(t, {
    kind: 'fixed',
    amount: 1000,
    max: 10,
    perUser: 1,
  });
  const cart = (
    await a.pool.query(
      'INSERT INTO bazar.carts(user_id) VALUES ($1) RETURNING id',
      [a.s.user],
    )
  ).rows[0].id;
  await a.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,2)',
    [cart, a.s.variant],
  );
  const inputs = [a.input, { ...a.input, cartId: cart }],
    quotes = await Promise.all(
      inputs.map((input) => a.service.evaluate(a.s.user, input)),
    );
  const results = await Promise.allSettled(
    inputs.map((input, i) =>
      a.service.claimForTest(a.s.user, {
        ...input,
        idempotencyKey: randomUUID(),
        expectedFingerprint: quotes[i].pricingFingerprint,
      }),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.promotion_usage_claims',
      )
    ).rows[0].n,
    1,
  );
});

// F6 is an isolated technical order/checkout composition; no provider or real reservation is enabled.
async function checkoutFixture(t: TestContext) {
  const db = await database(t);
  await migrate(db.config);
  const s = await seed(db.pool);
  await db.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,2)',
    [s.cart, s.variant],
  );
  return { ...db, s, service: createCheckoutBusinessService(db.pool) };
}
async function checkoutReview(
  a: Awaited<ReturnType<typeof checkoutFixture>>,
  cartId = a.s.cart,
  actor = a.s.user,
) {
  let draft = await a.service.start(actor, {
    cartId,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  draft = await a.service.setDelivery(actor, draft.id, {
    expectedVersion: draft.version,
    addressId: a.s.address,
  });
  draft = await a.service.setPayment(actor, draft.id, {
    expectedVersion: draft.version,
    paymentSelection: 'on-receipt',
    promoCode: null,
  });
  return draft;
}
test('F6 persists three checkout stages and an immutable pending integration order, never a provider success', async (t) => {
  const a = await checkoutFixture(t),
    key = randomUUID();
  const first = await a.service.start(a.s.user, {
    cartId: a.s.cart,
    expectedCartVersion: 1,
    idempotencyKey: key,
  });
  assert.equal(first.stage, 'contact-delivery');
  assert.equal(first.canPlaceRealOrder, false);
  assert.equal(
    (
      await a.service.start(a.s.user, {
        cartId: a.s.cart,
        expectedCartVersion: 1,
        idempotencyKey: key,
      })
    ).id,
    first.id,
  );
  await assert.rejects(
    a.service.setPayment(a.s.user, first.id, {
      expectedVersion: 1,
      paymentSelection: 'on-receipt',
      promoCode: null,
    }),
    { code: 'CHECKOUT_REJECTED' },
  );
  const second = await a.service.setDelivery(a.s.user, first.id, {
    expectedVersion: 1,
    addressId: a.s.address,
  });
  assert.equal(second.stage, 'payment');
  assert.equal(second.delivery?.cost, null);
  const third = await a.service.setPayment(a.s.user, first.id, {
    expectedVersion: second.version,
    paymentSelection: 'card-online',
    promoCode: null,
  });
  assert.equal(third.stage, 'confirmation');
  assert.equal(third.pricing?.merchandiseTotal.amountMinor, 24690);
  assert.equal(third.canRecordIntegrationOrder, true);
  const input = {
    expectedVersion: third.version,
    expectedFingerprint: third.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  };
  const recorded = await a.service.recordOrderForTest(
    a.s.user,
    third.id,
    input,
  );
  assert.equal(recorded.order.status, 'pending');
  assert.equal(recorded.order.recordState, 'recorded-for-test');
  assert.equal(recorded.order.paymentStatus, 'not-initiated');
  assert.equal(recorded.order.inventoryStatus, 'not-reserved');
  assert.equal(recorded.order.payableTotal, null);
  assert.equal(
    (
      await a.pool.query('SELECT stock FROM bazar.variants WHERE id=$1', [
        a.s.variant,
      ])
    ).rows[0].stock,
    5,
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.payment_attempts',
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await a.pool.query('SELECT count(*)::int AS n FROM bazar.shipments'))
      .rows[0].n,
    0,
  );
  assert.equal(
    (await a.service.recordOrderForTest(a.s.user, third.id, input)).order.id,
    recorded.order.id,
  );
  await a.pool.query(
    "UPDATE bazar.products SET title='Changed live title' WHERE id=$1",
    [a.s.product],
  );
  await a.pool.query(
    'UPDATE bazar.variants SET price_minor=30000,stock=0 WHERE id=$1',
    [a.s.variant],
  );
  await a.pool.query(
    "UPDATE bazar.addresses SET location_ref='changed-location' WHERE id=$1",
    [a.s.address],
  );
  const historical = await a.service.getOrder(a.s.user, recorded.order.id);
  assert.equal(historical.lines[0].title, 'Synthetic product');
  assert.equal(historical.lines[0].unitPrice.amountMinor, 12345);
  assert.equal(historical.delivery.locationRef, 'synthetic-location');
  assert.equal(
    (await a.service.get(a.s.user, third.id)).orderId,
    historical.id,
  );
});
test('F6 owner isolation, optimistic draft versions, changed price/address/stock and duplicate order keys fail closed', async (t) => {
  const a = await checkoutFixture(t);
  const draft = await checkoutReview(a);
  await assert.rejects(a.service.get(a.s.other, draft.id), { status: 404 });
  await assert.rejects(
    a.service.setDelivery(a.s.other, draft.id, {
      expectedVersion: draft.version,
      addressId: a.s.address,
    }),
    { status: 404 },
  );
  const foreignAddress = (
    await a.pool.query(
      "INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,'meest','other','other') RETURNING id",
      [a.s.other],
    )
  ).rows[0].id;
  await assert.rejects(
    a.service.setDelivery(a.s.user, draft.id, {
      expectedVersion: draft.version,
      addressId: foreignAddress,
    }),
    { status: 404 },
  );
  await assert.rejects(
    a.service.setPayment(a.s.user, draft.id, {
      expectedVersion: 1,
      paymentSelection: 'card-online',
      promoCode: null,
    }),
    { code: 'CHECKOUT_STALE' },
  );
  const input = {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  };
  await a.pool.query(
    'UPDATE bazar.variants SET price_minor=20000 WHERE id=$1',
    [a.s.variant],
  );
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, draft.id, input),
    { code: 'CHECKOUT_STALE' },
  );
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int AS n FROM bazar.orders WHERE foundation_mode='integration-test'",
      )
    ).rows[0].n,
    0,
  );
  const fresh = await a.service.setPayment(a.s.user, draft.id, {
    expectedVersion: draft.version,
    paymentSelection: 'on-receipt',
    promoCode: null,
  });
  await a.pool.query('UPDATE bazar.variants SET stock=1 WHERE id=$1', [
    a.s.variant,
  ]);
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, draft.id, {
      ...input,
      expectedVersion: fresh.version,
      expectedFingerprint: fresh.pricing!.fingerprint,
    }),
    { status: 409 },
  );
  await a.pool.query('UPDATE bazar.variants SET stock=5 WHERE id=$1', [
    a.s.variant,
  ]);
  await a.pool.query(
    "UPDATE bazar.addresses SET location_ref='changed' WHERE id=$1",
    [a.s.address],
  );
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, draft.id, {
      ...input,
      expectedVersion: fresh.version,
      expectedFingerprint: fresh.pricing!.fingerprint,
    }),
    { code: 'CHECKOUT_STALE' },
  );
  const again = await a.service.setPayment(a.s.user, draft.id, {
    expectedVersion: fresh.version,
    paymentSelection: 'on-receipt',
    promoCode: null,
  });
  const correct = {
    expectedVersion: again.version,
    expectedFingerprint: again.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  };
  const results = await Promise.all([
    a.service.recordOrderForTest(a.s.user, draft.id, correct),
    a.service.recordOrderForTest(a.s.user, draft.id, correct),
  ]);
  assert.equal(results[0].order.id, results[1].order.id);
  assert.equal(results.filter((r) => r.replayed).length, 1);
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, draft.id, {
      ...correct,
      expectedFingerprint: '0'.repeat(64),
    }),
    { code: 'CONFLICT' },
  );
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, draft.id, {
      ...correct,
      idempotencyKey: randomUUID(),
    }),
    { code: 'CONFLICT' },
  );
  await assert.rejects(a.service.getOrder(a.s.other, results[0].order.id), {
    status: 404,
  });
});
test('F6 promotion evaluation is reused for payment preview but real/test-order redemption stays policy-blocked', async (t) => {
  const a = await checkoutFixture(t);
  const campaign = (
    await a.pool.query(
      "INSERT INTO bazar.promotions(code,kind,fixed_minor,currency,min_subtotal_minor,starts_at,ends_at,enabled,max_uses,per_user_limit) VALUES ('F6-SYNTHETIC','fixed',1000,'UAH',0,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour',true,10,1) RETURNING id",
    )
  ).rows[0].id;
  await a.pool.query(
    'INSERT INTO bazar.promotion_products(promotion_id,product_id) VALUES ($1,$2)',
    [campaign, a.s.product],
  );
  let draft = await a.service.start(a.s.user, {
    cartId: a.s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  draft = await a.service.setDelivery(a.s.user, draft.id, {
    expectedVersion: draft.version,
    addressId: a.s.address,
  });
  draft = await a.service.setPayment(a.s.user, draft.id, {
    expectedVersion: draft.version,
    paymentSelection: 'on-receipt',
    promoCode: 'F6-SYNTHETIC',
  });
  assert.equal(draft.pricing?.discount.amountMinor, 1000);
  assert.equal(draft.pricing?.merchandiseTotal.amountMinor, 23690);
  assert.equal(draft.canRecordIntegrationOrder, false);
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, draft.id, {
      expectedVersion: draft.version,
      expectedFingerprint: draft.pricing!.fingerprint,
      idempotencyKey: randomUUID(),
    }),
    { code: 'CHECKOUT_POLICY_REQUIRED' },
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.promotion_usage_claims',
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.checkout_order_requests',
      )
    ).rows[0].n,
    0,
  );
  const cleared = await a.service.setPayment(a.s.user, draft.id, {
    expectedVersion: draft.version,
    paymentSelection: 'on-receipt',
    promoCode: null,
  });
  assert.equal(cleared.pricing?.discount.amountMinor, 0);
  assert.equal(cleared.canRecordIntegrationOrder, true);
});
test('F6 different drafts on one cart version and concurrent edits do not create duplicate orders or lose updates', async (t) => {
  const a = await checkoutFixture(t);
  const one = await checkoutReview(a),
    two = await checkoutReview(a);
  const results = await Promise.allSettled(
    [one, two].map((draft) =>
      a.service.recordOrderForTest(a.s.user, draft.id, {
        expectedVersion: draft.version,
        expectedFingerprint: draft.pricing!.fingerprint,
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int AS n FROM bazar.orders WHERE foundation_mode='integration-test'",
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.checkout_order_requests',
      )
    ).rows[0].n,
    1,
  );
  const anotherCart = (
    await a.pool.query(
      'INSERT INTO bazar.carts(user_id) VALUES ($1) RETURNING id',
      [a.s.user],
    )
  ).rows[0].id;
  await a.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,1)',
    [anotherCart, a.s.variant],
  );
  let draft = await a.service.start(a.s.user, {
    cartId: anotherCart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  draft = await a.service.setDelivery(a.s.user, draft.id, {
    expectedVersion: draft.version,
    addressId: a.s.address,
  });
  const edits = await Promise.allSettled(
    ['card-online', 'on-receipt'].map((paymentSelection) =>
      a.service.setPayment(a.s.user, draft.id, {
        expectedVersion: draft.version,
        paymentSelection,
        promoCode: null,
      }),
    ),
  );
  assert.equal(edits.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (await a.service.get(a.s.user, draft.id)).version,
    draft.version + 1,
  );
});
test('F6 a failed line insert rolls back all order/request/snapshot writes and permits the same safe retry key', async (t) => {
  const a = await checkoutFixture(t),
    draft = await checkoutReview(a);
  await a.pool.query(
    "CREATE FUNCTION bazar.test_order_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic-failure' USING ERRCODE='23514'; END $$; CREATE TRIGGER test_order_failure BEFORE INSERT ON bazar.order_lines FOR EACH ROW EXECUTE FUNCTION bazar.test_order_failure()",
  );
  const input = {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  };
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, draft.id, input),
    { code: '23514' },
  );
  for (const table of ['order_checkout_snapshots', 'checkout_order_requests'])
    assert.equal(
      (await a.pool.query(`SELECT count(*)::int AS n FROM bazar.${table}`))
        .rows[0].n,
      0,
    );
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int AS n FROM bazar.orders WHERE foundation_mode='integration-test'",
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await a.service.get(a.s.user, draft.id)).version,
    draft.version,
  );
  await a.pool.query('DROP TRIGGER test_order_failure ON bazar.order_lines');
  assert.equal(
    (await a.service.recordOrderForTest(a.s.user, draft.id, input)).replayed,
    false,
  );
});
test('F6 database constraints enforce immutable complete snapshots and reject provider operations on integration orders', async (t) => {
  const a = await checkoutFixture(t),
    draft = await checkoutReview(a);
  const { order } = await a.service.recordOrderForTest(a.s.user, draft.id, {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  });
  for (const sql of [
    "UPDATE bazar.orders SET status='confirmed' WHERE id=$1",
    "UPDATE bazar.order_lines SET title_snapshot='rewritten' WHERE order_id=$1",
    'UPDATE bazar.order_checkout_snapshots SET merchandise_total_minor=0 WHERE order_id=$1',
    'DELETE FROM bazar.order_checkout_snapshots WHERE order_id=$1',
  ]) {
    await assert.rejects(a.pool.query(sql, [order.id]), { code: '23514' });
  }
  await assert.rejects(
    a.pool.query('DELETE FROM bazar.checkout_sessions WHERE id=$1', [draft.id]),
    { code: '23514' },
  );
  await assert.rejects(
    a.pool.query(
      "INSERT INTO bazar.order_lines(order_id,user_id,product_id,variant_id,title_snapshot,quantity,unit_price_minor,line_total_minor) VALUES ($1,$2,$3,$4,'late-zero-line',1,0,0)",
      [order.id, a.s.user, a.s.product, a.s.variant],
    ),
    { code: '23514' },
  );
  await assert.rejects(
    a.pool.query(
      "INSERT INTO bazar.payment_attempts(order_id,user_id,provider,amount_minor) VALUES ($1,$2,'not-a-provider',1)",
      [order.id, a.s.user],
    ),
    { code: '23514' },
  );
  const legacyOrder = (await a.pool.query(
    'INSERT INTO bazar.orders(user_id,total_minor) VALUES ($1,0) RETURNING id',
    [a.s.user],
  )).rows[0].id;
  await a.pool.query(
    "INSERT INTO bazar.order_lines(order_id,user_id,product_id,variant_id,title_snapshot,quantity,unit_price_minor,line_total_minor) VALUES ($1,$2,$3,$4,'legacy-zero-line',1,0,0)",
    [legacyOrder, a.s.user, a.s.product, a.s.variant],
  );
  await assert.rejects(
    a.pool.query('UPDATE bazar.order_lines SET order_id=$1 WHERE order_id=$2', [order.id, legacyOrder]),
    { code: '23514' },
  );
  await assert.rejects(
    a.pool.query(
      "INSERT INTO bazar.shipments(order_id,user_id,carrier) VALUES ($1,$2,'meest')",
      [order.id, a.s.user],
    ),
    { code: '23514' },
  );
  const c = await a.pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(
      "INSERT INTO bazar.orders(user_id,total_minor,foundation_mode) VALUES ($1,100,'integration-test')",
      [a.s.user],
    );
    await assert.rejects(c.query('COMMIT'), { code: '23514' });
  } finally {
    await c.query('ROLLBACK');
    c.release();
  }
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int AS n FROM bazar.orders WHERE foundation_mode='integration-test'",
      )
    ).rows[0].n,
    1,
  );
});
test('F6 typed checkout HTTP completes only isolated records; owner/CSRF/financial input and order pagination are enforced', async (t) => {
  const a = await checkoutFixture(t),
    fixture = authFixture(),
    auth = createAuthService(a.pool, fixture.config, fixture.sms);
  const registration = await registered({ ...a, ...fixture, auth });
  const actor = registration.session.data.user.id;
  await a.pool.query('UPDATE bazar.carts SET user_id=$1 WHERE id=$2', [
    actor,
    a.s.cart,
  ]);
  const addressId = (
    await a.pool.query(
      "INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,'meest','test-city','test-location') RETURNING id",
      [actor],
    )
  ).rows[0].id;
  const logs: string[] = [];
  const app = createApiServer(
    readConfig({ NODE_ENV: 'test' }),
    createLogger('info', (line) => logs.push(line)),
    { auth, checkout: a.service, isReady: async () => true },
  );
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.shutdown());
  const address = app.server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const cookie = `__Host-bazar-session=${registration.session.token}; __Host-bazar-flow=${registration.session.flow}`;
  const transport: typeof fetch = async (path, init) => {
    const headers = new Headers(init?.headers);
    headers.set('origin', fixture.config.publicOrigin);
    headers.set('cookie', cookie);
    return fetch(base + path, { ...init, headers });
  };
  const client = createCheckoutBusinessClient(
    () => registration.session.data.csrfToken,
    transport,
  );
  let draft = await client.start({
    cartId: a.s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  draft = await client.setDelivery(draft.id, {
    expectedVersion: draft.version,
    addressId,
  });
  draft = await client.setPayment(draft.id, {
    expectedVersion: draft.version,
    paymentSelection: 'on-receipt',
    promoCode: null,
  });
  const input = {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  };
  const recorded = await client.recordOrderForTest(draft.id, input);
  assert.equal(recorded.order.recordState, 'recorded-for-test');
  assert.equal(recorded.order.payableTotal, null);
  assert.equal(
    (await client.recordOrderForTest(draft.id, input)).replayed,
    true,
  );
  assert.equal(
    (await client.getOrder(recorded.order.id)).id,
    recorded.order.id,
  );
  assert.equal((await client.get(draft.id)).canPlaceRealOrder, false);
  const secondCart = (
    await a.pool.query(
      'INSERT INTO bazar.carts(user_id) VALUES ($1) RETURNING id',
      [actor],
    )
  ).rows[0].id;
  await a.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,1)',
    [secondCart, a.s.variant],
  );
  let second = await client.start({
    cartId: secondCart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  second = await client.setDelivery(second.id, {
    expectedVersion: second.version,
    addressId,
  });
  second = await client.setPayment(second.id, {
    expectedVersion: second.version,
    paymentSelection: 'card-online',
    promoCode: null,
  });
  await client.recordOrderForTest(second.id, {
    expectedVersion: second.version,
    expectedFingerprint: second.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  });
  const page = await client.listOrders({ limit: 1 });
  assert.equal(page.items.length, 1);
  assert.ok(page.nextCursor);
  const next = await client.listOrders({ limit: 1, cursor: page.nextCursor });
  assert.equal(next.items.length, 1);
  assert.notEqual(page.items[0].id, next.items[0].id);
  assert.equal(next.nextCursor, null);
  await assert.rejects(client.listOrders({ limit: 101 }), { status: 400 });
  const raw = (
    path: string,
    body: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method: 'POST',
      headers: {
        origin: fixture.config.publicOrigin,
        cookie,
        'x-csrf-token': registration.session.data.csrfToken,
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await raw('/api/v1/checkouts', {
        cartId: a.s.cart,
        expectedCartVersion: 1,
        idempotencyKey: randomUUID(),
        userId: a.s.other,
        total: 1,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await raw(
        '/api/v1/checkouts',
        {
          cartId: a.s.cart,
          expectedCartVersion: 1,
          idempotencyKey: randomUUID(),
        },
        { 'x-csrf-token': '' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await raw(
        '/api/v1/checkouts',
        {
          cartId: a.s.cart,
          expectedCartVersion: 1,
          idempotencyKey: randomUUID(),
        },
        { origin: 'https://evil.invalid' },
      )
    ).status,
    403,
  );
  const other = await registered({ ...a, ...fixture, auth }, '+380501234567');
  const otherCookie = `__Host-bazar-session=${other.session.token}; __Host-bazar-flow=${other.session.flow}`;
  for (const path of [
    `/api/v1/orders/${recorded.order.id}`,
    `/api/v1/checkouts/${draft.id}`,
  ])
    assert.equal(
      (
        await fetch(base + path, {
          headers: {
            origin: fixture.config.publicOrigin,
            cookie: otherCookie,
            'x-user-id': actor,
          },
        })
      ).status,
      404,
    );
  assert.doesNotMatch(
    logs.join('\n'),
    /test-location|test-city|380671234567|expectedFingerprint/,
  );
});
test('F6 multi-line exact snapshots work while empty or changed-cart drafts cannot record orders', async (t) => {
  const a = await checkoutFixture(t);
  const category = (
    await a.pool.query('SELECT category_id FROM bazar.products WHERE id=$1', [
      a.s.product,
    ])
  ).rows[0].category_id;
  const product = (
    await a.pool.query(
      "INSERT INTO bazar.products(category_id,handle,title) VALUES ($1,'f6-second','Другий синтетичний товар') RETURNING id",
      [category],
    )
  ).rows[0].id;
  const variant = (
    await a.pool.query(
      "INSERT INTO bazar.variants(product_id,sku,price_minor,stock) VALUES ($1,'F6-SECOND',999,10) RETURNING id",
      [product],
    )
  ).rows[0].id;
  await a.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,3)',
    [a.s.cart, variant],
  );
  const draft = await checkoutReview(a);
  assert.equal(draft.pricing?.subtotal.amountMinor, 27687);
  const { order } = await a.service.recordOrderForTest(a.s.user, draft.id, {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  });
  assert.equal(order.lines.length, 2);
  assert.equal(order.subtotal.amountMinor, 27687);
  const empty = (
    await a.pool.query(
      'INSERT INTO bazar.carts(user_id) VALUES ($1) RETURNING id',
      [a.s.user],
    )
  ).rows[0].id;
  await assert.rejects(
    a.service.start(a.s.user, {
      cartId: empty,
      expectedCartVersion: 1,
      idempotencyKey: randomUUID(),
    }),
    { code: 'CHECKOUT_REJECTED' },
  );
  await a.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,1)',
    [empty, a.s.variant],
  );
  const another = await checkoutReview(a, empty);
  await createCartRepository(a.pool).mutate(a.s.user, empty, {
    operation: 'set',
    variantId: a.s.variant,
    quantity: 2,
    expectedVersion: 1,
  });
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, another.id, {
      expectedVersion: another.version,
      expectedFingerprint: another.pricing!.fingerprint,
      idempotencyKey: randomUUID(),
    }),
    { code: 'CHECKOUT_STALE' },
  );
});

// F7 uses synthetic carrier responses only, with real PostgreSQL and the existing verified-session protocol.
async function shippingCase(t: TestContext, ttl = 60000) {
  const a = await checkoutFixture(t),
    fixture = shippingFixture();
  fixture.config.quoteTtlMs = ttl;
  const shipping = createShippingService(
    a.pool,
    fixture.adapters,
    fixture.config,
  );
  const checkout = createCheckoutBusinessService(a.pool, shipping);
  const draft = await checkout.start(a.s.user, {
    cartId: a.s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  const selected = await shipping.select(a.s.user, draft.id, {
    expectedVersion: draft.version,
    addressId: a.s.address,
    kind: "branch",
  });
  return { ...a, ...fixture, shipping, checkout, draft, selected };
}
test("F7 upgrades F6 without rewriting existing orders; directories cover only explicit carrier capabilities", async (t) => {
  const db = await database(t),
    dir = mkdtempSync(`${tmpdir()}/bazar-f7-upgrade-`);
  t.after(() => rmSync(dir, { recursive: true }));
  for (const file of [
    "0001_core.sql",
    "0002_version_indexes.sql",
    "0003_catalog_search.sql",
    "0004_server_auth.sql",
    "0005_promotions.sql",
    "0006_checkout_orders.sql",
  ]) {
    // Use the actual immutable inventory names rather than maintaining a second migration registry.
    const all = readFileSync(`${migrationDirectory}/${file}`, "utf8");
    writeFileSync(`${dir}/${file}`, all);
  }
  await migrate(db.config, dir);
  const s = await seed(db.pool);
  assert.equal(await migrate(db.config), 8);
  assert.equal(await migrate(db.config), 0);
  assert.equal(
    (
      await db.pool.query(
        "SELECT total_minor::text FROM bazar.orders WHERE id=$1",
        [s.order],
      )
    ).rows[0].total_minor,
    "24690",
  );
  const f = shippingFixture(),
    service = createShippingService(db.pool, f.adapters, f.config);
  const carriers = await service.carriers();
  assert.equal(carriers.bazarPickup.available, false);
  assert.equal(carriers.carriers.length, 2);
  for (const carrier of ["nova-poshta", "meest"]) {
    assert.equal(
      (await service.cities({ carrier, query: "Тест" })).items.length,
      1,
    );
    assert.equal(
      (
        await service.points({
          carrier,
          cityRef: "synthetic-city",
          kind: "branch",
        })
      ).items[0].available,
      true,
    );
    await assert.rejects(
      service.points({
        carrier,
        cityRef: "synthetic-city",
        kind: "parcel-locker",
      }),
      { code: "DELIVERY_REJECTED" },
    );
  }
  assert.equal(
    (
      await db.pool.query(
        "SELECT count(*)::int AS n FROM bazar.shipping_points",
      )
    ).rows[0].n,
    2,
  );
});
test("F7 selections enforce owner/version and quote replay never refreshes an estimate", async (t) => {
  const a = await shippingCase(t),
    input = {
      expectedVersion: a.selected.checkoutVersion,
      idempotencyKey: randomUUID(),
    };
  await assert.rejects(a.shipping.getSelection(a.s.other, a.draft.id), {
    status: 404,
  });
  const foreign = (
    await a.pool.query(
      "INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,'meest','synthetic-city','synthetic-location') RETURNING id",
      [a.s.other],
    )
  ).rows[0].id;
  await assert.rejects(
    a.shipping.select(a.s.user, a.draft.id, {
      expectedVersion: a.selected.checkoutVersion,
      addressId: foreign,
      kind: "branch",
    }),
    { status: 404 },
  );
  const results = await Promise.all([
    a.shipping.quote(a.s.user, a.draft.id, input),
    a.shipping.quote(a.s.user, a.draft.id, input),
  ]);
  assert.equal(results[0].quote.id, results[1].quote.id);
  assert.equal(results.filter((x) => x.replayed).length, 1);
  assert.equal(a.state.calls, 1);
  assert.equal(results[0].quote.cost.amountMinor, 7350);
  assert.equal(results[0].quote.validitySource, "integration-policy");
  await assert.rejects(
    a.shipping.quote(a.s.user, a.draft.id, { ...input, expectedVersion: 1 }),
    { code: "CONFLICT" },
  );
  assert.equal(
    (
      await a.shipping.check(a.s.user, a.draft.id, {
        expectedVersion: a.selected.checkoutVersion,
        quoteId: results[0].quote.id,
      })
    ).current,
    true,
  );
  const edits = await Promise.allSettled(
    [1, 2].map(() =>
      a.shipping.select(a.s.user, a.draft.id, {
        expectedVersion: a.selected.checkoutVersion,
        addressId: a.s.address,
        kind: "branch",
      }),
    ),
  );
  assert.equal(edits.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    (await a.shipping.getSelection(a.s.user, a.draft.id)).quoteId,
    null,
  );
  const replay = await a.shipping.quote(a.s.user, a.draft.id, input);
  assert.equal(replay.quote.expiresAt, results[0].quote.expiresAt);
});
test("F7 current checks reject changed tariff, package plan, point, address, prices, and expired quotes", async (t) => {
  const a = await shippingCase(t),
    q = await a.shipping.quote(a.s.user, a.draft.id, {
      expectedVersion: 2,
      idempotencyKey: randomUUID(),
    }),
    check = { expectedVersion: 2, quoteId: q.quote.id };
  a.state.amount++;
  await assert.rejects(a.shipping.check(a.s.user, a.draft.id, check), {
    code: "DELIVERY_STALE",
  });
  a.state.amount--;
  a.state.planRevision = "changed";
  await assert.rejects(a.shipping.check(a.s.user, a.draft.id, check), {
    code: "DELIVERY_STALE",
  });
  a.state.planRevision = "synthetic-plan-1";
  a.state.pointRevision = "changed";
  await assert.rejects(a.shipping.check(a.s.user, a.draft.id, check), {
    code: "DELIVERY_STALE",
  });
  a.state.pointRevision = "synthetic-point-1";
  a.state.available = false;
  await assert.rejects(a.shipping.check(a.s.user, a.draft.id, check), {
    code: "DELIVERY_REJECTED",
  });
  a.state.available = true;
  await a.pool.query(
    "UPDATE bazar.variants SET price_minor=price_minor+1 WHERE id=$1",
    [a.s.variant],
  );
  await assert.rejects(a.shipping.check(a.s.user, a.draft.id, check), {
    code: "DELIVERY_STALE",
  });
  await a.pool.query(
    "UPDATE bazar.addresses SET location_ref='other-point' WHERE id=$1",
    [a.s.address],
  );
  await assert.rejects(a.shipping.check(a.s.user, a.draft.id, check), {
    code: "DELIVERY_STALE",
  });
  const b = await shippingCase(t, 1),
    expiredQuote = await b.shipping.quote(b.s.user, b.draft.id, {
      expectedVersion: 2,
      idempotencyKey: randomUUID(),
    });
  await new Promise((r) => setTimeout(r, 10));
  await assert.rejects(
    b.shipping.check(b.s.user, b.draft.id, {
      expectedVersion: 2,
      quoteId: expiredQuote.quote.id,
    }),
    { code: "DELIVERY_STALE" },
  );
});
test("F7 carrier errors, timeout and unavailable points never persist a successful quote or expose private errors", async (t) => {
  const a = await shippingCase(t),
    input = { expectedVersion: 2, idempotencyKey: randomUUID() };
  a.state.fail = true;
  await assert.rejects(
    a.shipping.quote(a.s.user, a.draft.id, input),
    (e) =>
      e instanceof Error &&
      !e.message.includes("private") &&
      "code" in e &&
      e.code === "DELIVERY_UNAVAILABLE",
  );
  a.state.fail = false;
  a.state.stall = true;
  await assert.rejects(a.shipping.quote(a.s.user, a.draft.id, input), {
    status: 503,
  });
  a.state.stall = false;
  assert.equal(
    (await a.pool.query("SELECT count(*)::int AS n FROM bazar.shipping_quotes"))
      .rows[0].n,
    0,
  );
  assert.equal(
    (await a.shipping.getSelection(a.s.user, a.draft.id)).quoteId,
    null,
  );
  a.state.available = false;
  await assert.rejects(
    a.shipping.select(a.s.user, a.draft.id, {
      expectedVersion: 2,
      addressId: a.s.address,
      kind: "branch",
    }),
    { code: "DELIVERY_REJECTED" },
  );
  assert.equal(
    (await a.shipping.getSelection(a.s.user, a.draft.id)).checkoutVersion,
    2,
  );
  a.state.available = true;
  assert.equal(
    (await a.shipping.quote(a.s.user, a.draft.id, input)).replayed,
    false,
  );
});
test("F7 final F6 transaction requires a current quote and never upgrades it to shipment/payment/payable success", async (t) => {
  const a = await shippingCase(t);
  let draft = await a.checkout.setPayment(a.s.user, a.draft.id, {
    expectedVersion: 2,
    paymentSelection: "on-receipt",
    promoCode: null,
  });
  const input = {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  };
  await assert.rejects(
    a.checkout.recordOrderForTest(a.s.user, draft.id, input),
    { code: "DELIVERY_STALE" },
  );
  const q = await a.shipping.quote(a.s.user, draft.id, {
    expectedVersion: draft.version,
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(
    a.service.recordOrderForTest(a.s.user, draft.id, input),
    { code: "CHECKOUT_POLICY_REQUIRED" },
  );
  a.state.amount++;
  await assert.rejects(
    a.checkout.recordOrderForTest(a.s.user, draft.id, input),
    { code: "DELIVERY_STALE" },
  );
  a.state.amount--;
  const result = await a.checkout.recordOrderForTest(a.s.user, draft.id, input);
  assert.equal(result.order.delivery.cost, null);
  assert.equal(result.order.delivery.status, "not-requested");
  assert.equal(result.order.payableTotal, null);
  assert.equal(result.order.paymentStatus, "not-initiated");
  assert.equal(
    (await a.checkout.recordOrderForTest(a.s.user, draft.id, input)).replayed,
    true,
  );
  for (const sql of [
    "UPDATE bazar.shipping_quotes SET amount_minor=0 WHERE id=$1",
    "DELETE FROM bazar.shipping_quotes WHERE id=$1",
  ])
    await assert.rejects(a.pool.query(sql, [q.quote.id]), { code: "23514" });
  await assert.rejects(
    a.pool.query(
      "UPDATE bazar.checkout_shipping SET quote_id=NULL WHERE checkout_id=$1",
      [draft.id],
    ),
    { code: "23514" },
  );
  assert.equal(
    (
      await a.pool.query(
        "SELECT (SELECT count(*)::int FROM bazar.shipments)+(SELECT count(*)::int FROM bazar.payment_attempts) AS n",
      )
    ).rows[0].n,
    0,
  );
  draft = await a.checkout.get(a.s.user, draft.id);
  assert.equal(draft.canPlaceRealOrder, false);
});
test("F7 quote insertion and selection update are atomic; failed persistence permits the same retry key", async (t) => {
  const a = await shippingCase(t),
    input = { expectedVersion: 2, idempotencyKey: randomUUID() };
  await a.pool.query(
    "CREATE FUNCTION bazar.test_shipping_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced'; END $$; CREATE TRIGGER test_shipping_failure BEFORE UPDATE ON bazar.checkout_shipping FOR EACH ROW EXECUTE FUNCTION bazar.test_shipping_failure()",
  );
  await assert.rejects(a.shipping.quote(a.s.user, a.draft.id, input));
  assert.equal(
    (await a.pool.query("SELECT count(*)::int AS n FROM bazar.shipping_quotes"))
      .rows[0].n,
    0,
  );
  await a.pool.query(
    "DROP TRIGGER test_shipping_failure ON bazar.checkout_shipping",
  );
  assert.equal(
    (await a.shipping.quote(a.s.user, a.draft.id, input)).replayed,
    false,
  );
  const foreign = (
    await a.pool.query(
      "INSERT INTO bazar.users(first_name,last_name) VALUES ('Test','Foreign') RETURNING id",
    )
  ).rows[0].id;
  await assert.rejects(
    a.pool.query(
      "UPDATE bazar.checkout_shipping SET user_id=$1 WHERE checkout_id=$2",
      [foreign, a.draft.id],
    ),
    { code: "23514" },
  );
});
test("F7 typed shipping client uses verified HTTP sessions, CSRF, no PII and the existing checkout stages", async (t) => {
  const a = await checkoutFixture(t),
    f = shippingFixture(),
    fixture = authFixture(),
    auth = createAuthService(a.pool, fixture.config, fixture.sms);
  const registration = await registered({ ...a, ...fixture, auth }),
    actor = registration.session.data.user.id;
  await a.pool.query("UPDATE bazar.carts SET user_id=$1 WHERE id=$2", [
    actor,
    a.s.cart,
  ]);
  const addressId = (
    await a.pool.query(
      "INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,'meest','synthetic-city','synthetic-location') RETURNING id",
      [actor],
    )
  ).rows[0].id;
  const shipping = createShippingService(a.pool, f.adapters, f.config),
    checkout = createCheckoutBusinessService(a.pool, shipping),
    logs: string[] = [];
  const app = createApiServer(
    readConfig({ NODE_ENV: "test" }),
    createLogger("info", (line) => logs.push(line)),
    { auth, checkout, shipping, isReady: async () => true },
  );
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  t.after(() => app.shutdown());
  const address = app.server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const cookie = `__Host-bazar-session=${registration.session.token}; __Host-bazar-flow=${registration.session.flow}`;
  const transport: typeof fetch = async (path, init) => {
    const headers = new Headers(init?.headers);
    headers.set("origin", fixture.config.publicOrigin);
    headers.set("cookie", cookie);
    return fetch(base + path, { ...init, headers });
  };
  const client = createShippingBusinessClient(
      () => registration.session.data.csrfToken,
      transport,
    ),
    checkoutClient = createCheckoutBusinessClient(
      () => registration.session.data.csrfToken,
      transport,
    );
  assert.equal((await client.carriers()).bazarPickup.available, false);
  await client.cities({ carrier: "meest", query: "Тест" });
  await client.points({
    carrier: "meest",
    cityRef: "synthetic-city",
    kind: "branch",
  });
  let draft = await checkoutClient.start({
    cartId: a.s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  const s = await client.select(draft.id, {
    expectedVersion: draft.version,
    addressId,
    kind: "branch",
  });
  assert.equal((await client.getSelection(draft.id)).checkoutVersion, 2);
  const q = await client.quote(draft.id, {
    expectedVersion: s.checkoutVersion,
    idempotencyKey: randomUUID(),
  });
  assert.equal(
    (await client.check(draft.id, { expectedVersion: 2, quoteId: q.quote.id }))
      .canPlaceRealOrder,
    false,
  );
  draft = await checkoutClient.setPayment(draft.id, {
    expectedVersion: 2,
    paymentSelection: "card-online",
    promoCode: null,
  });
  assert.equal(
    (
      await client.check(draft.id, {
        expectedVersion: draft.version,
        quoteId: q.quote.id,
      })
    ).current,
    true,
  );
  const raw = (body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + `/api/v1/delivery/checkouts/${draft.id}/quotes`, {
      method: "POST",
      headers: {
        origin: fixture.config.publicOrigin,
        cookie,
        "content-type": "application/json",
        "x-csrf-token": registration.session.data.csrfToken,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  const input = {
    expectedVersion: draft.version,
    idempotencyKey: randomUUID(),
  };
  assert.equal((await raw(input, { "x-csrf-token": "" })).status, 403);
  assert.equal((await raw(input, { origin: "https://evil.test" })).status, 403);
  assert.equal((await raw(input, { cookie: "" })).status, 403);
  assert.equal(
    (
      await raw(input, {
        cookie: `__Host-bazar-flow=${registration.session.flow}`,
      })
    ).status,
    401,
  );
  for (const extra of [
    { amountMinor: 0 },
    { userId: a.s.other },
    { recipientPhone: "+380671234567" },
    { apiKey: "secret" },
  ])
    assert.equal((await raw({ ...input, ...extra })).status, 400);
  f.state.fail = true;
  const failed = await raw(input);
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("private"));
  f.state.fail = false;
  assert.equal(
    (
      await fetch(base + "/api/v1/delivery/tracking/test", {
        headers: { origin: fixture.config.publicOrigin, cookie },
      })
    ).status,
    404,
  );
  assert.ok(!logs.join("").includes("synthetic-city"));
  assert.ok(!logs.join("").includes(registration.session.token));
  assert.ok(!logs.join("").includes("+380671234567"));
  const order = await checkoutClient.recordOrderForTest(draft.id, {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  });
  assert.equal(order.order.recordState, "recorded-for-test");
});
test("F7 competing quotes expose only the current selection; concurrent selection changes cannot keep an old quote", async (t) => {
  const a = await shippingCase(t);
  const quotes = await Promise.all(
    [1, 2].map(() =>
      a.shipping.quote(a.s.user, a.draft.id, {
        expectedVersion: 2,
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  const selected = await a.shipping.getSelection(a.s.user, a.draft.id);
  const old = quotes.find((q) => q.quote.id !== selected.quoteId)!;
  await assert.rejects(
    a.shipping.check(a.s.user, a.draft.id, {
      expectedVersion: 2,
      quoteId: old.quote.id,
    }),
    { code: "DELIVERY_STALE" },
  );
  const results = await Promise.allSettled([
    a.shipping.quote(a.s.user, a.draft.id, {
      expectedVersion: 2,
      idempotencyKey: randomUUID(),
    }),
    a.shipping.select(a.s.user, a.draft.id, {
      expectedVersion: 2,
      addressId: a.s.address,
      kind: "branch",
    }),
  ]);
  assert.equal(results[1].status, "fulfilled");
  assert.equal(
    (await a.shipping.getSelection(a.s.user, a.draft.id)).quoteId,
    null,
  );
  a.state.amount = -1;
  await assert.rejects(
    a.shipping.quote(a.s.user, a.draft.id, {
      expectedVersion: 3,
      idempotencyKey: randomUUID(),
    }),
    { code: "DELIVERY_UNAVAILABLE" },
  );
});
test("F7 parcel lockers are searchable/selectable only through an explicitly capable adapter, never by guessing a type", async (t) => {
  const a = await checkoutFixture(t),
    f = shippingFixture();
  const locker = {
    ref: "synthetic-locker",
    cityRef: "synthetic-city",
    name: "Тестовий поштомат",
    kind: "parcel-locker" as const,
    available: true,
    revision: "synthetic-locker-1",
  };
  const adapters = f.adapters.map((adapter) => ({
    ...adapter,
    pickupKinds: ["branch", "parcel-locker"] as const,
    async points(_city: string, kind: string) {
      return kind === "parcel-locker"
        ? [locker]
        : adapter.points(_city, "branch", new AbortController().signal);
    },
    async point(city: string, ref: string, kind: string) {
      return ref === locker.ref &&
        city === locker.cityRef &&
        kind === locker.kind
        ? locker
        : adapter.point(city, ref, "branch", new AbortController().signal);
    },
  }));
  const shipping = createShippingService(a.pool, adapters, f.config),
    checkout = createCheckoutBusinessService(a.pool, shipping);
  const result = await shipping.points({
    carrier: "meest",
    cityRef: "synthetic-city",
    kind: "parcel-locker",
  });
  assert.equal(result.items[0].kind, "parcel-locker");
  const addressId = (
    await a.pool.query(
      "INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,'meest','synthetic-city','synthetic-locker') RETURNING id",
      [a.s.user],
    )
  ).rows[0].id;
  const draft = await checkout.start(a.s.user, {
    cartId: a.s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  assert.equal(
    (
      await shipping.select(a.s.user, draft.id, {
        expectedVersion: 1,
        addressId,
        kind: "parcel-locker",
      })
    ).kind,
    "parcel-locker",
  );
  const q = await shipping.quote(a.s.user, draft.id, {
    expectedVersion: 2,
    idempotencyKey: randomUUID(),
  });
  assert.equal(q.quote.kind, "parcel-locker");
});

// F8: synthetic payment protocol, never a paid order or provider selection.
async function paymentCase(t: TestContext) {
  const a = await checkoutFixture(t),
    f = paymentFixture();
  let ready = await checkoutReview(a);
  ready = await a.service.setPayment(a.s.user, ready.id, {
    expectedVersion: ready.version,
    paymentSelection: 'card-online',
    promoCode: null,
  });
  const payments = createPaymentService(a.pool, f.adapter, f.config);
  const input = {
    checkoutId: ready.id,
    expectedVersion: ready.version,
    method: 'card' as const,
    idempotencyKey: randomUUID(),
  };
  return { ...a, ...f, config: a.config, payments, ready, input };
}
test('F8 verified success and concurrent duplicate webhooks update only one test operation with an immutable audit', async (t) => {
  const a = await paymentCase(t),
    created = await a.payments.create(a.s.user, a.input);
  assert.equal(created.attempt.status, 'pending');
  assert.equal(created.attempt.realPayment, false);
  assert.equal(created.attempt.orderPaid, false);
  const event = a.event(created.attempt.id, 'succeeded'),
    signed = a.signed(event);
  const results = await Promise.all(
    [1, 2, 3].map(() => a.payments.webhook(signed.raw, signed.signature)),
  );
  assert.equal(results.filter((x) => !x.replayed).length, 1);
  assert.equal(
    (await a.payments.get(a.s.user, created.attempt.id)).status,
    'succeeded',
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.payment_verified_events',
      )
    ).rows[0].n,
    1,
  );
  assert.deepEqual(
    (
      await a.pool.query(
        'SELECT to_status FROM bazar.payment_transition_audit ORDER BY id',
      )
    ).rows.map((r) => r.to_status),
    ['submitting', 'pending', 'succeeded'],
  );
  for (const sql of [
    "UPDATE bazar.payment_operations SET status='pending',version=version+1 WHERE id=$1",
    'DELETE FROM bazar.payment_operations WHERE id=$1',
    'DELETE FROM bazar.payment_transition_audit WHERE operation_id=$1',
  ])
    await assert.rejects(a.pool.query(sql, [created.attempt.id]), {
      code: '23514',
    });
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.orders WHERE foundation_mode IS NOT NULL',
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.payment_attempts',
      )
    ).rows[0].n,
    0,
  );
});
test('F8 invalid signatures, amount/currency/account/reference mismatches and injected payment credentials never alter state', async (t) => {
  const a = await paymentCase(t),
    created = await a.payments.create(a.s.user, a.input),
    event = a.event(created.attempt.id, 'succeeded'),
    signed = a.signed(event);
  await assert.rejects(a.payments.webhook(signed.raw, signed.signature + '0'), {
    status: 401,
  });
  const old = a.signed(event, Date.now() - 600000);
  await assert.rejects(a.payments.webhook(old.raw, old.signature), {
    status: 401,
  });
  for (const patch of [
    { amountMinor: event.amountMinor + 1 },
    { currency: 'USD' },
    { accountRef: 'different-merchant' },
    { operationRef: 'another-operation' },
  ]) {
    const bad = a.signed({ ...event, ...patch });
    await assert.rejects(a.payments.webhook(bad.raw, bad.signature));
  }
  const privatePayload = a.signed({ ...event, cardNumber: 'never-store-this' });
  await assert.rejects(
    a.payments.webhook(privatePayload.raw, privatePayload.signature),
    { status: 401 },
  );
  for (const extra of [
    { amountMinor: 1 },
    { currency: 'USD' },
    { status: 'succeeded' },
    { cvv: '123' },
    { cardNumber: 'forbidden' },
  ])
    await assert.rejects(
      a.payments.create(a.s.user, { ...a.input, ...extra }),
      { status: 400 },
    );
  assert.equal(
    (await a.payments.get(a.s.user, created.attempt.id)).status,
    'pending',
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.payment_verified_events',
      )
    ).rows[0].n,
    0,
  );
  await assert.rejects(a.payments.get(a.s.other, created.attempt.id), {
    status: 404,
  });
  await assert.rejects(a.payments.cancel(a.s.other, created.attempt.id), {
    status: 404,
  });
});
test('F8 definitive declines allow a new wallet attempt; unknown or successful operations cannot be retried', async (t) => {
  const a = await paymentCase(t),
    first = await a.payments.create(a.s.user, a.input),
    decline = a.signed(a.event(first.attempt.id, 'declined'));
  assert.equal(
    (await a.payments.webhook(decline.raw, decline.signature)).attempt.canRetry,
    true,
  );
  const next = await a.payments.create(a.s.user, {
    ...a.input,
    method: 'apple-pay',
    idempotencyKey: randomUUID(),
  });
  assert.notEqual(next.attempt.id, first.attempt.id);
  a.operations.get(next.attempt.id)!.status = 'succeeded';
  assert.equal(
    (await a.payments.reconcile(a.s.user, next.attempt.id)).attempt.status,
    'succeeded',
  );
  await assert.rejects(
    a.payments.create(a.s.user, {
      ...a.input,
      method: 'google-pay',
      idempotencyKey: randomUUID(),
    }),
    { status: 409 },
  );
  const late = a.signed(a.event(first.attempt.id, 'succeeded'));
  await assert.rejects(a.payments.webhook(late.raw, late.signature), {
    status: 409,
  });
  assert.equal(a.state.submissions, 2);
  assert.equal((await a.payments.create(a.s.user, a.input)).replayed, true);
  assert.equal(a.state.submissions, 2);
});
test('F8 durable preparation prevents concurrent and duplicate submissions even through another checkout draft', async (t) => {
  const a = await paymentCase(t);
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      a.payments.create(a.s.user, { ...a.input, idempotencyKey: randomUUID() }),
    ),
  );
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(a.state.submissions, 1);
  const b = await paymentCase(t);
  const same = await Promise.all(
    [1, 2].map(() => b.payments.create(b.s.user, b.input)),
  );
  assert.equal(same[0].attempt.id, same[1].attempt.id);
  assert.equal(b.state.submissions, 1);
  await assert.rejects(
    b.payments.create(b.s.user, { ...b.input, method: 'google-pay' }),
    { status: 409 },
  );
  const another = await checkoutReview(b);
  const ready = await b.service.setPayment(b.s.user, another.id, {
    expectedVersion: another.version,
    paymentSelection: 'card-online',
    promoCode: null,
  });
  await assert.rejects(
    b.payments.create(b.s.user, {
      ...b.input,
      checkoutId: ready.id,
      expectedVersion: ready.version,
      idempotencyKey: randomUUID(),
    }),
    { status: 409 },
  );
  assert.equal(b.state.submissions, 1);
});
test('F8 timeout persists unknown outcome, never resubmits, and needs authenticated reconciliation', async (t) => {
  const a = await paymentCase(t);
  a.state.stallSubmit = true;
  const created = await a.payments.create(a.s.user, a.input);
  assert.equal(created.attempt.status, 'unknown');
  assert.equal(created.attempt.canRetry, false);
  assert.equal((await a.payments.create(a.s.user, a.input)).replayed, true);
  assert.equal(a.state.submissions, 1);
  await assert.rejects(
    a.payments.create(a.s.user, { ...a.input, idempotencyKey: randomUUID() }),
    { status: 409 },
  );
  a.state.failInspect = true;
  await assert.rejects(a.payments.reconcile(a.s.user, created.attempt.id), {
    status: 503,
  });
  assert.equal(
    (await a.payments.get(a.s.user, created.attempt.id)).status,
    'unknown',
  );
  a.state.failInspect = false;
  a.operations.get(created.attempt.id)!.status = 'succeeded';
  assert.equal(
    (await a.payments.reconcile(a.s.user, created.attempt.id)).attempt.status,
    'succeeded',
  );
  assert.equal(a.state.submissions, 1);
});
test('F8 cancellation remains pending until provider confirmation; only definitive cancellation permits retry', async (t) => {
  const a = await paymentCase(t),
    created = await a.payments.create(a.s.user, a.input);
  a.state.cancelConfirmed = false;
  assert.equal(
    (await a.payments.cancel(a.s.user, created.attempt.id)).attempt.status,
    'pending',
  );
  await assert.rejects(
    a.payments.create(a.s.user, { ...a.input, idempotencyKey: randomUUID() }),
    { status: 409 },
  );
  a.state.cancelConfirmed = true;
  assert.equal(
    (await a.payments.cancel(a.s.user, created.attempt.id)).attempt.status,
    'cancelled',
  );
  const retry = await a.payments.create(a.s.user, {
    ...a.input,
    method: 'google-pay',
    idempotencyKey: randomUUID(),
  });
  assert.equal(retry.attempt.method, 'google-pay');
  const sameId = a.event(retry.attempt.id, 'pending');
  const signed = a.signed(sameId);
  await a.payments.webhook(signed.raw, signed.signature);
  const reused = a.signed({ ...sameId, status: 'succeeded' });
  await assert.rejects(a.payments.webhook(reused.raw, reused.signature), {
    status: 409,
  });
});
test('F8 amount basis changes fail closed after a decline and no client can supply a payable total', async (t) => {
  const a = await paymentCase(t),
    created = await a.payments.create(a.s.user, a.input),
    decline = a.signed(a.event(created.attempt.id, 'declined'));
  await a.payments.webhook(decline.raw, decline.signature);
  a.state.amount++;
  await assert.rejects(
    a.payments.create(a.s.user, { ...a.input, idempotencyKey: randomUUID() }),
    { code: 'PAYMENT_STALE' },
  );
  a.state.amount--;
  await a.pool.query(
    'UPDATE bazar.variants SET price_minor=price_minor+1 WHERE id=$1',
    [a.s.variant],
  );
  await assert.rejects(
    a.payments.create(a.s.user, { ...a.input, idempotencyKey: randomUUID() }),
    { status: 409 },
  );
  assert.equal(a.state.submissions, 1);
});
test('F8 payment HTTP and typed client require session/CSRF and only signed raw webhook results; logs contain no event body', async (t) => {
  const a = await checkoutFixture(t),
    f = paymentFixture(),
    fixture = authFixture(),
    auth = createAuthService(a.pool, fixture.config, fixture.sms);
  const registration = await registered({ ...a, ...fixture, auth }),
    actor = registration.session.data.user.id;
  await a.pool.query('UPDATE bazar.carts SET user_id=$1 WHERE id=$2', [
    actor,
    a.s.cart,
  ]);
  const addressId = (
    await a.pool.query(
      "INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,'meest','synthetic-city','synthetic-location') RETURNING id",
      [actor],
    )
  ).rows[0].id;
  let draft = await a.service.start(actor, {
    cartId: a.s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  draft = await a.service.setDelivery(actor, draft.id, {
    expectedVersion: draft.version,
    addressId,
  });
  draft = await a.service.setPayment(actor, draft.id, {
    expectedVersion: draft.version,
    paymentSelection: 'card-online',
    promoCode: null,
  });
  const payments = createPaymentService(a.pool, f.adapter, f.config),
    logs: string[] = [];
  const app = createApiServer(
    readConfig({ NODE_ENV: 'test' }),
    createLogger('info', (line) => logs.push(line)),
    { auth, payments, isReady: async () => true },
  );
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.shutdown());
  const address = app.server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`,
    cookie = `__Host-bazar-session=${registration.session.token}; __Host-bazar-flow=${registration.session.flow}`;
  const transport: typeof fetch = async (path, init) => {
    const headers = new Headers(init?.headers);
    headers.set('origin', fixture.config.publicOrigin);
    headers.set('cookie', cookie);
    return fetch(base + path, { ...init, headers });
  };
  const client = createPaymentBusinessClient(
    () => registration.session.data.csrfToken,
    transport,
  );
  assert.equal((await client.capabilities()).productionAvailable, false);
  const created = await client.create({
    checkoutId: draft.id,
    expectedVersion: draft.version,
    method: 'card',
    idempotencyKey: randomUUID(),
  });
  assert.equal((await client.get(created.attempt.id)).status, 'pending');
  const unsigned = await fetch(base + '/api/v1/payments/webhooks/isolated', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'succeeded' }),
  });
  assert.equal(unsigned.status, 401);
  const signed = f.signed(f.event(created.attempt.id, 'succeeded'));
  const webhook = await fetch(base + '/api/v1/payments/webhooks/isolated', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-isolated-signature': signed.signature,
    },
    body: signed.raw,
  });
  assert.equal(webhook.status, 200);
  assert.equal((await webhook.json()).data.receivedForTest, true);
  assert.equal((await client.get(created.attempt.id)).orderPaid, false);
  assert.equal((await client.get(created.attempt.id)).status, 'succeeded');
  const noCsrf = createPaymentBusinessClient(() => 'a'.repeat(43), transport);
  await assert.rejects(noCsrf.cancel(created.attempt.id), { status: 403 });
  assert.equal(
    (
      await fetch(base + '/api/v1/payments/attempts/' + created.attempt.id, {
        headers: { origin: fixture.config.publicOrigin },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + '/api/v1/payments/refunds', {
        headers: { origin: fixture.config.publicOrigin, cookie },
      })
    ).status,
    404,
  );
  assert.ok(!logs.join('').includes('synthetic-merchant'));
  assert.ok(!logs.join('').includes(signed.signature));
  assert.ok(!logs.join('').includes(created.attempt.id));
});
test('F8 Ukrposhta official directory adapter, quotes and checkout/order snapshots use the third carrier without booking', async (t) => {
  const a = await checkoutFixture(t),
    f = shippingFixture();
  let price = 8750;
  let active = true;
  const urls: string[] = [];
  const city = { REGION_ID: '286', CITY_ID: '29713', CITY_UA: 'Тестове місто' };
  const ukrposhta = createUkrposhtaTestAdapter({
    scope: 'isolated-test',
    async directory(url) {
      urls.push(url);
      return {
        Entries: {
          Entry: url.includes('get_city_')
            ? [city]
            : [
                {
                  ID: '2700',
                  CITY_ID: city.CITY_ID,
                  REGION_ID: city.REGION_ID,
                  PO_LONG: 'Тестове відділення',
                  POSTINDEX: '01001',
                  LOCK_CODE: active ? '0' : '1',
                  IS_NODISTRICT: '0',
                },
              ],
        },
      };
    },
    async resolveCity(ref) {
      return ref === '286-29713' ? city : null;
    },
    async estimateForTest() {
      return {
        amountMinor: price,
        currency: 'UAH',
        revision: 'synthetic-up-tariff-1',
      };
    },
  });
  const shipping = createShippingService(
      a.pool,
      [...f.adapters, ukrposhta],
      f.config,
    ),
    checkout = createCheckoutBusinessService(a.pool, shipping);
  assert.equal((await shipping.carriers()).carriers.length, 3);
  assert.equal(
    (await shipping.cities({ carrier: 'ukrposhta', query: 'Тест' })).items[0]
      .ref,
    '286-29713',
  );
  assert.equal(
    (
      await shipping.points({
        carrier: 'ukrposhta',
        cityRef: '286-29713',
        kind: 'branch',
      })
    ).items[0].ref,
    '2700',
  );
  await assert.rejects(
    shipping.points({
      carrier: 'ukrposhta',
      cityRef: '286-29713',
      kind: 'parcel-locker',
    }),
    { code: 'DELIVERY_REJECTED' },
  );
  const addressId = (
    await a.pool.query(
      "INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,'ukrposhta','286-29713','2700') RETURNING id",
      [a.s.user],
    )
  ).rows[0].id;
  let draft = await checkout.start(a.s.user, {
    cartId: a.s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  await shipping.select(a.s.user, draft.id, {
    expectedVersion: draft.version,
    addressId,
    kind: 'branch',
  });
  const q = await shipping.quote(a.s.user, draft.id, {
    expectedVersion: 2,
    idempotencyKey: randomUUID(),
  });
  assert.equal(q.quote.cost.amountMinor, 8750);
  price++;
  await assert.rejects(
    shipping.check(a.s.user, draft.id, {
      expectedVersion: 2,
      quoteId: q.quote.id,
    }),
    { code: 'DELIVERY_STALE' },
  );
  price--;
  active = false;
  await assert.rejects(
    shipping.check(a.s.user, draft.id, {
      expectedVersion: 2,
      quoteId: q.quote.id,
    }),
    { code: 'DELIVERY_REJECTED' },
  );
  active = true;
  draft = await checkout.setPayment(a.s.user, draft.id, {
    expectedVersion: 2,
    paymentSelection: 'on-receipt',
    promoCode: null,
  });
  const order = await checkout.recordOrderForTest(a.s.user, draft.id, {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
  });
  assert.equal(order.order.delivery.carrier, 'ukrposhta');
  assert.equal(order.order.delivery.cost, null);
  assert.ok(
    urls.every((url) =>
      url.startsWith('https://www.ukrposhta.ua/address-classifier-ws/'),
    ),
  );
  assert.ok(!urls.join('').includes('token='));
  assert.equal(
    (await a.pool.query('SELECT count(*)::int AS n FROM bazar.shipments'))
      .rows[0].n,
    0,
  );
});
test('F8 preserves durable exclusion across database failure after remote submission and reconciles without resending', async (t) => {
  const a = await paymentCase(t);
  await a.pool.query(
    "CREATE FUNCTION bazar.test_payment_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced'; END $$; CREATE TRIGGER test_payment_failure BEFORE UPDATE ON bazar.payment_operations FOR EACH ROW EXECUTE FUNCTION bazar.test_payment_failure()",
  );
  await assert.rejects(a.payments.create(a.s.user, a.input));
  assert.equal(a.state.submissions, 1);
  const op = (
    await a.pool.query('SELECT id,status FROM bazar.payment_operations')
  ).rows[0];
  assert.equal(op.status, 'submitting');
  await a.pool.query(
    'DROP TRIGGER test_payment_failure ON bazar.payment_operations',
  );
  assert.equal((await a.payments.create(a.s.user, a.input)).replayed, true);
  assert.equal(a.state.submissions, 1);
  assert.equal(
    (await a.payments.reconcile(a.s.user, op.id)).attempt.status,
    'pending',
  );
  assert.equal(a.state.submissions, 1);
  await assert.rejects(
    a.pool.query(
      "UPDATE bazar.payment_operations SET status='succeeded',last_source='submission',version=version+1 WHERE id=$1",
      [op.id],
    ),
    { code: '23514' },
  );
});
test('F8 early signed webhook cannot be overwritten by a later submission acknowledgement', async (t) => {
  const a = await paymentCase(t),
    submit = a.adapter.submit;
  a.adapter.submit = async (input, signal) => {
    const result = await submit(input, signal);
    const signed = a.signed(a.event(input.operationId, 'succeeded'));
    await a.payments.webhook(signed.raw, signed.signature);
    return result;
  };
  const created = await a.payments.create(a.s.user, a.input);
  assert.equal(created.attempt.status, 'succeeded');
  assert.equal(a.state.submissions, 1);
  assert.deepEqual(
    (
      await a.pool.query(
        'SELECT to_status FROM bazar.payment_transition_audit ORDER BY id',
      )
    ).rows.map((r) => r.to_status),
    ['submitting', 'succeeded'],
  );
});
test('F8 payment preparation requires an available current F7 quote and a configured shipping guard', async (t) => {
  const a = await shippingCase(t),
    f = paymentFixture();
  const ready = await a.checkout.setPayment(a.s.user, a.draft.id, {
    expectedVersion: 2,
    paymentSelection: 'card-online',
    promoCode: null,
  });
  const input = {
    checkoutId: ready.id,
    expectedVersion: ready.version,
    method: 'card',
    idempotencyKey: randomUUID(),
  };
  const blocked = createPaymentService(a.pool, f.adapter, f.config);
  await assert.rejects(blocked.create(a.s.user, input), { status: 409 });
  const payments = createPaymentService(
    a.pool,
    f.adapter,
    f.config,
    a.shipping,
  );
  await assert.rejects(payments.create(a.s.user, input), {
    code: 'DELIVERY_STALE',
  });
  const quote = await a.shipping.quote(a.s.user, ready.id, {
    expectedVersion: ready.version,
    idempotencyKey: randomUUID(),
  });
  assert.ok(quote.quote.id);
  a.state.amount++;
  await assert.rejects(payments.create(a.s.user, input), {
    code: 'DELIVERY_STALE',
  });
  a.state.amount--;
  assert.equal(
    (await payments.create(a.s.user, input)).attempt.status,
    'pending',
  );
  assert.equal(f.state.submissions, 1);
});
test('F8 upgrades the full F7 database without changing previously saved shipping quotes', async (t) => {
  const db = await database(t),
    dir = mkdtempSync(`${tmpdir()}/bazar-f8-upgrade-`);
  t.after(() => rmSync(dir, { recursive: true }));
  cpSync(migrationDirectory, dir, { recursive: true });
  rmSync(`${dir}/0008_ukrposhta.sql`);
  rmSync(`${dir}/0009_payment_security.sql`);
  rmSync(`${dir}/0010_current_cart_checkout.sql`);
  rmSync(`${dir}/0011_customer_account.sql`);
  rmSync(`${dir}/0012_communication_foundation.sql`);
  rmSync(`${dir}/0014_discounted_test_checkout.sql`);
  rmSync(`${dir}/0013_order_lifecycle.sql`);
  assert.equal(await migrate(db.config, dir), 7);
  const s = await seed(db.pool);
  await db.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,2)',
    [s.cart, s.variant],
  );
  const f = shippingFixture(),
    shipping = createShippingService(db.pool, f.adapters, f.config),
    checkout = createCheckoutBusinessService(db.pool, shipping);
  const draft = await checkout.start(s.user, {
    cartId: s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  await shipping.select(s.user, draft.id, {
    expectedVersion: 1,
    addressId: s.address,
    kind: 'branch',
  });
  const saved = await shipping.quote(s.user, draft.id, {
    expectedVersion: 2,
    idempotencyKey: randomUUID(),
  });
  assert.equal(await migrate(db.config), 7);
  assert.equal(await migrate(db.config), 0);
  assert.equal(
    (
      await shipping.check(s.user, draft.id, {
        expectedVersion: 2,
        quoteId: saved.quote.id,
      })
    ).current,
    true,
  );
  assert.equal(
    (
      await db.pool.query(
        'SELECT amount_minor::text FROM bazar.shipping_quotes WHERE id=$1',
        [saved.quote.id],
      )
    ).rows[0].amount_minor,
    '7350',
  );
});
test('F8 changing cart version cannot bypass an unresolved payment scope',async(t)=>{
 const a=await paymentCase(t);a.state.failSubmit=true;const first=await a.payments.create(a.s.user,a.input);assert.equal(first.attempt.status,'unknown');
 const cart=await createCartRepository(a.pool).get(a.s.user,a.s.cart);
 await createCartRepository(a.pool).mutate(a.s.user,a.s.cart,{operation:'set',variantId:a.s.variant,quantity:1,expectedVersion:cart.version});
 let draft=await a.service.start(a.s.user,{cartId:a.s.cart,expectedCartVersion:cart.version+1,idempotencyKey:randomUUID()});draft=await a.service.setDelivery(a.s.user,draft.id,{expectedVersion:draft.version,addressId:a.s.address});draft=await a.service.setPayment(a.s.user,draft.id,{expectedVersion:draft.version,paymentSelection:'card-online',promoCode:null});
 await assert.rejects(a.payments.create(a.s.user,{checkoutId:draft.id,expectedVersion:draft.version,method:'card',idempotencyKey:randomUUID()}),{status:409});assert.equal(a.state.submissions,1);
});
test('F8 a different merchant configuration cannot read, reconcile or authenticate events for another merchant operation',async(t)=>{
 const a=await paymentCase(t),created=await a.payments.create(a.s.user,a.input),other=paymentFixture();
 other.adapter.accountRef='different-merchant';
 const payments=createPaymentService(a.pool,other.adapter,other.config);
 await assert.rejects(payments.get(a.s.user,created.attempt.id),{status:404});await assert.rejects(payments.reconcile(a.s.user,created.attempt.id),{status:404});
 const bad=other.signed({...a.event(created.attempt.id,'succeeded'),accountRef:other.adapter.accountRef});await assert.rejects(payments.webhook(bad.raw,bad.signature),{status:404});
 await assert.rejects(payments.create(a.s.user,{...a.input,idempotencyKey:randomUUID()}),{code:'PAYMENT_STALE'});
 assert.equal((await a.payments.get(a.s.user,created.attempt.id)).status,'pending');assert.equal(other.state.submissions,0);
 await assert.rejects(a.pool.query("UPDATE bazar.payment_operations SET account_ref='another',version=version+1 WHERE id=$1",[created.attempt.id]),{code:'23514'});
 const good=a.signed(a.event(created.attempt.id,'succeeded'));assert.equal((await a.payments.webhook(good.raw,good.signature)).attempt.status,'succeeded');
});

// F9: approved active-cart policy and the complete isolated HTTP/client composition.
async function currentCartCase(t: TestContext) {
  const db = await database(t);
  await migrate(db.config);
  const s = await seed(db.pool);
  return { ...db, s, carts: createCurrentCartService(db.pool) };
}
test('F9 concurrent ensure creates exactly one active cart, never selects or merges existing owned legacy carts', async (t) => {
  const a = await currentCartCase(t);
  await a.pool.query(
    'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,2)',
    [a.s.cart, a.s.variant],
  );
  await assert.rejects(a.carts.get(a.s.user), { status: 404 });
  const views = await Promise.all(
    Array.from({ length: 5 }, () => a.carts.ensure(a.s.user, {})),
  );
  assert.equal(new Set(views.map((v) => v.cart.id)).size, 1);
  assert.notEqual(views[0].cart.id, a.s.cart);
  assert.equal(views[0].cart.lines.length, 0);
  assert.equal(views[0].canCheckout, false);
  assert.equal(views[0].guestMerge, 'none');
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int AS n FROM bazar.carts WHERE user_id=$1 AND lifecycle='active'",
        [a.s.user],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT quantity FROM bazar.cart_lines WHERE cart_id=$1',
        [a.s.cart],
      )
    ).rows[0].quantity,
    2,
  );
  await assert.rejects(
    a.pool.query(
      "INSERT INTO bazar.carts(user_id,lifecycle) VALUES ($1,'active')",
      [a.s.user],
    ),
    { code: '23505' },
  );
  const other = await a.carts.ensure(a.s.other, {});
  assert.notEqual(other.cart.id, views[0].cart.id);
});
test('F9 cart mutations replay historical receipts once; quantities, prices, stock and versions are server-authoritative', async (t) => {
  const a = await currentCartCase(t),
    initial = await a.carts.ensure(a.s.user, {}),
    input = {
      variantId: a.s.variant,
      quantity: 2,
      expectedVersion: initial.cart.version,
      idempotencyKey: randomUUID(),
    };
  const added = await Promise.all([
    a.carts.mutate(a.s.user, 'add', input),
    a.carts.mutate(a.s.user, 'add', input),
  ]);
  assert.equal(added.filter((r) => r.replayed).length, 1);
  assert.equal(added[0].view.cart.lines[0].quantity, 2);
  await assert.rejects(
    a.carts.mutate(a.s.user, 'add', { ...input, quantity: 3 }),
    { status: 409 },
  );
  await a.pool.query(
    'UPDATE bazar.variants SET price_minor=20000,stock=1 WHERE id=$1',
    [a.s.variant],
  );
  const fresh = await a.carts.get(a.s.user);
  assert.equal(fresh.cart.subtotal.amountMinor, 40000);
  assert.equal(fresh.canCheckout, false);
  assert.equal(fresh.inventory[0].stock, 1);
  const replay = await a.carts.mutate(a.s.user, 'add', input);
  assert.equal(replay.view.freshness, 'historical-replay');
  assert.equal(replay.view.cart.subtotal.amountMinor, 24690);
  assert.equal(replay.view.cart.version, 2);
  const removed = await a.carts.mutate(
    a.s.user,
    'remove',
    { expectedVersion: 2, idempotencyKey: randomUUID() },
    a.s.variant,
  );
  assert.equal(removed.view.cart.lines.length, 0);
  for (const extra of [
    { price: 1 },
    { userId: a.s.other },
    { cartId: a.s.cart },
    { guestLines: [] },
  ])
    await assert.rejects(
      a.carts.mutate(a.s.user, 'add', { ...input, ...extra }),
      { status: 400 },
    );
  for (const quantity of [0, -1, 1.5, 2147483648])
    await assert.rejects(
      a.carts.mutate(a.s.user, 'add', { ...input, quantity }),
      { status: 400 },
    );
});
test('F9 concurrent distinct requests cannot consume the same cart version, and failed receipt persistence rolls back the mutation', async (t) => {
  const a = await currentCartCase(t);
  await a.carts.ensure(a.s.user, {});
  const input = {
    variantId: a.s.variant,
    quantity: 1,
    expectedVersion: 1,
    idempotencyKey: randomUUID(),
  };
  const results = await Promise.allSettled([
    a.carts.mutate(a.s.user, 'add', input),
    a.carts.mutate(a.s.user, 'add', { ...input, idempotencyKey: randomUUID() }),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal((await a.carts.get(a.s.user)).cart.version, 2);
  await a.pool.query(
    "CREATE FUNCTION bazar.test_cart_receipt_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced'; END $$; CREATE TRIGGER test_cart_receipt_failure BEFORE INSERT ON bazar.cart_mutation_receipts FOR EACH ROW EXECUTE FUNCTION bazar.test_cart_receipt_failure()",
  );
  const change = {
    quantity: 2,
    expectedVersion: 2,
    idempotencyKey: randomUUID(),
  };
  await assert.rejects(a.carts.mutate(a.s.user, 'set', change, a.s.variant));
  assert.equal((await a.carts.get(a.s.user)).cart.version, 2);
  assert.equal((await a.carts.get(a.s.user)).cart.lines[0].quantity, 1);
  await a.pool.query(
    'DROP TRIGGER test_cart_receipt_failure ON bazar.cart_mutation_receipts',
  );
  assert.equal(
    (await a.carts.mutate(a.s.user, 'set', change, a.s.variant)).view.cart
      .lines[0].quantity,
    2,
  );
  await assert.rejects(
    a.pool.query('DELETE FROM bazar.cart_mutation_receipts WHERE user_id=$1', [
      a.s.user,
    ]),
    { code: '23514' },
  );
});
async function integratedCase(t: TestContext, discounted = false) {
  const db = await database(t);
  await migrate(db.config);
  const s = await seed(db.pool),
    identity = authFixture(),
    deliveryFixture = shippingFixture(),
    payment = paymentFixture();
  const upCity = {
    REGION_ID: '286',
    CITY_ID: '29713',
    CITY_UA: 'Тестове місто',
  };
  const up = createUkrposhtaTestAdapter({
    scope: 'isolated-test',
    async directory(url) {
      return {
        Entries: {
          Entry: url.includes('get_city_')
            ? [upCity]
            : [
                {
                  ID: '2700',
                  CITY_ID: '29713',
                  REGION_ID: '286',
                  PO_LONG: 'Тестове відділення',
                  POSTINDEX: '01001',
                  LOCK_CODE: '0',
                  IS_NODISTRICT: '0',
                },
              ],
        },
      };
    },
    async resolveCity(ref) {
      return ref === '286-29713' ? upCity : null;
    },
    async estimateForTest() {
      return {
        amountMinor: deliveryFixture.state.amount,
        currency: 'UAH',
        revision: 'synthetic-up-tariff-1',
      };
    },
  });
  const services = createCheckoutIntegrationServices(db.pool, {
    auth: identity.config,
    sms: identity.sms,
    shipping: [...deliveryFixture.adapters, up],
    shippingConfig: deliveryFixture.config,
    payment: payment.adapter,
    paymentConfig: discounted ? {...payment.config,discountedCheckoutForTest:true,plan:async ({pricing,shippingCostMinor})=>discountedTestPlan(pricing!,shippingCostMinor!)} : payment.config,
    ...(discounted ? {discountedCheckoutForTest:true as const} : {}),
    isReady: async () => {
      await db.pool.query('SELECT 1');
      return true;
    },
  });
  const logs: string[] = [];
  const app = createApiServer(
    readConfig({
      NODE_ENV: 'test',
      CORS_ORIGINS: identity.config.publicOrigin,
    }),
    createLogger('info', (line) => logs.push(line)),
    services,
  );
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.shutdown());
  const address = app.server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  let jar = '';
  const transport: typeof fetch = async (path, init) => {
    const raw = String(path),
      url = raw.startsWith('http')
        ? new URL(raw).pathname + new URL(raw).search
        : raw;
    const headers = new Headers(init?.headers);
    headers.set('origin', identity.config.publicOrigin);
    if (init?.credentials === 'same-origin') headers.set('cookie', jar);
    const response = await fetch(base + url, { ...init, headers });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) jar = cookies.map((c) => c.split(';')[0]).join('; ');
    return response;
  };
  const client = createServerCheckoutIntegrationClients(
    { baseUrl: base, timeoutMs: 3000 },
    transport,
  );
  return {
    ...db,
    s,
    identity,
    deliveryFixture,
    payment,
    services,
    client,
    base,
    logs,
    transport,
    getJar: () => jar,
  };
}
async function integrationLogin(
  a: Awaited<ReturnType<typeof integratedCase>>,
  phone = '+380671234567',
) {
  await a.client.auth.bootstrap();
  const challenge = await a.client.auth.start({ phone, intent: 'register' });
  const session = await a.client.auth.verify({
    challengeId: challenge.challengeId,
    code: a.identity.sent.get(challenge.challengeId)!.code,
    profile: { firstName: 'Синтетичний', lastName: 'Приклад', consent: true },
  });
  return session;
}
for (const carrier of ['nova-poshta', 'meest', 'ukrposhta'] as const)
  test(`F9 complete typed HTTP flow: catalog → isolated auth → active cart → ${carrier} → promo policy → test payment → confirmation → history`, async (t) => {
    const a = await integratedCase(t);
    // Browsing works anonymously. A local guest item is deliberately never accepted by ensureCurrent.
    const product = await a.client.catalog.get('synthetic');
    assert.equal(product.variants[0].id, a.s.variant);
    assert.equal((await a.client.catalog.categories()).length, 1);
    await assert.rejects(a.client.cart.get(), { status: 401 });
    const session = await integrationLogin(a);
    const current = await a.client.cart.ensureCurrent();
    assert.equal(current.cart.lines.length, 0);
    const added = await a.client.cart.add({
      variantId: product.variants[0].id,
      quantity: 2,
      expectedVersion: current.cart.version,
      idempotencyKey: randomUUID(),
    });
    assert.equal(added.view.cart.subtotal.amountMinor, 24690);
    const cityRef = carrier === 'ukrposhta' ? '286-29713' : 'synthetic-city',
      pointRef = carrier === 'ukrposhta' ? '2700' : 'synthetic-location';
    const addressId = (
      await a.pool.query(
        'INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,$2,$3,$4) RETURNING id',
        [session.user.id, carrier, cityRef, pointRef],
      )
    ).rows[0].id;
    const directory = await a.client.shipping.cities({
      carrier,
      query: 'Тест',
    });
    assert.equal(directory.items[0].ref, cityRef);
    await a.client.shipping.points({ carrier, cityRef, kind: 'branch' });
    assert.equal(
      (await a.client.shipping.carriers()).bazarPickup.available,
      false,
    );
    let draft = await a.client.startCurrentCheckout(randomUUID());
    assert.equal(draft.cartId, current.cart.id);
    const selected = await a.client.shipping.select(draft.id, {
      expectedVersion: draft.version,
      addressId,
      kind: 'branch',
    });
    const shipping = await a.client.shipping.quote(draft.id, {
      expectedVersion: selected.checkoutVersion,
      idempotencyKey: randomUUID(),
    });
    assert.equal(
      (
        await a.client.shipping.check(draft.id, {
          expectedVersion: selected.checkoutVersion,
          quoteId: shipping.quote.id,
        })
      ).current,
      true,
    );
    const promoId = (
      await a.pool.query(
        "INSERT INTO bazar.promotions(code,kind,fixed_minor,currency,min_subtotal_minor,starts_at,ends_at,enabled,max_uses,per_user_limit) VALUES ('F9-TEST','fixed',1000,'UAH',10000,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour',true,10,10) RETURNING id",
      )
    ).rows[0].id;
    await a.pool.query(
      'INSERT INTO bazar.promotion_products(promotion_id,product_id) VALUES ($1,$2)',
      [promoId, a.s.product],
    );
    const quote = await a.client.promotions.evaluate({
      cartId: current.cart.id,
      expectedCartVersion: added.view.cart.version,
      code: 'F9-TEST',
    });
    assert.equal(quote.discount.amountMinor, 1000);
    draft = await a.client.checkout.setPayment(draft.id, {
      expectedVersion: selected.checkoutVersion,
      paymentSelection: 'card-online',
      promoCode: 'F9-TEST',
    });
    assert.equal(draft.pricing!.merchandiseTotal.amountMinor, 23690);
    await assert.rejects(
      a.client.payments.create({
        checkoutId: draft.id,
        expectedVersion: draft.version,
        method: 'card',
        idempotencyKey: randomUUID(),
      }),
      { status: 409 },
    );
    // Explicitly clear the preview: no production redemption/funding/allocation policy is fabricated.
    draft = await a.client.checkout.setPayment(draft.id, {
      expectedVersion: draft.version,
      paymentSelection: 'card-online',
      promoCode: null,
    });
    const payment = await a.client.payments.create({
      checkoutId: draft.id,
      expectedVersion: draft.version,
      method: 'card',
      idempotencyKey: randomUUID(),
    });
    const input = {
      expectedVersion: draft.version,
      expectedFingerprint: draft.pricing!.fingerprint,
      paymentAttemptId: payment.attempt.id,
      idempotencyKey: randomUUID(),
    };
    await assert.rejects(
      a.client.checkout.confirmIntegratedForTest(draft.id, input),
      { status: 409 },
    );
    const signed = a.payment.signed(
      a.payment.event(payment.attempt.id, 'succeeded'),
    );
    const response = await fetch(
      a.base + '/api/v1/payments/webhooks/isolated',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isolated-signature': signed.signature,
        },
        body: signed.raw,
      },
    );
    assert.equal(response.status, 200);
    const result = await a.client.checkout.confirmIntegratedForTest(
      draft.id,
      input,
    );
    assert.equal(result.confirmationScope, 'integration-test-only');
    assert.equal(result.orderPaid, false);
    assert.equal(result.order.delivery.carrier, carrier);
    assert.equal(result.order.paymentStatus, 'not-initiated');
    assert.equal(result.order.payableTotal, null);
    assert.equal(
      (await a.client.checkout.confirmIntegratedForTest(draft.id, input))
        .replayed,
      true,
    );
    assert.equal(
      (await a.client.checkout.listOrders()).items[0].id,
      result.order.id,
    );
    assert.equal(
      (await a.client.checkout.getOrder(result.order.id)).id,
      result.order.id,
    );
    assert.equal(
      (
        await a.pool.query(
          'SELECT count(*)::int AS n FROM bazar.checkout_completion_links',
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await a.pool.query(
          'SELECT count(*)::int AS n FROM bazar.promotion_usage_claims',
        )
      ).rows[0].n,
      0,
    );
    assert.equal(a.payment.state.submissions, 1);
    assert.equal(
      (
        await a.pool.query(
          'SELECT (SELECT count(*) FROM bazar.shipments)+(SELECT count(*) FROM bazar.payment_attempts) AS n',
        )
      ).rows[0].n,
      '0',
    );
    assert.ok(!a.logs.join('').includes('F9-TEST'));
    assert.ok(!a.logs.join('').includes(signed.signature));
    await a.client.auth.logout(true);
    await assert.rejects(a.client.cart.get(), { status: 401 });
  });
async function readyIntegrated(t: TestContext, withShipping = true, quantity=1) {
  const a = await integratedCase(t),
    session = await integrationLogin(a),
    view = await a.client.cart.ensureCurrent();
  await a.client.cart.add({
    variantId: a.s.variant,
    quantity,
    expectedVersion: view.cart.version,
    idempotencyKey: randomUUID(),
  });
  const addressId = (
    await a.pool.query(
      "INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES ($1,'meest','synthetic-city','synthetic-location') RETURNING id",
      [session.user.id],
    )
  ).rows[0].id;
  let draft = await a.client.startCurrentCheckout(randomUUID());
  let shipping = null;
  if (withShipping) {
    await a.client.shipping.select(draft.id, {
      expectedVersion: draft.version,
      addressId,
      kind: 'branch',
    });
    shipping = await a.client.shipping.quote(draft.id, {
      expectedVersion: 2,
      idempotencyKey: randomUUID(),
    });
  } else {
    await a.client.checkout.setDelivery(draft.id, {
      expectedVersion: draft.version,
      addressId,
    });
  }
  draft = await a.client.checkout.setPayment(draft.id, {
    expectedVersion: 2,
    paymentSelection: 'card-online',
    promoCode: null,
  });
  const payment = await a.client.payments.create({
    checkoutId: draft.id,
    expectedVersion: draft.version,
    method: 'card',
    idempotencyKey: randomUUID(),
  });
  const input = {
    expectedVersion: draft.version,
    expectedFingerprint: draft.pricing!.fingerprint,
    idempotencyKey: randomUUID(),
    paymentAttemptId: payment.attempt.id,
  };
  const settle = async () => {
    const signed = a.payment.signed(
      a.payment.event(payment.attempt.id, 'succeeded'),
    );
    await a.services.payments.webhook(signed.raw, signed.signature);
  };
  return {
    ...a,
    session,
    view,
    addressId,
    draft,
    shipping,
    paymentAttempt: payment.attempt,
    input,
    settle,
  };
}
test('F9 private cart HTTP enforces session, CSRF, same origin, no caller IDs/prices and bounded verbs', async (t) => {
  const a = await readyIntegrated(t),
    raw = (
      path: string,
      method: string,
      body: unknown,
      headers: Record<string, string> = {},
    ) =>
      fetch(a.base + path, {
        method,
        headers: {
          origin: a.identity.config.publicOrigin,
          cookie: a.getJar(),
          'content-type': 'application/json',
          'x-csrf-token': a.session.csrfToken,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
  const add = {
    variantId: a.s.variant,
    quantity: 1,
    expectedVersion: 2,
    idempotencyKey: randomUUID(),
  };
  assert.equal(
    (await raw('/api/v1/cart/lines', 'POST', add, { 'x-csrf-token': '' }))
      .status,
    403,
  );
  assert.equal(
    (
      await raw('/api/v1/cart/lines', 'POST', add, {
        origin: 'https://evil.test',
      })
    ).status,
    403,
  );
  assert.equal(
    (await raw('/api/v1/cart', 'POST', {}, { cookie: '' })).status,
    403,
  );
  for (const extra of [
    { cartId: a.s.cart },
    { userId: a.s.other },
    { price: 1 },
    { subtotal: 1 },
    { guestLines: [{ quantity: 99 }] },
  ])
    assert.equal(
      (await raw('/api/v1/cart/lines', 'POST', { ...add, ...extra })).status,
      400,
    );
  assert.equal(
    (await raw('/api/v1/cart?userId=' + a.s.other, 'GET', undefined)).status,
    400,
  );
  assert.equal(
    (await raw('/api/v1/cart/' + a.s.cart, 'GET', undefined)).status,
    404,
  );
  assert.equal((await raw('/api/v1/cart', 'PUT', {})).status, 405);
  const removed = await a.client.cart.remove(a.s.variant, {
    expectedVersion: 2,
    idempotencyKey: randomUUID(),
  });
  assert.equal(removed.view.canCheckout, false);
  assert.equal((await a.client.cart.get()).cart.lines.length, 0);
});
test('F9 confirmation rejects foreign checkout/payment/merchant proofs and any forged status or amount', async (t) => {
  const a = await readyIntegrated(t);
  await a.settle();
  const other = await registered(
    { ...a, ...a.identity, auth: a.services.auth },
    '+380501234567',
  );
  await assert.rejects(
    a.services.checkout.confirmIntegratedForTest(
      other.session.data.user.id,
      a.draft.id,
      a.input,
    ),
    { status: 404 },
  );
  await assert.rejects(
    a.client.checkout.confirmIntegratedForTest(a.draft.id, {
      ...a.input,
      paymentAttemptId: randomUUID(),
    }),
    { status: 404 },
  );
  const foreign = createPaymentService(
    a.pool,
    { ...a.payment.adapter, accountRef: 'another-merchant' },
    a.payment.config,
    a.services.shipping,
  );
  const checkout = createCheckoutBusinessService(
    a.pool,
    a.services.shipping,
    foreign,
  );
  await assert.rejects(
    checkout.confirmIntegratedForTest(a.session.user.id, a.draft.id, a.input),
    { status: 404 },
  );
  const noGuard = createCheckoutBusinessService(a.pool, a.services.shipping);
  await assert.rejects(
    noGuard.confirmIntegratedForTest(a.session.user.id, a.draft.id, a.input),
    { status: 409 },
  );
  for (const extra of [
    { paid: true },
    { status: 'succeeded' },
    { amountMinor: 1 },
    { userId: a.s.other },
  ]) {
    const r = await a.transport(
      `/api/v1/checkouts/${a.draft.id}/confirmation`,
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': a.session.csrfToken,
        },
        body: JSON.stringify({ ...a.input, ...extra }),
      },
    );
    assert.equal(r.status, 400);
  }
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.checkout_completion_links',
      )
    ).rows[0].n,
    0,
  );
});
test('F9 confirmation checks current tariff and financial binding after verified test payment', async (t) => {
  const a = await readyIntegrated(t);
  await a.settle();
  a.deliveryFixture.state.amount++;
  await assert.rejects(
    a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input),
    { status: 409 },
  );
  a.deliveryFixture.state.amount--;
  a.payment.state.revision = 'changed-test-basis';
  await assert.rejects(
    a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input),
    { status: 409 },
  );
  a.payment.state.revision = 'test-plan-1';
  await a.pool.query(
    'UPDATE bazar.variants SET price_minor=price_minor+1 WHERE id=$1',
    [a.s.variant],
  );
  await assert.rejects(
    a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input),
    { status: 409 },
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.checkout_completion_links',
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await a.client.payments.get(a.paymentAttempt.id)).status,
    'succeeded',
  );
});
test('F9 concurrent integrated confirmations are atomic/idempotent; new keys and changed payment proofs cannot duplicate history', async (t) => {
  const a = await readyIntegrated(t);
  await a.settle();
  const results = await Promise.all([
    a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input),
    a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input),
  ]);
  assert.equal(results[0].order.id, results[1].order.id);
  assert.equal(results.filter((r) => r.replayed).length, 1);
  await assert.rejects(
    a.client.checkout.confirmIntegratedForTest(a.draft.id, {
      ...a.input,
      idempotencyKey: randomUUID(),
    }),
    { status: 409 },
  );
  await assert.rejects(
    a.client.checkout.confirmIntegratedForTest(a.draft.id, {
      ...a.input,
      paymentAttemptId: randomUUID(),
    }),
    { status: 409 },
  );
  assert.equal((await a.client.checkout.listOrders()).items.length, 1);
  await assert.rejects(
    a.pool.query(
      'DELETE FROM bazar.checkout_completion_links WHERE order_id=$1',
      [results[0].order.id],
    ),
    { code: '23514' },
  );
});
test('F9 failure to link verified test payment rolls back the whole order and key but preserves the provider observation', async (t) => {
  const a = await readyIntegrated(t);
  await a.settle();
  await a.pool.query(
    "CREATE FUNCTION bazar.test_completion_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced'; END $$; CREATE TRIGGER test_completion_failure BEFORE INSERT ON bazar.checkout_completion_links FOR EACH ROW EXECUTE FUNCTION bazar.test_completion_failure()",
  );
  await assert.rejects(
    a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input),
    { status: 500 },
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.orders WHERE foundation_mode IS NOT NULL',
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.checkout_order_requests',
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await a.client.payments.get(a.paymentAttempt.id)).status,
    'succeeded',
  );
  await a.pool.query(
    'DROP TRIGGER test_completion_failure ON bazar.checkout_completion_links',
  );
  assert.equal(
    (await a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input))
      .replayed,
    false,
  );
  assert.equal(a.payment.state.submissions, 1);
});
test('F9 upgrades F8 without silently selecting legacy carts or changing payment history', async (t) => {
  const db = await database(t),
    dir = mkdtempSync(`${tmpdir()}/bazar-f9-upgrade-`);
  t.after(() => rmSync(dir, { recursive: true }));
  cpSync(migrationDirectory, dir, { recursive: true });
  rmSync(`${dir}/0010_current_cart_checkout.sql`);
  rmSync(`${dir}/0011_customer_account.sql`);
  rmSync(`${dir}/0012_communication_foundation.sql`);
  rmSync(`${dir}/0014_discounted_test_checkout.sql`);
  rmSync(`${dir}/0013_order_lifecycle.sql`);
  assert.equal(await migrate(db.config, dir), 9);
  const s = await seed(db.pool);
  assert.equal(await migrate(db.config), 5);
  assert.equal(await migrate(db.config), 0);
  assert.equal(
    (
      await db.pool.query('SELECT lifecycle FROM bazar.carts WHERE id=$1', [
        s.cart,
      ])
    ).rows[0].lifecycle,
    'unselected',
  );
  const service = createCurrentCartService(db.pool),
    current = await service.ensure(s.user, {});
  assert.notEqual(current.cart.id, s.cart);
  assert.equal(
    (
      await db.pool.query(
        'SELECT total_minor::text FROM bazar.orders WHERE id=$1',
        [s.order],
      )
    ).rows[0].total_minor,
    '24690',
  );
});

test('F9 integrated confirmation cannot skip a shipping selection and current quote through the legacy F6 address seam', async (t) => {
  const a = await readyIntegrated(t, false);
  await a.settle();
  await assert.rejects(
    a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input),
    { status: 409 },
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int AS n FROM bazar.checkout_completion_links',
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await a.client.payments.get(a.paymentAttempt.id)).status,
    'succeeded',
  );
});

// F12: owned customer foundation. All policies and identities below are isolated fixtures.
async function customerCase(t: TestContext) {
  const db = await database(t);
  await migrate(db.config);
  const s = await seed(db.pool);
  const confirmed = new Set<string>();
  let modifications = false;
  const policy = {
    scope: 'isolated-test' as const,
    confirmPurchase: ({ orderLineId }: { orderLineId: string }) => ({
      confirmed: confirmed.has(orderLineId),
      proof: 'synthetic-proof-not-a-real-purchase',
    }),
    canChange: () => modifications,
  };
  return {
    ...db,
    s,
    confirmed,
    policy,
    service: createCustomerService(db.pool, policy),
    allowChanges: () => {
      modifications = true;
    },
  };
}
test('F12 wishlist operations are owned/idempotent, retain unavailable products and resolve current database prices', async (t) => {
  const a = await customerCase(t);
  await Promise.all([
    a.service.wishlist(a.s.user, a.s.product, true, {}),
    a.service.wishlist(a.s.user, a.s.product, true, {}),
  ]);
  let view = await a.service.get(a.s.user, 'wishlist');
  assert.equal(view.resource, 'wishlist');
  if (view.resource !== 'wishlist') throw new Error();
  assert.equal(view.items.length, 1);
  assert.equal(view.items[0].price?.amountMinor, 12345);
  assert.equal(
    (await a.service.get(a.s.other, 'wishlist')).resource,
    'wishlist',
  );
  await a.pool.query(
    'UPDATE bazar.variants SET stock=0,price_minor=20000 WHERE id=$1',
    [a.s.variant],
  );
  view = await a.service.get(a.s.user, 'wishlist');
  if (view.resource !== 'wishlist') throw new Error();
  assert.equal(view.items[0].available, false);
  assert.equal(view.items[0].price?.amountMinor, 20000);
  await a.service.wishlist(a.s.other, a.s.product, false, {});
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int n FROM bazar.wishlist_items WHERE user_id=$1',
        [a.s.user],
      )
    ).rows[0].n,
    1,
  );
  for (const extra of [{ userId: a.s.other }, { price: 1 }, { guestItems: [] }])
    await assert.rejects(
      a.service.wishlist(a.s.user, a.s.product, true, extra),
      { status: 400 },
    );
  await assert.rejects(a.service.wishlist(a.s.user, randomUUID(), true, {}), {
    status: 404,
  });
  await a.service.wishlist(a.s.user, a.s.product, false, {});
  await a.service.wishlist(a.s.user, a.s.product, false, {});
  assert.equal(
    (await a.pool.query('SELECT count(*)::int n FROM bazar.wishlist_items'))
      .rows[0].n,
    0,
  );
  const empty = (
    await a.pool.query(
      "INSERT INTO bazar.products(category_id,handle,title) SELECT category_id,'no-variants','No variants' FROM bazar.products WHERE id=$1 RETURNING id",
      [a.s.product],
    )
  ).rows[0].id;
  const result = await a.service.wishlist(a.s.user, empty, true, {});
  if (result.resource !== 'wishlist') throw new Error();
  assert.equal(result.items[0].price, null);
  assert.equal(result.items[0].available, false);
});
test('F12 profile updates allow only names and serialize expected versions without exposing contact data', async (t) => {
  const a = await customerCase(t);
  const input = {
    expectedVersion: 1,
    firstName: 'Тестовий',
    lastName: 'Приклад',
  };
  const attempts = await Promise.allSettled([
    a.service.updateProfile(a.s.user, input),
    a.service.updateProfile(a.s.user, input),
  ]);
  assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1);
  const view = await a.service.get(a.s.user, 'profile');
  if (view.resource !== 'profile') throw new Error();
  assert.equal(view.profile.version, 2);
  assert.equal(view.profile.firstName, 'Тестовий');
  for (const extra of [
    { phone: '+380000000000' },
    { email: 'x@example.invalid' },
    { userId: a.s.other },
    { birthday: '2000-01-01' },
  ])
    await assert.rejects(
      a.service.updateProfile(a.s.user, { ...input, ...extra }),
      { status: 400 },
    );
  await assert.rejects(
    a.service.updateProfile(a.s.user, { ...input, firstName: ' ' }),
    { status: 400 },
  );
  const other = await a.service.get(a.s.other, 'profile');
  if (other.resource !== 'profile') throw new Error();
  assert.equal(other.profile.firstName, 'Synthetic');
});
test('F12 address CRUD is owner/version scoped, defaults are explicit and referenced deletion fails atomically', async (t) => {
  const a = await customerCase(t),
    body = {
      carrier: 'ukrposhta',
      cityRef: '286-29713',
      locationRef: '2700',
      isDefault: false,
    };
  for (const extra of [
    { phone: 'secret' },
    { recipientName: 'secret' },
    { address1: 'secret' },
    { userId: a.s.other },
  ])
    await assert.rejects(
      a.service.createAddress(a.s.user, { ...body, ...extra }),
      { status: 400 },
    );
  await assert.rejects(
    a.service.createAddress(a.s.user, { ...body, carrier: 'bazar-pickup' }),
    { status: 400 },
  );
  await assert.rejects(
    a.service.createAddress(a.s.user, { ...body, cityRef: 'City with PII' }),
    { status: 400 },
  );
  let r = await a.service.createAddress(a.s.user, body);
  if (r.resource !== 'addresses') throw new Error();
  const id = r.items.find((v) => v.carrier === 'ukrposhta')!.id;
  await assert.rejects(
    a.service.changeAddress(a.s.other, id, { expectedVersion: 1 }, 'delete'),
    { status: 404 },
  );
  const competing = await Promise.allSettled([
    a.service.changeAddress(a.s.user, id, { expectedVersion: 1 }, 'default'),
    a.service.changeAddress(a.s.user, id, { expectedVersion: 1 }, 'default'),
  ]);
  assert.equal(competing.filter((v) => v.status === 'fulfilled').length, 1);
  r = await a.service.get(a.s.user, 'addresses');
  if (r.resource !== 'addresses') throw new Error();
  assert.equal(r.items.filter((v) => v.isDefault).length, 1);
  assert.equal(r.items.find((v) => v.isDefault)!.id, id);
  await assert.rejects(
    a.service.changeAddress(
      a.s.user,
      id,
      { ...body, expectedVersion: 1 },
      'edit',
    ),
    { status: 409 },
  );
  r = await a.service.changeAddress(
    a.s.user,
    id,
    { ...body, expectedVersion: 2, locationRef: '2701', isDefault: true },
    'edit',
  );
  if (r.resource !== 'addresses') throw new Error();
  assert.equal(r.items.find((v) => v.id === id)!.locationRef, '2701');
  await a.service.changeAddress(a.s.user, id, { expectedVersion: 3 }, 'delete');
  r = await a.service.get(a.s.user, 'addresses');
  if (r.resource !== 'addresses') throw new Error();
  assert.equal(r.items.filter((v) => v.isDefault).length, 0);
  const existing = r.items.find((v) => v.id === a.s.address)!;
  await assert.rejects(
    a.service.changeAddress(
      a.s.user,
      a.s.address,
      { expectedVersion: existing.version },
      'delete',
    ),
    { status: 409 },
  );
  assert.equal(
    (
      await a.pool.query(
        'SELECT count(*)::int n FROM bazar.addresses WHERE id=$1',
        [a.s.address],
      )
    ).rows[0].n,
    1,
  );
  await Promise.all([
    a.service.createAddress(a.s.user, { ...body, isDefault: true }),
    a.service.createAddress(a.s.user, {
      ...body,
      locationRef: 'another',
      isDefault: true,
    }),
  ]);
  r = await a.service.get(a.s.user, 'addresses');
  if (r.resource !== 'addresses') throw new Error();
  assert.equal(r.items.filter((v) => v.isDefault).length, 1);
});
test('F12 review proof/policy gates, owner checks and irreversible claims prevent duplicate reviews even after allowed test deletion', async (t) => {
  const a = await customerCase(t),
    input = {
      orderLineId: a.s.line,
      rating: 5,
      body: 'Synthetic private review',
    };
  await assert.rejects(a.service.createReview(a.s.other, input), {
    status: 404,
  });
  await assert.rejects(a.service.createReview(a.s.user, input), {
    status: 409,
  });
  await assert.rejects(
    createCustomerService(a.pool).createReview(a.s.user, input),
    { status: 409 },
  );
  a.confirmed.add(a.s.line);
  for (const extra of [
    { published: true },
    { userId: a.s.other },
    { verifiedPurchase: true },
  ])
    await assert.rejects(
      a.service.createReview(a.s.user, { ...input, ...extra }),
      { status: 400 },
    );
  const created = await Promise.allSettled([
    a.service.createReview(a.s.user, input),
    a.service.createReview(a.s.user, input),
  ]);
  assert.equal(created.filter((v) => v.status === 'fulfilled').length, 1);
  let view = await a.service.get(a.s.user, 'reviews');
  if (view.resource !== 'reviews') throw new Error();
  assert.equal(view.publication, 'not-asserted');
  const id = view.items[0].id;
  await assert.rejects(a.service.changeReview(a.s.other, id, {}, 'delete'), {
    status: 404,
  });
  await assert.rejects(a.service.changeReview(a.s.user, id, {}, 'delete'), {
    status: 409,
  });
  a.allowChanges();
  view = await a.service.changeReview(
    a.s.user,
    id,
    { rating: 4, body: 'Updated synthetic text' },
    'edit',
  );
  if (view.resource !== 'reviews') throw new Error();
  assert.equal(view.items[0].rating, 4);
  const proof = (
    await a.pool.query(
      'SELECT proof_digest FROM bazar.review_foundation_claims WHERE review_id=$1',
      [id],
    )
  ).rows[0].proof_digest;
  assert.equal(proof.length, 32);
  assert.notEqual(proof.toString(), 'synthetic-proof-not-a-real-purchase');
  await a.service.changeReview(a.s.user, id, {}, 'delete');
  await assert.rejects(a.service.createReview(a.s.user, input), {
    status: 409,
  });
  assert.equal(
    (await a.pool.query('SELECT count(*)::int n FROM bazar.reviews')).rows[0].n,
    0,
  );
  await assert.rejects(
    a.pool.query('DELETE FROM bazar.review_foundation_claims'),
    { code: '23514' },
  );
});
test('F12 failed review claim persistence rolls back the review and permits a safe retry', async (t) => {
  const a = await customerCase(t);
  a.confirmed.add(a.s.line);
  await a.pool.query(
    "CREATE FUNCTION bazar.fail_customer_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced'; END $$;CREATE TRIGGER fail_customer_claim BEFORE INSERT ON bazar.review_foundation_claims FOR EACH ROW EXECUTE FUNCTION bazar.fail_customer_claim()",
  );
  const input = { orderLineId: a.s.line, rating: 5, body: 'Synthetic' };
  await assert.rejects(a.service.createReview(a.s.user, input));
  assert.equal(
    (await a.pool.query('SELECT count(*)::int n FROM bazar.reviews')).rows[0].n,
    0,
  );
  await a.pool.query(
    'DROP TRIGGER fail_customer_claim ON bazar.review_foundation_claims',
  );
  await a.service.createReview(a.s.user, input);
});
test('F12 synthetic F9 payment/order completion cannot become confirmed-purchase review eligibility', async (t) => {
  const a = await readyIntegrated(t);
  await a.settle();
  const order = (
    await a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input)
  ).order;
  const line = (
    await a.pool.query('SELECT id FROM bazar.order_lines WHERE order_id=$1', [
      order.id,
    ])
  ).rows[0].id;
  const service = createCustomerService(a.pool, {
    scope: 'isolated-test',
    confirmPurchase: () => ({
      confirmed: true,
      proof: 'explicit-synthetic-proof',
    }),
    canChange: () => true,
  });
  await assert.rejects(
    service.createReview(a.session.user.id, {
      orderLineId: line,
      rating: 5,
      body: 'Synthetic',
    }),
    { status: 409 },
  );
});
test('F12 typed clients use verified HTTP sessions, strict CSRF/Origin and sanitized failures without a demo fallback', async (t) => {
  const a = await authentication(t),
    identity = await registered(a),
    s = await seed(a.pool),
    logs: string[] = [],
    confirmed = new Set<string>(),
    customer = createCustomerService(a.pool, {
      scope: 'isolated-test',
      confirmPurchase: ({ orderLineId }) => ({
        confirmed: confirmed.has(orderLineId),
        proof: 'fixture-owned-purchase-proof',
      }),
      canChange: () => true,
    });
  const app = createApiServer(
    readConfig({ NODE_ENV: 'test' }),
    createLogger('info', (line) => logs.push(line)),
    { auth: a.auth, customer, isReady: () => true },
  );
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  a.beforeDrop.push(() => app.shutdown());
  const addr = app.server.address();
  assert.ok(addr && typeof addr !== 'string');
  const base = `http://127.0.0.1:${addr.port}`;
  const cookie = `__Host-bazar-session=${identity.session.token}; __Host-bazar-flow=${identity.session.flow}`;
  const transport: typeof fetch = (url, init) =>
    fetch(base + String(url), {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init?.headers)),
        origin: a.config.publicOrigin,
        cookie,
      },
    });
  const client = createCustomerBusinessClient(
    () => identity.session.data.csrfToken,
    transport,
  );
  assert.equal(
    (await client.getProfile()).profile.id,
    identity.session.data.user.id,
  );
  assert.equal(
    (
      await client.updateProfile({
        expectedVersion: 1,
        firstName: 'Синтетичний',
        lastName: 'Інший',
      })
    ).profile.version,
    2,
  );
  assert.equal((await client.addWishlist(s.product)).items.length, 1);
  assert.equal((await client.addWishlist(s.product)).items.length, 1);
  assert.equal((await client.removeWishlist(s.product)).items.length, 0);
  let addresses = (
    await client.createAddress({
      carrier: 'meest',
      cityRef: 'synthetic-city',
      locationRef: 'synthetic-location',
      isDefault: true,
    })
  ).items;
  const own = addresses[0];
  addresses = (
    await client.updateAddress(own.id, {
      carrier: 'nova-poshta',
      cityRef: 'synthetic-city',
      locationRef: 'synthetic-location',
      isDefault: false,
      expectedVersion: 1,
    })
  ).items;
  assert.equal(addresses[0].version, 2);
  assert.equal((await client.setDefaultAddress(own.id, 2)).items[0].version, 3);
  await client.removeAddress(own.id, 3);
  await assert.rejects(
    client.createReview({ orderLineId: s.line, rating: 5, body: 'Foreign' }),
    { status: 404 },
  );
  assert.equal((await client.getReviews()).publication, 'not-asserted');
  const ownOrder = (
    await a.pool.query(
      "INSERT INTO bazar.orders(user_id,total_minor,status) VALUES ($1,12345,'fulfilled') RETURNING id",
      [identity.session.data.user.id],
    )
  ).rows[0].id;
  const ownLine = (
    await a.pool.query(
      "INSERT INTO bazar.order_lines(order_id,user_id,product_id,variant_id,title_snapshot,quantity,unit_price_minor,line_total_minor) VALUES ($1,$2,$3,$4,'Synthetic owned purchase',1,12345,12345) RETURNING id",
      [ownOrder, identity.session.data.user.id, s.product, s.variant],
    )
  ).rows[0].id;
  confirmed.add(ownLine);
  const ownReview = (
    await client.createReview({
      orderLineId: ownLine,
      rating: 5,
      body: 'Private-own-review',
    })
  ).items[0];
  assert.equal(
    (
      await client.updateReview(ownReview.id, {
        rating: 4,
        body: 'Private-own-update',
      })
    ).items[0].rating,
    4,
  );
  assert.equal((await client.removeReview(ownReview.id)).items.length, 0);
  await assert.rejects(
    client.createReview({
      orderLineId: ownLine,
      rating: 5,
      body: 'Private-own-review',
    }),
    { status: 409 },
  );

  const call = (
    path: string,
    method = 'GET',
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method,
      headers: {
        origin: a.config.publicOrigin,
        cookie,
        'content-type': 'application/json',
        'x-csrf-token': identity.session.data.csrfToken,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  assert.equal(
    (await call('/api/v1/wishlist', 'GET', undefined, { cookie: '' })).status,
    401,
  );
  assert.equal(
    (
      await call(
        '/api/v1/customer/profile',
        'PATCH',
        {},
        { 'x-csrf-token': '' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        '/api/v1/customer/profile',
        'PATCH',
        {},
        { origin: 'https://evil.invalid' },
      )
    ).status,
    403,
  );
  assert.equal(
    (await call('/api/v1/customer/profile?userId=' + s.other)).status,
    400,
  );
  assert.equal(
    (
      await call('/api/v1/wishlist/items/' + s.product, 'PUT', {
        userId: s.other,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call('/api/v1/customer/profile', 'PATCH', {
        expectedVersion: 2,
        firstName: 'Synthetic',
        lastName: 'Example',
        phone: 'private-value',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call('/api/v1/customer/addresses/' + s.address, 'DELETE', {
        expectedVersion: 1,
      })
    ).status,
    404,
  );
  assert.equal((await call('/api/v1/wishlist', 'POST', {})).status, 405);
  assert.doesNotMatch(
    logs.join(''),
    /Private-own|private-value|__Host-bazar|Synthetic|synthetic-city|Foreign/,
  );
  assert.ok(logs.some((line) => line.includes('/api/v1/customer')));
});
test('F12 upgrade preserves F11 customer data and previous migrations while adding only versions and empty review claims', async (t) => {
  const db = await database(t),
    dir = mkdtempSync(`${tmpdir()}/bazar-f12-upgrade-`);
  t.after(() => rmSync(dir, { recursive: true }));
  cpSync(migrationDirectory, dir, { recursive: true });
  rmSync(`${dir}/0011_customer_account.sql`);
  rmSync(`${dir}/0012_communication_foundation.sql`);
  rmSync(`${dir}/0014_discounted_test_checkout.sql`);
  rmSync(`${dir}/0013_order_lifecycle.sql`);
  assert.equal(await migrate(db.config, dir), 10);
  const s = await seed(db.pool);
  await db.pool.query(
    'INSERT INTO bazar.wishlist_items(user_id,product_id) VALUES ($1,$2)',
    [s.user, s.product],
  );
  assert.equal(await migrate(db.config), 4);
  assert.equal(await migrate(db.config), 0);
  assert.equal(
    (
      await db.pool.query(
        'SELECT profile_version::text v FROM bazar.users WHERE id=$1',
        [s.user],
      )
    ).rows[0].v,
    '1',
  );
  assert.equal(
    (await db.pool.query('SELECT count(*)::int n FROM bazar.wishlist_items'))
      .rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM bazar.review_foundation_claims',
      )
    ).rows[0].n,
    0,
  );
});

async function communicationCase(t: TestContext) {
  const db = await database(t);
  await migrate(db.config);
  const s = await seed(db.pool);
  const third = (
    await db.pool.query(
      "INSERT INTO bazar.users(first_name,last_name) VALUES('Synthetic','Third') RETURNING id",
    )
  ).rows[0].id;
  const chat = (
    await db.pool.query(
      "INSERT INTO bazar.conversations DEFAULT VALUES RETURNING id",
    )
  ).rows[0].id;
  await db.pool.query(
    "INSERT INTO bazar.conversation_members(conversation_id,user_id) VALUES($1,$2),($1,$3)",
    [chat, s.user, s.other],
  );
  return {
    ...db,
    s,
    third,
    chat,
    service: createCommunicationService(db.pool),
  };
}
test("F13 owned members send/receive once, count unread chats, reject foreign access and do not leak sender identities", async (t) => {
  const a = await communicationCase(t),
    key = randomUUID();
  const sent = await a.service.send(a.s.user, a.chat, "messages", {
    clientMessageId: key,
    body: "Synthetic text",
  });
  assert.equal(sent.resource, "messages");
  assert.equal(sent.items.length, 1);
  assert.ok("author" in sent.items[0] && sent.items[0].author === "self");
  const replay = await a.service.send(a.s.user, a.chat, "messages", {
    clientMessageId: key,
    body: "Synthetic text",
  });
  assert.deepEqual(replay, sent);
  await assert.rejects(
    a.service.send(a.s.user, a.chat, "messages", {
      clientMessageId: key,
      body: "Changed",
    }),
    { status: 409 },
  );
  const history = await a.service.history(a.s.other, a.chat, "messages");
  assert.ok(
    "author" in history.items[0] && history.items[0].author === "member",
  );
  const chats = await a.service.list(a.s.other, "conversations");
  assert.equal(chats.unreadChats, 1);
  await a.service.send(a.s.user, a.chat, "messages", {
    clientMessageId: randomUUID(),
    body: "Another",
  });
  assert.equal(
    (await a.service.list(a.s.other, "conversations")).unreadChats,
    1,
  );
  for (const op of [
    () => a.service.history(a.third, a.chat, "messages"),
    () =>
      a.service.send(a.third, a.chat, "messages", {
        clientMessageId: randomUUID(),
        body: "Blocked",
      }),
    () => a.service.pin(a.third, a.chat, { pinned: true }),
    () =>
      a.service.markRead(a.third, a.chat, { lastMessageId: sent.items[0].id }),
  ])
    await assert.rejects(op(), { status: 404 });
  assert.equal(JSON.stringify(history).includes(a.s.user), false);
  assert.equal(
    (await a.service.list(a.s.user, "notifications")).items.length,
    0,
  );
  const inbox = await a.service.list(a.s.other, "notifications");
  assert.equal(inbox.items.length, 2);
  await assert.rejects(
    a.service.readNotification(a.s.user, inbox.items[0].id, {}),
    { status: 404 },
  );
  const read = await a.service.readNotification(
    a.s.other,
    inbox.items[0].id,
    {},
  );
  assert.ok("read" in read.items[0] && read.items[0].read);
  assert.equal(
    (await a.pool.query("SELECT count(*)::int n FROM bazar.messages")).rows[0]
      .n,
    2,
  );
});
test("F13 concurrent same-key sends and new messages stay unique with atomic notification creation", async (t) => {
  const a = await communicationCase(t),
    input = { clientMessageId: randomUUID(), body: "Concurrent fixture" };
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      a.service.send(a.s.user, a.chat, "messages", input),
    ),
  );
  assert.equal(new Set(results.map((r) => r.items[0].id)).size, 1);
  await Promise.all(
    Array.from({ length: 4 }, (_, i) =>
      a.service.send(a.s.user, a.chat, "messages", {
        clientMessageId: randomUUID(),
        body: `Fixture ${i}`,
      }),
    ),
  );
  assert.equal(
    (await a.pool.query("SELECT count(*)::int n FROM bazar.messages")).rows[0]
      .n,
    5,
  );
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int n FROM bazar.notification_events",
      )
    ).rows[0].n,
    5,
  );
  await a.pool.query(
    "CREATE FUNCTION bazar.fail_notification_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private-fixture';END $$;CREATE TRIGGER fail_notification_fixture BEFORE INSERT ON bazar.notification_events FOR EACH ROW EXECUTE FUNCTION bazar.fail_notification_fixture()",
  );
  const failed = { clientMessageId: randomUUID(), body: "Rolled back" };
  await assert.rejects(a.service.send(a.s.user, a.chat, "messages", failed));
  assert.equal(
    (await a.pool.query("SELECT count(*)::int n FROM bazar.messages")).rows[0]
      .n,
    5,
  );
  await a.pool.query(
    "DROP TRIGGER fail_notification_fixture ON bazar.notification_events",
  );
  await a.service.send(a.s.user, a.chat, "messages", failed);
  assert.equal(
    (await a.pool.query("SELECT count(*)::int n FROM bazar.messages")).rows[0]
      .n,
    6,
  );
});
test("F13 history pagination is oldest-to-newest within newest-first pages and read watermarks never regress", async (t) => {
  const a = await communicationCase(t);
  const ids: string[] = [];
  for (let i = 0; i < 5; i++)
    ids.push(
      (
        await a.service.send(a.s.user, a.chat, "messages", {
          clientMessageId: randomUUID(),
          body: `Synthetic ${i}`,
        })
      ).items[0].id,
    );
  const first = await a.service.history(
    a.s.other,
    a.chat,
    "messages",
    Number.MAX_SAFE_INTEGER,
    2,
  );
  assert.deepEqual(
    first.items.map((i) => ("body" in i ? i.body : null)),
    ["Synthetic 3", "Synthetic 4"],
  );
  assert.ok(first.nextBefore);
  const second = await a.service.history(
    a.s.other,
    a.chat,
    "messages",
    first.nextBefore,
    2,
  );
  assert.deepEqual(
    second.items.map((i) => ("body" in i ? i.body : null)),
    ["Synthetic 1", "Synthetic 2"],
  );
  const third = await a.service.history(
    a.s.other,
    a.chat,
    "messages",
    second.nextBefore!,
    2,
  );
  assert.equal(third.items.length, 1);
  assert.equal(third.nextBefore, null);
  await a.service.markRead(a.s.other, a.chat, { lastMessageId: ids[3] });
  assert.equal(
    (await a.service.list(a.s.other, "conversations")).unreadChats,
    1,
  );
  await Promise.all([
    a.service.markRead(a.s.other, a.chat, { lastMessageId: ids[4] }),
    a.service.markRead(a.s.other, a.chat, { lastMessageId: ids[0] }),
  ]);
  assert.equal(
    (await a.service.list(a.s.other, "conversations")).unreadChats,
    0,
  );
  await a.service.send(a.s.user, a.chat, "messages", {
    clientMessageId: randomUUID(),
    body: "New incoming",
  });
  assert.equal(
    (await a.service.list(a.s.other, "conversations")).unreadChats,
    1,
  );
  await a.service.pin(a.s.other, a.chat, { pinned: true });
  const pin = await a.service.list(a.s.other, "conversations");
  assert.ok("pinned" in pin.items[0] && pin.items[0].pinned);
  const own = await a.service.list(a.s.user, "conversations");
  assert.ok("pinned" in own.items[0] && !own.items[0].pinned);
  const foreign = (
    await a.pool.query(
      "INSERT INTO bazar.conversations DEFAULT VALUES RETURNING id",
    )
  ).rows[0].id;
  await a.pool.query(
    "INSERT INTO bazar.conversation_members(conversation_id,user_id) VALUES($1,$2)",
    [foreign, a.s.user],
  );
  const wrong = await a.service.send(a.s.user, foreign, "messages", {
    clientMessageId: randomUUID(),
    body: "Different chat",
  });
  await assert.rejects(
    a.service.markRead(a.s.other, a.chat, { lastMessageId: wrong.items[0].id }),
    { status: 404 },
  );
});
test("F13 support creation/replies are owner scoped, atomic, idempotent and closed tickets reject new writes", async (t) => {
  const a = await communicationCase(t),
    input = {
      clientRequestId: randomUUID(),
      subject: "Synthetic issue",
      category: "other",
      body: "Synthetic description",
    };
  const created = await Promise.all([
    a.service.createTicket(a.s.user, input),
    a.service.createTicket(a.s.user, input),
  ]);
  assert.equal(created[0].items[0].id, created[1].items[0].id);
  const id = created[0].items[0].id;
  await assert.rejects(
    a.service.createTicket(a.s.user, { ...input, body: "Changed" }),
    { status: 409 },
  );
  await assert.rejects(a.service.history(a.s.other, id, "replies"), {
    status: 404,
  });
  await assert.rejects(
    a.service.send(a.s.other, id, "replies", {
      clientMessageId: randomUUID(),
      body: "Foreign",
    }),
    { status: 404 },
  );
  const reply = { clientMessageId: randomUUID(), body: "Synthetic reply" };
  const replies = await Promise.all([
    a.service.send(a.s.user, id, "replies", reply),
    a.service.send(a.s.user, id, "replies", reply),
  ]);
  assert.deepEqual(replies[0], replies[1]);
  await a.pool.query(
    "UPDATE bazar.support_tickets SET status='closed' WHERE id=$1",
    [id],
  );
  await assert.rejects(
    a.service.send(a.s.user, id, "replies", {
      ...reply,
      clientMessageId: randomUUID(),
    }),
    { status: 409 },
  );
  assert.deepEqual(
    await a.service.send(a.s.user, id, "replies", reply),
    replies[0],
  );
  assert.equal(
    (await a.service.history(a.s.user, id, "replies")).items.length,
    2,
  );
  assert.equal(
    (await a.service.list(a.s.user, "notifications")).items.length,
    0,
  );
  await assert.rejects(
    a.pool.query(
      "INSERT INTO bazar.support_messages(ticket_id,user_id,body) VALUES($1,$2,'Foreign')",
      [id, a.s.other],
    ),
    { code: "23503" },
  );
});
test("F13 typed HTTP clients enforce sessions, CSRF, ownership and strict payloads with no leaked content", async (t) => {
  const a = await authentication(t),
    identity = await registered(a),
    s = await seed(a.pool),
    actor = identity.session.data.user.id;
  const chat = (
    await a.pool.query(
      "INSERT INTO bazar.conversations DEFAULT VALUES RETURNING id",
    )
  ).rows[0].id;
  await a.pool.query(
    "INSERT INTO bazar.conversation_members(conversation_id,user_id) VALUES($1,$2),($1,$3)",
    [chat, actor, s.user],
  );
  const service = createCommunicationService(a.pool),
    logs: string[] = [];
  const app = createApiServer(
    readConfig({ NODE_ENV: "test" }),
    createLogger("info", (l) => logs.push(l)),
    { auth: a.auth, communication: service, isReady: () => true },
  );
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  a.beforeDrop.push(() => app.shutdown());
  const addr = app.server.address();
  assert.ok(addr && typeof addr !== "string");
  const base = `http://127.0.0.1:${addr.port}`;
  const cookie = `__Host-bazar-session=${identity.session.token}; __Host-bazar-flow=${identity.session.flow}`;
  const headers = {
    origin: a.config.publicOrigin,
    cookie,
    "content-type": "application/json",
    "x-csrf-token": identity.session.data.csrfToken,
  };
  const transport: typeof fetch = (url, init) =>
    fetch(base + String(url), {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init?.headers)),
        origin: a.config.publicOrigin,
        cookie,
      },
    });
  const client = createCommunicationBusinessClient(
    () => identity.session.data.csrfToken,
    transport,
  );
  assert.equal((await client.conversations()).items.length, 1);
  const sent = await client.send(
    chat,
    randomUUID(),
    "Synthetic-private-content",
  );
  await client.history(chat, undefined, 1);
  await client.markRead(chat, sent.items[0].id);
  await client.pin(chat, true);
  await service.send(s.user, chat, "messages", {
    clientMessageId: randomUUID(),
    body: "Synthetic incoming",
  });
  const inbox = await client.notifications();
  assert.equal(inbox.items.length, 1);
  await client.readNotification(inbox.items[0].id);
  const ticket = (
    await client.createTicket({
      clientRequestId: randomUUID(),
      subject: "Synthetic support",
      category: "delivery",
      body: "Fixture text",
    })
  ).items[0];
  await client.send(ticket.id, randomUUID(), "Fixture reply", true);
  assert.equal(
    (await client.history(ticket.id, undefined, 50, true)).items.length,
    2,
  );
  const path = "/api/v1/communication/conversations/" + chat + "/messages";
  for (const [patch, status] of [
    [{ cookie: "" }, 403],
    [{ "x-csrf-token": "invalid" }, 403],
    [{ origin: "https://evil.invalid" }, 403],
    [{ "sec-fetch-site": "cross-site" }, 403],
  ] as const) {
    const r = await fetch(base + path, {
      method: "POST",
      headers: { ...headers, ...patch },
      body: JSON.stringify({
        clientMessageId: randomUUID(),
        body: "Never accepted",
      }),
    });
    assert.equal(r.status, status);
    await r.body?.cancel();
  }
  for (const body of [
    { clientMessageId: randomUUID(), body: "Test", senderId: actor },
    {
      clientMessageId: randomUUID(),
      body: "Test",
      attachment: { key: "unsafe" },
    },
  ]) {
    const r = await fetch(base + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(r.status, 400);
    await r.body?.cancel();
  }
  const unicode = await fetch(base + path, {method:"POST",headers,body:JSON.stringify({clientMessageId:randomUUID(),body:"\u0344".repeat(1001)})});
  assert.equal(unicode.status,400);await unicode.body?.cancel();
  const anonymous = await fetch(base + path, {
    headers: { origin: a.config.publicOrigin },
  });
  assert.equal(anonymous.status, 401);
  await anonymous.body?.cancel();
  const bad = await fetch(base + path + "?limit=101", { headers });
  assert.equal(bad.status, 400);
  await bad.body?.cancel();
  const foreign = await fetch(
    base + "/api/v1/communication/conversations/" + randomUUID() + "/messages",
    { headers },
  );
  assert.equal(foreign.status, 404);
  await foreign.body?.cancel();
  const upload = await fetch(base + "/api/v1/communication/attachments", {
    method: "POST",
    headers,
    body: "{}",
  });
  assert.equal(upload.status, 404);
  await upload.body?.cancel();
  assert.doesNotMatch(
    logs.join(""),
    /Synthetic-private-content|Fixture text|bazar-session|cookie|csrfToken/,
  );
  assert.ok(logs.some((l) => l.includes("/api/v1/communication")));
});
test("F13 upgrades F12 with legacy messages intact, ordered sequences, valid read markers and rerunnable migrations", async (t) => {
  const a = await database(t),
    dir = mkdtempSync(`${tmpdir()}/bazar-f13-upgrade-`);
  t.after(() => rmSync(dir, { recursive: true }));
  cpSync(migrationDirectory, dir, { recursive: true });
  rmSync(`${dir}/0012_communication_foundation.sql`);
  rmSync(`${dir}/0014_discounted_test_checkout.sql`);
  rmSync(`${dir}/0013_order_lifecycle.sql`);
  assert.equal(await migrate(a.config, dir), 11);
  const s = await seed(a.pool);
  const chat = (
    await a.pool.query(
      "INSERT INTO bazar.conversations DEFAULT VALUES RETURNING id",
    )
  ).rows[0].id;
  await a.pool.query(
    "INSERT INTO bazar.conversation_members(conversation_id,user_id) VALUES($1,$2)",
    [chat, s.user],
  );
  const later = (
    await a.pool.query(
      "INSERT INTO bazar.messages(conversation_id,sender_id,client_message_id,body,created_at) VALUES($1,$2,$3,'Later','2026-10-26') RETURNING id",
      [chat, s.user, randomUUID()],
    )
  ).rows[0].id;
  await a.pool.query(
    "INSERT INTO bazar.messages(conversation_id,sender_id,client_message_id,body,created_at) VALUES($1,$2,$3,'Earlier','2026-10-25')",
    [chat, s.user, randomUUID()],
  );
  await a.pool.query(
    "UPDATE bazar.conversation_members SET last_read_message_id=$1",
    [later],
  );
  assert.equal(await migrate(a.config), 3);
  assert.equal(await migrate(a.config), 0);
  const service = createCommunicationService(a.pool);
  const history = await service.history(s.user, chat, "messages");
  assert.deepEqual(
    history.items.map((i) => ("body" in i ? i.body : null)),
    ["Earlier", "Later"],
  );
  const next = await service.send(s.user, chat, "messages", {
    clientMessageId: randomUUID(),
    body: "Newest",
  });
  assert.ok("sequence" in next.items[0] && next.items[0].sequence > 2);
  assert.equal((await service.list(s.user, "conversations")).unreadChats, 0);
});

async function lifecycleCase(t: TestContext, quantity = 3) {
  const a = await readyIntegrated(t, true, quantity);
  await a.settle();
  const order = (
    await a.client.checkout.confirmIntegratedForTest(a.draft.id, a.input)
  ).order;
  const f = lifecycleFixture(),
    actor = a.session.user.id,
    service = createOrderLifecycleService(a.pool, f.policy, f.adapter);
  const view = await service.get(actor, order.id);
  return { ...a, f, actor, order, service, line: view.order.lines[0].id };
}
test("F14 reads preserve F6 facts, owner isolation, policy blocker, immutable initial history and no implied refund", async (t) => {
  const a = await lifecycleCase(t),
    none = createOrderLifecycleService(a.pool),
    view = await none.get(a.actor, a.order.id);
  assert.equal(view.order.status, "pending");
  assert.equal(view.order.paymentStatus, "not-initiated");
  assert.equal(view.order.deliveryStatus, "not-requested");
  assert.equal(view.order.orderPaid, false);
  assert.equal(view.order.fundsReturned, false);
  assert.equal(view.eligibility.cancellation, "policy-required");
  assert.equal(view.history.length, 1);
  await assert.rejects(
    none.request(a.actor, a.order.id, "cancellation", {
      idempotencyKey: randomUUID(),
      reason: "Synthetic",
    }),
    { code: "CHECKOUT_POLICY_REQUIRED" },
  );
  await assert.rejects(a.service.get(a.s.user, a.order.id), { status: 404 });
  await assert.rejects(
    a.service.request(a.s.user, a.order.id, "return", {
      idempotencyKey: randomUUID(),
      reason: "Foreign",
      items: [{ orderLineId: a.line, quantity: 1 }],
    }),
    { status: 404 },
  );
  assert.equal(
    (await a.service.list(a.s.user, new URLSearchParams())).items.length,
    0,
  );
  await assert.rejects(
    a.pool.query(
      "UPDATE bazar.order_lifecycle_history SET to_state='cancelled'",
    ),
    { code: "23514" },
  );
  await assert.rejects(
    a.pool.query("DELETE FROM bazar.order_lifecycle_history"),
    { code: "23514" },
  );
});
test("F14 cancellation requests replay without cancelling orders; explicit review transitions use versions and immutable audit", async (t) => {
  const a = await lifecycleCase(t),
    input = {
      idempotencyKey: randomUUID(),
      reason: "Synthetic cancellation request",
    };
  const results = await Promise.all([
    a.service.request(a.actor, a.order.id, "cancellation", input),
    a.service.request(a.actor, a.order.id, "cancellation", input),
  ]);
  assert.equal(results[0].requests[0].id, results[1].requests[0].id);
  assert.equal(results[0].history.length, 2);
  const request = results[0].requests[0];
  await assert.rejects(
    a.service.request(a.actor, a.order.id, "cancellation", {
      ...input,
      reason: "Changed",
    }),
    { status: 409 },
  );
  await assert.rejects(
    a.service.request(a.actor, a.order.id, "cancellation", {
      ...input,
      idempotencyKey: randomUUID(),
    }),
    { status: 409 },
  );
  await assert.rejects(
    a.service.reviewForTest(a.actor, a.order.id, request.id, {
      expectedVersion: 1,
      state: "closed-for-test",
    }),
    { status: 409 },
  );
  const review = { expectedVersion: 1, state: "under-review" };
  const r = await Promise.all([
    a.service.reviewForTest(a.actor, a.order.id, request.id, review),
    a.service.reviewForTest(a.actor, a.order.id, request.id, review),
  ]);
  assert.equal(r[0].history.length, 3);
  assert.equal(r[1].history.length, 3);
  await a.service.reviewForTest(a.actor, a.order.id, request.id, {
    expectedVersion: 2,
    state: "closed-for-test",
  });
  await assert.rejects(
    a.service.reviewForTest(a.actor, a.order.id, request.id, {
      expectedVersion: 3,
      state: "under-review",
    }),
    { status: 409 },
  );
  const view = await a.service.get(a.actor, a.order.id);
  assert.equal(view.order.status, "pending");
  assert.equal(view.requests[0].state, "closed-for-test");
  assert.equal(view.history.length, 4);
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int n FROM bazar.notification_events WHERE kind='order.cancelled'",
      )
    ).rows[0].n,
    0,
  );
});
test("F14 partial item returns enforce cumulative purchased quantity under concurrent requests and emit only test request notifications", async (t) => {
  const a = await lifecycleCase(t, 3),
    input = {
      idempotencyKey: randomUUID(),
      reason: "Synthetic partial return",
      items: [{ orderLineId: a.line, quantity: 2 }],
    };
  const [first, replay] = await Promise.all([
    a.service.request(a.actor, a.order.id, "return", input),
    a.service.request(a.actor, a.order.id, "return", input),
  ]);
  assert.equal(first.requests[0].id, replay.requests[0].id);
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      a.service.request(a.actor, a.order.id, "return", {
        ...input,
        idempotencyKey: randomUUID(),
        items: [{ orderLineId: a.line, quantity: 1 }],
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const view = await a.service.get(a.actor, a.order.id);
  assert.equal(view.requests.length, 2);
  assert.equal(view.order.returnStatus, "requested-for-test");
  assert.equal(view.order.paymentStatus, "not-initiated");
  assert.equal(
    (
      await a.pool.query(
        "SELECT sum(quantity)::int n FROM bazar.order_return_items",
      )
    ).rows[0].n,
    3,
  );
  await assert.rejects(
    a.service.request(a.actor, a.order.id, "return", {
      ...input,
      idempotencyKey: randomUUID(),
      items: [{ orderLineId: randomUUID(), quantity: 1 }],
    }),
    { status: 409 },
  );
  const inbox = await createCommunicationService(a.pool).list(
    a.actor,
    "notifications",
  );
  assert.equal(inbox.items.length, 2);
  assert.ok(
    inbox.items.every((i) => "kind" in i && i.kind === "return.requested"),
  );
  const request = view.requests[0];
  await a.service.reviewForTest(a.actor, a.order.id, request.id, {
    expectedVersion: 1,
    state: "under-review",
  });
  const after = await createCommunicationService(a.pool).list(
    a.actor,
    "notifications",
  );
  assert.ok(
    after.items.some((i) => "kind" in i && i.kind === "return.status_changed"),
  );
});
test("F14 return insert failures rollback requests audit notifications and request key for a safe retry", async (t) => {
  const a = await lifecycleCase(t),
    input = {
      idempotencyKey: randomUUID(),
      reason: "Synthetic",
      items: [{ orderLineId: a.line, quantity: 1 }],
    };
  await a.pool.query(
    "CREATE FUNCTION bazar.fail_return_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private'; END $$;CREATE TRIGGER fail_return_fixture BEFORE INSERT ON bazar.order_return_items FOR EACH ROW EXECUTE FUNCTION bazar.fail_return_fixture()",
  );
  await assert.rejects(a.service.request(a.actor, a.order.id, "return", input));
  assert.equal((await a.service.get(a.actor, a.order.id)).requests.length, 0);
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int n FROM bazar.notification_events",
      )
    ).rows[0].n,
    0,
  );
  await a.pool.query(
    "DROP TRIGGER fail_return_fixture ON bazar.order_return_items",
  );
  await a.service.request(a.actor, a.order.id, "return", input);
});
async function requestForRefund(a: Awaited<ReturnType<typeof lifecycleCase>>) {
  const v = await a.service.request(a.actor, a.order.id, "return", {
    idempotencyKey: randomUUID(),
    reason: "Synthetic refund source",
    items: [{ orderLineId: a.line, quantity: 1 }],
  });
  return v.requests.at(-1)!.id;
}
test("F14 refund preparation is server-planned and bounded across partial concurrent claims; duplicate keys and per-request double refunds are blocked", async (t) => {
  const a = await lifecycleCase(t),
    ids = [
      await requestForRefund(a),
      await requestForRefund(a),
      await requestForRefund(a),
    ],
    input = {
      requestId: ids[0],
      extent: "partial",
      idempotencyKey: randomUUID(),
    };
  const first = await Promise.all([
    a.service.prepareRefundForTest(a.actor, a.order.id, input),
    a.service.prepareRefundForTest(a.actor, a.order.id, input),
  ]);
  assert.equal(first[0].refunds[0].id, first[1].refunds[0].id);
  assert.equal((await a.pool.query('SELECT plan_revision FROM bazar.order_refund_attempts WHERE id=$1',[first[0].refunds[0].id])).rows[0].plan_revision,a.f.state.revision);
  await assert.rejects(
    a.service.prepareRefundForTest(a.actor, a.order.id, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
    { status: 409 },
  );
  const results = await Promise.allSettled(
    ids
      .slice(1)
      .map((requestId) =>
        a.service.prepareRefundForTest(a.actor, a.order.id, {
          requestId,
          extent: "partial",
          idempotencyKey: randomUUID(),
        }),
      ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const view = await a.service.get(a.actor, a.order.id);
  assert.equal(view.refunds.length, 2);
  assert.equal(
    view.refunds.reduce((s, r) => s + r.amountMinor, 0),
    18000,
  );
  assert.ok(
    view.refunds.every(
      (r) => r.state === "prepared" && !r.realRefund && !r.fundsReturned,
    ),
  );
  await assert.rejects(
    a.service.prepareRefundForTest(a.actor, a.order.id, {
      ...input,
      amountMinor: 1,
    }),
    { status: 400 },
  );
  a.f.state.denyPlan = true;
  await assert.rejects(
    a.service.prepareRefundForTest(a.actor, a.order.id, {
      requestId: ids[2],
      extent: "partial",
      idempotencyKey: randomUUID(),
    }),
    { code: "CHECKOUT_POLICY_REQUIRED" },
  );
});
test("F14 full refund capacity requires a linked confirmed test operation and never marks real funds returned", async (t) => {
  const a = await lifecycleCase(t),
    requestId = await requestForRefund(a),
    input = { requestId, extent: "full", idempotencyKey: randomUUID() };
  const view = await a.service.prepareRefundForTest(a.actor, a.order.id, input);
  assert.equal(
    view.refunds[0].amountMinor,
    a.paymentAttempt.amount.amountMinor,
  );
  assert.equal(view.refunds[0].extent, "full");
  const next = await requestForRefund(a);
  await assert.rejects(
    a.service.prepareRefundForTest(a.actor, a.order.id, {
      ...input,
      requestId: next,
      idempotencyKey: randomUUID(),
    }),
    { status: 409 },
  );
  const none = createOrderLifecycleService(a.pool, a.f.policy);
  await assert.rejects(
    none.prepareRefundForTest(a.actor, a.order.id, {
      requestId: next,
      extent: "partial",
      idempotencyKey: randomUUID(),
    }),
    { code: "CHECKOUT_POLICY_REQUIRED" },
  );
  assert.equal(view.order.fundsReturned, false);
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int n FROM bazar.notification_events WHERE kind='refund.completed'",
      )
    ).rows[0].n,
    0,
  );
});
test("F14 signed test refund observations bind amount account and payment, deduplicate, reject forgery and terminal contradictions", async (t) => {
  const a = await lifecycleCase(t),
    requestId = await requestForRefund(a);
  let view = await a.service.prepareRefundForTest(a.actor, a.order.id, {
    requestId,
    extent: "partial",
    idempotencyKey: randomUUID(),
  });
  const refund = view.refunds[0];
  const event = {
    eventId: randomUUID(),
    refundId: refund.id,
    paymentOperationId: refund.paymentOperationId,
    accountRef: a.f.adapter.accountRef,
    amountMinor: refund.amountMinor,
    currency: "UAH",
    state: "confirmed-for-test",
  };
  const signed = a.f.signed(event);
  await assert.rejects(a.service.observeRefundForTest(signed.raw, "invalid"), {
    status: 401,
  });
  await assert.rejects(
    a.service.observeRefundForTest(
      Buffer.from(signed.raw.toString() + " "),
      signed.signature,
    ),
    { status: 401 },
  );
  const old = a.f.signed(event, Date.now() - 600000);
  await assert.rejects(a.service.observeRefundForTest(old.raw, old.signature), {
    status: 401,
  });
  for (const patch of [
    { amountMinor: 1 },
    { currency: "USD" },
    { accountRef: "foreign" },
    { paymentOperationId: randomUUID() },
  ]) {
    const wrong = a.f.signed({ ...event, ...patch });
    await assert.rejects(
      a.service.observeRefundForTest(wrong.raw, wrong.signature),
    );
  }
  const r = await Promise.all([
    a.service.observeRefundForTest(signed.raw, signed.signature),
    a.service.observeRefundForTest(signed.raw, signed.signature),
  ]);
  assert.equal(r[0].refunds[0].state, "confirmed-for-test");
  assert.equal(r[0].history.length, r[1].history.length);
  const contradictory = a.f.signed({
    ...event,
    eventId: randomUUID(),
    state: "rejected-for-test",
  });
  await assert.rejects(
    a.service.observeRefundForTest(contradictory.raw, contradictory.signature),
    { status: 409 },
  );
  const changed = a.f.signed({ ...event, state: "pending" });
  await assert.rejects(
    a.service.observeRefundForTest(changed.raw, changed.signature),
    { status: 409 },
  );
  view = await a.service.get(a.actor, a.order.id);
  assert.equal(view.order.paymentStatus, "not-initiated");
  assert.equal(view.order.fundsReturned, false);
  assert.equal(view.refunds[0].fundsReturned, false);
  await assert.rejects(
    a.pool.query("DELETE FROM bazar.refund_verified_events"),
    { code: "23514" },
  );
  await assert.rejects(
    a.pool.query(
      "UPDATE bazar.order_refund_attempts SET state='pending',version=version+1",
    ),
    { code: "23514" },
  );
});
test("F14 authenticated lifecycle HTTP client rejects foreign orders CSRF and customer financial/status endpoints", async (t) => {
  const a = await lifecycleCase(t),
    logs: string[] = [],
    app = createApiServer(
      readConfig({ NODE_ENV: "test" }),
      createLogger("info", (l) => logs.push(l)),
      { auth: a.services.auth, lifecycle: a.service, isReady: () => true },
    );
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  a.beforeDrop.push(() => app.shutdown());
  const addr = app.server.address();
  assert.ok(addr && typeof addr !== "string");
  const base = `http://127.0.0.1:${addr.port}`;
  // Reuse the existing isolated integration cookie transport rather than exposing session secrets.
  const transport: typeof fetch = (url, init) =>
    fetch(base + String(url), {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init?.headers)),
        origin: a.identity.config.publicOrigin,
        cookie: a.getJar(),
      },
    });
  const client = createOrderLifecycleClient(
    () => a.session.csrfToken,
    transport,
  );
  assert.equal((await client.listOrders()).items[0].id, a.order.id);
  assert.equal((await client.getOrder(a.order.id)).history.length, 1);
  const input = {
    idempotencyKey: randomUUID(),
    reason: "Synthetic private return",
    items: [{ orderLineId: a.line, quantity: 1 }],
  };
  const v = await client.requestReturn(a.order.id, input);
  assert.equal(v.requests.length, 1);
  assert.equal(
    (await client.requestReturn(a.order.id, input)).requests.length,
    1,
  );
  const headers = {
      origin: a.identity.config.publicOrigin,
      cookie: a.getJar(),
      "content-type": "application/json",
      "x-csrf-token": a.session.csrfToken,
    },
    path = "/api/v1/order-lifecycle/orders/" + a.order.id;
  for (const patch of [
    { "x-csrf-token": "bad" },
    { origin: "https://evil.invalid" },
    { "sec-fetch-site": "cross-site" },
  ] as Record<string, string>[]) {
    const r = await fetch(base + path + "/cancellations", {
      method: "POST",
      headers: { ...headers, ...patch },
      body: JSON.stringify({
        idempotencyKey: randomUUID(),
        reason: "Never accepted",
      }),
    });
    assert.equal(r.status, 403);
    await r.body?.cancel();
  }
  for (const endpoint of [
    "/refunds",
    "/status",
    "/review",
    "/refunds/webhooks/isolated",
  ]) {
    const r = await fetch(base + path + endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ amountMinor: 1, status: "refunded" }),
    });
    assert.equal(r.status, 404);
    await r.body?.cancel();
  }
  const forged = await fetch(base + path + "/returns", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...input, userId: a.s.user, state: "approved" }),
  });
  assert.equal(forged.status, 400);
  await forged.body?.cancel();
  const foreign = await fetch(
    base + "/api/v1/order-lifecycle/orders/" + a.s.order,
    { headers },
  );
  assert.equal(foreign.status, 404);
  await foreign.body?.cancel();
  const anonymous = await fetch(base + path, {
    headers: { origin: a.identity.config.publicOrigin },
  });
  assert.equal(anonymous.status, 401);
  await anonymous.body?.cancel();
  assert.doesNotMatch(
    logs.join(""),
    /Synthetic private return|bazar-session|csrfToken|requestKey/,
  );
});

test("F14 F13 upgrade backfills immutable initial order history and preserves prior checkout snapshots", async (t) => {
  const db = await database(t),
    dir = mkdtempSync(`${tmpdir()}/bazar-f14-upgrade-`);
  t.after(() => rmSync(dir, { recursive: true }));
  cpSync(migrationDirectory, dir, { recursive: true });
  rmSync(`${dir}/0014_discounted_test_checkout.sql`);
  rmSync(`${dir}/0013_order_lifecycle.sql`);
  assert.equal(await migrate(db.config, dir), 12);
  const s = await seed(db.pool);
  await db.pool.query(
    "INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES($1,$2,2)",
    [s.cart, s.variant],
  );
  const checkout = createCheckoutBusinessService(db.pool);
  let draft = await checkout.start(s.user, {
    cartId: s.cart,
    expectedCartVersion: 1,
    idempotencyKey: randomUUID(),
  });
  draft = await checkout.setDelivery(s.user, draft.id, {
    expectedVersion: draft.version,
    addressId: s.address,
  });
  draft = await checkout.setPayment(s.user, draft.id, {
    expectedVersion: draft.version,
    paymentSelection: "on-receipt",
    promoCode: null,
  });
  const original = (
    await checkout.recordOrderForTest(s.user, draft.id, {
      expectedVersion: draft.version,
      expectedFingerprint: draft.pricing!.fingerprint,
      idempotencyKey: randomUUID(),
    })
  ).order;
  assert.equal(await migrate(db.config), 2);
  assert.equal(await migrate(db.config), 0);
  assert.deepEqual(await checkout.getOrder(s.user, original.id), original);
  const f = lifecycleFixture(),
    service = createOrderLifecycleService(db.pool, f.policy, f.adapter);
  const view = await service.get(s.user, original.id);
  assert.equal(view.history.length, 1);
  assert.equal(view.history[0].createdAt, original.createdAt);
  const request = (
    await service.request(s.user, original.id, "return", {
      idempotencyKey: randomUUID(),
      reason: "Synthetic",
      items: [{ orderLineId: view.order.lines[0].id, quantity: 1 }],
    })
  ).requests[0];
  await assert.rejects(
    service.prepareRefundForTest(s.user, original.id, {
      requestId: request.id,
      extent: "full",
      idempotencyKey: randomUUID(),
    }),
    { code: "CHECKOUT_POLICY_REQUIRED" },
  );
});
test("F14 refund plans cannot exceed paid capacity, pretend a partial is full or bypass missing financial policy", async (t) => {
  const a = await lifecycleCase(t),
    requestId = await requestForRefund(a),
    input = { requestId, extent: "partial", idempotencyKey: randomUUID() };
  for (const amount of [
    a.paymentAttempt.amount.amountMinor,
    a.paymentAttempt.amount.amountMinor + 1,
  ]) {
    a.f.state.amount = amount;
    await assert.rejects(
      a.service.prepareRefundForTest(a.actor, a.order.id, input),
      { status: 409 },
    );
  }
  assert.equal((await a.service.get(a.actor, a.order.id)).refunds.length, 0);
  a.f.state.denyPlan = true;
  await assert.rejects(
    a.service.prepareRefundForTest(a.actor, a.order.id, input),
    { code: "CHECKOUT_POLICY_REQUIRED" },
  );
  a.f.state.denyPlan = false;
  a.f.state.amount = 9000;
  await a.service.prepareRefundForTest(a.actor, a.order.id, input);
});
test("F14 unknown/timeout outcomes retain refund budget; verified receipt and state audit rollback atomically", async (t) => {
  const a = await lifecycleCase(t),
    requestId = await requestForRefund(a),
    view = await a.service.prepareRefundForTest(a.actor, a.order.id, {
      requestId,
      extent: "partial",
      idempotencyKey: randomUUID(),
    }),
    r = view.refunds[0];
  const base = {
    eventId: randomUUID(),
    refundId: r.id,
    paymentOperationId: r.paymentOperationId,
    accountRef: a.f.adapter.accountRef,
    amountMinor: r.amountMinor,
    currency: "UAH",
    state: "unknown",
  };
  const unknown = a.f.signed(base);
  await a.service.observeRefundForTest(unknown.raw, unknown.signature);
  a.f.state.stall = true;
  await assert.rejects(
    a.service.observeRefundForTest(unknown.raw, unknown.signature),
    { status: 401 },
  );
  a.f.state.stall = false;
  assert.equal(
    (await a.service.get(a.actor, a.order.id)).refunds[0].state,
    "unknown",
  );
  const event = { ...base, eventId: randomUUID(), state: "confirmed-for-test" },
    signed = a.f.signed(event);
  await a.pool.query(
    "CREATE FUNCTION bazar.fail_refund_audit_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private';END $$;CREATE TRIGGER fail_refund_audit_fixture BEFORE INSERT ON bazar.order_lifecycle_history FOR EACH ROW EXECUTE FUNCTION bazar.fail_refund_audit_fixture()",
  );
  await assert.rejects(
    a.service.observeRefundForTest(signed.raw, signed.signature),
  );
  assert.equal(
    (
      await a.pool.query(
        "SELECT count(*)::int n FROM bazar.refund_verified_events WHERE event_id=$1",
        [event.eventId],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await a.service.get(a.actor, a.order.id)).refunds[0].state,
    "unknown",
  );
  await a.pool.query(
    "DROP TRIGGER fail_refund_audit_fixture ON bazar.order_lifecycle_history",
  );
  const final = await a.service.observeRefundForTest(
    signed.raw,
    signed.signature,
  );
  assert.equal(final.refunds[0].state, "confirmed-for-test");
  assert.equal(final.order.fundsReturned, false);
});

async function discountedCase(t:TestContext, percent=false) {
 const a=await integratedCase(t,true);const session=await integrationLogin(a);
 const cart=await a.client.cart.ensureCurrent();
 await a.client.cart.add({variantId:a.s.variant,quantity:2,expectedVersion:cart.cart.version,idempotencyKey:randomUUID()});
 const address=(await a.pool.query("INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES($1,'nova-poshta','synthetic-city','synthetic-location') RETURNING id",[session.user.id])).rows[0].id;
 const promotion=(await a.pool.query("INSERT INTO bazar.promotions(code,kind,fixed_minor,percentage_basis_points,currency,min_subtotal_minor,starts_at,ends_at,enabled,max_uses,per_user_limit) VALUES('F16',$1,$2,$3,'UAH',1,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',true,1,1) RETURNING id",[percent?'percentage':'fixed',percent?null:1000,percent?2000:null])).rows[0].id;
 await a.pool.query('INSERT INTO bazar.promotion_products(promotion_id,product_id) VALUES($1,$2)',[promotion,a.s.product]);
 let draft=await a.client.startCurrentCheckout(randomUUID());
 const selection=await a.client.shipping.select(draft.id,{expectedVersion:draft.version,addressId:address,kind:'branch'});
 await a.client.shipping.quote(draft.id,{expectedVersion:selection.checkoutVersion,idempotencyKey:randomUUID()});
 draft=await a.client.checkout.setPayment(draft.id,{expectedVersion:selection.checkoutVersion,paymentSelection:'card-online',promoCode:'F16'});
 const attempt=(await a.client.payments.create({checkoutId:draft.id,expectedVersion:draft.version,method:'card',idempotencyKey:randomUUID()})).attempt;
 const signed=a.payment.signed(a.payment.event(attempt.id,'succeeded'));await a.services.payments.webhook(signed.raw,signed.signature);
 return {...a,session,promotion,draft,attempt,input:{expectedVersion:draft.version,expectedFingerprint:draft.pricing!.fingerprint,paymentAttemptId:attempt.id,idempotencyKey:randomUUID()}};
}
for(const percent of [false,true])test(`F16 discounted HTTP completion snapshots ${percent?'exact percentage':'fixed'} sums and atomically replays usage`,async t=>{
 const a=await discountedCase(t,percent);
 const discount=percent?4938:1000;
 assert.equal(a.attempt.amount.amountMinor,24690-discount+7350);
 const results=await Promise.all([a.client.checkout.confirmIntegratedForTest(a.draft.id,a.input),a.client.checkout.confirmIntegratedForTest(a.draft.id,a.input)]);
 assert.equal(results[0].order.id,results[1].order.id);assert.equal(results.filter(x=>x.replayed).length,1);
 const order=results[0].order;assert.equal(order.discount.amountMinor,discount);assert.equal(order.testFinancials!.shipping.amountMinor,7350);assert.equal(order.testFinancials!.total.amountMinor,a.attempt.amount.amountMinor);
 assert.equal((await a.pool.query('SELECT count(*)::int n FROM bazar.promotion_usage_claims')).rows[0].n,1);
 await a.pool.query('UPDATE bazar.variants SET price_minor=30000 WHERE id=$1',[a.s.variant]);
 assert.deepEqual(await a.client.checkout.getOrder(order.id),order);
 await assert.rejects(a.pool.query('UPDATE bazar.order_test_financials SET total_minor=1 WHERE order_id=$1',[order.id]),{code:'23514'});
});
test('F16 expiry after signed proof rolls back order and promotion usage',async t=>{
 const a=await discountedCase(t);
 await a.pool.query('UPDATE bazar.promotions SET ends_at=clock_timestamp() WHERE id=$1',[a.promotion]);
 await assert.rejects(a.client.checkout.confirmIntegratedForTest(a.draft.id,a.input),{status:409});
 assert.equal((await a.pool.query('SELECT count(*)::int n FROM bazar.promotion_usage_claims')).rows[0].n,0);
 assert.equal((await a.pool.query("SELECT count(*)::int n FROM bazar.orders WHERE foundation_mode='integration-test'")).rows[0].n,0);
});
test('F16 competing discounted checkouts serialize one global use without deadlocks or double redemption',async t=>{
 const a=await discountedCase(t);const actor=a.s.other;
 const cart=await a.services.currentCart.ensure(actor,{});
 await a.services.currentCart.mutate(actor,'add',{variantId:a.s.variant,quantity:2,expectedVersion:cart.cart.version,idempotencyKey:randomUUID()});
 const fresh=await a.services.currentCart.get(actor);
 const address=(await a.pool.query("INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref) VALUES($1,'nova-poshta','synthetic-city','synthetic-location') RETURNING id",[actor])).rows[0].id;
 let draft=await a.services.checkout.start(actor,{cartId:fresh.cart.id,expectedCartVersion:fresh.cart.version,idempotencyKey:randomUUID()});
 const selection=await a.services.shipping.select(actor,draft.id,{expectedVersion:draft.version,addressId:address,kind:'branch'});
 await a.services.shipping.quote(actor,draft.id,{expectedVersion:selection.checkoutVersion,idempotencyKey:randomUUID()});
 draft=await a.services.checkout.setPayment(actor,draft.id,{expectedVersion:selection.checkoutVersion,paymentSelection:'card-online',promoCode:'F16'});
 const attempt=(await a.services.payments.create(actor,{checkoutId:draft.id,expectedVersion:draft.version,method:'card',idempotencyKey:randomUUID()})).attempt;
 const signed=a.payment.signed(a.payment.event(attempt.id,'succeeded'));await a.services.payments.webhook(signed.raw,signed.signature);
 const outcomes=await Promise.allSettled([a.services.checkout.confirmIntegratedForTest(a.session.user.id,a.draft.id,a.input),a.services.checkout.confirmIntegratedForTest(actor,draft.id,{expectedVersion:draft.version,expectedFingerprint:draft.pricing!.fingerprint,paymentAttemptId:attempt.id,idempotencyKey:randomUUID()})]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const failure=outcomes.find(x=>x.status==='rejected');assert.ok(failure && failure.status==='rejected');assert.equal(failure.reason.status,409);
 for(const table of ['orders','promotion_usage_claims','order_test_financials'])assert.equal((await a.pool.query(`SELECT count(*)::int n FROM bazar.${table}${table==='orders'?" WHERE foundation_mode='integration-test'":""}`)).rows[0].n,1);
});
test('F16 failed financial persistence rolls back usage and confirmation atomically and exact retry succeeds',async t=>{
 const a=await discountedCase(t);
 await a.pool.query("CREATE FUNCTION bazar.fail_f16() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic failure'; END$$; CREATE TRIGGER fail_f16 BEFORE INSERT ON bazar.order_test_financials FOR EACH ROW EXECUTE FUNCTION bazar.fail_f16()");
 await assert.rejects(a.client.checkout.confirmIntegratedForTest(a.draft.id,a.input),{status:500});
 for(const table of ['orders','promotion_usage_claims','order_test_financials'])assert.equal((await a.pool.query(`SELECT count(*)::int n FROM bazar.${table}${table==='orders'?" WHERE foundation_mode='integration-test'":""}`)).rows[0].n,0);
 await a.pool.query('DROP TRIGGER fail_f16 ON bazar.order_test_financials');
 assert.equal((await a.client.checkout.confirmIntegratedForTest(a.draft.id,a.input)).replayed,false);
});
