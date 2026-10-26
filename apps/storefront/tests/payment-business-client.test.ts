import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPaymentBusinessClient,
  PaymentClientError,
} from '../lib/payment-business-client';
import { eligibleWallets } from '../lib/payment-capabilities';
const id = '00000000-0000-0000-0000-000000000001';
const attempt = {
  id,
  checkoutId: id,
  mode: 'integration-test',
  amountBasis: 'isolated-test-plan',
  method: 'card',
  status: 'pending',
  amount: { amountMinor: 25000, currency: 'UAH' },
  createdAt: '2026-01-01T00:00:00.000Z',
  version: 2,
  canRetry: false,
  realPayment: false,
  orderPaid: false,
};
const response = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data, meta: { requestId: id } }), {
    headers: { 'content-type': 'application/json' },
  });
test('payment client sends only references and CSRF, never accepts a claimed real charge or unsafe retry', async () => {
  let sent: RequestInit | undefined;
  const client = createPaymentBusinessClient(
    () => 'a'.repeat(43),
    async (_url, init) => {
      sent = init;
      return response({ attempt, replayed: false });
    },
  );
  assert.equal(
    (
      await client.create({
        checkoutId: id,
        expectedVersion: 3,
        method: 'card',
        idempotencyKey: id,
      })
    ).attempt.orderPaid,
    false,
  );
  assert.equal(sent?.credentials, 'same-origin');
  assert.equal(sent?.cache, 'no-store');
  assert.equal(sent?.redirect, 'error');
  assert.equal(new Headers(sent?.headers).get('x-csrf-token'), 'a'.repeat(43));
  for (const patch of [
    { realPayment: true },
    { orderPaid: true },
    { mode: 'production' },
    { status: 'unknown', canRetry: true },
    { amount: { amountMinor: 0, currency: 'UAH' } },
    { status: 'paid' },
  ]) {
    const bad = createPaymentBusinessClient(
      () => 'a'.repeat(43),
      async () => response({ ...attempt, ...patch }),
    );
    await assert.rejects(bad.get(id), { code: 'invalid-response' });
  }
  let calls = 0;
  const offline = createPaymentBusinessClient(
    () => 'a'.repeat(43),
    async () => {
      calls++;
      return new Response('secret-provider-error', { status: 503 });
    },
  );
  await assert.rejects(
    offline.get(id),
    (e) =>
      e instanceof PaymentClientError &&
      e.status === 503 &&
      !e.message.includes('secret'),
  );
  assert.equal(calls, 1);
});
test('wallet visibility requires secure browser/device probes AND an enabled compatible provider, never an OS name', async () => {
  const ready = {
    secureContext: true,
    providerEnabled: true,
    providerMethods: ['apple-pay', 'google-pay'],
    appleCanMakePayments: () => true,
    googleIsReadyToPay: async () => true,
  };
  assert.deepEqual(await eligibleWallets(ready), {
    applePay: true,
    googlePay: true,
  });
  assert.deepEqual(
    await eligibleWallets({ ...ready, providerEnabled: false }),
    { applePay: false, googlePay: false },
  );
  assert.deepEqual(await eligibleWallets({ ...ready, secureContext: false }), {
    applePay: false,
    googlePay: false,
  });
  assert.deepEqual(
    await eligibleWallets({ ...ready, providerMethods: ['card'] }),
    { applePay: false, googlePay: false },
  );
  assert.deepEqual(
    await eligibleWallets({
      ...ready,
      appleCanMakePayments: () => false,
      googleIsReadyToPay: async () => {
        throw new Error('not ready');
      },
    }),
    { applePay: false, googlePay: false },
  );
});
