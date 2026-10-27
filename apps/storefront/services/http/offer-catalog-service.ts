import type {CatalogService,ProductQuery} from '../contracts/catalog';
import {createOffersClient} from '../../lib/offers-client';
import {createCatalogV2Client} from '../../lib/catalog-v2-client';
import {mapSellerOffer} from '../../domain/catalog/offers';
import {mapCatalogV2} from '../../domain/catalog/v2';
import {ApiClientError} from '../../lib/api-client';
export class OfferCatalogService implements CatalogService{
 constructor(private offers:ReturnType<typeof createOffersClient>,private products:ReturnType<typeof createCatalogV2Client>,private enabled:boolean){}
 async getCategories(){const rows=await this.products.categories();return rows.map(c=>({id:c.id,parentId:c.parentId,handle:c.handle,title:c.title,icon:'',subcategories:rows.filter(x=>x.parentId===c.id).map(x=>x.title)}));}
 async listProducts(input:ProductQuery={}){const q=new URLSearchParams();if(input.query)q.set('query',input.query);if(input.category)q.set('categoryId',input.category);if(input.subcategory&&input.category){const cs=await this.products.categories(),sub=cs.find(c=>c.parentId===input.category&&c.title===input.subcategory);if(sub)q.set('categoryId',sub.id);}if(input.vendor)q.set('brand',input.vendor);if(input.attribute&&input.value){q.set('attribute',input.attribute);q.set('value',input.value);}if(input.available!==undefined)q.set('available',String(input.available));if(input.minPrice!==undefined)q.set('minPrice',String(input.minPrice));if(input.maxPrice!==undefined)q.set('maxPrice',String(input.maxPrice));q.set('sort',input.sort==='featured'||!input.sort?'default':input.sort);q.set('page',String(input.page??1));q.set('limit',String(input.limit??8));const p=await this.offers.list(q);return {items:p.items.map(o=>({...mapSellerOffer(o),purchaseEnabled:this.enabled})),total:p.total,page:p.page,pageSize:p.pageSize,pageCount:Math.max(1,Math.ceil(p.total/p.pageSize))};}
 async getProduct(handle:string){try{const p=mapCatalogV2(await this.products.get(handle));return {...p,purchaseEnabled:this.enabled};}catch(e){if(e instanceof ApiClientError&&e.status===404)return null;throw e;}}
 async getSuggestions(query:string,limit=5){return query.trim().length<2?[]:(await this.listProducts({query,limit})).items;}
}
