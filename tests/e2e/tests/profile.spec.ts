import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const accountNavigation = [
  { label: 'Мої замовлення', href: '/profile/orders' },
  { label: 'Обране', href: '/profile/wishlist' },
  { label: 'Повідомлення', href: '/profile/messages' },
  { label: 'Мої відгуки', href: '/profile/reviews' },
  { label: 'Особисті дані', href: '/profile/personal-data' },
  { label: 'Улюблені адреси', href: '/profile/addresses' },
  { label: 'Платіжні методи', href: '/profile/payment-methods' },
  { label: 'BAZAR-підтримка', href: '/profile/support' },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  await expect(page.locator('.account-loading')).toHaveCount(0);
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
}

function accountNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Розділи акаунта' });
}

async function waitForAccountPreview(page: Page) {
  await expect(page.getByRole('note').filter({ hasText: 'Демонстраційний профіль' })).toBeVisible();
  await expect(page.getByText('Завантажуємо демонстраційні дані…')).toHaveCount(0);
}

test('profile preserves the approved overview landing and exact sidebar order', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop account navigation assertion.');
  await page.goto('/profile');
  await expect(page).toHaveURL('/profile');
  await expect(page.getByRole('heading', { name: /Вітаємо, Олена|Ваш профіль/ })).toBeVisible();
  await expect(page.getByText(/Ви не автентифіковані/)).toBeVisible();

  const nav = accountNav(page);
  await expect(nav).toBeVisible();
  const entries = await nav.locator(':scope > *').allTextContents();
  expect(entries.map((entry) => entry.trim())).toEqual([
    ...accountNavigation.map((entry) => entry.label),
    'Вихід',
  ]);
  await expect(nav.getByText('Огляд', { exact: true })).toHaveCount(0);

  for (const entry of accountNavigation) {
    await expect(nav.getByRole('link', { name: entry.label, exact: true })).toHaveAttribute('href', entry.href);
  }
  await expectNoHorizontalOverflow(page);
});

test('all approved account destinations are reachable and active without authentication claims', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop route matrix assertion.');
  for (const entry of accountNavigation) {
    await page.goto(entry.href);
    await expect(page).toHaveURL(entry.href);
    await expect(accountNav(page).getByRole('link', { name: entry.label, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText(/Ви не автентифіковані/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test('orders filter deterministic demo records and expose only verified detail fields', async ({ page }) => {
  await page.goto('/profile/orders');
  await expect(page.getByRole('heading', { name: 'Мої замовлення' })).toBeVisible();
  const filter = page.getByRole('group', { name: 'Фільтр за статусом замовлення' });
  await expect(filter.getByRole('button', { name: /Усі/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('article', { name: 'Демо-замовлення BZ-DEMO-006' })).toBeVisible();

  await filter.getByRole('button', { name: /Відправлені/ }).click();
  await expect(filter.getByRole('button', { name: /Відправлені/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('article', { name: 'Демо-замовлення BZ-DEMO-005' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Демо-замовлення BZ-DEMO-006' })).toHaveCount(0);

  await page.getByRole('article', { name: 'Демо-замовлення BZ-DEMO-005' }).getByRole('link', { name: 'Детальніше' }).click();
  await expect(page).toHaveURL('/profile/orders/demo-order-005');
  await expect(page.getByRole('heading', { name: 'Замовлення BZ-DEMO-005' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Товари' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Підсумок' })).toBeVisible();
  await expect(page.getByText(/Дані про оплату, продавця, доставку, відстеження.*не показані/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Продавець|Доставка|Оплата|Статус замовлення/ })).toHaveCount(0);
  await expect(page.getByText(/ТТН|Нова пошта|Meest|Apple Pay|Google Pay/)).toHaveCount(0);
});

test('orders expose empty and error states for deterministic preview scenarios', async ({ page }) => {
  await page.goto('/profile/orders?preview=empty');
  await expect(page.getByRole('heading', { name: 'Тут поки немає замовлень' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Перейти до каталогу' })).toHaveAttribute('href', '/catalog');

  await page.goto('/profile/orders?preview=error');
  await expect(page.getByRole('alert').getByRole('heading', { name: 'Замовлення не завантажилися' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Спробувати ще раз' })).toBeVisible();
});

test('wishlist search, sorting, selection, removal and cart integration stay explicitly demo-only', async ({ page }) => {
  await page.goto('/profile/wishlist');
  await expect(page.getByRole('heading', { name: 'Обране' })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Пошук в обраному' });
  const sort = page.getByRole('combobox', { name: 'Сортування' });

  await search.fill('Sony');
  await expect(page.getByRole('article', { name: 'Навушники Sony WH-1000XM5' })).toBeVisible();
  await expect(page.locator('.account-wishlist-grid').getByRole('article')).toHaveCount(1);
  await search.fill('');
  await sort.selectOption('price-asc');
  const cards = page.locator('.account-wishlist-grid').getByRole('article');
  await expect(cards.first()).toHaveAccessibleName('Кросівки для бігу Air Flex');

  const shoes = page.getByRole('article', { name: 'Кросівки для бігу Air Flex' });
  await shoes.getByRole('button', { name: 'До кошика' }).click();
  await expect(page.getByRole('status')).toContainText('додано до демонстраційного кошика');
  await expect(page.getByLabel('1 товарів у кошику')).toHaveText('1');

  await shoes.getByRole('checkbox', { name: 'Обрати Кросівки для бігу Air Flex' }).check();
  await expect(page.getByText('Обрано: 1')).toBeVisible();
  await page.getByRole('button', { name: 'Видалити обрані' }).click();
  await expect(page.getByRole('status')).toContainText('Зміна скинеться після оновлення сторінки');
  await expect(page.getByRole('article', { name: 'Кросівки для бігу Air Flex' })).toHaveCount(0);

  await page.reload();
  await sort.selectOption('price-asc');
  await expect(page.getByRole('article', { name: 'Кросівки для бігу Air Flex' })).toBeVisible();
  await expect(page.getByLabel('1 товарів у кошику')).toHaveText('1');

  await search.fill('товару-якого-немає');
  await expect(page.getByRole('heading', { name: 'Нічого не знайдено' })).toBeVisible();
  await page.locator('.account-content').getByRole('button', { name: 'Очистити пошук' }).click();
  await expect(search).toHaveValue('');
  await page.goto('/cart');
  await expect(page.locator('.cart-line__info').getByRole('link', { name: 'Кросівки для бігу Air Flex' })).toBeVisible();
});

test('wishlist ignores superseded responses', async ({ page }) => {
  await page.clock.install();
  await page.goto('/profile/wishlist');
  await expect(page.locator('.account-wishlist-card')).toHaveCount(4);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));

  const search = page.getByRole('searchbox', { name: 'Пошук в обраному' });
  const loading = page.getByText('Завантажуємо демонстраційне обране…');
  await search.fill('Sony');
  await expect(loading).toBeVisible();
  await page.clock.runFor(90);
  await search.fill('Apple');
  await page.clock.runFor(90);
  // The older Sony request has completed, but must not replace the pending Apple result.
  await expect(loading).toBeVisible();
  await expect(page.locator('.account-wishlist-card')).toHaveCount(0);
  await page.clock.runFor(90);
  await expect(page.getByRole('article', { name: 'Apple iPhone 15 Pro 128GB' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Навушники Sony WH-1000XM5' })).toHaveCount(0);

});

test('retry clears the previous account error while a new request is pending', async ({ page }) => {
  await page.clock.install();
  await page.goto('/profile/orders?preview=error');
  await expect(page.locator('.account-content').getByRole('alert')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: 'Спробувати ще раз' }).click();
  await expect(page.locator('.account-content').getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('Завантажуємо демонстраційні замовлення…')).toBeVisible();
  await page.clock.runFor(180);
  await expect(page.locator('.account-content').getByRole('alert')).toBeVisible();
});

test('review editor validates, focuses and applies only in-memory changes', async ({ page }) => {
  await page.goto('/profile/reviews');
  await expect(page.getByRole('heading', { name: 'Мої відгуки' })).toBeVisible();
  const review = page.getByRole('article', { name: 'Відгук про Apple iPhone 15 Pro 128GB' });
  await review.getByRole('button', { name: 'Редагувати' }).click();
  const text = review.getByLabel('Текст відгуку');
  await text.fill('Коротко');
  await review.getByRole('button', { name: 'Зберегти демо-зміни' }).click();
  await expect(review.getByText('Відгук має містити щонайменше 10 символів.')).toBeVisible();
  await expect(text).toBeFocused();

  await review.getByRole('combobox', { name: /^Оцінка/ }).selectOption('4');
  await text.fill('Оновлений текст існує лише під час цього демо-перегляду.');
  await review.getByRole('button', { name: 'Зберегти демо-зміни' }).click();
  await expect(page.getByRole('status')).toContainText('Після оновлення сторінки зміни зникнуть');
  await expect(review.getByText('Оновлений текст існує лише під час цього демо-перегляду.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Зручний смартфон, камера та швидкодія відповідають очікуванням.')).toBeVisible();
});

test('personal data validation focuses the first error and never exposes a complete phone', async ({ page }) => {
  await page.goto('/profile/personal-data');
  await expect(page.getByRole('heading', { name: 'Особисті дані' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Телефон/ })).toHaveValue('+380 67 *** ** 67');
  await expect(page.getByRole('textbox', { name: /^Телефон/ })).toHaveAttribute('readonly', '');

  const firstName = page.getByLabel('Імʼя');
  await firstName.fill('');
  await page.getByLabel('Електронна пошта').fill('invalid@');
  await page.getByRole('button', { name: 'Зберегти демо-зміни' }).click();
  await expect(page.getByText('Вкажіть імʼя.')).toBeVisible();
  await expect(firstName).toBeFocused();

  await firstName.fill('Марія');
  await page.getByRole('button', { name: 'Зберегти демо-зміни' }).click();
  await expect(page.getByText('Введіть коректну електронну пошту.')).toBeVisible();
  await expect(page.getByLabel('Електронна пошта')).toBeFocused();
  await page.getByLabel('Електронна пошта').fill('maria@example.test');
  await page.getByRole('button', { name: 'Зберегти демо-зміни' }).click();
  await expect(page.getByRole('status')).toContainText('Дані не надіслані');
  await expect(page.getByLabel('Імʼя')).toHaveValue('Марія');

  await page.reload();
  await expect(page.getByLabel('Імʼя')).toHaveValue('Олена');
  await expect(page.getByText(/\+380\s?67\s?123\s?45\s?67/)).toHaveCount(0);
});

test('address add, edit, default and remove actions validate and reset on refresh', async ({ page }) => {
  await page.goto('/profile/addresses');
  await expect(page.getByRole('heading', { name: 'Улюблені адреси' })).toBeVisible();
  await page.getByRole('button', { name: 'Додати адресу' }).click();
  await expect(page.getByRole('heading', { name: 'Нова адреса' })).toBeVisible();
  await page.getByRole('button', { name: 'Зберегти демо-адресу' }).click();
  const label = page.getByLabel('Назва адреси');
  await expect(page.getByText('Додайте коротку назву адреси.')).toBeVisible();
  await expect(label).toBeFocused();

  await label.fill('Тестова');
  await page.getByLabel('Отримувач').fill('Марія Коваль');
  await page.getByLabel('Спосіб доставки').selectOption('meest');
  await page.getByLabel('Населений пункт').fill('Одеса');
  await page.getByLabel('Відділення або поштомат').fill('Поштомат 7');
  await page.getByLabel('Зробити основною').check();
  await page.getByRole('button', { name: 'Зберегти демо-адресу' }).click();

  const created = page.getByRole('article', { name: 'Адреса Тестова' });
  await expect(created).toContainText('Основна');
  await expect(created).toContainText('Одеса, Поштомат 7');
  await created.getByRole('button', { name: 'Редагувати' }).click();
  await expect(page.getByRole('heading', { name: 'Редагування адреси' })).toBeVisible();
  await page.getByLabel('Відділення або поштомат').fill('Поштомат 8');
  await page.getByRole('button', { name: 'Зберегти демо-адресу' }).click();
  await expect(created).toContainText('Поштомат 8');

  const work = page.getByRole('article', { name: 'Адреса Робота' });
  await work.getByRole('button', { name: 'Зробити основною' }).click();
  await expect(work).toContainText('Основна');
  await created.getByRole('button', { name: 'Видалити' }).click();
  await expect(page.getByRole('article', { name: 'Адреса Тестова' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('article', { name: 'Адреса Дім' })).toContainText('Основна');
  await expect(page.getByRole('article', { name: 'Адреса Тестова' })).toHaveCount(0);
});

test('payment methods collect no card credentials and deferred screens create nothing', async ({ page }) => {
  await page.goto('/profile/payment-methods');
  await expect(page.getByRole('heading', { name: 'Платіжні методи' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Платіжних методів немає' })).toBeVisible();
  await expect(page.getByText(/не просить вводити номер картки або CVV/)).toBeVisible();
  await expect(page.locator('.account-content input')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /додати|зберегти|оплатити/i })).toHaveCount(0);

  for (const route of ['/profile/messages', '/profile/support']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'Функціональність запланована для Phase E2' })).toBeVisible();
    const shell = page.locator('.account-deferred');
    await expect(shell.getByRole('textbox')).toHaveCount(0);
    await expect(shell.getByRole('button')).toHaveCount(0);
    await expect(shell.getByRole('note')).toContainText('нічого не надсилається, не створюється й не зберігається');
  }
});

test('logout remains an anonymous preview boundary with no browser session state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop logout boundary assertion.');
  await page.goto('/profile');
  await accountNav(page).getByRole('button', { name: 'Вихід' }).click();
  await expect(page).toHaveURL('/profile');
  await expect(page.getByRole('status').filter({ hasText: 'Серверної сесії немає' })).toBeVisible();
  const state = await page.evaluate(() => ({
    cookies: document.cookie,
    localKeys: Object.keys(localStorage),
    sessionKeys: Object.keys(sessionStorage),
  }));
  expect([state.cookies, ...state.localKeys, ...state.sessionKeys].join(' ')).not.toMatch(/auth|identity|profile|session|token/i);
});

test('mobile account drawer traps focus, closes safely and profile routes never overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile account drawer assertion.');
  await page.goto('/profile');
  const trigger = page.getByRole('button', { name: 'Відкрити меню профілю' });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const drawer = page.getByRole('dialog', { name: 'Навігація акаунта' });
  const close = drawer.getByRole('button', { name: 'Закрити меню акаунта' });
  await expect(close).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(drawer.getByRole('button', { name: 'Вихід' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.locator('.account-drawer-backdrop').click({ position: { x: page.viewportSize()!.width - 2, y: 2 } });
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  for (const route of ['/profile', ...accountNavigation.map((entry) => entry.href), '/profile/orders/demo-order-006']) {
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  }
});

test('account shell has no serious accessibility violations', async ({ page }) => {
  await page.goto('/profile');
  await waitForAccountPreview(page);
  const results = await new AxeBuilder({ page }).include('[data-account-shell]').analyze();
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
});
