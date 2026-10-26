import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  startInput,
  deliveryInput,
  paymentInput,
  recordInput,
} from '../src/checkout/input.js';
const id = '12345678-1234-1234-1234-123456789abc';
test('checkout inputs admit owned resource references and reject financial/contact/provider overrides', () => {
  assert.equal(
    startInput({ cartId: id, expectedCartVersion: 1, idempotencyKey: id })
      .cartId,
    id,
  );
  assert.equal(
    deliveryInput({ expectedVersion: 1, addressId: id }).addressId,
    id,
  );
  assert.equal(
    paymentInput({
      expectedVersion: 2,
      paymentSelection: 'on-receipt',
      promoCode: null,
    }).promoCode,
    null,
  );
  for (const extra of [
    { userId: id },
    { subtotal: 1 },
    { shipping: 0 },
    { recipientPhone: '+380671234567' },
  ])
    assert.throws(
      () =>
        startInput({
          cartId: id,
          expectedCartVersion: 1,
          idempotencyKey: id,
          ...extra,
        }),
      { status: 400 },
    );
  for (const extra of [
    { cardNumber: 'forbidden' },
    { paid: true },
    { paymentToken: 'invented' },
  ])
    assert.throws(
      () =>
        paymentInput({
          expectedVersion: 2,
          paymentSelection: 'card-online',
          promoCode: null,
          ...extra,
        }),
      { status: 400 },
    );
  for (const version of [0, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(
      () =>
        recordInput({
          expectedVersion: version,
          expectedFingerprint: 'a'.repeat(64),
          idempotencyKey: id,
        }),
      { status: 400 },
    );
});
test('production cannot construct the isolated checkout service', () => {
  const code =
    "import assert from 'node:assert/strict'; import {createCheckoutBusinessService} from './src/checkout/service.ts'; assert.throws(()=>createCheckoutBusinessService({}),/isolated test process/);";
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', code],
    {
      env: { PATH: process.env.PATH, NODE_ENV: 'production' },
      encoding: 'utf8',
      timeout: 5000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
});
