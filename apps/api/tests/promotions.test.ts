import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDiscount } from '../src/promotions/pricing.js';
import { spawnSync } from 'node:child_process';
import { promotionInput } from '../src/promotions/input.js';
const id = '12345678-1234-1234-1234-123456789abc';
test('percentage and fixed discounts use exact minor-unit arithmetic including safe-integer extremes', () => {
  assert.deepEqual(
    calculateDiscount(12300, { kind: 'percentage', basisPoints: 1000 }),
    { discount: 1230, merchandiseTotal: 11070 },
  );
  assert.deepEqual(
    calculateDiscount(800, { kind: 'percentage', basisPoints: 1250 }),
    { discount: 100, merchandiseTotal: 700 },
  );
  assert.deepEqual(
    calculateDiscount(12345, { kind: 'fixed', amountMinor: 2345 }),
    { discount: 2345, merchandiseTotal: 10000 },
  );
  assert.deepEqual(
    calculateDiscount(Number.MAX_SAFE_INTEGER, {
      kind: 'percentage',
      basisPoints: 10000,
    }),
    { discount: Number.MAX_SAFE_INTEGER, merchandiseTotal: 0 },
  );
});
test('fractional minor units and oversized discounts require policy rather than rounding or capping', () => {
  assert.throws(
    () => calculateDiscount(12345, { kind: 'percentage', basisPoints: 1000 }),
    { code: 'PROMOTION_POLICY_REQUIRED' },
  );
  assert.throws(
    () => calculateDiscount(10, { kind: 'fixed', amountMinor: 11 }),
    { code: 'PROMOTION_POLICY_REQUIRED' },
  );
  for (const subtotal of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(
      () => calculateDiscount(subtotal, { kind: 'fixed', amountMinor: 1 }),
      { status: 400 },
    );
  for (const basisPoints of [0, -1, 10001, 1.1])
    assert.throws(
      () => calculateDiscount(10000, { kind: 'percentage', basisPoints }),
      { status: 400 },
    );
});
test('pricing input accepts only owned-cart references and one exact opaque code, never client prices or stacking', () => {
  assert.equal(
    promotionInput({ cartId: id, expectedCartVersion: 1, code: 'Знижка-10' })
      .code,
    'Знижка-10',
  );
  for (const extra of [
    { subtotal: 100 },
    { price: 1 },
    { discount: 100 },
    { userId: id },
    { codes: ['ONE', 'TWO'] },
  ])
    assert.throws(
      () =>
        promotionInput({
          cartId: id,
          expectedCartVersion: 1,
          code: 'ONE',
          ...extra,
        }),
      { status: 400 },
    );
  for (const code of ['', ' ONE', 'ONE ', 'a'.repeat(65), 'x\0y'])
    assert.throws(
      () => promotionInput({ cartId: id, expectedCartVersion: 1, code }),
      { status: 400 },
    );
  for (const version of [0, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(
      () =>
        promotionInput({
          cartId: id,
          expectedCartVersion: version,
          code: 'ONE',
        }),
      { status: 400 },
    );
});

test('ordinary runtime cannot construct the isolated promotion integration service',()=>{
  const code="import assert from 'node:assert/strict'; import {createPromotionService} from './src/promotions/service.ts'; assert.throws(()=>createPromotionService({}),/isolated test process/);";
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',code],{env:{PATH:process.env.PATH,NODE_ENV:'production'},encoding:'utf8',timeout:5000});
  assert.equal(result.status,0,result.stderr);
});
