import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { control } from "./controller";
test.beforeEach(async () => {
  await control("reset");
});
async function login(page: Page, phone = "+380671234567") {
  await page.goto("/account/login");
  await page.getByLabel("Телефон для тесту").fill(phone);
  await page.getByLabel("Погоджуюся лише").focus();
  await page.getByLabel("Погоджуюся лише").press("Space");
  await page
    .getByRole("button", { name: "Створити серверний OTP challenge" })
    .press("Enter");
  await page
    .getByRole("button", { name: "Показати власний тестовий код" })
    .click();
  const code = await page.locator("output").innerText();
  await page.getByLabel("Серверний OTP", { exact: true }).fill(code);
  await page.getByLabel("Серверний OTP", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText("Серверний кошик: 0 позицій")).toBeVisible();
}
async function cart(page: Page) {
  await login(page);
  await page
    .getByRole("button", { name: "Додати тестовий товар у серверний кошик" })
    .click();
  await expect(page.getByLabel("Кількість у серверному кошику")).toHaveValue(
    "1",
  );
  await page.getByRole("button", { name: "Перейти до оформлення" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Контактні дані та доставка",
      exact: true,
    }),
  ).toBeVisible();
}
async function shipping(page: Page, carrier = "Нова пошта", success = true) {
  await page.getByRole("radio", { name: new RegExp(carrier) }).check();
  await page.getByRole("button", { name: "Знайти міста" }).click();
  await page
    .getByLabel("Населений пункт", { exact: true })
    .selectOption({ label: "Тестове місто" });
  await page.getByRole("button", { name: "Знайти відділення" }).click();
  await page
    .getByLabel("Відділення", { exact: true })
    .selectOption({ label: "Тестовий пункт" });
  await page
    .getByRole("button", { name: "Розрахувати тестову доставку" })
    .click();
  if (success)
    await expect(page.getByRole("status")).toContainText(
      "Тестова пропозиція доставки",
    );
  else
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "доставка недоступна",
    );
}
async function payment(page: Page) {
  await page.getByRole("button", { name: "Продовжити до оплати" }).click();
  await expect(
    page.getByRole("heading", { name: "Оплата", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Створити тестову платіжну спробу" })
    .click();
  await expect(page.getByRole("status")).toContainText("pending");
  await page
    .getByRole("button", { name: "Ізольований успішний результат" })
    .click();
  await expect(page.getByRole("status")).toContainText("succeeded");
  await page.getByRole("button", { name: "Перейти до підтвердження" }).click();
  await expect(page).toHaveURL(/step=3/);
  await expect(
    page.getByRole("heading", { name: "Підтвердження", exact: true }),
  ).toBeVisible();
}
for (const carrier of ["Нова пошта", "Meest", "Укрпошта"])
  test(`browser PostgreSQL checkout via ${carrier} keeps Secure sessions and cannot duplicate test orders`, async ({
    page,
    context,
  }) => {
    await page.goto("/catalog");
    await page.getByRole("link", { name: /Тестовий товар BAZAR/ }).click();
    await page
      .getByRole("button", { name: "Додати до локального кошика" })
      .click();
    await expect(
      page.getByText("Локальний гостьовий кошик: 1.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Увійти через сервер для оформлення" })
      .click();
    await login(page);
    await expect(
      page.getByText("Локальний гостьовий кошик: 1.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Додати тестовий товар у серверний кошик" })
      .click();
    await page.getByLabel("Кількість у серверному кошику").fill("2");
    await expect(page.getByLabel("Кількість у серверному кошику")).toHaveValue(
      "2",
    );
    await page.getByRole("button", { name: "Видалити", exact: true }).click();
    await expect(page.getByText("Серверний кошик: 0 позицій")).toBeVisible();
    await page
      .getByRole("button", { name: "Додати тестовий товар у серверний кошик" })
      .click();
    await page.getByRole("button", { name: "Перейти до оформлення" }).click();
    await shipping(page, carrier);
    await expect(page.getByRole("radio", { name: /ПВЗ BAZAR/ })).toBeDisabled();
    await payment(page);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Підтвердження", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Записати лише тестове замовлення" })
      .evaluate((e) => {
        (e as HTMLButtonElement).click();
        (e as HTMLButtonElement).click();
      });
    await expect(page.getByRole("status")).toContainText(
      "Тестове замовлення записано",
    );
    await page
      .getByRole("button", { name: "Повторити підтвердження без дублювання" })
      .click();
    await expect
      .poll(async () => Number((await control("counts")).orders))
      .toBe(1);
    expect((await control("counts")).links).toBe(1);
    await page
      .getByRole("link", { name: "Відкрити в «Мої замовлення»" })
      .click();
    await expect(
      page.getByRole("list", { name: "Історія серверних статусів" }),
    ).toContainText("immutable-order: pending");
    await expect(
      page.getByText("Замовлення: pending.", { exact: false }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /Тестовий запис/ }),
    ).toBeVisible();
    const cookies = await context.cookies();
    for (const c of cookies.filter((c) => c.name.startsWith("__Host-bazar-"))) {
      expect(c.secure).toBe(true);
      expect(c.httpOnly).toBe(true);
      expect(c.sameSite).toBe("Strict");
      expect(c.path).toBe("/");
    }
    expect(cookies.some((c) => c.name === "__Host-bazar-session")).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "__Host-bazar-",
    );
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(stored).not.toMatch(/csrfToken|session.token|Тестовий|380671234567/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("browser server rejects invalid auth, CSRF, caller price, revoked session and unsupported wallets", async ({
  page,
}) => {
  await page.goto("/account/login");
  await page.getByLabel("Погоджуюся лише").check();
  await page
    .getByRole("button", { name: "Створити серверний OTP challenge" })
    .click();
  await page
    .getByRole("button", { name: "Показати власний тестовий код" })
    .click();
  const code = await page.locator("output").innerText();
  await page
    .getByLabel("Серверний OTP", { exact: true })
    .fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Перевірити OTP на сервері" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Сервер не підтвердив",
  );
  await page.getByLabel("Серверний OTP", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Перевірити OTP на сервері" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  const denied = await page.evaluate(async () => {
    const r = await fetch("/api/v1/cart", {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": "forged" },
      body: "{}",
    });
    return r.status;
  });
  expect(denied).toBe(403);
  await page
    .getByRole("button", { name: "Додати тестовий товар у серверний кошик" })
    .click();
  await page.getByRole("button", { name: "Перейти до оформлення" }).click();
  await shipping(page);
  await page.getByRole("button", { name: "Продовжити до оплати" }).click();
  await expect(page.getByRole("radio", { name: /Apple Pay/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /Google Pay/ })).toBeDisabled();
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  expect(
    axe.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await control("revoke");
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Потрібна серверна сесія" }),
  ).toBeVisible();
  expect((await control("counts")).orders).toBe(0);
});
test("browser price, unavailable stock, delivery and payment errors remain truthful", async ({
  page,
}) => {
  await page.goto("/products/unavailable-product");
  await expect(
    page.getByRole("button", { name: "Додати до локального кошика" }),
  ).toBeDisabled();
  await cart(page);
  await control("shipping-error");
  await shipping(page, "Нова пошта", false);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "доставка недоступна",
  );
  await control("shipping-ok");
  await shipping(page);
  await page.getByRole("button", { name: "Продовжити до оплати" }).click();
  await page
    .getByRole("button", { name: "Створити тестову платіжну спробу" })
    .click();
  await page.getByRole("button", { name: "Ізольована відмова" }).click();
  await expect(page.getByRole("status")).toContainText("declined");
  await expect(
    page.getByRole("button", { name: "Перейти до підтвердження" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Нова тестова платіжна спроба" })
    .click();
  await expect(page.getByRole("status")).toContainText("pending");
  expect((await control("counts")).orders).toBe(0);
});
test("browser changed price cannot produce an order; active promo stays policy-blocked", async ({
  page,
}) => {
  await cart(page);
  await shipping(page);
  await page.getByRole("button", { name: "Продовжити до оплати" }).click();
  await page.getByLabel("Промокод", { exact: true }).fill("TEST1000");
  await page
    .getByRole("button", { name: "Застосувати промокод на сервері" })
    .click();
  await expect(page.getByText(/Серверна знижка:/)).toContainText("10,00");
  await page
    .getByRole("button", { name: "Створити тестову платіжну спробу" })
    .click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Прибрати промокод явно" }).click();
  await control("price");
  await page
    .getByRole("button", { name: "Створити тестову платіжну спробу" })
    .click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  expect((await control("counts")).orders).toBe(0);
});

test("browser stale tariff after signed proof cannot create an order", async ({
  page,
}) => {
  await cart(page);
  await shipping(page);
  await payment(page);
  await control("stale-tariff");
  await page
    .getByRole("button", { name: "Записати лише тестове замовлення" })
    .click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  expect((await control("counts")).orders).toBe(0);
});
test("browser expired quote and newly unavailable stock fail closed", async ({
  page,
}) => {
  await cart(page);
  await control("short-quote");
  await shipping(page);
  await page.getByRole("button", { name: "Продовжити до оплати" }).click();
  await expect(
    page.getByRole("heading", { name: "Оплата", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(4500);
  await page
    .getByRole("button", { name: "Створити тестову платіжну спробу" })
    .click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  expect((await control("counts")).orders).toBe(0);
  await page.goto("/cart");
  await control("sold-out");
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Серверні залишки",
  );
  await expect(
    page.getByRole("button", { name: "Перейти до оформлення" }),
  ).toBeDisabled();
});
test("browser cannot forge cart prices or duplicate a mutation; private controller is not a browser endpoint", async ({
  page,
}) => {
  await login(page);
  const statuses = await page.evaluate(async () => {
    const session = await (await fetch("/api/v1/auth/session")).json();
    const headers = {
      "content-type": "application/json",
      "x-csrf-token": session.data.csrfToken,
    };
    const cart = await (
      await fetch("/api/v1/cart", { method: "POST", headers, body: "{}" })
    ).json();
    const product = await (
      await fetch("/api/v1/products/browser-product")
    ).json();
    const input = {
      variantId: product.data.variants[0].id,
      quantity: 1,
      expectedVersion: cart.data.cart.version,
      idempotencyKey: crypto.randomUUID(),
    };
    const bad = await fetch("/api/v1/cart/lines", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...input, priceMinor: 1 }),
    });
    const responses = await Promise.all([
      fetch("/api/v1/cart/lines", {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }),
      fetch("/api/v1/cart/lines", {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }),
    ]);
    const results = await Promise.all(responses.map((r) => r.json()));
    const control = await fetch("/__control/action", {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "reset" }),
    });
    const forwarded = await fetch("/api/v1/cart", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    return {
      bad: bad.status,
      replays: results.filter((r) => r.data.replayed).length,
      versions: results.map((r) => r.data.view.cart.version),
      control: control.status,
      forwarded: forwarded.status,
    };
  });
  expect(statuses.bad).toBe(400);
  expect(statuses.replays).toBe(1);
  expect(statuses.versions[0]).toBe(statuses.versions[1]);
  expect(statuses.control).toBeGreaterThanOrEqual(400);
  expect(statuses.forwarded).toBe(403);
  await page.reload();
  await expect(page.getByLabel("Кількість у серверному кошику")).toHaveValue(
    "1",
  );
});
test("browser sessions isolate another customer order and OTP challenge", async ({
  page,
  browser,
  baseURL,
}) => {
  await cart(page);
  await shipping(page);
  await payment(page);
  await page
    .getByRole("button", { name: "Записати лише тестове замовлення" })
    .click();
  await page.getByRole("link", { name: "Відкрити в «Мої замовлення»" }).click();
  await expect(page).toHaveURL(/\/profile\/orders\/[a-f0-9-]{36}$/);
  const orderId = new URL(page.url()).pathname.split("/").at(-1)!;
  const other = await browser.newContext({ baseURL, ignoreHTTPSErrors: false });
  try {
    const p = await other.newPage();
    await login(p, "+380681234567");
    const code = await p.evaluate(async (id) => {
      const r = await fetch("/api/v1/orders/" + id);
      return r.status;
    }, orderId);
    expect(code).toBe(404);
    const challenge = await page.evaluate(async () => {
      const flow = await (await fetch("/api/v1/auth/csrf")).json();
      const response = await fetch("/api/v1/auth/otp/challenges", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": flow.data.csrfToken,
        },
        body: JSON.stringify({ phone: "+380691234567", intent: "register" }),
      });
      return (await response.json()).data.challengeId as string;
    });
    const stolen = await p.evaluate(async (id) => {
      const session = await (await fetch("/api/v1/auth/session")).json();
      const r = await fetch("/__browser/otp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.data.csrfToken,
        },
        body: JSON.stringify({ challengeId: id }),
      });
      return r.status;
    }, challenge);
    expect(stolen).toBeGreaterThanOrEqual(400);
  } finally {
    await other.close();
  }
});
