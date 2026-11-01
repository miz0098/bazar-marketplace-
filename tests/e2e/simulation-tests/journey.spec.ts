import {test,expect,type Page} from '@playwright/test';

import {register} from './auth';
async function assertOrdinary(page:Page){
 const text=await page.locator('body').innerText();
 expect(text).not.toMatch(/demo|mock|preview|демо|тестов|ізольован/i);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
test('account, cart, paid order and communications persist; forged success and cross-owner access fail',async({page,browser},info)=>{
 await register(page,info.project.name==='server-mobile'?'671110002':'671110001');
 await page.goto('/profile/personal-data');
 await page.getByLabel('По батькові — необов’язково',{exact:true}).fill('Іванівна');
 await page.getByRole('button',{name:'Зберегти особисті дані',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Зміни збережено'})).toBeVisible();
 await page.reload();
 await expect(page.getByLabel('По батькові — необов’язково',{exact:true})).toHaveValue('Іванівна');
 await assertOrdinary(page);
 await page.goto('/search?q=iPhone');
 const card=page.locator('[data-offer-id]').first();
 await card.getByRole('button',{name:/кошик/}).click();
 await expect(card.getByRole('button',{name:'Додано ✓',exact:true})).toBeVisible();
 await page.reload();await page.goto('/cart');
 await expect(page.locator('.cart-line')).toHaveCount(1);
 await page.goto('/checkout');
 await page.getByLabel(/^Телефон/).fill('671110001');
 const groups=page.locator('[data-seller-delivery]');await expect(groups).toHaveCount(1);
 const group=groups.first();
 await group.getByLabel('Пошук міста',{exact:true}).fill('Київ');
 await group.getByRole('button',{name:'Знайти міста',exact:true}).click();
 await group.getByRole('combobox',{name:'Місто',exact:true}).selectOption({label:'Київ'});
 await group.getByRole('button',{name:'Знайти відділення',exact:true}).click();
 await group.getByRole('combobox',{name:'Відділення або поштомат',exact:true}).selectOption({label:'Відділення № 1'});
 await page.getByRole('button',{name:'Перейти до оплати',exact:true}).click();
 // Error response cannot display success or clear the cart.
 await page.route('**/api/v1/commerce/**/pay',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}),{times:1});
 await page.getByRole('button',{name:'Сплатити',exact:true}).click();
 await expect(page.locator('main').getByRole('alert')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Дякуємо за замовлення!',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Сплатити',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Дякуємо за замовлення!',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Дякуємо за замовлення!',exact:true})).toBeVisible();
 const order=await page.evaluate(()=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith('bazar-commerce-'))!;return JSON.parse(sessionStorage.getItem(key)!).parentId as string;});
 const checks=await page.evaluate(async id=>{
  const session=(await(await fetch('/api/v1/auth/session')).json()).data;
  const order=(await(await fetch('/api/v1/commerce/orders/'+id)).json()).data;
  const cart=(await(await fetch('/api/v1/catalog/customer-state')).json()).data;
  const forged=await fetch('/__browser/commerce-payment',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':session.csrfToken},body:JSON.stringify({operationId:order.attemptId,result:'succeeded'})});
  const csrf=await fetch('/api/v1/commerce/orders/'+id+'/reconcile',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  return {status:order.status,payment:order.paymentState,cart:cart.lines.length,forged:forged.status,csrf:csrf.status};
 },order);
 expect(checks).toEqual({status:'confirmed',payment:'succeeded',cart:0,forged:400,csrf:403});
 await page.goto('/profile/orders/'+order);await expect(page.locator('[data-commerce-order]')).toHaveAttribute('data-commerce-order',order);
 await expect.poll(()=>page.evaluate(async id=>(await(await fetch('/api/v1/commerce/orders/'+id+'/lifecycle')).json()).data.sellerOrders[0].status,order),{timeout:10000}).toBe('delivered');
 await page.reload();await assertOrdinary(page);
 await page.getByLabel('Причина',{exact:true}).fill('Повернення покупки');
 await page.getByRole('spinbutton',{name:/Кількість для повернення/}).fill('1');
 await page.getByRole('button',{name:'Подати запит на повернення',exact:true}).click();
 await expect.poll(()=>page.evaluate(async id=>(await(await fetch('/api/v1/commerce/orders/'+id+'/lifecycle')).json()).data.refunds[0]?.state,order),{timeout:10000}).toBe('confirmed-for-test');
 await page.reload();await expect(page.locator('main')).toContainText('Підтверджено');
 await page.goto('/profile/reviews');
 await page.getByLabel('Текст відгуку',{exact:true}).fill('Покупку збережено в історії');
 await page.getByRole('button',{name:'Надіслати відгук на модерацію',exact:true}).click();
 await expect(page.locator('article.account-panel')).toContainText('Покупку збережено в історії');await page.reload();await expect(page.locator('article.account-panel')).toContainText('Покупку збережено в історії');await assertOrdinary(page);

 await page.goto('/profile/support');await page.getByLabel('Тема',{exact:true}).fill('Питання щодо покупки');await page.getByLabel('Повідомлення',{exact:true}).fill('Прошу уточнити умови доставки');await page.getByRole('button',{name:'Створити звернення',exact:true}).click();
 await page.getByRole('link',{name:/Питання щодо покупки/}).click();
 await page.getByLabel('Ваше повідомлення',{exact:true}).fill('Додаткова інформація');await page.getByRole('button',{name:'Надіслати',exact:true}).click();
 await expect(page.getByRole('region',{name:'Історія повідомлень',exact:true}).getByText('Додаткова інформація',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('region',{name:'Історія повідомлень',exact:true}).getByText('Додаткова інформація',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Історія повідомлень',exact:true})).toContainText('Дякуємо за звернення!');
 await assertOrdinary(page);
 const other=await browser.newContext({baseURL:new URL(page.url()).origin});
 const p=await other.newPage();await register(p,info.project.name==='server-mobile'?'931110002':'931110001');
 const denied=await p.evaluate(async id=>(await fetch('/api/v1/commerce/orders/'+id)).status,order);
 expect([403,404]).toContain(denied);await other.close();
});

test('saved addresses, wishlist, logout and repeat login use the same database account',async({page},info)=>{
 const phone=info.project.name==='server-mobile'?'681110002':'681110001';
 await register(page,phone);await page.goto('/profile/addresses');
 await page.getByRole('button',{name:'Додати адресу',exact:true}).click();
 await page.getByLabel('Пошук міста',{exact:true}).fill('Київ');
 await page.getByRole('button',{name:'Знайти міста',exact:true}).click();
 await page.getByRole('combobox',{name:'Місто',exact:true}).selectOption({label:'Київ'});
 await page.getByRole('button',{name:'Знайти відділення',exact:true}).click();
 await page.getByRole('combobox',{name:'Відділення або поштомат',exact:true}).selectOption({label:'Відділення № 1'});
 await page.getByLabel('Назва адреси — необов’язково',{exact:true}).fill('Основна адреса');
 await page.getByLabel('Основна адреса',{exact:true}).check();
 await page.getByRole('button',{name:'Зберегти адресу',exact:true}).click();
 await expect(page.locator('article.account-panel')).toContainText('Основна адреса');
 await page.reload();await expect(page.locator('article.account-panel')).toContainText('Основна адреса');await assertOrdinary(page);
 await page.goto('/profile/payment-methods');
 await page.getByRole('button',{name:'Додати спосіб оплати',exact:true}).click();
 await expect(page.locator('.account-payment-card')).toContainText('4242');
 await page.getByRole('button',{name:'Обрати основним',exact:true}).click();
 await expect(page.locator('.account-payment-card')).toContainText('За замовчуванням');
 await page.reload();await expect(page.locator('.account-payment-card')).toContainText('За замовчуванням');await assertOrdinary(page);
 await page.getByRole('button',{name:'Видалити метод',exact:true}).click();
 await expect(page.locator('.account-payment-card')).toHaveCount(0);
 await page.reload();await expect(page.locator('.account-payment-card')).toHaveCount(0);
 await page.goto('/search?q=iPhone');
 const favorite=page.locator('[data-offer-id]').first().getByRole('button',{name:/до обраного/});await favorite.click();
 await expect(page.locator('[data-offer-id]').first().getByRole('button',{name:/з обраного/})).toHaveAttribute('aria-pressed','true');
 await page.goto('/profile/wishlist');await expect(page.locator('.account-wishlist-card')).toHaveCount(1);
 await page.reload();await expect(page.locator('.account-wishlist-card')).toHaveCount(1);await assertOrdinary(page);
 if(info.project.name==='server-mobile')await page.getByRole('button',{name:'Відкрити меню профілю',exact:true}).click();
 await page.getByRole('button',{name:'Вихід',exact:true}).click();
 await expect(page).toHaveURL(/\/$/);
 expect(await page.evaluate(async()=>(await fetch('/api/v1/auth/session')).status)).toBe(401);
 await page.goto('/account/login');await page.getByLabel('Номер телефону',{exact:true}).fill(phone);
 await page.getByRole('button',{name:'Продовжити',exact:true}).click();
 const code='123456';
 for(let i=0;i<6;i++)await page.getByLabel(`Цифра ${i+1} з 6`,{exact:true}).fill(code[i]);
 await page.locator('.auth-page').getByRole('button',{name:'Увійти',exact:true}).click();await expect(page).toHaveURL(/\/profile\/personal-data$/);
 await page.goto('/profile/addresses');await expect(page.locator('article.account-panel')).toContainText('Основна адреса');
 await page.goto('/profile/wishlist');await expect(page.locator('.account-wishlist-card')).toHaveCount(1);
});


test('ordinary catalog and information screens contain no simulation labels; guest cart requires an account',async({page})=>{
 for(const path of ['/','/catalog','/catalog?preview=error','/catalog?preview=empty','/products/offer-phone-0','/help/how-to-order','/help/delivery','/help/returns','/help/order-tracking','/help/privacy-policy','/about','/contacts']){
  await page.goto(path);await expect(page.locator('main')).toBeVisible();await assertOrdinary(page);
 }
 await page.goto('/search?q=iPhone');
 await page.locator('[data-offer-id]').first().getByRole('button',{name:/кошик/}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.locator('[data-offer-id]').first().getByRole('button',{name:'Додано ✓',exact:true})).toHaveCount(0);
});

test('seller questions receive moderated answers and incoming messages appear automatically',async({page},info)=>{
 await register(page,info.project.name==='server-mobile'?'691110002':'691110001');
 await page.goto('/search?q=iPhone');
 await page.locator('[data-offer-id]').first().locator('a[href^="/products/"]').first().click();
 await page.getByRole('tab',{name:'Питання та відповіді',exact:true}).click();
 await page.getByLabel('Ваше запитання',{exact:true}).fill('Які варіанти товару доступні?');
 await page.getByRole('button',{name:'Надіслати запитання',exact:true}).click();
 await expect(page.getByText('Запитання збережено на сервері й очікує модерації.',{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(async()=>(await(await fetch('/api/v1/customer/account')).json()).data.questions[0]?.answer),{timeout:10000}).toContain('Дякуємо за запитання!');
 await page.reload();await page.getByRole('tab',{name:'Питання та відповіді',exact:true}).click();
 await expect(page.locator('.customer-feedback')).toContainText('Дякуємо за запитання!');await assertOrdinary(page);
 await page.getByRole('button',{name:'Написати продавцю цієї пропозиції',exact:true}).click();
 await page.getByLabel('Ваше повідомлення',{exact:true}).fill('Доброго дня!');
 await page.getByRole('button',{name:'Надіслати',exact:true}).click();
 await expect(page.getByRole('region',{name:'Історія повідомлень',exact:true})).toContainText('Дякуємо за повідомлення!');
 await page.reload();await expect(page.getByRole('region',{name:'Історія повідомлень',exact:true})).toContainText('Дякуємо за повідомлення!');await assertOrdinary(page);
});
