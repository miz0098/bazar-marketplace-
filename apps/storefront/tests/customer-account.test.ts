import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPersistentDemoAccountService,
  parseWishlistIds,
} from '../services/mock/persistent-wishlist';
import { demoProducts } from '../fixtures/catalog';
import { createCustomerBusinessClient } from '../lib/customer-business-client';
import { isCustomerView } from '../services/contracts/customer-business';
const id = '12345678-1234-1234-1234-123456789abc';
test('persistent demo wishlist stores only IDs, restores current canonical products, syncs deletions and keeps unavailable items', async () => {
  let value: string | null = JSON.stringify({
    version: 1,
    productIds: ['camera', 'camera', 'gone'],
  });
  const storage = {
    read: () => value,
    write: (v: string) => {
      value = v;
    },
  };
  const service = createPersistentDemoAccountService();
  service.connectWishlist(storage);
  assert.equal(service.isWishlistReady(), true);
  assert.equal(service.getWishlistSnapshot().length, 1);
  assert.equal(service.getWishlistSnapshot()[0].product.available, false);
  await service.addWishlistItem(
    demoProducts.find((p) => p.id === 'garden-lamp')!,
  );
  const saved = JSON.parse(value!);
  assert.deepEqual(Object.keys(saved).sort(), ['productIds', 'version']);
  assert.equal(saved.productIds[0], 'garden-lamp');
  assert.doesNotMatch(value!, /price|phone|profile|token|recipient/i);
  const restored = createPersistentDemoAccountService();
  restored.connectWishlist(storage);
  assert.equal(restored.getWishlistSnapshot()[0].product.id, 'garden-lamp');
  await restored.removeWishlistItems(
    restored.getWishlistSnapshot().map((i) => i.id),
  );
  service.reloadWishlist();
  assert.equal(service.getWishlistSnapshot().length, 0);
  const empty = createPersistentDemoAccountService();
  empty.connectWishlist(storage);
  assert.equal(empty.getWishlistSnapshot().length, 0);
  value = null;
  service.reloadWishlist();
  assert.equal(service.getWishlistSnapshot().length, 0);
});
test('malformed/oversized/PII-shaped storage is reset without copying untrusted product data; denied storage stays explicit', async () => {
  for (const raw of [
    '{broken',
    '[]',
    'null',
    JSON.stringify({ version: 1, productIds: ['camera'], phone: 'private' }),
    JSON.stringify({ version: 2, productIds: [] }),
    JSON.stringify({ version: 1, productIds: [{}] }),
    'x'.repeat(17000),
  ]) {
    assert.throws(() => parseWishlistIds(raw));
    let value = raw;
    const service = createPersistentDemoAccountService();
    service.connectWishlist({
      read: () => value,
      write: (v) => {
        value = v;
      },
    });
    assert.equal(service.getWishlistSnapshot().length, 0);
    assert.match(service.getWishlistNotice(), /Пошкоджене/);
    assert.deepEqual(JSON.parse(value), { version: 1, productIds: [] });
  }
  const blocked = createPersistentDemoAccountService();
  blocked.connectWishlist({
    read: () => {
      throw new Error('blocked');
    },
    write: () => {
      throw new Error('blocked');
    },
  });
  assert.equal(blocked.isWishlistReady(), true);
  await blocked.addWishlistItem(
    demoProducts.find((p) => p.id === 'garden-lamp')!,
  );
  assert.match(blocked.getWishlistNotice(), /Не вдалося зберегти/);
  assert.ok(
    blocked.getWishlistSnapshot().some((i) => i.product.id === 'garden-lamp'),
  );
});
test('customer client sends only scoped paths and CSRF/cookies; invalid/live/published output never becomes demo success', async () => {
  const profile = {
    mode: 'integration-test',
    resource: 'profile',
    profile: { id, firstName: 'Synthetic', lastName: 'Example', version: 1 },
  };
  let seen: RequestInit | undefined;
  const envelope = (v: unknown) =>
    new Response(
      JSON.stringify({ ok: true, data: v, meta: { requestId: id } }),
      { headers: { 'content-type': 'application/json' } },
    );
  const client = createCustomerBusinessClient(
    () => 'a'.repeat(43),
    async (_url, init) => {
      seen = init;
      return envelope({
        ...profile,
        profile: {
          ...profile.profile,
          version: init?.method === 'PATCH' ? 2 : 1,
        },
      });
    },
  );
  assert.equal((await client.getProfile()).profile.id, id);
  assert.equal(seen?.credentials, 'same-origin');
  assert.equal(seen?.cache, 'no-store');
  assert.equal(seen?.redirect, 'error');
  await client.updateProfile({
    firstName: 'Synthetic',
    lastName: 'Example',
    expectedVersion: 1,
  });
  assert.equal(new Headers(seen?.headers).get('x-csrf-token'), 'a'.repeat(43));
  await assert.rejects(
    createCustomerBusinessClient(
      () => 'a'.repeat(43),
      async () => envelope({ ...profile, mode: 'production' }),
    ).getProfile(),
    { code: 'invalid-response' },
  );
  assert.equal(
    isCustomerView({
      mode: 'integration-test',
      resource: 'reviews',
      publication: 'published',
      items: [],
    }),
    false,
  );
  assert.equal(
    isCustomerView({
      mode: 'integration-test',
      resource: 'addresses',
      items: [
        {
          id,
          carrier: 'bazar-pickup',
          cityRef: 'a',
          locationRef: 'b',
          isDefault: true,
          version: 1,
        },
      ],
    }),
    false,
  );
  assert.equal(
    isCustomerView({
      mode: 'integration-test',
      resource: 'wishlist',
      items: [
        {
          productId: id,
          handle: 'x',
          title: 'X',
          available: true,
          price: null,
        },
      ],
    }),
    false,
  );
  const offline = createCustomerBusinessClient(
    () => 'a'.repeat(43),
    async () => new Response('private upstream', { status: 503 }),
  );
  await assert.rejects(offline.getWishlist(), {
    code: 'http-error',
    status: 503,
  });
});
