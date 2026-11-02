/** Local LiquidJS/browser fixture, not Shopify rendering or merchant data. No store/API calls. */
import {readFile, readFileSync} from 'node:fs';
import {promisify} from 'node:util';
import {createServer} from 'node:http';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tooling = process.env.BAZAR_TOOL_ROOT || '/tmp/bazar-theme-tools';
const require = createRequire(import.meta.url);
const {Liquid} = require(resolve(tooling, 'node_modules/liquidjs'));
const load = promisify(readFile);
const strip = text => text.replace(/{%[-\s]*(doc|schema)\b[\s\S]*?{%[-\s]*end\1\s*[-]?%}/g,'').replace(/{%\s*(style|stylesheet)\s*%}/g,'<style>').replace(/{%\s*end(style|stylesheet)\s*%}/g,'</style>').replace(/{%\s*form\b[^%]*%}/g,'<form action="/localization" method="post">').replace(/{%\s*endform\s*%}/g,'</form>');
const nativeFs = new Liquid().options.fs;
const engine = new Liquid({root:[resolve(root,'snippets'),resolve(root,'sections')],extname:'.liquid',fs:{...nativeFs,readFile:async p=>strip(await load(p,'utf8')),readFileSync:p=>strip(readFileSync(p,'utf8'))}});
const escape = s => String(s??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
engine.registerFilter('inline_asset_content', name => readFileSync(resolve(root,'assets',name),'utf8'));
engine.registerFilter('asset_url', name => '/assets/'+name);
engine.registerFilter('stylesheet_tag', url=>`<link rel="stylesheet" href="${url}">`);
engine.registerFilter('image_url', value=>value?.src || '/fixture.svg');
engine.registerFilter('image_tag', (url,...args)=>{const opts=Object.fromEntries(args.filter(Array.isArray));return `<img src="${escape(url)}" width="800" height="400" class="${escape(opts.class)}" alt="${escape(opts.alt)}" loading="${opts.loading||'lazy'}">`;});
function schema(file) { return JSON.parse(readFileSync(resolve(root,file),'utf8').match(/{% schema %}([\s\S]*?){% endschema %}/)[1]); }
function defaults(spec) { return Object.fromEntries(spec.settings.filter(x=>x.id&&x.default!==undefined).map(x=>[x.id,x.default])); }
const headerDefault=defaults(schema('sections/header.liquid'));
const footerDefault=defaults(schema('sections/bazar-footer.liquid'));
const sampleMenu={links:[{title:'Категорія для перевірки',url:'/collections/check',links:[{title:'Підкатегорія',url:'/collections/sub',links:[]}]}]};
async function fixture(url) {
 const configured=url.searchParams.has('configured');const editor=url.searchParams.has('editor');
 const context={request:{design_mode:editor},settings:{cart_type:url.searchParams.has('drawer')?'drawer':'page',page_text_color:'#0f172a',page_background_color:'#fff'},routes:{root_url:'/',search_url:'/search',cart_url:'/cart',all_products_collection_url:'/collections/all',account_url:'/customer_authentication/login'},shop:{name:'BAZAR',customer_accounts_enabled:true},template:{name:'index'},cart:{item_count:2},search:{terms:''},localization:{available_languages:[],available_countries:[]}};
 const header={id:'header-fixture',settings:{...headerDefault,bazar_catalog_menu:sampleMenu}};
 const footer={id:'footer-fixture',settings:{...footerDefault},blocks:['Покупцям','Про компанію','Особистий кабінет'].map((heading,i)=>({id:String(i),settings:{heading,menu:configured?{links:[{title:'Посилання для перевірки',url:'/pages/check'}]}:null}}))};
 if(configured){for(const key of ['facebook','instagram','threads','telegram','app_store','google_play','public_offer','privacy','terms']) footer.settings[key+'_url']='/fixture-destination/'+key;header.settings.bazar_account_ready=true;header.settings.bazar_favorites_url='/fixture-destination/favorites';}
 const hero={id:'hero-fixture',settings:configured?{image:{src:'/fixture.svg'},image_alt:'Медіа для локальної перевірки',menu:sampleMenu}:{} };
 const categories={id:'categories-fixture',settings:{heading:'Популярні категорії',collections:configured?[{title:'Колекція для перевірки',url:'/collections/check',featured_image:{src:'/fixture.svg'}}]:[]}};
 const render=(file,section)=>engine.renderFile(file,{section},{globals:context});
 const drawer=context.settings.cart_type==='drawer'?'<theme-drawer id="cart-drawer"><dialog ref="panel" aria-label="Тестова панель кошика"><button class="theme-drawer__close-button" on:click="#cart-drawer/close">Закрити</button><a href="/cart">До кошика</a></dialog></theme-drawer>':'';
 if(url.searchParams.has('empty'))context.cart={item_count:0,items:[],'empty?':true};
 const contents=await Promise.all([render('bazar-header-desktop',header),render('bazar-home-hero',hero),render('bazar-category-blocks',categories),render('bazar-footer',footer)]);
 if(url.searchParams.has('empty')){
   context.cart={item_count:0,items:[],'empty?':true};
   contents[1]=await engine.renderFile('bazar-main-cart',{section:{id:'cart-fixture'}},{globals:context});contents[2]='';
 }
 const imports={'@shopify/events':'/native-events.js'};for(const [,key,file] of readFileSync(resolve(root,'snippets/scripts.liquid'),'utf8').matchAll(/"(@theme\/[^"]+)": "{{ '([^']+)'/g))imports[key]='/assets/'+file;
 return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BAZAR — локальний технічний макет</title><style>body{margin:0;--color-primary-button-background:#0f172a;--color-primary-button-text:#fff;--page-width:1380px;--font-body--family:system-ui;--color-foreground:#0f172a;--color-background:#fff;--icon-stroke-width:1.5px;--font-size--3xs:11px;--layer-flat:1;--style-border-radius-50:50%}header,main,footer{display:block}main{min-height:160px}.visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.hidden{display:none!important}.svg-wrapper{display:inline-flex}.fixture-notice{padding:8px;background:#fff3cd;color:#222;font:12px sans-serif}</style><link rel="stylesheet" href="/assets/base.css"><style>${readFileSync(resolve(root,'sections/header.liquid'),'utf8').match(/{% stylesheet %}([\s\S]*?){% endstylesheet %}/)?.[1]||''}</style><style>h2 {font-family:monospace;font-size:96px;text-transform:uppercase}body{--font-h2--size:96px;--font-h2--family:monospace}</style>${['global','header','footer','home'].map(n=>`<link rel="stylesheet" href="/assets/bazar-${n}.css">`).join('')}<script>window.Theme={translations:{cart_count:'Кількість товарів'}};</script><script type="importmap">${JSON.stringify({imports})}</script></head><body><div class="fixture-notice">ЛОКАЛЬНА ПЕРЕВІРКА B3.1 · синтетичні дані · не Shopify</div><div class="page-wrapper"><header><header-component id="header-component" class="header"><h1 class="visually-hidden">BAZAR</h1>${contents[0]}</header-component></header><main id="MainContent">${contents[1]}${contents[2]}</main><footer>${contents[3]}</footer></div>${drawer}<script type="module" src="/assets/header.js"></script><script type="module" src="/assets/bazar-header.js"></script></body></html>`;
}
export async function startPreview() {
 const server=createServer(async(req,res)=>{try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/fixture.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#eef2ff"/><text x="80" y="210" fill="#0f172a" font-size="32">LOCAL MEDIA FIXTURE</text></svg>');return;}
  if(url.pathname==='/native-events.js'){res.setHeader('Content-Type','text/javascript');res.end(await load('/tmp/b2-1-standard-events.js'));return;}
  if(url.pathname.startsWith('/assets/')){const name=url.pathname.slice('/assets/'.length);if(!/^[\w.-]+$/.test(name))throw Error('bad asset');res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.woff2')?'font/woff2':'text/javascript');res.end(await load(resolve(root,'assets',name)));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await fixture(url));
 }catch(error){res.statusCode=500;res.end(String(error.stack));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,url:`http://127.0.0.1:${server.address().port}`};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {url}=await startPreview();console.log(url);}
