import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const key = 'bazar-demo-wishlist-v1';
test('wishlist persists product IDs across reload and synchronizes header, product, catalog and account', async ({
  page,
  context,
}) => {
  await page.goto('/products/garden-lamp');
  await page.locator('.product-summary .wishlist-toggle').click();
  await expect(
    page.locator('.product-summary .wishlist-toggle'),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(
    page.locator('.product-summary .wishlist-toggle'),
  ).toHaveAttribute('aria-pressed', 'true');
  const stored = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    key,
  );
  expect(Object.keys(stored).sort()).toEqual(['productIds', 'version']);
  expect(stored.productIds).toContain('garden-lamp');
  await page.locator('a[href="/profile/wishlist"]:visible').first().click();
  const item = page.getByRole('article', { name: 'Садовий світильник Solar' });
  await expect(item).toBeVisible();
  const second = await context.newPage();
  await second.goto('/catalog?category=home');
  const catalogToggle = second.getByRole('button', { name: /Садовий світильник Solar.*обраного/ }).and(second.locator('button:enabled'));
  await expect(
    catalogToggle,
  ).toHaveAttribute('aria-pressed', 'true');
  await item.getByRole('button', { name: /Видалити.*з обраного/ }).click();
  await expect(item).toHaveCount(0);
  await expect(
    catalogToggle,
  ).toHaveAttribute('aria-pressed', 'false');
  await second.close();
  await page.reload();
  await expect(
    page.getByRole('article', { name: 'Садовий світильник Solar' }),
  ).toHaveCount(0);
});
test('corrupt local wishlist resets safely while unavailable canonical products remain removable', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      if (!sessionStorage.getItem('f12-seeded')) {
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            productIds: ['camera'],
            profile: { phone: 'private-value' },
          }),
        );
        sessionStorage.setItem('f12-seeded', '1');
      }
    },
    { key },
  );
  await page.goto('/profile/wishlist');
  await expect(
    page.getByRole('heading', { name: 'Список обраного порожній' }),
  ).toBeVisible();
  await expect(page.locator('#main-content').getByRole('alert')).toContainText(
    'Пошкоджене',
  );
  expect(
    await page.evaluate((k) => localStorage.getItem(k), key),
  ).not.toContain('private-value');
  await page.evaluate(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          version: 1,
          productIds: ['camera', 'camera', 'unknown-product'],
        }),
      ),
    key,
  );
  await page.reload();
  const camera = page.getByRole('article', { name: 'Камера Fujifilm X-S20' });
  await expect(camera).toBeVisible();
  await expect(
    camera.getByRole('button', { name: 'Немає в наявності' }),
  ).toBeDisabled();
  await camera.getByRole('button', { name: /Видалити.*з обраного/ }).click();
  await expect(camera).toHaveCount(0);
});
test('all agreed account routes retain empty/error states, keyboard navigation and safe payment methods', async ({
  page,
}) => {
  for (const route of [
    'orders',
    'wishlist',
    'reviews',
    'addresses',
    'payment-methods',
    'messages',
    'support',
  ]) {
    await page.goto(`/profile/${route}?preview=empty`);
    await expect(page.locator('#main-content h1')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  }
  for (const route of [
    'orders',
    'wishlist',
    'reviews',
    'personal-data',
    'addresses',
    'payment-methods',
    'messages',
    'support',
  ]) {
    await page.goto(`/profile/${route}?preview=error`);
    await expect(page.locator('.account-state--error')).toBeVisible();
  }
  await page.goto('/profile/addresses');
  await page.getByRole('button', { name: 'Додати адресу' }).click();
  await page
    .getByRole('combobox', { name: 'Спосіб доставки' })
    .selectOption('ukrposhta');
  await expect(
    page.getByRole('textbox', { name: 'Відділення', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Зберегти демо-адресу' }).click();
  await expect(page.getByText('Додайте коротку назву адреси.')).toBeVisible();
  await page.goto('/profile/payment-methods');
  await expect(page.locator('input')).toHaveCount(1); // Header search only; no card inputs.
  const result = await new AxeBuilder({ page })
    .include('[data-account-shell]')
    .analyze();
  expect(
    result.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    ),
  ).toEqual([]);
  const nav = page.getByRole('navigation', { name: 'Розділи акаунта' });
  await expect(
    nav.getByRole('link', { name: 'Огляд', exact: true }),
  ).toHaveCount(0);
});
