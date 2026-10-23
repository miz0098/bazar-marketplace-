import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('homepage exposes the approved shared shell without serious accessibility violations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop shell assertion');
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'BAZAR — головна' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Популярні категорії' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
});

test('mobile navigation works and pages do not overflow horizontally', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile viewport assertion');
  await page.goto('/catalog');
  const menu = page.getByRole('button', { name: 'Відкрити навігацію' });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#catalog-menu').getByText('Популярні категорії')).toBeVisible();
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
});

test('unknown routes render the Ukrainian not-found state', async ({ page }) => {
  await page.goto('/route-that-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Повернутися на головну' })).toHaveAttribute('href', '/');
});
