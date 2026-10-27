import type {CatalogService,ProductQuery} from '../contracts/catalog';
import {createCatalogV2Client} from '../../lib/catalog-v2-client';
import {mapCatalogV2} from '../../domain/catalog/v2';
import {ApiClientError} from '../../lib/api-client';
/** Explicit public read-only preview. No mock fallback, buyer/seller identity or commerce activation. */
export class CatalogV2Service implements CatalogService{
 constructor(private readonly client:ReturnType<typeof createCatalogV2Client>){}
 async getCategories(){const rows=await this.client.categories();return rows.map(c=>({id:c.id,parentId:c.parentId,handle:c.handle,title:c.title,icon:'',subcategories:rows.filter(x=>x.parentId===c.id).map(x=>x.title)}));}
 async listProducts(input:ProductQuery={}){
  const q=new URLSearchParams();if(input.query)q.set('query',input.query);if(input.category)q.set('categoryId',input.category);
  if(input.subcategory&&input.category){const cs=await this.client.categories(),child=cs.find(c=>c.parentId===input.category&&c.title===input.subcategory);if(child)q.set('categoryId',child.id);}
  if(input.vendor)q.set('brand',input.vendor);if(input.attribute&&input.value){q.set('attribute',input.attribute);q.set('value',input.value);}
  if(input.available!==undefined)q.set('available',String(input.available));if(input.minPrice!==undefined)q.set('minPrice',String(input.minPrice));if(input.maxPrice!==undefined)q.set('maxPrice',String(input.maxPrice));
  q.set('sort',input.sort==='featured'||!input.sort?'default':input.sort);
  q.set('page',String(input.page??1));q.set('limit',String(input.limit??8));const p=await this.client.list(q);
  return {items:p.items.map(mapCatalogV2),total:p.total,page:p.page,pageSize:p.pageSize,pageCount:Math.max(1,Math.ceil(p.total/p.pageSize))};
 }
 async getProduct(handle:string){try{return mapCatalogV2(await this.client.get(handle));}catch(e){if(e instanceof ApiClientError&&e.status===404)return null;throw e;}}
 async getSuggestions(query:string,limit=5){if(query.trim().length<2)return [];return (await this.listProducts({query,limit})).items;}
}
