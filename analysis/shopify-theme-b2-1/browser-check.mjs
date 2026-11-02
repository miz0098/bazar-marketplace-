/** Local-only rendered-component tests. Not Shopify checkout/cart/merchant certification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {startPreview} from './preview.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const {chromium}=require(resolve(here,'../../tests/e2e/node_modules/playwright'));
const {default:AxeBuilder}=await import(resolve(here,'../../tests/e2e/node_modules/@axe-core/playwright/dist/index.mjs'));
const {server,url}=await startPreview();
const browser=await chromium.launch({executablePath:process.env.BAZAR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];const errors=[];
const context=await browser.newContext();const page=await context.newPage();
page.on('pageerror',error=>errors.push(String(error)));
async function check(name,fn){await fn();results.push({name,result:'passed'});console.log('PASS',name);}
async function visit(query=''){await page.goto(url+'/'+query);await page.waitForFunction(()=>customElements.get('cart-icon')&&customElements.get('header-actions')&&customElements.get('header-component'));}
try {
 await check('Default Liquid render: six required header elements, no fake auth or legacy hrefs',async()=>{
  await visit();assert.equal(await page.locator('.bazar-logo').count(),2);assert.equal(await page.locator('.bazar-header-actions > *').count(),4);
  assert.equal(await page.locator('.bazar-header-action[aria-disabled=true]').count(),2);
  assert.equal(await page.locator('a[href^="/profile"],script[src*="bazar-auth"],a[href="#"]').count(),0);
  assert.equal(await page.locator('.bazar-home-hero,.bazar-category-grid').count(),0);
 });
 await check('Unconfigured footer destinations are inert; all nine slots identifiable in editor',async()=>{
  assert.equal(await page.locator('.bazar-footer [aria-disabled=true]').count(),9);
  assert.equal(await page.locator('.bazar-footer__social a,.bazar-footer__legal a,.bazar-footer__apps a').count(),0);
  await visit('?editor=1');assert.match(await page.locator('.bazar-footer .bazar-editor-note').last().innerText(),/Facebook.*Instagram.*Threads.*Telegram.*App Store.*Google Play.*Публічна оферта/s);
 });
 await check('Configured footer destinations and actual collection fixtures render only configured links',async()=>{
  await visit('?configured=1');assert.equal(await page.locator('.bazar-footer [aria-disabled=true]').count(),0);
  assert.equal(await page.locator('.bazar-footer a[href^="/fixture-destination/"]').count(),9);
  assert.equal(await page.locator('.bazar-category-card').count(),1);assert.equal(await page.locator('.bazar-home-hero img').count(),1);
  assert.equal(await page.locator('.bazar-header-action[href="/customer_authentication/login"]').count(),1);
 });
 await check('Search GET submits Ukrainian and special-character query to Shopify route contract',async()=>{
  await visit();await page.getByRole('searchbox').fill('кава & чай');await page.getByRole('button',{name:'Пошук',exact:true}).click();
  const parsed=new URL(page.url());assert.equal(parsed.pathname,'/search');assert.equal(parsed.searchParams.get('q'),'кава & чай');assert.equal(parsed.searchParams.get('options[prefix]'),'last');
 });
 await check('Catalog keyboard disclosure: Enter, focusable links, Escape restores summary, outside click closes',async()=>{
  await visit();const summary=page.locator('.bazar-catalog-details > summary');await summary.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.bazar-catalog-details').getAttribute('open'),'');await page.keyboard.press('Tab');assert.equal(await page.locator('.bazar-catalog-panel a').first().evaluate(x=>x===document.activeElement),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.bazar-catalog-details').getAttribute('open'),null);assert.equal(await summary.evaluate(x=>x===document.activeElement),true);
  await summary.click();await page.locator('main').click();assert.equal(await page.locator('.bazar-catalog-details').getAttribute('open'),null);
 });
 await check('Native Horizon cart-icon receives actual standard-event contract and updates badge/live region',async()=>{
  await visit();await page.evaluate(async()=>{const {StandardEvents}=await import('/native-events.js');const event=new Event(StandardEvents.cartLinesUpdate,{bubbles:true});event.promise=Promise.resolve({cart:{totalQuantity:5}});document.dispatchEvent(event);});
  await page.waitForFunction(()=>document.querySelector('[ref=cartBubbleCount]').textContent.trim()==='5');assert.match(await page.locator('[ref=liveRegion]').innerText(),/5/);
  assert.equal(await page.locator('.bazar-header-action[href="/cart"]').count(),1);
 });
 await check('Native Horizon drawer delegation, aria-expanded, Escape and focus restoration',async()=>{
  await visit('?drawer=1');const trigger=page.locator('button[aria-controls="cart-drawer"]');await trigger.click();
  await page.waitForFunction(()=>document.getElementById('cart-drawer').hasAttribute('open'));assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('cart-drawer').hasAttribute('open'));assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.equal(await trigger.evaluate(x=>x===document.activeElement),true);
 });
 await check('Responsive layout: no horizontal overflow at 320/390/768/1024/1440, default and configured',async()=>{
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});for(const query of ['', '?configured=1']){await visit(query);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${query}`);}}
 });
 await check('Section unload/load safely remounts catalog disclosure',async()=>{
  await visit();await page.evaluate(()=>{const parent=document.querySelector('header');parent.dispatchEvent(new CustomEvent('shopify:section:unload',{bubbles:true}));parent.dispatchEvent(new CustomEvent('shopify:section:load',{bubbles:true}));});
  const summary=page.locator('.bazar-catalog-details > summary');await summary.click();await page.keyboard.press('Escape');assert.equal(await page.locator('.bazar-catalog-details').getAttribute('open'),null);
 });
 await check('Axe WCAG 2 A/AA: default and configured local component fixtures',async()=>{
  for(const query of ['', '?configured=1']){await visit(query);const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();assert.deepEqual(scan.violations.map(x=>({id:x.id,targets:x.nodes.map(n=>n.target)})),[]);}
 });
 await check('Screenshots captured from local defaults, not represented as merchant previews',async()=>{
  await mkdir(resolve(here,'previews'),{recursive:true});for(const [name,width] of [['desktop',1440],['mobile',390]]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>sessionStorage.removeItem('cart-count'));await visit();await page.screenshot({path:resolve(here,`previews/local-${name}.png`),fullPage:true});}
 });
 await check('No browser runtime errors',async()=>assert.deepEqual(errors,[]));
 await writeFile(resolve(here,'browser-results.json'),JSON.stringify({scope:'Local LiquidJS fixture + Chromium only; no Shopify/merchant/provider operations',checks:results,errors},null,2)+'\n');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
