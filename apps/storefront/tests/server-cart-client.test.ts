import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createServerCartClient,
  ServerCartClientError,
} from '../lib/server-cart-client';
import { createServerCheckoutIntegrationClients } from '../lib/server-checkout-integration';
const id = '12345678-1234-1234-1234-123456789abc';
const view = {
  mode: 'integration-test',
  guestMerge: 'none',
  freshness: 'current',
  cart: {
    id,
    version: 1,
    lines: [],
    subtotal: { amountMinor: 0, currency: 'UAH' },
  },
  inventory: [],
  canCheckout: false,
};
const response = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data, meta: { requestId: id } }), {
    headers: { 'content-type': 'application/json' },
  });
test('server cart transport keeps guest data out of ensure, enforces cookies/CSRF and distinguishes historical mutation replay', async () => {
  let sent: RequestInit | undefined;
  const client = createServerCartClient(
    () => 'a'.repeat(43),
    async (_url, init) => {
      sent = init;
      return response(view);
    },
  );
  assert.equal((await client.ensureCurrent()).guestMerge, 'none');
  assert.equal(sent?.body, '{}');
  assert.equal(sent?.credentials, 'same-origin');
  assert.equal(sent?.cache, 'no-store');
  assert.equal(sent?.redirect, 'error');
  assert.equal(new Headers(sent?.headers).get('x-csrf-token'), 'a'.repeat(43));
  const replay = createServerCartClient(
    () => 'a'.repeat(43),
    async () =>
      response({
        view: {
          ...view,
          freshness: 'historical-replay',
          cart: { ...view.cart, version: 2 },
        },
        replayed: true,
      }),
  );
  assert.equal(
    (await replay.remove(id, { expectedVersion: 1, idempotencyKey: id })).view
      .freshness,
    'historical-replay',
  );
  const bad = createServerCartClient(
    () => 'a'.repeat(43),
    async () =>
      response({
        view: { ...view, cart: { ...view.cart, version: 2 } },
        replayed: true,
      }),
  );
  await assert.rejects(
    bad.remove(id, { expectedVersion: 1, idempotencyKey: id }),
    { code: 'invalid-response' },
  );
  for (const patch of [
    { mode: 'live' },
    { guestMerge: 'automatic' },
    { freshness: 'historical-replay' },
  ])
    await assert.rejects(
      createServerCartClient(
        () => 'a'.repeat(43),
        async () => response({ ...view, ...patch }),
      ).get(),
      { code: 'invalid-response' },
    );
  let calls = 0;
  const offline = createServerCartClient(
    () => 'a'.repeat(43),
    async () => {
      calls++;
      return new Response('secret', { status: 503 });
    },
  );
  await assert.rejects(
    offline.get(),
    (e) =>
      e instanceof ServerCartClientError &&
      e.status === 503 &&
      !e.message.includes('secret'),
  );
  assert.equal(calls, 1);
});
test('integration controller captures CSRF in memory and does not copy a local cart or fabricate a ready checkout', async () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  const client = createServerCheckoutIntegrationClients(
    { baseUrl: 'https://api.bazar.test', timeoutMs: 3000 },
    async (path, init) => {
      calls.push({ path: String(path), init });
      return String(path).endsWith('/csrf')
        ? response({ csrfToken: 'a'.repeat(43), mode: 'test-only' })
        : response(view);
    },
  );
  await client.auth.bootstrap();
  await client.cart.ensureCurrent();
  assert.equal(calls[1].init?.body, '{}');
  assert.equal(
    new Headers(calls[1].init?.headers).get('x-csrf-token'),
    'a'.repeat(43),
  );
  await assert.rejects(client.startCurrentCheckout(id));
  assert.equal(calls.filter((c) => c.path === '/api/v1/checkouts').length, 0);
});
