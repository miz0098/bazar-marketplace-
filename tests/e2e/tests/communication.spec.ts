import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Next.js streaming temporarily includes a second hidden Suspense copy; inspect the visible UI.
const screen = (page: Page) => page.locator('[data-communication]').filter({ visible: true });
const history = (page: Page) => page.getByRole('region', { name: 'Історія повідомлень' });

async function assertChronologyAndBottom(page: Page) {
  const dates = await history(page).locator('[data-created-at]').evaluateAll((items) => items.map((item) => Date.parse(item.getAttribute('data-created-at')!)));
  expect(dates).toEqual([...dates].sort((a, b) => a - b));
  await expect.poll(() => history(page).evaluate((element) => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThanOrEqual(2);
}

async function assertNoOverflow(page: Page) {
  await expect(screen(page).locator('.account-loading')).toHaveCount(0);
  const widths = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
}

test('dialog search, pins and unread count operate on conversations and reset on reload', async ({ page }) => {
  await page.goto('/profile/messages');
  await expect(page.locator('.communication-dialog-list > li')).toHaveCount(3);
  await expect(page.getByLabel('Непрочитаних діалогів')).toHaveText('2');
  const pin = page.getByRole('button', { name: 'Закріпити Спорт · демо-магазин', exact: true });
  await pin.focus();
  await pin.press('Enter');
  await expect(page.locator('.communication-dialog-link').first()).toContainText('Спорт · демо-магазин');
  const search = page.getByRole('searchbox', { name: 'Пошук діалогів' });
  await search.fill('Техніка');
  await expect(page.locator('.communication-dialog-link')).toHaveCount(1);
  await search.fill('немає-такого');
  await expect(page.getByText('Діалогів за цим запитом немає.')).toBeVisible();
  await search.fill('');
  await page.getByRole('link', { name: /Техніка · демо-магазин/ }).click();
  await expect(history(page).locator('[data-message-id]')).toHaveCount(18);
  await expect(page.locator('.account-nav a[href="/profile/messages"]')).toHaveAttribute('aria-current', 'page');
  await assertChronologyAndBottom(page);
  await page.getByRole('link', { name: '← До діалогів' }).click();
  await expect(page).toHaveURL(/\/profile\/messages$/);
  await expect(page.getByLabel('Непрочитаних діалогів')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'Відкріпити Спорт · демо-магазин', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByLabel('Непрочитаних діалогів')).toHaveText('2');
  await expect(page.getByRole('button', { name: 'Закріпити Спорт · демо-магазин', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await assertNoOverflow(page);
});

test('message composer supports keyboard, metadata-only attachments and ephemeral demo messages', async ({ page }) => {
  const mutations: string[] = [];
  page.on('request', (request) => { if (request.method() !== 'GET') mutations.push(request.url()); });
  page.on('websocket', (socket) => mutations.push(socket.url()));
  await page.goto('/profile/messages/demo-chat-1');
  await expect(history(page).locator('[data-message-id]')).toHaveCount(18);
  await assertChronologyAndBottom(page);
  const input = page.getByRole('textbox', { name: 'Ваше повідомлення' });
  await input.fill('Вигадане повідомлення');
  await input.press('Shift+Enter');
  await input.pressSequentially('Другий рядок');
  await page.getByLabel('Демо-вкладення (до 5 МБ)').setInputFiles({ name: 'demo.txt', mimeType: 'text/plain', buffer: Buffer.from('fictional content') });
  await input.press('Enter');
  await expect(screen(page).getByRole('status')).toContainText('Нікому не доставлено');
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  const last = history(page).locator('[data-message-id]').last();
  await expect(last).toContainText('Вигадане повідомлення\nДругий рядок');
  await expect(last).toContainText('demo.txt');
  await expect(last).toContainText('Лише демо · не доставлено');
  await assertChronologyAndBottom(page);
  await assertNoOverflow(page);
  const keys = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
  expect(keys.filter((key) => /chat|message|support|ticket|auth|token/i.test(key))).toEqual([]);
  expect(mutations).toEqual([]);
  await page.reload();
  await expect(history(page).locator('[data-message-id]')).toHaveCount(18);
  await expect(history(page).getByText('Вигадане повідомлення', { exact: false })).toHaveCount(0);
});

test('failed demo send preserves the draft and does not append a message', async ({ page }) => {
  await page.goto('/profile/messages/demo-chat-1?preview=send-error');
  await expect(history(page).locator('[data-message-id]')).toHaveCount(18);
  const input = page.getByRole('textbox', { name: 'Ваше повідомлення' });
  await page.getByRole('button', { name: 'Надіслати в демо' }).click();
  await expect(screen(page).getByRole('alert')).toContainText('Напишіть повідомлення.');
  await expect(input).toBeFocused();
  await input.fill('Не доставляти — демо-приклад');
  await page.getByRole('button', { name: 'Надіслати в демо' }).click();
  await expect(screen(page).getByRole('alert')).toContainText('Демо-дію не виконано');
  await expect(input).toHaveValue('Не доставляти — демо-приклад');
  await expect(history(page).locator('[data-message-id]')).toHaveCount(18);
});

test('empty messaging card matches wishlist styling and has no actions', async ({ page }) => {
  await page.goto('/profile/wishlist?preview=empty');
  await expect(page.getByRole('heading', { name: 'Список обраного порожній' })).toBeVisible();
  const style = () => page.locator('.account-state').evaluate((element) => {
    const css = getComputedStyle(element);
    return { minHeight: css.minHeight, background: css.backgroundColor, borderRadius: css.borderRadius };
  });
  const wishlistStyle = await style();
  await page.goto('/profile/messages?preview=empty');
  await expect(page.getByRole('heading', { name: 'У вас поки немає повідомлень' })).toBeVisible();
  expect(await style()).toEqual(wishlistStyle);
  await expect(screen(page).locator('.account-state').getByRole('button')).toHaveCount(0);
  await expect(screen(page).locator('.account-state').getByRole('link')).toHaveCount(0);
  await assertNoOverflow(page);
});

test('support statuses, creation validation, history and replies remain demo-only', async ({ page }) => {
  await page.goto('/profile/support');
  await expect(page.getByRole('list', { name: 'Демонстраційні звернення' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.locator('.communication-ticket-list')).toContainText('Очікує відповіді');
  const trigger = page.getByRole('button', { name: 'Нове демо-звернення', exact: true });
  await trigger.click();
  const form = page.getByRole('form', { name: 'Нове демонстраційне звернення' });
  await form.getByRole('button', { name: 'Скасувати' }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await form.getByRole('button', { name: 'Створити лише в демо' }).click();
  const subject = form.getByRole('textbox', { name: /^Тема звернення/ });
  await expect(subject).toBeFocused();
  await expect(form.getByText('Тема має містити від 5 до 120 символів.')).toBeVisible();
  await subject.fill('Вигадане питання для перевірки');
  await form.getByRole('combobox', { name: 'Категорія' }).selectOption('other');
  await form.getByRole('textbox', { name: /^Опис звернення/ }).fill('Це вигаданий опис. Оператор нічого не отримує.');
  await form.getByRole('button', { name: 'Створити лише в демо' }).click();
  await expect(page).toHaveURL(/\/profile\/support\/demo-new-ticket-1$/);
  await expect(page.getByRole('heading', { name: 'Вигадане питання для перевірки' })).toBeVisible();
  await expect(history(page)).toContainText('Це вигаданий опис.');
  await page.getByRole('textbox', { name: 'Ваше повідомлення' }).fill('Демонстраційне доповнення');
  await page.getByRole('button', { name: 'Надіслати в демо' }).click();
  await expect(screen(page).getByRole('status')).toContainText('Нікому не доставлено');
  await expect(history(page).locator('[data-message-id]')).toHaveCount(2);
  await assertChronologyAndBottom(page);
  await assertNoOverflow(page);
  await page.getByRole('link', { name: '← До звернень' }).click();
  await expect(page.getByRole('list', { name: 'Демонстраційні звернення' }).getByRole('listitem')).toHaveCount(4);
  await page.reload();
  await expect(page.getByRole('list', { name: 'Демонстраційні звернення' }).getByRole('listitem')).toHaveCount(3);
  await page.goto('/profile/support/demo-new-ticket-1');
  await expect(page.getByRole('heading', { name: 'Звернення не знайдено' })).toBeVisible();
  await page.goto('/profile/support/demo-ticket-3');
  await expect(page.getByText('Демо-звернення закрите.', { exact: false })).toBeVisible();
  await expect(screen(page).getByRole('textbox')).toHaveCount(0);
});

test('support failures preserve drafts and unknown histories have explicit states', async ({ page }) => {
  await page.goto('/profile/support?preview=send-error');
  await page.getByRole('button', { name: 'Нове демо-звернення', exact: true }).click();
  const form = page.getByRole('form', { name: 'Нове демонстраційне звернення' });
  await form.getByRole('textbox', { name: 'Тема звернення' }).fill('Вигадана тема звернення');
  await form.getByRole('textbox', { name: 'Опис звернення' }).fill('Вигаданий опис звернення');
  await form.getByRole('button', { name: 'Створити лише в демо' }).click();
  await expect(form.getByRole('alert')).toContainText('Демо-дію не виконано');
  await expect(form.getByRole('textbox', { name: 'Опис звернення' })).toHaveValue('Вигаданий опис звернення');
  await page.goto('/profile/support/demo-ticket-1?preview=send-error');
  await expect(history(page).locator('[data-message-id]')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Ваше повідомлення' }).fill('Приклад відповіді');
  await page.getByRole('button', { name: 'Надіслати в демо' }).click();
  await expect(screen(page).getByRole('alert')).toContainText('Демо-дію не виконано');
  await expect(history(page).locator('[data-message-id]')).toHaveCount(2);
  for (const [route, title] of [['messages', 'Діалог не знайдено'], ['support', 'Звернення не знайдено']]) {
    await page.goto(`/profile/${route}/missing`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }
});

test('loading, retry errors and empty support states are accessible', async ({ page }) => {
  await page.clock.install();
  await page.goto('/profile/messages?preview=error');
  await expect(screen(page).getByRole('alert')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await screen(page).getByRole('button', { name: 'Спробувати ще раз' }).click();
  await expect(screen(page).getByRole('alert')).toHaveCount(0);
  await expect(screen(page).getByRole('status')).toContainText('Завантажуємо демонстраційні діалоги');
  await page.clock.runFor(160);
  await expect(screen(page).getByRole('alert')).toBeVisible();
  await page.clock.resume();
  await page.goto('/profile/support?preview=error');
  await expect(screen(page).getByRole('alert')).toContainText('Не вдалося завантажити');
  await page.goto('/profile/support?preview=empty');
  await expect(page.getByRole('heading', { name: 'Звернень поки немає' })).toBeVisible();
});

test('message and support surfaces have no serious accessibility violations or horizontal overflow', async ({ page }) => {
  for (const route of ['/profile/messages', '/profile/messages/demo-chat-1', '/profile/messages/demo-chat-3', '/profile/support', '/profile/support/demo-ticket-1', '/profile/messages?preview=empty']) {
    await page.goto(route);
    await expect(screen(page)).toBeVisible();
    await assertNoOverflow(page);
    const results = await new AxeBuilder({ page }).include('[data-communication]').analyze();
    const serious = results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
    expect(serious, serious.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
  }
  await page.goto('/profile/messages/demo-chat-1');
  await expect(history(page).locator('[data-message-id]')).toHaveCount(18);
  await history(page).focus();
  await page.keyboard.press('Home');
  await expect.poll(() => history(page).evaluate((element) => element.scrollTop)).toBe(0);
  await page.keyboard.press('End');
  await assertChronologyAndBottom(page);
  await page.getByRole('textbox', { name: 'Ваше повідомлення' }).focus();
  await expect(page.getByRole('textbox', { name: 'Ваше повідомлення' })).toBeFocused();
  await page.goto('/profile/support');
  await page.getByRole('button', { name: 'Нове демо-звернення', exact: true }).click();
  const results = await new AxeBuilder({ page }).include('[data-communication]').analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});
