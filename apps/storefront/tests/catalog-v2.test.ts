import assert from 'node:assert/strict';
import test from 'node:test';
import {formatMoney} from '../lib/money';
import {isCatalogV2Product} from '../lib/catalog-v2-client';
import {selectVariant} from '../domain/catalog/variants';
import {createCart,parseStoredCart,cartReducer} from '../domain/cart/cart';
import {demoProducts} from '../fixtures/catalog';
import {queryProducts} from '../domain/catalog/query';
test('F20 money presentation preserves every minor unit without financial rounding',()=>{
 assert.equal(formatMoney({amountMinor:12345,currency:'UAH'}),'123,45 ₴');assert.equal(formatMoney({amountMinor:12300,currency:'UAH'}),'123 ₴');assert.equal(formatMoney({amountMinor:1,currency:'UAH'}),'0,01 ₴');
 assert.throws(()=>formatMoney({amountMinor:NaN,currency:'UAH'}));
});
test('F20 unavailable selected variant remains saved and other availability cannot reactivate it',()=>{
 const phone=demoProducts[0],selected=selectVariant(phone,'iphone-15-black')!;
 const saved=JSON.stringify([{product:{id:phone.id,variantId:selected.variantId},quantity:6}]);
 const off={...phone,variants:phone.variants!.map(v=>({...v,available:v.id!==selected.variantId}))};
 const cart=createCart(parseStoredCart(saved,[off]));assert.equal(cart.lines.length,1);assert.equal(cart.lines[0].quantity,6);assert.equal(cart.lines[0].product.available,false);
 assert.equal(cartReducer(cart,{type:'add',product:cart.lines[0].product}),cart);
 const restored=createCart(parseStoredCart(saved,[phone]));assert.equal(restored.lines[0].product.available,true);assert.equal(restored.lines[0].quantity,6);
});
test('F20 combined actual facets and availability sort and page remain deterministic',()=>{
 const q={category:'electronics',available:true,vendor:'Apple',sort:'price-asc' as const,limit:1,page:1};const first=queryProducts(demoProducts,q),second=queryProducts(demoProducts,{...q,page:2});assert.equal(first.total,2);assert.notEqual(first.items[0].id,second.items[0].id);
 const filtered=queryProducts(demoProducts,{attribute:'Колір',value:'Чорний'});assert.ok(filtered.items.every(p=>p.id==='sony-headphones'));
 assert.equal(queryProducts(demoProducts,{available:false}).items[0].id,'camera');
});
test('F20 v2 transport rejects missing identity availability malformed media and stock-only legacy payloads',()=>{
 assert.equal(isCatalogV2Product({...demoProducts[0],stock:100}),false);
 const id='12345678-1234-1234-1234-123456789abc';const v={contractVersion:2,id,sellerId:id,categoryId:id,handle:'synthetic',title:'Синтетичний',description:'',attributes:{},status:'published',publishedAt:'2026-10-27T00:00:00Z',version:1,available:true,selectable:true,price:{amountMinor:12345,currency:'UAH'},pricePolicy:'uniform',variants:[{id,title:'Варіант',sku:'TEST',price:{amountMinor:12345,currency:'UAH'},available:true,purchasable:true}],media:[]};assert.ok(isCatalogV2Product(v));
 assert.equal(isCatalogV2Product({...v,price:{amountMinor:1,currency:'UAH'}}),false);assert.equal(isCatalogV2Product({...v,media:[{id,variantId:null,src:'//evil.invalid/x.svg',alt:'x',width:1,height:1,position:0}]}),false);
});
test('F20 search has complete deterministic pages beyond the old twelve-result cap',()=>{
 const fixtures=Array.from({length:35},(_,i)=>({...demoProducts[0],id:`synthetic-${String(i).padStart(2,'0')}`,handle:`synthetic-${i}`,title:`Синтетичний товар ${i}`}));
 const pages=[1,2,3,4,5].map(page=>queryProducts(fixtures,{query:'Синтетичний',page,limit:8}));assert.equal(pages[0].total,35);assert.equal(pages[4].items.length,3);assert.equal(new Set(pages.flatMap(p=>p.items.map(x=>x.id))).size,35);
});
test('F20 typed public preview mapper carries stable IDs and requires explicit selection instead of fabricating merchandising price',async()=>{
 const {mapCatalogV2}=await import('../domain/catalog/v2');const id='12345678-1234-1234-1234-123456789abc';
 const product={contractVersion:2 as const,id,sellerId:id,categoryId:id,handle:'synthetic',title:'Синтетичний',description:'',attributes:{brand:'Synthetic'},status:'published' as const,publishedAt:'2026-10-27T00:00:00Z',version:1,available:true,selectable:true,price:null,pricePolicy:'selection-required',variants:[{id,title:'Варіант',sku:'TEST',price:{amountMinor:12345,currency:'UAH' as const},available:true,purchasable:true}],media:[]};
 const mapped=mapCatalogV2(product);assert.equal(mapped.id,id);assert.equal(mapped.sellerId,id);assert.equal(mapped.requiresVariantSelection,true);assert.equal(mapped.purchaseEnabled,false);assert.equal(selectVariant(mapped,id)!.price.amountMinor,12345);assert.equal(selectVariant(mapped,id)!.requiresVariantSelection,false);assert.equal(mapped.reviewCount,0);
});
