import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
test("F14 own demo order exposes separated statuses, validates partial return and never claims cancellation/refund", async ({
  page,
}) => {
  await page.goto("/profile/orders/demo-order-004");
  const section = page.getByRole("region", {
      name: "Демонстраційний життєвий цикл",
    }),
    form = page.getByRole("form", {
      name: "Демонстраційний запит на повернення",
    });
  await expect(section).toBeVisible();
  await expect(
    section.getByText("Не підтверджено", { exact: true }),
  ).toHaveCount(2);
  await expect(
    section.getByText("Не ініційовано", { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText(/Реальне скасування недоступне/),
  ).toBeVisible();
  await form.getByRole("button", { name: "Створити лише демо-запит" }).click();
  const reason = form.getByRole("textbox", {
    name: "Вигадана причина повернення",
  });
  await expect(reason).toBeFocused();
  await expect(form.getByRole("alert")).toBeVisible();
  await reason.fill("Це вигадана причина для тестування.");
  const quantity = form.getByRole("spinbutton").nth(1);
  await quantity.fill("3");
  await form.getByRole("button").click();
  await expect(form.getByRole("alert")).toContainText("Кількість перевищує");
  await expect(reason).toHaveValue("Це вигадана причина для тестування.");
  await quantity.fill("1");
  await form.evaluate((e) => {
    (e as HTMLFormElement).requestSubmit();
    (e as HTMLFormElement).requestSubmit();
  });
  await expect(form.getByRole("status")).toContainText("Нікому не надіслано");
  await expect(
    section
      .getByRole("list", { name: "Демо-запити на повернення" })
      .getByRole("listitem"),
  ).toHaveCount(1);
  await expect(reason).toBeFocused();
  await expect(
    section.getByText("Не ініційовано", { exact: true }),
  ).toBeVisible();
  await expect(
    section
      .getByRole("list", { name: "Історія статусів і запитів" })
      .getByRole("listitem"),
  ).toHaveCount(2);
  const result = await new AxeBuilder({ page })
    .include(".account-order-detail")
    .analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: /До замовлень/ })
    .first()
    .click();
  await page
    .getByRole("article", { name: "Демо-замовлення BZ-DEMO-004" })
    .getByRole("link", { name: "Детальніше" })
    .click();
  await expect(
    page
      .getByRole("list", { name: "Демо-запити на повернення" })
      .getByRole("listitem"),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByText("Демо-запитів на повернення поки немає."),
  ).toBeVisible();
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(storage).not.toContain("вигадана причина");
  expect(storage).not.toContain("demo-return");
});
test("F14 order navigation errors and empty states preserve account structure and keyboard access", async ({
  page,
}) => {
  await page.goto("/profile/orders");
  await expect(
    page.getByRole("heading", { name: "Мої замовлення" }),
  ).toBeVisible();
  const order = page
    .getByRole("article", { name: "Демо-замовлення BZ-DEMO-006" })
    .getByRole("link", { name: "Детальніше" });
  await order.focus();
  await order.press("Enter");
  await expect(
    page.getByRole("region", { name: "Демонстраційний життєвий цикл" }),
  ).toBeVisible();
  await page.goto("/profile/orders/missing");
  await expect(
    page.getByRole("heading", { name: "Замовлення не знайдено" }),
  ).toBeVisible();
  await page.goto("/profile/orders/demo-order-004?preview=error");
  await expect(
    page.getByRole("heading", { name: "Деталі недоступні" }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Демонстраційний запит на повернення" }),
  ).toHaveCount(0);
  await page.goto("/profile/orders?preview=empty");
  await expect(
    page.getByRole("heading", { name: "Тут поки немає замовлень" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
