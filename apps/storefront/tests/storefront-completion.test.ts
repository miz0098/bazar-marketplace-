import { createDemoRecentViews } from '../services/mock/recent-service';
import assert from 'node:assert/strict';
import test from 'node:test';
import { demoProducts } from '../fixtures/catalog';
import { cartKey, selectVariant } from '../domain/catalog/variants';
import {
  cartError,
  cartReducer,
  createCart,
  parseStoredCart,
} from '../domain/cart/cart';
import { queryProducts } from '../domain/catalog/query';
import { createDemoAccountService } from '../services/mock/account-service';
import { MockContentService } from '../services/mock/content-service';
const phone = demoProducts.find((p) => p.id === 'iphone-15')!;
test('distinct variants keep their own prices/stock and cannot silently cap a successful add', () => {
  const base = selectVariant(phone)!,
    black = selectVariant(phone, 'iphone-15-black')!;
  assert.notEqual(cartKey(base), cartKey(black));
  assert.equal(black.price.amountMinor, 4599900);
  let cart = cartReducer(createCart([]), {
    type: 'add',
    product: base,
    quantity: 1,
  });
  cart = cartReducer(cart, { type: 'add', product: black, quantity: 2 });
  assert.equal(cart.lines.length, 2);
  assert.equal(
    cart.subtotal.amountMinor,
    base.price.amountMinor + black.price.amountMinor * 2,
  );
  assert.match(cartError(cart, black, 1, true), /лише 2/);
  assert.equal(cartReducer(cart, { type: 'add', product: black }), cart);
  assert.equal(
    cartReducer(cart, {
      type: 'update',
      productId: cartKey(black),
      quantity: 3,
    }),
    cart,
  );
  assert.equal(
    cartReducer(cart, { type: 'remove', productId: cartKey(black) }).lines
      .length,
    1,
  );
  assert.equal(selectVariant(phone, 'missing'), undefined);
  assert.equal(selectVariant(phone, 'iphone-15-silver')!.available, false);
});
test('cart restoration resolves only canonical catalog/variant data and bounds malformed or stale storage', () => {
  const forged = {
    product: {
      ...phone,
      variantId: 'iphone-15-black',
      price: { amountMinor: 1, currency: 'UAH' },
      stock: 999,
      title: 'forged',
    },
    quantity: 99,
  };
  const restored = createCart(
    parseStoredCart(
      JSON.stringify([
        forged,
        forged,
        { product: { id: 'unknown' }, quantity: 1 },
        { product: { id: phone.id, variantId: 'missing' }, quantity: 1 },
        { product: { id: phone.id }, quantity: -1 },
      ]),
      demoProducts,
    ),
  );
  assert.equal(restored.lines.length, 1);
  assert.equal(restored.itemCount, 2);
  assert.equal(restored.subtotal.amountMinor, 4599900 * 2);
  assert.notEqual(restored.lines[0].product.title, 'forged');
  for (const data of ['{broken', 'null', '{}', '[null,1,{}]'])
    assert.deepEqual(parseStoredCart(data, demoProducts), []);
});
test('shared demo wishlist adds once, notifies subscribers and resets with a new preview instance', async () => {
  const service = createDemoAccountService({ latencyMs: 0 }),
    before = service.getWishlistSnapshot().length;
  const product = demoProducts.find(
    (p) => !service.getWishlistSnapshot().some((i) => i.product.id === p.id),
  )!;
  let changes = 0;
  const off = service.subscribeWishlist(() => changes++);
  const results = await Promise.all([
    service.addWishlistItem(product),
    service.addWishlistItem(product),
  ]);
  assert.equal(results[0].persisted, false);
  assert.equal(service.getWishlistSnapshot().length, before + 1);
  assert.equal(changes, 1);
  await service.removeWishlistItem(
    service.getWishlistSnapshot().find((i) => i.product.id === product.id)!.id,
  );
  assert.equal(changes, 2);
  off();
  assert.equal(createDemoAccountService().getWishlistSnapshot().length, before);
  await assert.rejects(service.addWishlistItem({ ...product, id: 'unknown' }), {
    code: 'not-found',
  });
});
test('demo price filters include an explicit zero upper bound and reject reversed ranges as empty', () => {
  assert.equal(queryProducts(demoProducts, { maxPrice: 0 }).total, 0);
  assert.equal(
    queryProducts(demoProducts, { minPrice: 200000, maxPrice: 100000 }).total,
    0,
  );
  const list = queryProducts(demoProducts, {
    minPrice: 100000,
    maxPrice: 200000,
    sort: 'price-asc',
  }).items;
  assert.ok(list.length > 0);
  assert.ok(
    list.every(
      (p) => p.price.amountMinor >= 100000 && p.price.amountMinor <= 200000,
    ),
  );
});
test('footer information has explicit demo boundaries and unknown content stays absent', async () => {
  const service = new MockContentService();
  for (const slug of [
    'how-to-order',
    'delivery',
    'returns',
    'about',
    'contacts',
    'careers',
  ])
    assert.ok((await service.getInfoPage(slug))?.description);
  assert.equal(await service.getInfoPage('__proto__'), null);
  assert.equal(await service.getInfoPage('made-up'), null);
});

test('recent demo views are scoped to known unique IDs and optional storage failure never fabricates history', () => {
  let value = '["a","a","unknown","b"]';
  const history = createDemoRecentViews({
    read: () => value,
    write: (v) => {
      value = v;
    },
  });
  let changes = 0;
  history.subscribe(() => changes++);
  history.visit('b', ['a', 'b']);
  assert.deepEqual(history.getSnapshot(), ['a']);
  assert.deepEqual(JSON.parse(value), ['b', 'a']);
  history.visit('b', ['a', 'b']);
  assert.equal(changes, 1);
  const blocked = createDemoRecentViews({
    read: () => {
      throw new Error('blocked');
    },
    write: () => {},
  });
  blocked.visit('a', ['a']);
  assert.deepEqual(blocked.getSnapshot(), []);
  assert.deepEqual(blocked.getServerSnapshot(), []);
});
