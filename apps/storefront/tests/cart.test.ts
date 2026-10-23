import assert from 'node:assert/strict';
import test from 'node:test';
import { cartReducer, createCart, normalizeQuantity, parseStoredCart } from '../domain/cart/cart';
import { demoProducts } from '../fixtures/catalog';

const available = demoProducts.find((product) => product.available)!;
const unavailable = demoProducts.find((product) => !product.available)!;

test('adds lines and calculates integer-minor-unit totals', () => {
  const cart = cartReducer(createCart([]), { type: 'add', product: available, quantity: 2 });
  assert.equal(cart.itemCount, 2);
  assert.equal(cart.subtotal.amountMinor, available.price.amountMinor * 2);
});

test('updates and removes cart lines', () => {
  const added = cartReducer(createCart([]), { type: 'add', product: available });
  const updated = cartReducer(added, { type: 'update', productId: available.id, quantity: 3 });
  assert.equal(updated.lines[0]?.quantity, 3);
  assert.equal(cartReducer(updated, { type: 'remove', productId: available.id }).lines.length, 0);
});

test('rejects invalid quantities and unavailable products', () => {
  assert.equal(normalizeQuantity(-3), 1);
  assert.equal(cartReducer(createCart([]), { type: 'add', product: unavailable }).lines.length, 0);
  const cart = cartReducer(createCart([{ product: available, quantity: 2 }]), { type: 'update', productId: available.id, quantity: 0 });
  assert.equal(cart.lines[0]?.quantity, 2);
});

test('handles malformed persisted cart safely', () => {
  assert.deepEqual(parseStoredCart('{broken'), []);
  assert.deepEqual(parseStoredCart(JSON.stringify([{ nope: true }])), []);
});
