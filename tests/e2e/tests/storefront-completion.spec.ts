import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
async function noOverflow(page: import('@playwright/test').Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}

test('category redirects, filters, sorting, empty/error recovery and search keyboard navigation', async ({
  page,
}) => {
  await page.goto('/collections');
  const trigger = page
    .locator('button[aria-controls="catalog-menu"]:visible')
    .first();
  await trigger.focus();
  await trigger.press('Space');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.catalog-menu a').first().focus();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await page
    .getByRole('link', { name: 'Електроніка', exact: false })
    .last()
    .click();
  await expect(page).toHaveURL(/category=electronics/);
  await page.getByLabel('Бренд', { exact: true }).selectOption('Sony');
  await page.getByRole('button', { name: 'Застосувати', exact: true }).click();
  await expect(page.locator('.catalog-results .product-card')).toHaveCount(2);
  await page.goto('/catalog?minPrice=1000&maxPrice=2000&sort=price-asc');
  await expect(page.getByLabel('Від', { exact: true })).toHaveValue('1000');
  await noOverflow(page);
  await page.goto('/catalog?minPrice=2000&maxPrice=1000');
  await expect(page.locator('#main-content').getByRole('alert')).toContainText(
    'Перевірте діапазон',
  );
  await page.goto('/catalog?maxPrice=0');
  await expect(
    page.getByRole('heading', { name: 'Товарів не знайдено' }),
  ).toBeVisible();
  await page.goto('/catalog?preview=error');
  await page.getByRole('link', { name: 'Спробувати ще раз' }).click();
  await expect(
    page.locator('.catalog-results .product-card').first(),
  ).toBeVisible();
  const search = page.getByRole('combobox', {
    name: 'Пошук товарів',
    exact: true,
  });
  await search.fill('Lenovo');
  await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', 'suggestion-0');
  await search.press('Enter');
  await expect(page).toHaveURL(/products\/lenovo-ideapad/);
  await noOverflow(page);
  await page.goto('/collections/electronics?sort=price-desc&vendor=Sony');
  await expect(page).toHaveURL(/vendor=Sony/);
  await expect(page.getByLabel('Сортування', { exact: true })).toHaveValue(
    'price-desc',
  );
});

test('variants, sold-out state and stock limits stay authoritative in the local demo cart', async ({
  page,
}) => {
  await page.goto('/products/iphone-15');
  const summary = page.locator('.product-summary');
  await summary.getByLabel('Варіант товару').selectOption('iphone-15-silver');
  await expect(summary.locator('.add-cart-button')).toBeDisabled();
  await summary.getByLabel('Варіант товару').selectOption('iphone-15-black');
  await expect(summary).toContainText('Демо-залишок: 2');
  await summary.locator('.add-cart-button').click();
  await summary.locator('.add-cart-button').click();
  await summary.locator('.add-cart-button').click();
  await expect(summary.locator('.cart-feedback')).toContainText(
    'Доступно лише 2',
  );
  await summary.getByLabel('Варіант товару').selectOption('iphone-15');
  await summary.locator('.add-cart-button').click();
  await page.locator('a[href="/cart"]:visible').first().click();
  await expect(page.locator('.cart-line')).toHaveCount(2);
  await expect(
    page.getByText('Чорний титан, 256 ГБ', { exact: true }),
  ).toBeVisible();
  const black = page
    .locator('.cart-line')
    .filter({ hasText: 'Чорний титан, 256 ГБ' });
  await black.getByRole('button', { name: /Збільшити кількість/ }).click();
  await expect(page.getByRole('status')).toContainText('Доступно лише 2');
  await expect(black.getByRole('spinbutton')).toHaveValue('2');
  await page.reload();
  await expect(page.locator('.cart-line')).toHaveCount(2);
  await black.getByRole('button', { name: /Видалити/ }).click();
  await expect(page.locator('.cart-line')).toHaveCount(1);
  await noOverflow(page);
  await page.goto('/products/missing-product');
  await expect(
    page.getByRole('heading', { name: 'Сторінку не знайдено' }),
  ).toBeVisible();
});

test('wishlist buttons share a locally persisted demo with header counts and the existing account list', async ({
  page,
}) => {
  await page.goto('/products/garden-lamp');
  const summary = page.locator('.product-summary');
  const heart = summary.locator('.wishlist-toggle');
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await heart.focus();
  await heart.press('Space');
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await page.locator('a[href="/profile/wishlist"]:visible').first().click();
  const item = page.getByRole('article', { name: 'Садовий світильник Solar' });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: /Видалити.*з обраного/ }).click();
  await expect(item).toHaveCount(0);
  const search = page.getByRole('combobox', {
    name: 'Пошук товарів',
    exact: true,
  });
  await search.fill('Solar');
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page).toHaveURL(/products\/garden-lamp/);
  await expect(
    page.locator('.product-summary .wishlist-toggle'),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.product-summary .wishlist-toggle').click();
  await expect(page.locator('.product-summary .wishlist-toggle')).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(
    page.locator('.product-summary .wishlist-toggle'),
  ).toHaveAttribute('aria-pressed', 'true');
  await noOverflow(page);
});

test('all header/footer destinations, approved social platforms and unknown routes are truthful', async ({
  page,
}) => {
  await page.goto('/');
  const hrefs = await page
    .locator('footer a[href^="/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
  for (const href of new Set(hrefs))
    expect((await page.request.get(href)).status(), href).toBe(200);
  const socials = page.getByRole('navigation', { name: 'Соціальні мережі' });
  await expect(socials.getByRole('link')).toHaveCount(4);
  for (const name of ['Facebook', 'Instagram', 'Threads', 'Telegram'])
    await expect(
      socials.getByRole('link', { name, exact: true }),
    ).toBeVisible();
  await expect(socials).not.toContainText(/TikTok|YouTube/);
  await noOverflow(page);
  for (const url of [
    '/collections/missing',
    '/help/missing',
    '/products/iphone-15?variant=forged',
    '/unknown-route',
  ]) {
    const r = await page.goto(url);
    expect(r?.status(), url).toBe(404);
  }
  await page.goto('/help/returns');
  await expect(
    page.getByRole('heading', { name: 'Повернення товару' }),
  ).toBeVisible();
  await expect(page.getByText(/Не є офертою/)).toBeVisible();
});

test('new browsing, variant, cart and information surfaces are accessible without horizontal scrolling', async ({
  page,
}) => {
  for (const path of [
    '/catalog',
    '/products/iphone-15',
    '/collections',
    '/help/delivery',
  ]) {
    await page.goto(path);
    await noOverflow(page);
    const result = await new AxeBuilder({ page })
      .include('#main-content')
      .analyze();
    expect(
      result.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      ),
      path,
    ).toEqual([]);
  }
});

test('optional storage failure is visible and cannot prevent local demo mutations', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
  await page.goto('/products/lenovo-ideapad');
  await page.locator('.product-summary .add-cart-button').click();
  await expect(page.locator('.product-summary .cart-feedback')).toContainText(
    'Не вдалося зберегти',
  );
  await page.locator('a[href="/cart"]:visible').first().click();
  await expect(page.locator('.cart-line')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('Не вдалося зберегти');
  await noOverflow(page);
});

test('product tabs, recommendations, recent views and buy-now preserve the demo checkout stop', async ({
  page,
}) => {
  await page.goto('/products/iphone-15');
  const firstTab = page.getByRole('tab', { name: 'Опис', exact: true });
  await firstTab.focus();
  await firstTab.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Характеристики', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Відгуки', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Питання та відповіді' }),
  ).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText(
    'Надсилання запитань у демо недоступне',
  );
  await page.locator('.home-section .product-card__link').first().click();
  await expect(
    page.getByRole('heading', { name: 'Нещодавно переглянуті' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Демонстраційна добірка з тієї самої категорії, без персоналізації.',
    ),
  ).toBeVisible();
  await page
    .locator('.product-summary')
    .getByRole('button', { name: 'Купити зараз' })
    .click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(
    page.getByRole('heading', { name: 'Контактні дані та доставка' }),
  ).toBeVisible();
  await noOverflow(page);
});
