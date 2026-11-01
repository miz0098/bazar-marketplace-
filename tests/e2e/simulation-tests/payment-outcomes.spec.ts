import {test,expect} from '@playwright/test';
import {register} from './auth';
test('payment failure or unresolved outcome preserves cart and never displays successful order confirmation',async({page},info)=>{
 await register(page,info.project.name==='server-mobile'?'731110002':'731110001');
 await page.goto('/search?q=iPhone');const card=page.locator('[data-offer-id]').first();await card.getByRole('button',{name:/кошик/}).click();await expect(card.getByRole('button',{name:'Додано ✓',exact:true})).toBeVisible();
 await page.goto('/checkout');await page.getByLabel(/^Телефон/).fill('731110001');
 await expect(page.getByRole('button',{name:'Перейти до оплати',exact:true})).toBeDisabled();
 const group=page.locator('[data-seller-delivery]').first();await group.getByLabel('Пошук міста',{exact:true}).fill('Київ');await group.getByRole('button',{name:'Знайти міста',exact:true}).click();await group.getByRole('combobox',{name:'Місто',exact:true}).selectOption({label:'Київ'});await group.getByRole('button',{name:'Знайти відділення',exact:true}).click();await group.getByRole('combobox',{name:'Відділення або поштомат',exact:true}).selectOption({label:'Відділення № 1'});
 await page.getByRole('button',{name:'Перейти до оплати',exact:true}).click();await page.getByRole('button',{name:'Сплатити',exact:true}).click();
 if(process.env.BAZAR_SIMULATION_PAYMENT_OUTCOME==='declined')await expect(page.getByText('Платіж відхилено. Кошик збережено.',{exact:true})).toBeVisible();
 else {await expect(page.getByRole('status').filter({hasText:/Оплата перевіряється|Очікуємо підтвердження оплати/})).toBeVisible();await expect(page.getByRole('button',{name:'Сплатити',exact:true})).toBeDisabled();}
 await expect(page.getByRole('heading',{name:'Дякуємо за замовлення!',exact:true})).toHaveCount(0);
 const state=await page.evaluate(async()=>({cart:(await(await fetch('/api/v1/catalog/customer-state')).json()).data,orders:(await(await fetch('/api/v1/commerce/orders')).json()).data}));
 expect(state.cart.lines).toHaveLength(1);expect(state.orders.items).toHaveLength(1);expect(state.orders.items[0].status).not.toBe('confirmed');expect(state.orders.items[0].paymentState).not.toBe('succeeded');
 await page.reload();await expect(page.getByRole('heading',{name:'Дякуємо за замовлення!',exact:true})).toHaveCount(0);await page.goto('/cart');await expect(page.locator('.cart-line')).toHaveCount(1);
});
