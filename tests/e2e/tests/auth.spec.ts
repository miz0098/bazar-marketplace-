import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function openAuthModal(page: Page) {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /Увійти(?: за номером телефону)?/ });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return { dialog, trigger };
}

async function beginPreview(container: Locator, phone = '+380671234567') {
  const input = container.getByLabel('Номер телефону');
  await input.fill(phone);
  await expect(input).toHaveValue('67 123 45 67');
  const continueButton = container.getByRole('button', { name: 'Продовжити' });
  await continueButton.click();
  await expect(container.getByRole('status')).toContainText('Готуємо безпечний демо-перегляд');
  await expect(container.getByRole('heading', { name: 'Код з SMS' })).toBeVisible();
}

async function pasteOtp(container: Locator, code: string) {
  const firstInput = container.getByLabel('Цифра 1 з 6');
  await firstInput.evaluate((element, value) => {
    const clipboard = new DataTransfer();
    clipboard.setData('text', value);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: clipboard }));
  }, code);
}

async function expectNoAuthPersistence(page: Page) {
  const persisted = await page.evaluate(() => ({
    cookies: document.cookie,
    ls: Object.entries(localStorage),
    ss: Object.entries(sessionStorage),
  }));
  const serialized = JSON.stringify(persisted);
  expect(serialized).not.toMatch(/auth|identity|otp|token|session/i);
  expect(serialized).not.toContain('0671234567');
  expect(serialized).not.toContain('+380671234567');
  expect(serialized).not.toContain('123456');
}

async function expectNoSeriousAuthViolations(page: Page, selector: string) {
  const results = await new AxeBuilder({ page }).include(selector).analyze();
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
}

test('header auth modal validates the Ukrainian phone and restores focus on Escape', async ({ page }) => {
  const { dialog, trigger } = await openAuthModal(page);
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByRole('heading', { name: 'Вхід' })).toBeVisible();
  await expect(dialog.getByText(/SMS не надсилається, вхід і сесія не створюються/)).toBeVisible();

  const phone = dialog.getByLabel('Номер телефону');
  await expect(phone).toBeFocused();
  await phone.fill('12');
  await dialog.getByRole('button', { name: 'Продовжити' }).click();
  await expect(dialog.getByText('Введіть 9 цифр українського номера після +380.')).toBeVisible();
  await expect(phone).toBeFocused();

  await phone.fill('67 123 45 67');
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Закрити' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Зареєструватися' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expectNoAuthPersistence(page);
});

test('OTP supports keyboard movement, paste and a non-authenticating preview completion', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  const { dialog } = await openAuthModal(page);
  await beginPreview(dialog);

  const first = dialog.getByLabel('Цифра 1 з 6');
  const second = dialog.getByLabel('Цифра 2 з 6');
  await expect(first).toBeFocused();
  await first.press('5');
  await expect(second).toBeFocused();
  await second.press('ArrowLeft');
  await expect(first).toBeFocused();
  await first.press('End');
  await expect(dialog.getByLabel('Цифра 6 з 6')).toBeFocused();
  await page.keyboard.press('Backspace');

  await pasteOtp(dialog, '12 34-56');
  const values = await dialog.locator('.auth-otp__input').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  expect(values).toEqual(['1', '2', '3', '4', '5', '6']);

  const submit = dialog.getByRole('button', { name: 'Увійти' });
  await submit.click();
  await expect(dialog.getByRole('heading', { name: 'Демо-перегляд завершено' })).toBeVisible();
  await expect(dialog.getByText(/Вхід не виконано.*Серверної сесії немає/)).toBeVisible();
  await expect(page).toHaveURL('/');
  await expectNoAuthPersistence(page);
  expect(consoleMessages.join('\n')).not.toMatch(/0671234567|\+380671234567|123456/);
});

test('pending requests disable state-changing controls and cannot be overwritten', async ({ page }) => {
  const { dialog } = await openAuthModal(page);
  await dialog.getByLabel('Номер телефону').fill('+380671234567');
  await dialog.getByRole('button', { name: 'Продовжити' }).click();
  await expect(dialog.getByRole('status')).toContainText('Готуємо безпечний демо-перегляд');
  await expect(dialog.getByRole('button', { name: 'Зареєструватися' })).toBeDisabled();
  await expect(dialog.getByRole('heading', { name: 'Код з SMS' })).toBeVisible();

  await pasteOtp(dialog, '123456');
  await dialog.getByRole('button', { name: 'Увійти' }).click();
  await expect(dialog.getByRole('button', { name: 'Змінити номер' })).toBeDisabled();
  await expect(dialog.getByRole('heading', { name: 'Демо-перегляд завершено' })).toBeVisible();
});

test('OTP renders invalid, expired, resend, rate-limit and network states truthfully', async ({ page }) => {
  const { dialog } = await openAuthModal(page);
  await beginPreview(dialog);
  await expect(dialog.getByRole('button', { name: /Надіслати повторно через 02:00/ })).toBeDisabled();

  await pasteOtp(dialog, '111111');
  await dialog.getByRole('button', { name: 'Увійти' }).click();
  await expect(dialog.getByText('Код не підтверджено. Для демо використайте 123456.')).toBeVisible();

  await pasteOtp(dialog, '654321');
  await dialog.getByRole('button', { name: 'Увійти' }).click();
  await expect(dialog.getByText('Термін дії демо-коду минув. Повторіть демо-запит.')).toBeVisible();
  const resend = dialog.getByRole('button', { name: 'Повторити демо-запит' });
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect(dialog.getByText('Демо-запит оновлено. SMS не надсилалося.')).toBeVisible();

  await pasteOtp(dialog, '999999');
  await dialog.getByRole('button', { name: 'Увійти' }).click();
  await expect(dialog.getByText('Забагато спроб. Повторіть через 60 с.')).toBeVisible();
  await pasteOtp(dialog, '123456');
  await expect(dialog.getByRole('button', { name: /Повторіть через (?:01:00|00:59|00:58)/ })).toBeDisabled();
  await expect(dialog.getByRole('heading', { name: 'Демо-перегляд завершено' })).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Змінити номер' }).click();
  await beginPreview(dialog);
  await pasteOtp(dialog, '000000');
  await dialog.getByRole('button', { name: 'Увійти' }).click();
  await expect(dialog.getByText('Помилка мережі. SMS не надсилалося, вхід не виконано.')).toBeVisible();
  await expectNoAuthPersistence(page);
});

test('login and registration routes expose only the approved phone flow and validate consent', async ({ page }) => {
  await page.goto('/account/login');
  await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();
  await expect(page.getByLabel(/Пароль/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Забули пароль/i })).toHaveCount(0);
  await page.getByRole('link', { name: 'Зареєструватися' }).click();
  await expect(page).toHaveURL('/account/register');
  const pageFlow = page.locator('[data-auth-surface="page"]');
  await beginPreview(pageFlow, '+380501234567');
  await pasteOtp(pageFlow, '123456');
  await pageFlow.getByRole('button', { name: 'Продовжити' }).click();
  await expect(pageFlow.getByRole('heading', { name: 'Особиста інформація' })).toBeVisible();

  await pageFlow.getByRole('button', { name: 'Зареєструватися' }).click();
  await expect(pageFlow.getByText('Вкажіть імʼя.')).toBeVisible();
  await expect(pageFlow.getByLabel('Імʼя')).toBeFocused();
  await expect(pageFlow.getByText(/Юридичні тексти Умов використання.*ще не затверджені/)).toBeVisible();
  await expect(pageFlow.getByRole('link', { name: /Умовами використання|Політикою конфіденційності/ })).toHaveCount(0);
  await pageFlow.getByLabel('Імʼя').fill('Олена');
  await pageFlow.getByLabel('Прізвище').fill('Коваль');
  await pageFlow.getByLabel(/Електронна пошта/).fill('invalid@');
  await pageFlow.getByRole('button', { name: 'Зареєструватися' }).click();
  await expect(pageFlow.getByText('Введіть коректну електронну пошту.')).toBeVisible();
  await pageFlow.getByLabel(/Електронна пошта/).fill('olena@example.com');
  await pageFlow.getByRole('checkbox').check();
  await pageFlow.getByRole('button', { name: 'Зареєструватися' }).click();
  await expect(pageFlow.getByRole('heading', { name: 'Демо-перегляд завершено' })).toBeVisible();
  await expect(pageFlow.getByText(/Акаунт не створено.*Серверної сесії немає/)).toBeVisible();
  await expectNoAuthPersistence(page);
});

test('phone, OTP and profile surfaces have no serious accessibility violations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop accessibility assertion.');
  const { dialog } = await openAuthModal(page);
  await expectNoSeriousAuthViolations(page, '[data-auth-modal]');
  await dialog.getByRole('button', { name: 'Зареєструватися' }).click();
  await beginPreview(dialog, '+380501234567');
  await expectNoSeriousAuthViolations(page, '[data-auth-modal]');
  await pasteOtp(dialog, '123456');
  await dialog.getByRole('button', { name: 'Продовжити' }).click();
  await expect(dialog.getByRole('heading', { name: 'Особиста інформація' })).toBeVisible();
  await expectNoSeriousAuthViolations(page, '[data-auth-modal]');
});

test('mobile auth modal closes from the backdrop and never overflows horizontally', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile viewport assertion.');
  const { dialog, trigger } = await openAuthModal(page);
  await expect(dialog).toBeVisible();
  const expectNoOverflow = async () => {
    const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  };
  await expectNoOverflow();
  await dialog.getByRole('button', { name: 'Зареєструватися' }).click();
  await beginPreview(dialog, '+380501234567');
  await expectNoOverflow();
  await pasteOtp(dialog, '123456');
  await dialog.getByRole('button', { name: 'Продовжити' }).click();
  await expect(dialog.getByRole('heading', { name: 'Особиста інформація' })).toBeVisible();
  await expectNoOverflow();
  await page.locator('[data-auth-modal]').click({ position: { x: 2, y: 2 } });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
