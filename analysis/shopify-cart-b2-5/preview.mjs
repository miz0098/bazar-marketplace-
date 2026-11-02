/** LOCAL CONTRACT FIXTURES ONLY. Synthetic product, media, money and API responses never enter theme defaults. */
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
const {Liquid}=require(resolve(process.env.BAZAR_TOOL_ROOT||'/tmp/bazar-theme-tools','node_modules/liquidjs'));
const escape=x=>String(x?.name??x??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function strip(s){
 return s.replace(/{%[-\s]*(doc|schema|javascript)\b[\s\S]*?{%[-\s]*end\1\s*[-]?%}/g,'')
 .replace(/{%\s*(style|stylesheet)\s*%}/g,'<style>').replace(/{%\s*end(style|stylesheet)\s*%}/g,'</style>')
 .replace(/{%\s*form 'product'[^%]*%}/g,'<form method="post" action="/cart/add" id="{{ form_id }}">')
 .replace(/{%\s*form 'localization'[^%]*%}/g,'<form method="post" action="/localization">').replace(/{%\s*endform\s*%}/g,'</form>')
 .replace(/{%\s*content_for 'block', type: 'variant-picker'[^%]*%}/g,"{% render 'variant-main-picker', product_resource: product, product: product, section: section, block: fixture_variant_block %}")
 .replace(/{%\s*content_for 'block', type: '_product-card'[^%]*%}/g,"{% render 'product-card', product: product, block: fixture_card_block, product_view_context: 'recommendation' %}");
}
const fs=new Liquid().options.fs;
const engine=new Liquid({root:[resolve(root,'snippets'),resolve(root,'sections')],extname:'.liquid',fs:{...fs,readFile:async p=>strip(readFileSync(p,'utf8')),readFileSync:p=>strip(readFileSync(p,'utf8'))}});
engine.registerFilter('escape',escape);
engine.registerFilter('asset_url',x=>'/assets/'+x);
engine.registerFilter('stylesheet_tag',x=>`<link rel="stylesheet" href="${x}">`);
engine.registerFilter('inline_asset_content',x=>readFileSync(resolve(root,'assets',x),'utf8'));
engine.registerFilter('image_url',x=>x?.src||'/fixture.svg');
engine.registerFilter('image_tag',(url,...args)=>{const o=Object.fromEntries(args.filter(Array.isArray));return `<img src="${escape(url)}" alt="${escape(o.alt)}" width="640" height="640" loading="${o.loading||'lazy'}">`;});
engine.registerFilter('money_with_currency',x=>(Number(x)/100).toFixed(2)+' UAH');
engine.registerFilter('money',x=>(Number(x)/100).toFixed(2)+' ₴');
engine.registerFilter('item_count_for_variant',cart=>0);
engine.registerFilter('standard_event_data',value=>JSON.stringify({product:{id:'gid://shopify/Product/'+value.id},context:'recommendation'}));
engine.registerFilter('structured_data',()=>JSON.stringify({'@type':'Product',name:'LOCAL FIXTURE'}));
engine.registerFilter('metafield_tag',field=>`<div class="metafield-rich_text_field">${field.value}</div>`);
engine.registerFilter('t',(key,...args)=>{const a=Object.fromEntries(args.filter(Array.isArray));return ({'products.product.sold_out':'Немає в наявності','blocks.load_video':'Відтворити відео: '+(a.description||''),'accessibility.pause_video':'Призупинити відео','accessibility.play_video':'Відтворити відео'})[key]||key;});
engine.registerFilter('video_tag',()=>'<video controls playsinline aria-label="Локальне тестове відео"><source src="/fixture-video.mp4" type="video/mp4"></video>');
// All cart/customer data below is synthetic, local-only and never used by theme defaults.
export async function startPreview(){
 const requests=[];
 const make=(id)=>({index:id-1,key:'local-line-'+id,id,variant_id:id,quantity:1,url:'/products/local-'+id,url_to_remove:'/cart/change?id=local-line-'+id+'&quantity=0',product:{title:'ЛОКАЛЬНИЙ ТЕСТОВИЙ ТОВАР '+id,has_only_default_variant:false},variant:{id,available:true,quantity_rule:{min:1,max:5,increment:1}},options_with_values:[{name:'Колір',value:'ТЕСТ'}],properties:[],item_components:[],instructions:{can_update_quantity:true,can_remove:true},image:{src:'/fixture.svg',alt:'ТЕСТ'},final_price:10000,original_price:12000,line_level_discount_allocations:[]});
 let items=[make(1),make(2)];
 const cart=()=>({token:'local-only',currency:'UAH',items:items.map((x,index)=>({...x,index,final_line_price:x.quantity*10000})),item_count:items.reduce((n,x)=>n+x.quantity,0),items_subtotal_price:items.reduce((n,x)=>n+x.quantity*10000,0),original_total_price:items.reduce((n,x)=>n+x.quantity*12000,0),total_price:items.reduce((n,x)=>n+x.quantity*10000,0)- (items.length?500:0),cart_level_discount_applications:items.length?[{title:'ЛОКАЛЬНА ЗНИЖКА',total_allocated_amount:500}]:[],taxes_included:true,'empty?':items.length===0});
 const drawer=()=>`<div id="shopify-section-header-fixture"><div data-hydration-key="cart-drawer-inner"><cart-items-component data-drawer data-section-id="header-fixture"><span ref="cartItemCount">${cart().item_count}</span></cart-items-component></div></div>`;
 const render=async()=>`<div id="shopify-section-cart-fixture" class="shopify-section">${await engine.renderFile('bazar-main-cart',{cart:cart(),section:{id:'cart-fixture'},routes:{root_url:'/',cart_url:'/cart',all_products_collection_url:'/collections/all'}})}</div>`;
 const imports={'@shopify/events':'/native-events.js'};for(const [,key,file]of readFileSync(resolve(root,'snippets/scripts.liquid'),'utf8').matchAll(/"(@theme\/[^"]+)": "{{ '([^']+)'/g))imports[key]='/assets/'+file;
 const page=async()=>`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Локальна перевірка кошика</title><link rel="stylesheet" href="/assets/base.css"><link rel="stylesheet" href="/assets/bazar-global.css"><style>body{margin:0;font-family:system-ui;color:#0f172a;background:#fff;--color-foreground:#0f172a;--color-background:#fff;--page-width:1380px;--color-primary-button-background:#0f172a;--color-primary-button-text:#fff;--icon-stroke-width:1.5px}.hidden{display:none!important}.fixture-notice{background:#fff3cd;color:#222;padding:8px}.quantity-selector{display:flex}.quantity-selector input{color:#0f172a;background:#fff;border:0}.quantity-selector button{color:#0f172a;background:#fff;border:0}</style><script type="importmap">${JSON.stringify({imports})}</script><script>window.Shopify={designMode:false,locale:'uk'};window.Theme={routes:{cart_url:'/cart',cart_change_url:'/cart/change.js'},translations:{cart_count:'Кількість товарів'}};</script></head><body><div class="fixture-notice">ЛОКАЛЬНА СИМУЛЯЦІЯ — синтетичні дані, не Shopify.</div><header hidden>${drawer()}<cart-icon><span ref="cartBubble"><span ref="cartBubbleText"><span ref="cartBubbleCount">${cart().item_count}</span></span></span></cart-icon></header><main>${await render()}</main><script type="module" src="/assets/cart-icon.js"></script></body></html>`;
 const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/assets/')){const name=url.pathname.slice(8);if(!/^[\w.-]+$/.test(name))throw Error('bad asset');res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');return res.end(readFileSync(resolve(root,'assets',name)));}
 if(url.pathname==='/native-events.js'){res.setHeader('Content-Type','text/javascript');return res.end(readFileSync('/tmp/b2-1-standard-events.js'));}
 if(url.pathname==='/fixture.svg'){res.setHeader('Content-Type','image/svg+xml');return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#eee"/></svg>');}
 if(url.pathname==='/cart/change.js'){let body='';for await(const c of req)body+=c;const data=JSON.parse(body);requests.push(data);const item=items.find(x=>x.key===data.id);res.setHeader('Content-Type','application/json');if(!item||data.quantity>5){res.statusCode=422;return res.end(JSON.stringify({errors:'ТЕСТ: недостатньо залишків'}));}item.quantity=data.quantity;items=items.filter(x=>x.quantity>0);return res.end(JSON.stringify({...cart(),sections:{'cart-fixture':await render(),'header-fixture':drawer()}}));}
 if(url.pathname==='/cart.json'||url.pathname==='/cart.js'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(cart()));}
 if(url.searchParams.has('sections')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({'cart-fixture':await render()}));}
 if(url.searchParams.has('unavailable')&&items[0])items[0].variant.available=false;
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await page());
 }catch(e){res.statusCode=500;res.end(e.stack);}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return{server,requests,url:`http://127.0.0.1:${server.address().port}`};
}
