import assert from 'node:assert/strict';
import test from 'node:test';
import { createPromotionPricingClient } from '../lib/promotion-pricing-client';
const id = '12345678-1234-1234-1234-123456789abc',
  csrf = 'a'.repeat(43);
const input = { cartId: id, expectedCartVersion: 1, code: 'Приклад' };
const quote = {
  mode: 'integration-test',
  scope: 'single-product-merchandise',
  checkoutAvailable: false,
  cartId: id,
  cartVersion: 1,
  promotionId: id,
  promotionVersion: 1,
  subtotal: { amountMinor: 1000, currency: 'UAH' },
  discount: { amountMinor: 100, currency: 'UAH' },
  merchandiseTotal: { amountMinor: 900, currency: 'UAH' },
  pricingFingerprint: 'a'.repeat(64),
  evaluatedAt: '2026-10-26T12:00:00.000Z',
  promotionEndsAt: '2026-10-26T13:00:00.000Z',
};
const response = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data, meta: { requestId: id } }), {
    headers: { 'content-type': 'application/json' },
  });
test('future checkout pricing transport sends cart/version/code and validates authoritative integer totals', async () => {
  const client = createPromotionPricingClient(
    () => csrf,
    async (path, init) => {
      assert.equal(path, '/api/v1/pricing/promotions/evaluate');
      assert.deepEqual(JSON.parse(String(init?.body)), input);
      assert.equal(init?.credentials, 'same-origin');
      assert.equal(init?.cache, 'no-store');
      assert.equal(init?.redirect, 'error');
      assert.equal(new Headers(init?.headers).get('x-csrf-token'), csrf);
      return response(quote);
    },
  );
  assert.equal(
    (await client.evaluate(input)).merchandiseTotal.amountMinor,
    900,
  );
});
test('pricing transport rejects client price fields, wrong cart/version, false live/checkout claims and invalid arithmetic', async () => {
  for (const data of [
    { ...quote, checkoutAvailable: true },
    { ...quote, mode: 'live' },
    { ...quote, cartVersion: 2 },
    { ...quote, discount: { amountMinor: -1, currency: 'UAH' } },
    { ...quote, merchandiseTotal: { amountMinor: 899, currency: 'UAH' } },
  ])
    await assert.rejects(
      createPromotionPricingClient(
        () => csrf,
        async () => response(data),
      ).evaluate(input),
      { code: 'invalid-response' },
    );
  const client = createPromotionPricingClient(
    () => csrf,
    async () => {
      throw new Error('must not send');
    },
  );
  await assert.rejects(client.evaluate({ ...input, subtotal: 1 } as never), {
    code: 'invalid-input',
  });
  await assert.rejects(
    createPromotionPricingClient(
      () => csrf,
      async () => new Response('database-secret', { status: 409 }),
    ).evaluate(input),
    (error) =>
      error instanceof Error && !error.message.includes('database-secret'),
  );
});
