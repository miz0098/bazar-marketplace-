import assert from 'node:assert/strict';
import test from 'node:test';
import { queryProducts, suggestProducts } from '../domain/catalog/query';
import { demoProducts } from '../fixtures/catalog';

test('search matches Ukrainian product text and vendor', () => {
  assert.equal(queryProducts(demoProducts, { query: 'навушники', limit: 24 }).items[0]?.handle, 'sony-headphones');
  assert.equal(queryProducts(demoProducts, { query: 'sony', limit: 24 }).total, 2);
});

test('category and subcategory filters combine', () => {
  const result = queryProducts(demoProducts, { category: 'electronics', subcategory: 'Ноутбуки', limit: 24 });
  assert.deepEqual(result.items.map((item) => item.handle), ['lenovo-ideapad']);
});

test('sort and pagination return deterministic pages', () => {
  const result = queryProducts(demoProducts, { sort: 'price-asc', page: 2, limit: 4 });
  assert.equal(result.page, 2);
  assert.equal(result.items.length, 4);
  assert.ok(result.items[0]!.price.amountMinor <= result.items[1]!.price.amountMinor);
});

test('suggestions require two characters and respect limit', () => {
  assert.equal(suggestProducts(demoProducts, 's').length, 0);
  assert.equal(suggestProducts(demoProducts, 'ap', 1).length, 1);
});
