import assert from 'node:assert/strict';
import test from 'node:test';
import {isSellerOffer,isOfferPage,isCustomerOfferState,type SellerOffer} from '../lib/offers-client';
import {mapSellerOffer,productHref} from '../domain/catalog/offers';
import {createServerCustomerStore} from '../services/server/customer-store';
const id='12345678-1234-1234-1234-123456789abc';
const offer:SellerOffer={contractVersion:1,id,variantId:id,productId:id,sellerId:id,sellerName:'Synthetic seller',categoryId:id,handle:'synthetic',title:'Synthetic',variantTitle:'Black 256',sku:'SYNTHETIC',description:'Synthetic fixture',attributes:{storage:'256'},price:{amountMinor:3899900,currency:'UAH'},available:true,publishedAt:null,media:[]};
const response=(data:unknown)=>new Response(JSON.stringify({ok:true,data,meta:{requestId:id}}),{headers:{'content-type':'application/json'}});
test('offer mapping preserves exact seller SKU price and selected URL without parent aggregation',()=>{
 assert.ok(isSellerOffer(offer));const p=mapSellerOffer(offer);assert.equal(p.offerId,id);assert.equal(p.sellerId,id);assert.equal(p.price.amountMinor,3899900);assert.equal(productHref(p),'/products/synthetic?variant='+id);
 for(const patch of [{variantId:'other'},{price:{amountMinor:1.1,currency:'UAH'}},{sellerId:'other'},{media:[{src:'https://untrusted.invalid'}]}])assert.equal(isSellerOffer({...offer,...patch}),false);
 assert.equal(isOfferPage({contractVersion:1,total:5,page:1,pageSize:1,items:[offer,offer]}),false);
 assert.equal(isCustomerOfferState({contractVersion:1,mode:'live',cartVersion:1,lines:[],wishlist:[],legacyWishlist:[]}),false);
});
test('guest state remains separate from server cart through login refresh logout and errors',async()=>{
 let logged=false,failed=false;const writes:string[]=[],calls:string[]=[];
 const state={contractVersion:1,mode:'integration-test',subtotal:{amountMinor:0,currency:'UAH'},cartVersion:1,lines:[],wishlist:[{offer,savedAt:new Date().toISOString()}],legacyWishlist:[]};
 const store=createServerCustomerStore(async(path,init)=>{const p=String(path);calls.push(p);
 if(p.endsWith('/csrf'))return response({csrfToken:'a'.repeat(43),mode:'test-only'});
 if(p.endsWith('/session'))return logged?response({user:{id,firstName:'Synthetic',lastName:'Buyer',maskedPhone:'+380 •• ••• •• ••'},expiresAt:new Date(Date.now()+100000).toISOString(),csrfToken:'a'.repeat(43),mode:'test-only'}):new Response('',{status:401});
 if(p.endsWith('/logout')){logged=false;return response({status:'revoked'});}
 if(p==='/api/v1/cart'){assert.equal(init?.body,'{}');return response({mode:'integration-test',guestMerge:'none',freshness:'current',cart:{id,version:1,lines:[],subtotal:{amountMinor:0,currency:'UAH'}},inventory:[],canCheckout:false});}
 if(p.endsWith('/customer-state'))return failed?new Response('',{status:503}):response(state);
 if(p.includes('/offers/'))return response(offer);
 throw new Error('Unexpected transport path '+p);
 });
 await store.connect(()=>JSON.stringify([{variantId:id,quantity:2}]),v=>writes.push(v));assert.equal(store.getSnapshot().status,'anonymous');assert.equal(store.getSnapshot().cart.itemCount,2);
 logged=true;await store.refresh();assert.equal(store.getSnapshot().cart.itemCount,0);assert.equal(store.getSnapshot().wishlist.length,1);assert.equal(writes.length,0);assert.equal(calls.some(p=>p.includes('/cart/lines')),false);
 failed=true;await store.refresh();assert.equal(store.getSnapshot().status,'error');assert.equal(store.getSnapshot().wishlist.length,0);
 failed=false;await store.refresh();await store.logout();assert.equal(store.getSnapshot().cart.itemCount,2);assert.equal(store.getSnapshot().wishlist.length,0);assert.equal(writes.length,0);
});

test('acknowledged cart write with failed refresh retains its receipt key and never adds twice',async()=>{
 let fail=false,written=false;const keys:string[]=[];
 const base={mode:'integration-test',guestMerge:'none',freshness:'current',cart:{id,version:1,lines:[],subtotal:{amountMinor:0,currency:'UAH'}},inventory:[],canCheckout:false};
 const committed={...base,canCheckout:true,cart:{...base.cart,version:2,lines:[{productId:id,variantId:id,quantity:1,lineTotal:offer.price}],subtotal:offer.price},inventory:[{variantId:id,availabilityModel:'binary',stock:null,available:true,unitPrice:offer.price}]};
 const store=createServerCustomerStore(async(path,init)=>{const p=String(path);
 if(p.endsWith('/csrf'))return response({csrfToken:'a'.repeat(43),mode:'test-only'});
 if(p.endsWith('/session'))return response({user:{id,firstName:'Synthetic',lastName:'Buyer',maskedPhone:'+380 •• ••• •• ••'},expiresAt:new Date(Date.now()+100000).toISOString(),csrfToken:'a'.repeat(43),mode:'test-only'});
 if(p==='/api/v1/cart')return response(base);
 if(p==='/api/v1/cart/lines'){keys.push(JSON.parse(String(init?.body)).idempotencyKey);const replayed=written;written=true;return response({view:{...committed,freshness:replayed?'historical-replay':'current'},replayed});}
 if(p.endsWith('/customer-state'))return fail?new Response('',{status:503}):response({contractVersion:1,mode:'integration-test',cartVersion:written?2:1,subtotal:written?offer.price:{amountMinor:0,currency:'UAH'},lines:written?[{offer,quantity:1}]:[],wishlist:[],legacyWishlist:[]});
 throw new Error('Unexpected request '+p);
 });
 await store.connect(()=>null,()=>{throw new Error('Authenticated state must not be written locally');});
 fail=true;assert.notEqual(await store.mutate('add',mapSellerOffer(offer),1),'');
 fail=false;assert.equal(await store.mutate('add',mapSellerOffer(offer),1),'');
 assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);assert.equal(store.getSnapshot().cart.itemCount,1);
});
