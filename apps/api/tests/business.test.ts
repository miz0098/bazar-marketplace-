import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCatalogQuery } from '../src/business/catalog.js';
import { money } from '../src/business/validation.js';
test('catalog query validation rejects duplicate, unknown, unsafe and mismatched cursor inputs', () => {
  for (const q of [
    'limit=0',
    'limit=101',
    'limit=1&limit=2',
    'sort=constructor',
    'sort=price;DROP',
    'minPrice=2&maxPrice=1',
    'available=yes',
    'categoryId=someone',
    'userId=someone',
    'cursor=garbage',
    'minPrice=9007199254740992',
  ])
    assert.throws(() => parseCatalogQuery(new URLSearchParams(q)));
  assert.equal(
    parseCatalogQuery(
      new URLSearchParams('query=Телефон&limit=1&sort=price-asc'),
    ).query,
    'Телефон',
  );
});
test('money decoding preserves the safe integer boundary without global pg int8 coercion', () => {
  assert.equal(money('9007199254740991'), Number.MAX_SAFE_INTEGER);
  for (const value of ['9007199254740992', '-1', '1.1', NaN, null])
    assert.throws(() => money(value));
});
