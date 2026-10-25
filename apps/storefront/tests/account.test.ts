import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasAccountValidationErrors,
  validateAccountAddress,
  validateAccountProfile,
  validateAccountReview,
} from '../domain/account/account';
import { demoAccountFixtures } from '../fixtures/account';
import { AccountServiceError } from '../services/contracts/account';
import { createDemoAccountService } from '../services/mock/account-service';

const noWait = async () => {};

test('validates profile, review and address drafts with Ukrainian messages', () => {
  const profileErrors = validateAccountProfile({
    firstName: '',
    lastName: '',
    email: 'not-an-email',
    birthday: '18.04.1992',
    gender: 'unspecified',
  });
  assert.equal(profileErrors.firstName, 'Вкажіть імʼя.');
  assert.equal(profileErrors.lastName, 'Вкажіть прізвище.');
  assert.equal(profileErrors.email, 'Введіть коректну електронну пошту.');
  assert.equal(profileErrors.birthday, 'Вкажіть дату у форматі РРРР-ММ-ДД.');
  assert.equal(hasAccountValidationErrors(profileErrors), true);

  assert.deepEqual(validateAccountReview({ rating: 0, text: 'Коротко' }), {
    rating: 'Оберіть оцінку від 1 до 5.',
    text: 'Відгук має містити щонайменше 10 символів.',
  });
  assert.deepEqual(
    validateAccountAddress({
      label: '',
      recipientName: '',
      deliveryMethod: 'nova-poshta',
      city: '',
      location: '',
    }),
    {
      label: 'Додайте коротку назву адреси.',
      recipientName: 'Вкажіть імʼя отримувача.',
      city: 'Вкажіть населений пункт.',
      location: 'Вкажіть відділення або адресу.',
    },
  );
});

test('exposes only a masked demo phone and preview-only profile mutations', async () => {
  const service = createDemoAccountService({ latencyMs: 0, wait: noWait });
  const profile = await service.getProfile();
  assert.equal(profile.maskedPhone, '+380 67 *** ** 67');
  assert.doesNotMatch(JSON.stringify(profile), /\+?380\d{9}/);

  const result = await service.updateProfile({
    firstName: '  Марія  ',
    lastName: '  Левченко ',
    email: 'maria@example.test',
    birthday: '1995-06-12',
    gender: 'female',
  });
  assert.equal(result.status, 'preview-only');
  assert.equal(result.persisted, false);
  assert.equal(result.value.firstName, 'Марія');
  assert.equal(result.value.maskedPhone, profile.maskedPhone);
  assert.equal(service.mode, 'preview-only');
});

test('paginates and filters orders while keeping details free of fabricated fulfillment facts', async () => {
  const service = createDemoAccountService({ latencyMs: 0, wait: noWait });
  const firstPage = await service.listOrders({ pageSize: 2 });
  assert.equal(firstPage.items.length, 2);
  assert.equal(firstPage.total, 6);
  assert.equal(firstPage.pageCount, 3);
  assert.equal(firstPage.hasMore, true);
  assert.equal(firstPage.counts.all, 6);
  assert.equal(firstPage.counts.delivered, 2);

  const delivered = await service.listOrders({ status: 'delivered', pageSize: 5 });
  assert.equal(delivered.items.length, 2);
  assert.ok(delivered.items.every((order) => order.status === 'delivered'));

  const detail = await service.getOrder('demo-order-004');
  assert.ok(detail);
  assert.equal(detail.items.length, 2);
  for (const forbidden of ['delivery', 'tracking', 'payment', 'seller']) {
    assert.equal(forbidden in detail, false);
  }
  assert.equal(await service.getOrder('missing-order'), null);
});

test('searches, sorts and paginates wishlist deterministically', async () => {
  const service = createDemoAccountService({ latencyMs: 0, wait: noWait });
  const search = await service.listWishlist({ search: 'навушники' });
  assert.deepEqual(search.items.map((item) => item.product.handle), ['sony-headphones']);

  const sorted = await service.listWishlist({ sort: 'price-asc', pageSize: 2 });
  assert.equal(sorted.items.length, 2);
  assert.ok(sorted.items[0]!.product.price.amountMinor <= sorted.items[1]!.product.price.amountMinor);
  assert.equal(sorted.pageCount, 3);
  assert.equal(sorted.hasMore, true);

  const lastPage = await service.listWishlist({ sort: 'name', page: 99, pageSize: 2 });
  assert.equal(lastPage.page, 3);
  assert.equal(lastPage.items.length, 1);
});

test('removes individual and selected wishlist items without mutating shared fixtures', async () => {
  const originalFixtureLength = demoAccountFixtures.wishlist.length;
  const service = createDemoAccountService({ latencyMs: 0, wait: noWait });
  const first = (await service.listWishlist()).items[0]!;
  const removed = await service.removeWishlistItem(first.id);
  assert.equal(removed.status, 'preview-only');
  assert.equal(removed.persisted, false);
  assert.equal(removed.value.some((item) => item.id === first.id), false);

  const selectedIds = removed.value.slice(0, 2).map((item) => item.id);
  const bulk = await service.removeWishlistItems(selectedIds);
  assert.equal(bulk.value.length, originalFixtureLength - 3);
  assert.equal(demoAccountFixtures.wishlist.length, originalFixtureLength);

  await assert.rejects(
    service.removeWishlistItems([]),
    (error: unknown) => error instanceof AccountServiceError && error.code === 'validation',
  );
});

test('updates and deletes reviews in preview memory and rejects invalid edits', async () => {
  const service = createDemoAccountService({ latencyMs: 0, wait: noWait });
  const review = (await service.listReviews())[0]!;

  await assert.rejects(
    service.updateReview(review.id, { rating: 6, text: 'Надто коротко' }),
    (error: unknown) => {
      assert.ok(error instanceof AccountServiceError);
      assert.equal(error.code, 'validation');
      assert.equal(error.fieldErrors?.rating, 'Оберіть оцінку від 1 до 5.');
      return true;
    },
  );

  const updated = await service.updateReview(review.id, {
    rating: 5,
    text: 'Оновлений демонстраційний відгук із достатньою довжиною.',
  });
  assert.equal(updated.status, 'preview-only');
  assert.equal(updated.value.find((item) => item.id === review.id)?.rating, 5);

  const deleted = await service.deleteReview(review.id);
  assert.equal(deleted.value.some((item) => item.id === review.id), false);
  assert.equal(demoAccountFixtures.reviews.length, 2);
});

test('adds, edits, defaults and removes addresses while preserving one default', async () => {
  const service = createDemoAccountService({ latencyMs: 0, wait: noWait });
  const added = await service.addAddress({
    label: '  Батьки ',
    recipientName: 'Ірина Коваль',
    deliveryMethod: 'courier',
    city: ' Львів ',
    location: ' вул. Городоцька, 10 ',
    makeDefault: true,
  });
  const newAddress = added.value.find((address) => address.label === 'Батьки');
  assert.ok(newAddress);
  assert.equal(newAddress.city, 'Львів');
  assert.equal(added.value.filter((address) => address.isDefault).length, 1);
  assert.equal(newAddress.isDefault, true);

  const edited = await service.updateAddress(newAddress.id, {
    label: 'Батьки',
    recipientName: 'Ірина Коваль',
    deliveryMethod: 'meest',
    city: 'Львів',
    location: 'Поштомат № 9',
  });
  assert.equal(edited.value.find((address) => address.id === newAddress.id)?.deliveryMethod, 'meest');

  const originalDefault = edited.value.find((address) => address.id === 'demo-address-1')!;
  const defaulted = await service.setDefaultAddress(originalDefault.id);
  assert.equal(defaulted.value.find((address) => address.id === originalDefault.id)?.isDefault, true);
  assert.equal(defaulted.value.filter((address) => address.isDefault).length, 1);

  const removed = await service.removeAddress(originalDefault.id);
  assert.equal(removed.value.some((address) => address.id === originalDefault.id), false);
  assert.equal(removed.value.filter((address) => address.isDefault).length, 1);
});

test('keeps payment methods empty and never defines sensitive card fields', async () => {
  const service = createDemoAccountService({ latencyMs: 0, wait: noWait });
  assert.deepEqual(await service.listPaymentMethods(), []);
  const serialized = JSON.stringify(demoAccountFixtures.paymentMethods);
  assert.doesNotMatch(serialized, /cardNumber|cvv|cvc/i);
});

test('supports deterministic empty and error scenarios', async () => {
  const empty = createDemoAccountService({ scenario: 'empty', latencyMs: 0, wait: noWait });
  assert.equal((await empty.listOrders()).total, 0);
  assert.equal((await empty.listWishlist()).total, 0);
  assert.deepEqual(await empty.listReviews(), []);
  assert.deepEqual(await empty.listAddresses(), []);
  assert.deepEqual(await empty.listPaymentMethods(), []);

  const failing = createDemoAccountService({ scenario: 'error', latencyMs: 0, wait: noWait });
  await assert.rejects(
    failing.getProfile(),
    (error: unknown) => error instanceof AccountServiceError && error.code === 'unavailable',
  );
  await assert.rejects(
    failing.listOrders(),
    (error: unknown) => error instanceof AccountServiceError && error.code === 'unavailable',
  );
});

test('uses injected latency without relying on browser timers or storage', async () => {
  const observed: number[] = [];
  const service = createDemoAccountService({
    latencyMs: 37,
    wait: async (milliseconds) => {
      observed.push(milliseconds);
    },
  });

  await service.getProfile();
  await service.listWishlist();
  assert.deepEqual(observed, [37, 37]);
  assert.equal('localStorage' in service, false);
  assert.equal('session' in service, false);
});
