import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogApiClient } from '../lib/catalog-api-client';
const config = { baseUrl: 'http://127.0.0.1:4000', timeoutMs: 500 };
const id = '12345678-1234-1234-1234-123456789abc';
const item = {
  id,
  categoryId: id,
  handle: 'телефон',
  title: 'Телефон',
  description: '',
  price: { amountMinor: 123, currency: 'UAH' },
  availability: 'available',
};
test('catalog transport validates payloads and sends encoded credential-free, uncached reads', async () => {
  let observed = '';
  const client = createCatalogApiClient(config, async (input, init) => {
    observed = String(input);
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.redirect, 'error');
    return new Response(
      JSON.stringify({
        ok: true,
        data: { items: [item], nextCursor: null },
        meta: { requestId: id },
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  });
  assert.equal(
    (await client.list({ query: 'Телефон', available: true })).items[0].title,
    'Телефон',
  );
  assert.equal(new URL(observed).searchParams.get('query'), 'Телефон');
});
test('catalog transport refuses invalid prices, variants and unauthorized responses without mock fallback', async () => {
  for (const data of [
    {
      items: [{ ...item, price: { amountMinor: -1, currency: 'UAH' } }],
      nextCursor: null,
    },
    {
      ...item,
      variants: [
        {
          id,
          sku: 'x',
          price: item.price,
          stock: 0,
          availability: 'available',
        },
      ],
    },
  ]) {
    const client = createCatalogApiClient(
      config,
      async () =>
        new Response(
          JSON.stringify({ ok: true, data, meta: { requestId: id } }),
          { headers: { 'content-type': 'application/json' } },
        ),
    );
    await assert.rejects(
      'items' in data ? client.list() : client.get('телефон'),
      { code: 'invalid-response' },
    );
  }
  const client = createCatalogApiClient(
    config,
    async () => new Response('{}', { status: 401 }),
  );
  await assert.rejects(client.list(), { code: 'http-error', status: 401 });
});
