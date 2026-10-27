import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function addDemoProduct(page: import('@playwright/test').Page) {
  await page.goto('/catalog');
  await page.locator('[data-offer-id="iphone-15"]').getByRole('button', { name: 'У кошик' }).click();
  await page.goto('/cart');
  await page.getByRole('link', { name: 'Перейти до оформлення' }).click();
}

test('checkout validates fields and preserves data through all three demo steps', async ({ page }) => {
  await addDemoProduct(page);
  await expect(page.getByRole('heading', { name: 'Контактні дані та доставка' })).toBeVisible();
  await page.getByRole('button', { name: 'Продовжити до оплати' }).click();
  await expect(page.getByText('Вкажіть ім’я та прізвище.')).toBeVisible();
  await expect(page.locator('#fullName')).toBeFocused();

  await page.locator('#fullName').fill('Олена Коваль');
  await page.locator('#phone').fill('067 123 45 67');
  await page.getByLabel('Meest').check();
  await page.locator('#city').fill('Київ');
  await page.locator('#branch').fill('Відділення 12');
  await page.getByRole('button', { name: 'Продовжити до оплати' }).click();

  await expect(page.getByRole('heading', { name: 'Оплата' })).toBeVisible();
  await page.locator('#promoCode').fill('BAZAR10');
  await page.getByRole('button', { name: 'Застосувати' }).click();
  await expect(page.getByText('Демо-знижку 10% застосовано.')).toBeVisible();
  await page.getByRole('button', { name: 'Перейти до підтвердження' }).click();

  await expect(page.getByRole('heading', { name: 'Підтвердження' })).toBeVisible();
  await expect(page.getByText('Демо завершується на цьому кроці.')).toBeVisible();
  await expect(page.getByRole('button', { name: /створити замовлення|підтвердити оплату/i })).toHaveCount(0);
  await expect(page.getByText('Олена Коваль')).toBeVisible();
  await page.getByRole('button', { name: 'Назад до оплати' }).click();
  await expect(page.locator('#promoCode')).toHaveValue('BAZAR10');
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.locator('#fullName')).toHaveValue('Олена Коваль');
  await expect(page.getByLabel('Meest')).toBeChecked();

  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
});

test('checkout refresh keeps cart and draft but never offers order completion', async ({ page }) => {
  await addDemoProduct(page);
  await page.locator('#fullName').fill('Іван Петренко');
  await page.locator('#phone').fill('+380501234567');
  await page.locator('#city').fill('Львів');
  await page.locator('#branch').fill('3');
  await page.reload();
  await expect(page.locator('#fullName')).toHaveValue('Іван Петренко');
  await expect(page.getByRole('button', { name: /створити замовлення|підтвердити оплату/i })).toHaveCount(0);
  await page.goto('/cart');
  await expect(page.getByText('Apple iPhone 15 Pro 128GB')).toBeVisible();
});


test('Ukrposhta preserves the three-step demo, keyboard selection, mobile layout and payment boundaries',async({page})=>{
 await addDemoProduct(page);
 await expect(page.getByLabel('ПВЗ BAZAR')).toBeDisabled();
 await page.getByLabel('Укрпошта').focus();await page.keyboard.press('Space');await expect(page.getByLabel('Укрпошта')).toBeChecked();await expect(page.getByLabel('Укрпошта')).toBeFocused();
 await page.locator('#fullName').fill('Олена Коваль');await page.locator('#phone').fill('+380671234567');await page.locator('#city').fill('Київ');await page.locator('#branch').fill('01001');
 await page.reload();await expect(page.getByLabel('Укрпошта')).toBeChecked();
 for(const step of [1,2,3]){
  if(step===2)await page.getByRole('button',{name:'Продовжити до оплати'}).click();
  if(step===3)await page.getByRole('button',{name:'Перейти до підтвердження'}).click();
  await expect(page.getByRole('heading',{name:step===1?'Контактні дані та доставка':step===2?'Оплата':'Підтвердження',exact:true})).toBeVisible();
  if(step===2){await expect(page.getByLabel('Карткою онлайн')).toBeChecked();await expect(page.getByLabel('Промокод')).toBeVisible();}
  const widths=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));expect(widths.scroll).toBeLessThanOrEqual(widths.width);
  const axe=await new AxeBuilder({page}).include('.checkout-layout').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 }
 await expect(page.locator('.checkout-review').getByText('Укрпошта',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:/створити замовлення|підтвердити оплату/i})).toHaveCount(0);
});
