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
function defaults(path){const spec=JSON.parse(readFileSync(resolve(root,path),'utf8').match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);return Object.fromEntries(spec.settings.filter(x=>x.id&&x.default!==undefined).map(x=>[x.id,x.default]));}
function productFixture(url){
 const image=(id,alt)=>({id,media_type:'image',alt,aspect_ratio:1,preview_image:{src:'/fixture.svg?image='+id},src:'/fixture.svg?image='+id});
 const media=[image(301,'Тестове фото спереду'),image(302,'Тестове фото ззаду')];
 if(url.searchParams.has('video'))media.push({id:303,media_type:'video',alt:'Тестовий відеоогляд',preview_image:{src:'/fixture.svg?video'},sources:[],aspect_ratio:1});
 if(url.searchParams.has('model'))media.push({...image(304,'Статичне зображення моделі'),media_type:'model'});
 const variants=[{id:101,title:'Чорний / 128',price:10000,compare_at_price:0,available:true,sku:'TEST-101',featured_media:media[0]}, {id:102,title:'Срібний / 128',price:12000,compare_at_price:15000,available:true,sku:'TEST-102',featured_media:media[1]}, {id:103,title:'Чорний / 256',price:16000,compare_at_price:0,available:false,sku:'TEST-103',featured_media:media[0]}].map(v=>({...v,inventory_management:'shopify',inventory_policy:'deny',inventory_quantity:v.available?20:0,quantity_rule:{min:1,max:6,increment:1},selling_plan_allocations:[]}));
 if(url.searchParams.has('rules'))variants[0].quantity_rule={min:2,max:6,increment:2};
 const ids=url.searchParams.get('option_values')?.split(',').map(Number);
 let color=11,storage=21;
 if(ids){color=ids[0];storage=ids[1];}
 else if(url.searchParams.get('variant')==='102')color=12;
 else if(url.searchParams.get('variant')==='103')storage=22;
 let selected=variants.find(v=>v.id===({ '11,21':101,'12,21':102,'11,22':103 })[[color,storage].join(',')])||null;
 if(url.searchParams.has('single'))selected=variants[0];
 const value=(id,name,position)=>({id,name,size:name.length,selected:(position===1?color:storage)===id,available:true,variant:variants.find(v=>v.id===({11:storage===21?101:103,12:storage===21?102:undefined,21:color===11?101:102,22:color===11?103:undefined})[id])||null});
 const p={id:1,title:'ТЕСТОВИЙ ТОВАР — локальна перевірка PDP',vendor:'ТЕСТОВИЙ БРЕНД',handle:'fixture',url:'/products/fixture',available:true,has_only_default_variant:url.searchParams.has('single'),options:['Колір','Пам’ять'],options_with_values:[{name:'Колір',position:1,selected_value:color===11?'Чорний':'Срібний',values:[value(11,'Чорний',1),value(12,'Срібний',1)]},{name:'Пам’ять',position:2,selected_value:storage===21?'128':'256',values:[value(21,'128',2),value(22,'256',2)]}],variants,variants_count:3,selected_or_first_available_variant:selected,selected_variant:selected,featured_media:media[0],featured_image:media[0].preview_image,media:url.searchParams.has('nomedia')?[]:media,description:'<p>Синтетичний опис лише для локальної перевірки. Не дані продавця.</p>',requires_selling_plan:false,metafields:{custom:{specifications:{type:'rich_text_field',value:'<p>Тестова характеристика</p>'},additional_information:{type:'multi_line_text_field',value:'Тестова додаткова інформація'}}}};
 if(url.searchParams.has('emptycontent')){p.description='';p.vendor='';p.metafields={};}
 if(url.searchParams.has('unsupported'))p.metafields.custom.specifications={type:'json',value:{not:'renderable'}};
 if(url.searchParams.has('plan')){p.requires_selling_plan=true;p.selected_or_first_available_variant.selling_plan_allocations=[{selling_plan:{id:501,name:'ТЕСТОВИЙ ПЛАН'}}];}
 return p;
}
async function content(url,kind='page'){
 const product=productFixture(url);
 const context={product,closest:{product},section:{id:'pdp-fixture',settings:{...defaults('sections/bazar-main-product.liquid'),information:url.searchParams.has('information')?'<p>Тестова інформаційна панель без обіцянок доставки.</p>':''},blocks:[]},settings:{cart_type:'page',variant_button_width:'fit-content',transition_to_main_product:false,show_sale_price_first:true},routes:{root_url:'/',search_url:'/search',cart_url:'/cart',product_recommendations_url:'/recommendations/products',all_products_collection_url:'/collections/all'},request:{page_type:'product',design_mode:url.searchParams.has('editor')},template:{name:'product'},shop:{name:'BAZAR',customer_accounts_enabled:false},cart:{item_count:2,items:[]},fixture_variant_block:{id:'pdp-options',settings:{...defaults('blocks/variant-picker.liquid'),variant_style:'buttons',show_swatches:true}},fixture_card_block:{id:'rec-card',settings:{}},recommendations:{performed:kind==='recommendations',products_count:url.searchParams.has('emptyrecs')?0:1,products:[{...product,id:2,title:'ТЕСТОВА РЕКОМЕНДАЦІЯ',url:'/products/test-recommendation',variants_count:2}]}};
 const render=(name,vars={})=>engine.renderFile(name,vars,{globals:context});
 if(kind==='recommendations'){
  context.section={id:'pdp-recommendations',settings:{max_products:8,bazar_catalog_cards:true}};
  return `<div id="shopify-section-pdp-recommendations" class="shopify-section">${await render('bazar-pdp-recommendations')}</div>`;
 }
 const header=await render('bazar-header-desktop',{section:{id:'header-fixture',settings:{...defaults('sections/header.liquid')}}});
 const footer=await render('bazar-footer',{section:{id:'footer-fixture',settings:defaults('sections/bazar-footer.liquid'),blocks:[]}});
 const main=await render('bazar-main-product');
 const rec=await render('bazar-pdp-recommendations',{section:{id:'pdp-recommendations',settings:{max_products:8,bazar_catalog_cards:true}},recommendations:{performed:false}});
 const imports={'@shopify/events':'/native-events.js'};for(const [,key,file] of readFileSync(resolve(root,'snippets/scripts.liquid'),'utf8').matchAll(/"(@theme\/[^"]+)": "{{ '([^']+)'/g))imports[key]='/assets/'+file;
 const headerCSS=readFileSync(resolve(root,'sections/header.liquid'),'utf8').match(/{% stylesheet %}([\s\S]*?){% endstylesheet %}/)[1];
 return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Локальна перевірка PDP</title><link rel="stylesheet" href="/assets/base.css"><style>${headerCSS}body{margin:0;--page-width:1380px;--color-primary-button-background:#0f172a;--color-primary-button-text:#fff;--font-body--family:system-ui;--color-foreground:#0f172a;--color-background:#fff;--style-border-radius-50:50%;--icon-stroke-width:1.5px}.fixture-notice{padding:8px;font:12px sans-serif;background:#fff3cd;color:#222}.visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.hidden{display:none!important}</style>${['global','header','footer','pdp'].map(n=>`<link rel="stylesheet" href="/assets/bazar-${n}.css">`).join('')}<script type="importmap">${JSON.stringify({imports})}</script><script>window.Shopify={designMode:false,locale:'uk'};window.Theme={routes:{cart_url:'/cart',cart_add_url:'/cart/add.js'},translations:{added:'Товар додано',cart_count:'Кількість товарів'}};</script></head><body><div class="fixture-notice">ЛОКАЛЬНА СИМУЛЯЦІЯ PDP — синтетичні товар, ціни, медіа та відповіді; не Shopify і не дані BAZAR.</div><header>${header}</header><main><div id="shopify-section-pdp-fixture" class="shopify-section">${main}</div><div id="shopify-section-pdp-recommendations" class="shopify-section">${rec}</div></main><footer>${footer}</footer><script type="module" src="/assets/bazar-header.js"></script><script type="module" src="/assets/product-card.js"></script><script type="module" src="/assets/media.js"></script></body></html>`;
}
export async function startPreview(){const requests=[];const items=[{id:900,variant_id:900,key:'existing-test-line',quantity:2,final_line_price:200}];
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/assets/')){const name=url.pathname.slice(8);if(!/^[\w.-]+$/.test(name))throw Error('bad asset');res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/javascript');return res.end(readFileSync(resolve(root,'assets',name)));}
  if(url.pathname==='/native-events.js'){res.setHeader('Content-Type','text/javascript');return res.end(readFileSync('/tmp/b2-1-standard-events.js'));}
  if(url.pathname==='/fixture.svg'){res.setHeader('Content-Type','image/svg+xml');return res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><rect width="640" height="640" fill="${url.searchParams.get('image')==='302'?'#e2e8f0':'#eef2ff'}"/><text x="80" y="320" font-size="32">TEST MEDIA ONLY</text></svg>`);}
  if(url.pathname==='/cart/add.js'&&req.method==='POST'){const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks).toString();const field=name=>body.match(new RegExp('name="'+name+'"\\r\\n\\r\\n([^\\r]+)'))?.[1];requests.push({path:url.pathname,body,id:field('id'),quantity:field('quantity'),plan:field('selling_plan')});const variant=Number(field('id'));const quantity=Number(field('quantity'));const existing=items.find(x=>x.variant_id===variant);if(existing)existing.quantity+=quantity;else items.push({id:variant,variant_id:variant,key:'test-'+variant,quantity,final_line_price:quantity*10000});res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({id:variant,sections:{}}));}
  if(['/cart.json','/cart.js'].includes(url.pathname)){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({token:'local-test',item_count:items.reduce((n,x)=>n+x.quantity,0),total_price:10000,currency:'UAH',items}));}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await content(url,url.pathname==='/recommendations/products'?'recommendations':'page'));
 }catch(error){res.statusCode=500;res.end(String(error.stack));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,requests,url:`http://127.0.0.1:${server.address().port}`};}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {url}=await startPreview();console.log(url);}
