import assert from 'node:assert/strict';
import test from 'node:test';
import { createCheckoutBusinessClient } from '../lib/checkout-business-client';
const id = '12345678-1234-1234-1234-123456789abc',
  token = 'a'.repeat(43);
const draft = {
  id,
  mode: 'integration-test',
  version: 1,
  cartId: id,
  cartVersion: 1,
  stage: 'contact-delivery',
  delivery: null,
  paymentSelection: null,
  pricing: null,
  orderId: null,
  canRecordIntegrationOrder: false,
  canPlaceRealOrder: false,
  blockers: ['live-authentication'],
};
const response = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data, meta: { requestId: id } }), {
    headers: { 'content-type': 'application/json' },
  });
test('checkout client sends references/versions with browser-managed cookies and explicit CSRF, without live claims', async () => {
  const input = { cartId: id, expectedCartVersion: 1, idempotencyKey: id };
  const client = createCheckoutBusinessClient(
    () => token,
    async (path, init) => {
      assert.equal(path, '/api/v1/checkouts');
      assert.deepEqual(JSON.parse(String(init?.body)), input);
      assert.equal(init?.credentials, 'same-origin');
      assert.equal(init?.cache, 'no-store');
      assert.equal(init?.redirect, 'error');
      assert.equal(new Headers(init?.headers).get('x-csrf-token'), token);
      return response(draft);
    },
  );
  assert.equal((await client.start(input)).canPlaceRealOrder, false);
});
test('checkout client rejects manufactured real confirmation/provider success and unavailable runtime without fallback', async () => {
  for (const value of [
    { ...draft, mode: 'live' },
    { ...draft, canPlaceRealOrder: true },
    { ...draft, canRecordIntegrationOrder: true },
  ])
    await assert.rejects(
      createCheckoutBusinessClient(
        () => token,
        async () => response(value),
      ).get(id),
      { code: 'invalid-response' },
    );
  let attempts = 0;
  await assert.rejects(
    createCheckoutBusinessClient(
      () => token,
      async () => {
        attempts++;
        return new Response('sql-secret', { status: 503 });
      },
    ).get(id),
    { code: 'http-error', status: 503 },
  );
  assert.equal(attempts, 1);
  await assert.rejects(
    createCheckoutBusinessClient(
      () => token,
      async () =>
        response({
          mode: 'integration-test',
          status: 'confirmed',
          paymentStatus: 'settled',
        }),
    ).getOrder(id),
    { code: 'invalid-response' },
  );
});
