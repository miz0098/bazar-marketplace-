import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { isServerCartView } from '../src/contracts/server-cart.js';
test('current cart snapshots reject forged stock, totals, duplicate lines and falsely live or merged results', () => {
  const id = '12345678-1234-1234-1234-123456789abc',
    price = { amountMinor: 1000, currency: 'UAH' },
    line = {
      productId: id,
      variantId: id,
      quantity: 2,
      lineTotal: { ...price, amountMinor: 2000 },
    },
    stock = { variantId: id, stock: 5, available: true, unitPrice: price };
  const view = {
    mode: 'integration-test',
    guestMerge: 'none',
    freshness: 'current',
    cart: { id, version: 2, lines: [line], subtotal: line.lineTotal },
    inventory: [stock],
    canCheckout: true,
  };
  assert.equal(isServerCartView(view), true);
  for (const patch of [
    { mode: 'production' },
    { guestMerge: 'automatic' },
    { canCheckout: false },
    { inventory: [{ ...stock, stock: 1 }] },
    { cart: { ...view.cart, subtotal: price } },
    {
      cart: {
        ...view.cart,
        lines: [line, { ...line, variantId: id.toUpperCase() }],
      },
      inventory: [stock, { ...stock, variantId: id.toUpperCase() }],
    },
  ])
    assert.equal(isServerCartView({ ...view, ...patch }), false);
});
test('ordinary processes cannot construct the current-cart or full checkout integration graph', () => {
  const code =
    "import assert from 'node:assert/strict';import {createCurrentCartService} from './src/cart/service.ts';import {createCheckoutIntegrationServices} from './src/integration/checkout.ts';assert.throws(()=>createCurrentCartService({}),/isolated verified-session/);assert.throws(()=>createCheckoutIntegrationServices({},{}),/isolated integration/);";
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
