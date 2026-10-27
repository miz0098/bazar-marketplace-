import {createApiReader} from './api-client';
import type {ApiClientConfig} from './api-config';
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const str=(v:unknown,max=300):v is string=>typeof v==='string'&&v.length<=max;
const num=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const cash=(v:unknown):v is {amountMinor:number;currency:'UAH'}=>record(v)&&num(v.amountMinor)&&v.currency==='UAH';
export interface CatalogV2Product {contractVersion:2;id:string;sellerId:string;handle:string;title:string;description:string;categoryId:string;attributes:Record<string,string>;status:'published';publishedAt:string;version:number;available:boolean;selectable:boolean;price:{amountMinor:number;currency:'UAH'}|null;pricePolicy:string;variants:{id:string;sku:string;title:string;price:{amountMinor:number;currency:'UAH'};available:boolean;purchasable:boolean}[];media:{id:string;variantId:string|null;src:string;alt:string;width:number;height:number;position:number}[]}
export function isCatalogV2Product(v:unknown):v is CatalogV2Product{
 if(!record(v)||v.contractVersion!==2||!id(v.id)||!id(v.sellerId)||!id(v.categoryId)||!str(v.handle,200)||!v.handle||!str(v.title)||!str(v.description,10000)||v.status!=='published'||!str(v.publishedAt)||!Number.isFinite(Date.parse(v.publishedAt))||!num(v.version)||v.version<1||typeof v.available!=='boolean'||typeof v.selectable!=='boolean'||!record(v.attributes)||Object.keys(v.attributes).length>30||Object.values(v.attributes).some(x=>!str(x,200))||!Array.isArray(v.variants)||v.variants.length>200||!Array.isArray(v.media)||v.media.length>100)return false;
 if(!v.variants.every(x=>record(x)&&id(x.id)&&str(x.sku,100)&&str(x.title,200)&&cash(x.price)&&typeof x.available==='boolean'&&typeof x.purchasable==='boolean')||new Set(v.variants.map(x=>x.id)).size!==v.variants.length)return false;
 if(!v.media.every(m=>record(m)&&id(m.id)&&(m.variantId===null||(v.variants as Record<string,unknown>[]).some(x=>x.id===m.variantId))&&typeof m.src==='string'&&/^\/catalog-media\/[a-zA-Z0-9_-]+\.(png|jpg|webp|avif)$/.test(m.src)&&str(m.alt)&&m.alt.length>0&&num(m.width)&&m.width>0&&num(m.height)&&m.height>0&&num(m.position)))return false;
 const vs=v.variants.filter(x=>x.purchasable),uniform=vs.length>0&&vs.every(x=>x.price.amountMinor===vs[0].price.amountMinor);
 if(uniform)return v.pricePolicy==='uniform'&&cash(v.price)&&v.price.amountMinor===vs[0].price.amountMinor;
 return v.price===null&&v.pricePolicy==='selection-required';
}
export interface CatalogV2Page {contractVersion:2;total:number;page:number;pageSize:number;items:CatalogV2Product[]}
export interface CatalogV2Category {id:string;parentId:string|null;handle:string;title:string;directProductCount:number}
export function isCatalogV2Page(v:unknown):v is CatalogV2Page{return record(v)&&v.contractVersion===2&&num(v.total)&&v.total<=1000&&num(v.page)&&v.page>=1&&num(v.pageSize)&&v.pageSize>=1&&v.pageSize<=100&&Array.isArray(v.items)&&v.items.length<=v.pageSize&&v.items.every(isCatalogV2Product);}
export function isCatalogV2Categories(v:unknown):v is CatalogV2Category[]{return Array.isArray(v)&&v.length<=1000&&v.every(c=>record(c)&&id(c.id)&&(c.parentId===null||id(c.parentId))&&str(c.handle,200)&&str(c.title,200)&&num(c.directProductCount));}
export function createCatalogV2Client(config:ApiClientConfig,transport:typeof fetch=fetch){
 const read=createApiReader(config,transport);
 return {get:(reference:string)=>read.get('/api/v1/catalog/products/'+encodeURIComponent(reference),isCatalogV2Product),list:(params:URLSearchParams)=>read.get('/api/v1/catalog/products?'+params,isCatalogV2Page),categories:()=>read.get('/api/v1/catalog/categories',isCatalogV2Categories)};
}
