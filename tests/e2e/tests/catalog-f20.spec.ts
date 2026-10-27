import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const redirects=[['/pages/delivery-payment','/help/delivery'],['/pages/returns','/help/returns'],['/pages/warranty','/help/warranty'],['/pages/order-tracking','/help/order-tracking'],['/pages/about','/about'],['/pages/partners','/help/partners'],['/blogs/news','/help/news'],['/pages/public-offer','/help/public-offer'],['/policies/privacy-policy','/help/privacy-policy'],['/policies/terms-of-service','/help/terms-of-service']];
test('F20 all ten pinned Shopify footer routes preserve query and land on matching content without loops',async({page})=>{
 for(const [source,target] of redirects){await page.goto(source+'?utm_source=legacy');await expect(page).toHaveURL(new RegExp(target.replaceAll('/','\\/')+'\\?utm_source=legacy$'));await expect(page.locator('main h1')).toBeVisible();}
 await expect(page.locator('main')).toContainText('Затверджені умови ще не надано');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('F20 available filter combines with category and price URL state survives refresh and back',async({page})=>{
 await page.goto('/catalog?category=electronics&available=false&sort=price-asc');await expect(page.locator('.product-card:visible')).toHaveCount(1);await expect(page.locator('.product-card:visible')).toContainText('Немає в наявності');
 await page.reload();await expect(page.locator('.product-card:visible')).toHaveCount(1);await page.goto('/catalog?category=electronics&available=true');await expect(page.locator('.product-card:visible')).toHaveCount(5);await page.goBack();await expect(page.locator('.product-card:visible')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 const results=await new AxeBuilder({page}).analyze();expect(results.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
});
test('F20 binary variants preserve requested quantity after refresh and disable unavailable selections',async({page})=>{
 await page.goto('/products/iphone-15');
 const quantity=page.locator('.product-summary').getByLabel('Кількість',{exact:true});await quantity.fill('6');await page.locator('.product-summary .add-cart-button').click();
 await page.goto('/cart');await expect(page.locator('.cart-line input[type=number]')).toHaveValue('6');await page.reload();await expect(page.locator('.cart-line input[type=number]')).toHaveValue('6');
 await page.goto('/products/iphone-15?variant=iphone-15-silver');await expect(page.locator('.product-summary .add-cart-button')).toBeDisabled();await expect(page.locator('.product-summary')).toContainText('Немає в наявності');
});
test('F20 search pagination preserves query sorting and keyboard navigation',async({page})=>{
 await page.goto('/search?q=а&sort=price-asc&limit=4');const pages=page.getByRole('navigation',{name:'Сторінки результатів'});await expect(pages).toBeVisible();await pages.getByRole('link',{name:'2',exact:true}).focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/page=2/);await expect(page.locator('.product-card:visible').first()).toBeVisible();await page.reload();await expect(page.getByRole('textbox',{name:'Пошук товарів',exact:true})).toHaveValue('а');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('F20 gallery has accessible responsive loading and missing-image fallback without an invented asset',async({page})=>{
 await page.route('**/_next/image**',route=>route.fulfill({status:404,body:'Synthetic missing media fixture'}));
 await page.goto('/products/camera');await expect(page.getByRole('img',{name:/зображення недоступне/})).toBeVisible();await expect(page.locator('.product-gallery')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
