import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import test, { type TestContext } from 'node:test';
import { readConfig } from '../src/config.js';
import { plannedModules } from '../src/contracts/modules.js';
import { createLogger } from '../src/logger.js';
import { createApiServer } from '../src/server.js';

async function application(t: TestContext, dependencies: { isReady?: () => boolean } = {}) {
  const lines: string[] = [];
  const app = createApiServer(readConfig({ NODE_ENV: 'test', PORT: '0', SHUTDOWN_TIMEOUT_MS: '100' }), createLogger('info', (line) => lines.push(line)), { isReady: () => true, ...dependencies });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const address = app.server.address();
  assert.ok(address && typeof address !== 'string');
  t.after(() => app.shutdown());
  return { ...app, url: `http://127.0.0.1:${address.port}`, port: address.port, lines };
}

async function raw(port: number, request: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    let response = '';
    socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Raw request timed out')); });
    socket.on('connect', () => socket.write(request));
    socket.on('data', (data: Buffer) => { response += data.toString(); });
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
  });
}

test('liveness, readiness and v1 discovery have validated envelopes and no business-success claims', async (t) => {
  const app = await application(t);
  for (const path of ['/health', '/ready', '/api/v1']) {
    const response = await fetch(app.url + path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['data', 'meta', 'ok']);
    assert.equal(body.ok, true);
    assert.match(body.meta.requestId, /^[a-f0-9-]{36}$/);
    assert.equal(response.headers.get('x-request-id'), body.meta.requestId);
    if (path === '/health') {
      assert.equal(body.data.scope, 'process');
      assert.equal(body.data.status, 'ok');
      assert.ok(Number.isSafeInteger(body.data.uptimeSeconds));
    } else assert.equal(body.data.businessModulesAvailable, false);
  }
  const head = await fetch(app.url + '/health', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('planned private modules remain unavailable and catalog fails closed without PostgreSQL', async (t) => {
  const app = await application(t);
  assert.equal(plannedModules.length, 13);
  for (const module of plannedModules) {
    const response = await fetch(app.url + module.path);
    assert.equal(response.status, ['catalog','categories','identity','users','orders','delivery','payments','wishlist'].includes(module.name) ? 503 : module.name === 'cart' ? 401 : 404, module.name);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.error.code, ['catalog','categories','identity','users','orders','delivery','payments','wishlist'].includes(module.name) ? 'SERVICE_UNAVAILABLE' : module.name === 'cart' ? 'AUTH_REQUIRED' : 'NOT_FOUND');
  }
  for (const path of ['/api/v1/auth/otp/challenges', '/api/v1/payments', '/api/v1/orders']) {
    assert.equal((await fetch(app.url + path, { method: 'POST' })).status, path.startsWith('/api/v1/auth/') || path==='/api/v1/orders' || path==='/api/v1/payments' ? 503 : 404);
  }
});

test('OpenAPI describes catalog and blocked cart while retaining foundation schemas', async (t) => {
  const contract = JSON.parse(readFileSync(new URL('../contracts/openapi.json', import.meta.url), 'utf8'));
  const app = await application(t);
  assert.equal(contract.openapi, '3.1.0');
  assert.deepEqual(Object.keys(contract.paths).sort(), ['/api/v1/communication/conversations', '/api/v1/communication/tickets', '/api/v1/communication/notifications', '/api/v1/communication/conversations/{id}/messages', '/api/v1/communication/tickets/{id}/messages', '/api/v1/communication/conversations/{id}/pin', '/api/v1/communication/conversations/{id}/read', '/api/v1/communication/notifications/{id}/read', '/api/v1/wishlist', '/api/v1/wishlist/items/{productId}', '/api/v1/customer/profile', '/api/v1/customer/addresses', '/api/v1/customer/addresses/{id}', '/api/v1/customer/addresses/{id}/default', '/api/v1/customer/reviews', '/api/v1/customer/reviews/{id}', '/api/v1', '/api/v1/cart', '/api/v1/cart/lines', '/api/v1/cart/lines/{variantId}', '/api/v1/checkouts/{id}/confirmation', '/api/v1/categories', '/api/v1/products', '/api/v1/products/{handle}', '/health', '/ready', '/api/v1/auth/csrf','/api/v1/auth/otp/challenges','/api/v1/auth/otp/verify','/api/v1/auth/session','/api/v1/users/me','/api/v1/auth/logout','/api/v1/auth/logout-all','/api/v1/pricing/promotions/evaluate','/api/v1/checkouts','/api/v1/checkouts/{id}','/api/v1/checkouts/{id}/contact-delivery','/api/v1/checkouts/{id}/payment','/api/v1/checkouts/{id}/orders','/api/v1/orders','/api/v1/orders/{id}','/api/v1/delivery/carriers','/api/v1/delivery/cities','/api/v1/delivery/points','/api/v1/delivery/checkouts/{id}/selection','/api/v1/delivery/checkouts/{id}/quotes','/api/v1/delivery/checkouts/{id}/check','/api/v1/payments/capabilities','/api/v1/payments/attempts','/api/v1/payments/attempts/{id}','/api/v1/payments/attempts/{id}/reconcile','/api/v1/payments/attempts/{id}/cancel','/api/v1/payments/webhooks/isolated'].sort());
  assert.deepEqual(contract['x-planned-modules'].map((module: { name: string }) => module.name), plannedModules.map((module) => module.name));
  for (const module of contract['x-planned-modules']) assert.equal(module.status, ['catalog','categories'].includes(module.name) ? 'implemented' : ['cart','wishlist'].includes(module.name) ? 'blocked-production-sms' : ['identity','users'].includes(module.name) ? 'blocked-production-sms' : module.name==='orders' ? 'blocked-production-checkout' : module.name==='delivery' ? 'blocked-production-provider' : module.name==='payments' ? 'blocked-production-payment-provider' : 'not-implemented');
  for (const path of ['/health','/ready','/api/v1']) {
    const response = await fetch(app.url + path);
    const body = await response.json();
    const reference = contract.paths[path].get.responses['200'].content['application/json'].schema.$ref.split('/').at(-1);
    const schema = contract.components.schemas[reference];
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(body).sort(), [...schema.required].sort());
    assert.deepEqual(Object.keys(body.data).sort(), [...schema.properties.data.required].sort());
  }
});

test('input validation rejects unsupported methods, query strings, malformed URLs and bodies', async (t) => {
  const app = await application(t);
  const method = await fetch(app.url + '/health', { method: 'POST' });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'GET, HEAD, OPTIONS');
  const query = await fetch(app.url + '/health?token=do-not-leak');
  assert.equal(query.status, 400);
  assert.doesNotMatch(await query.text(), /do-not-leak/);
  const malformed = await raw(app.port, 'GET /%zz HTTP/1.1\r\nHost: local\r\nConnection: close\r\n\r\n');
  assert.match(malformed, /400 Bad Request/);
  assert.equal(JSON.parse(malformed.split('\r\n\r\n')[1]).error.code, 'INVALID_REQUEST');
  const body = await raw(app.port, 'GET /health HTTP/1.1\r\nHost: local\r\nContent-Length: 6\r\n\r\nsecret');
  assert.match(body, /400 Bad Request/);
  assert.match(body.toLowerCase(), /connection: close/);
  const large = await raw(app.port, `GET /health HTTP/1.1\r\nHost: local\r\nX-Large: ${'x'.repeat(20000)}\r\nConnection: close\r\n\r\n`);
  assert.match(large, /431 Request Header Fields Too Large/);
  assert.equal(JSON.parse(large.split('\r\n\r\n')[1]).error.code, 'HEADERS_TOO_LARGE');
  assert.doesNotMatch(app.lines.join('\n'), /do-not-leak|secret|X-Large|%zz/);
});

test('CORS uses exact origins, no credentials, and narrowly validated preflight', async (t) => {
  const app = await application(t);
  const origin = 'http://localhost:3000';
  const allowed = await fetch(app.url + '/health', { headers: { origin } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), origin);
  assert.equal(allowed.headers.get('access-control-allow-credentials'), null);
  assert.equal(allowed.headers.get('access-control-expose-headers'), 'X-Request-Id');
  assert.equal(allowed.headers.get('vary'), 'Origin');
  await allowed.body?.cancel();
  for (const origin of ['null', 'https://evil.invalid', 'http://localhost:3000.evil.invalid']) {
    const denied = await fetch(app.url + '/health', { headers: { origin } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.equal((await denied.json()).error.code, 'CORS_DENIED');
  }
  const preflight = await fetch(app.url + '/health', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'Content-Type' } });
  assert.equal(preflight.status, 204);
  assert.equal(await preflight.text(), '');
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, HEAD');
  const unsupported = await fetch(app.url + '/health', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } });
  assert.equal(unsupported.status, 405);
  await unsupported.body?.cancel();
  const headers = await fetch(app.url + '/health', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'Authorization' } });
  assert.equal(headers.status, 400);
  await headers.body?.cancel();
  const missing = await fetch(app.url + '/health', { method: 'OPTIONS' });
  assert.equal(missing.status, 400);
  await missing.body?.cancel();
});

test('readiness failure is separate from liveness and unexpected errors never disclose internals', async (t) => {
  let mode = 'unready';
  const app = await application(t, { isReady: () => { if (mode === 'throw') throw new Error('database-password-private'); return false; } });
  const unavailable = await fetch(app.url + '/ready');
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error.code, 'SERVICE_UNAVAILABLE');
  assert.equal((await fetch(app.url + '/health')).status, 200);
  mode = 'throw';
  const failed = await fetch(app.url + '/ready');
  assert.equal(failed.status, 500);
  const body = await failed.text();
  assert.equal(JSON.parse(body).error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(body + app.lines.join(''), /database-password-private|stack/);
});

test('graceful shutdown is idempotent and bounds incomplete connections', { timeout: 3000 }, async (t) => {
  const app = await application(t);
  const socket = createConnection({ port: app.port, host: '127.0.0.1' });
  socket.on('error', () => {});
  t.after(() => socket.destroy());
  await once(socket, 'connect');
  socket.write('GET /health HTTP/1.1\r\nHost: local\r\n');
  const first = app.shutdown();
  assert.equal(first, app.shutdown());
  await first;
  assert.equal(app.server.listening, false);
  assert.ok(app.lines.some((line) => JSON.parse(line).event === 'shutdown'));
});
