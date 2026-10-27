import {authenticate} from './auth';
import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {control} from '../browser-tests/controller';
test.beforeEach(async()=>{await control('reset');});
test('ordinary catalog renders each seller offer, exact prices and selected variant URLs',async({page})=>{
 await page.goto('/search?q=iPhone');
 const cards=page.locator('[data-offer-id]');await expect(cards).toHaveCount(5);
 expect(new Set(await cards.evaluateAll(es=>es.map(e=>e.getAttribute('data-offer-id')))).size).toBe(5);
 expect(new Set(await cards.evaluateAll(es=>es.map(e=>e.getAttribute('data-seller-id')))).size).toBe(3);
 await expect(cards.filter({hasText:'Немає в наявності'})).toHaveCount(1);
 expect((await cards.allTextContents()).every(t=>! /Від\s+\d/.test(t))).toBe(true);
 const seller=await cards.first().getAttribute('data-seller-id');const offer=await cards.first().getAttribute('data-offer-id');const price=await cards.first().locator('.product-card__price b').innerText();
 const href=await cards.first().locator('a').first().getAttribute('href');expect(href).toMatch(/variant=/);
 await page.goto(href!);await expect(page).toHaveURL(/variant=/);
 await expect(page.locator('main')).toContainText('iPhone 17');await expect(page.locator('.product-summary')).toHaveAttribute('data-seller-id',seller!);await expect(page.locator('.product-summary')).toContainText(price);expect(new URL(page.url()).searchParams.get('variant')).toBe(offer);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('offer search/filter/sort/pagination use offer rows and reject unsupported owner input',async({page})=>{
 await page.goto('/search?q=iPhone&sort=price-asc&limit=2');await expect(page.locator('[data-offer-id]')).toHaveCount(2);
 const data=await page.evaluate(async()=>{const r=await fetch('/api/v1/catalog/offers?query=iPhone&sort=price-asc&limit=2');return (await r.json()).data;});
 expect(data.total).toBe(5);expect(data.items.map((x:{price:{amountMinor:number}})=>x.price.amountMinor)).toEqual([3780000,3899900]);
 const filter=await page.evaluate(async()=>{const r=await fetch('/api/v1/catalog/offers?query=iPhone&attribute=storage&value=512&available=true');return(await r.json()).data;});expect(filter.total).toBe(2);
 await page.reload();await expect(page.locator('[data-offer-id]')).toHaveCount(2);
 const denied=await page.evaluate(async()=> (await fetch('/api/v1/catalog/customer-state')).status);expect(denied).toBe(401);
 await page.goto('/search?q=missing-synthetic-offer');await expect(page.locator('[data-offer-id]')).toHaveCount(0);
});
test('catalog keyboard and accessible names remain usable on desktop and mobile',async({page})=>{
 await page.goto('/search?q=iPhone');await expect(page.locator('[data-offer-id]')).toHaveCount(5);
 await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement!==document.body)).toBe(true);
 const results=await new AxeBuilder({page}).analyze();expect(results.violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('ordinary authentication persists exact offer cart/wishlist, refresh, no guest merge and cross-device isolation',async({page,context,browser})=>{
 await page.goto('/search?q=iPhone');await expect(page.getByRole('button',{name:'Оновити серверні дані'})).toBeEnabled();
 const guestCard=page.locator('[data-offer-id]').filter({hasText:'37'}).first();await guestCard.getByRole('button',{name:/кошик/}).click();await expect(guestCard.getByRole('button',{name:'Додано ✓',exact:true})).toBeVisible();
 // Register through ordinary UI; existing guest selection is never merged.
 await authenticate(page);
 expect((await page.evaluate(async()=> (await(await fetch('/api/v1/catalog/customer-state')).json()).data)).lines).toHaveLength(0);
 await page.goto('/search?q=iPhone&sort=price-asc');
 const card=page.locator('[data-offer-id]').first();const id=await card.getAttribute('data-offer-id');
 await card.getByRole('button',{name:/кошик/}).click();await expect(card.getByRole('button',{name:'Додано ✓',exact:true})).toBeVisible();
 await card.getByRole('button',{name:/обран/}).click();await expect(card.getByRole('button',{name:/обран/})).toHaveAttribute('aria-pressed','true');
 const nextCard=page.locator('[data-offer-id]').nth(1);await nextCard.getByRole('button',{name:/кошик/}).click();await expect(nextCard.getByRole('button',{name:'Додано ✓',exact:true})).toBeVisible();
 await page.reload();
 const state=await page.evaluate(async()=> (await(await fetch('/api/v1/catalog/customer-state')).json()).data);
 expect(state.lines).toHaveLength(2);expect(state.lines.some((l:{offer:{id:string}})=>l.offer.id===id)).toBe(true);expect(state.wishlist).toHaveLength(1);
 const second=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:390,height:844}});const other=await second.newPage();
 await authenticate(other,false);await expect(other.getByRole('link',{name:'Кошик: 2',exact:true})).toBeVisible();await expect(other.getByRole('link',{name:'Обране: 1',exact:true})).toBeVisible();const copy=await other.evaluate(async()=> (await(await fetch('/api/v1/catalog/customer-state')).json()).data);
 expect(copy.lines).toHaveLength(2);expect(copy.lines.some((l:{offer:{id:string}})=>l.offer.id===id)).toBe(true);expect(copy.wishlist[0].offer.id).toBe(id);
 const cookies=(await context.cookies()).filter(c=>c.name==='__Host-bazar-session');expect(cookies).toHaveLength(1);expect(cookies.every(c=>c.httpOnly&&c.secure&&c.sameSite==='Strict')).toBe(true);expect(await page.evaluate(()=>document.cookie.includes('__Host-bazar'))).toBe(false);
 await page.goto('/profile/wishlist');await expect(page.getByRole('heading',{name:'Обране',exact:true})).toBeVisible();if(await page.getByRole('button',{name:'Відкрити меню профілю',exact:true}).isVisible())await page.getByRole('button',{name:'Відкрити меню профілю',exact:true}).click();await page.getByRole('button',{name:'Вихід',exact:true}).click();await expect(page.getByText('Гостьовий кошик локальний. Автоматичного об’єднання немає.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bazar-offer-guest-cart-v1')??'[]').length)).toBe(1);
 await authenticate(page,false);
 await control('expire-sessions');await page.reload();await expect(page.getByText('Гостьовий кошик локальний. Автоматичного об’єднання немає.',{exact:true})).toBeVisible();
 expect(await page.evaluate(async()=> (await fetch('/api/v1/catalog/customer-state')).status)).toBe(401);
 await second.close();
});

test('saved unavailable offer survives server refresh, restoration and owner/CSRF denials',async({page,browser})=>{
 await authenticate(page);
 const info=await control('offer-info') as unknown as {offers:{id:string}[]};const id=info.offers[0].id;
 await page.goto('/search?q=iPhone');const selected=page.locator(`[data-offer-id="${id}"]`);await selected.getByRole('button',{name:/кошик/}).click();await expect(selected.getByRole('button',{name:'Додано ✓',exact:true})).toBeVisible();
 const save=await page.evaluate(async(id)=>{const s=(await(await fetch('/api/v1/auth/session')).json()).data;return(await fetch('/api/v1/catalog/wishlist/offers/'+id,{method:'PUT',headers:{'content-type':'application/json','x-csrf-token':s.csrfToken},body:'{}'})).status;},id);expect(save).toBe(200);
 const denied=await page.evaluate(async(id)=> (await fetch('/api/v1/catalog/wishlist/offers/'+id,{method:'DELETE',headers:{'content-type':'application/json'},body:'{}'})).status,id);expect(denied).toBe(403);
 await control('offer-out');await page.reload();
 const read=()=>page.evaluate(async()=> (await(await fetch('/api/v1/catalog/customer-state')).json()).data);
 expect((await read()).wishlist[0].offer.available).toBe(false);expect((await read()).lines[0].offer.available).toBe(false);await expect(page.locator(`[data-offer-id="${id}"]`).getByRole('button',{name:'Немає в наявності',exact:true})).toBeDisabled();
 await control('offer-restored');await page.reload();expect((await read()).wishlist[0].offer.available).toBe(true);expect((await read()).lines[0].offer.available).toBe(true);
 const second=await browser.newContext({baseURL:new URL(page.url()).origin});const other=await second.newPage();await authenticate(other,true,'931234567');
 const otherState=await other.evaluate(async()=> (await(await fetch('/api/v1/catalog/customer-state')).json()).data);expect(otherState.wishlist).toHaveLength(0);expect(otherState.lines).toHaveLength(0);
 await control('offers-error');await page.getByRole('button',{name:'Оновити серверні дані'}).click();await expect(page.locator('main')).toContainText('Серверні дані недоступні');
 await control('offers-ok');await page.getByRole('button',{name:'Оновити серверні дані'}).click();await expect(page.getByText('Тестова серверна сесія. Кошик та обране зберігаються у тестовому акаунті.',{exact:true})).toBeVisible();
 await second.close();
});

test('catalog API outage stays an explicit retryable error without mock replacement',async({page})=>{
 await control('catalog-error');await page.goto('/search?q=iPhone');
 await expect(page.getByRole('heading',{name:'Не вдалося завантажити сторінку',exact:true})).toBeVisible();
 await expect(page.locator('[data-offer-id]')).toHaveCount(0);await expect(page.locator('main')).toContainText('Каталог недоступний');
 await control('catalog-ok');await page.getByRole('button',{name:'Повторити',exact:true}).click();await expect(page.locator('[data-offer-id]')).toHaveCount(5);
});
