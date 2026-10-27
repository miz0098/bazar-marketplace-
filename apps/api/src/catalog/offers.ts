import type pg from 'pg';
import {ApiError} from '../contracts/foundation.js';
import {integer,money,text,uuid} from '../business/validation.js';
import {attributes,type CatalogQuery} from './service.js';
const unavailable=()=>new ApiError(503,'SERVICE_UNAVAILABLE','Offer data is unavailable.');
function unavailableDescription():never{throw unavailable();}
function offer(r:pg.QueryResultRow){
 if(r.currency!=='UAH'||!Array.isArray(r.media)||r.media.length>100)throw unavailable();
 return {contractVersion:1 as const,id:uuid(r.id),variantId:uuid(r.id),productId:uuid(r.product_id),sellerId:uuid(r.seller_id),sellerName:text(r.seller_name,200),handle:text(r.handle,200),title:text(r.title,300),variantTitle:text(r.variant_title,200),sku:text(r.sku,100),description:typeof r.description==='string'&&r.description.length<=10000?r.description:unavailableDescription(),categoryId:uuid(r.category_id),attributes:attributes(r.attributes,60),price:{amountMinor:money(String(r.price_minor)),currency:'UAH' as const},available:Boolean(r.available)&&Boolean(r.purchasable),publishedAt:r.published_at instanceof Date?r.published_at.toISOString():null,media:r.media};
}
export function createOfferService(pool:pg.Pool){
 async function tx<T>(fn:(c:pg.PoolClient)=>Promise<T>,read=false){const c=await pool.connect();try{await c.query(read?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN');const v=await fn(c);await c.query('COMMIT');return v;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 const isolated=()=>{if(process.env.NODE_ENV!=='test')throw unavailable();};
 return {
  async list(q:CatalogQuery){return tx(async c=>{
   const rows=(await c.query("SELECT * FROM bazar.seller_offers WHERE status='published' AND seller_active AND purchasable ORDER BY published_at DESC,id LIMIT 10001")).rows;if(rows.length>10000)throw unavailable();
   const categories=q.category?(await c.query('WITH RECURSIVE tree AS (SELECT id FROM bazar.categories WHERE id=$1 UNION SELECT c.id FROM bazar.categories c JOIN tree t ON c.parent_id=t.id) SELECT id FROM tree',[q.category])).rows.map(x=>x.id):null;
   const term=q.query.trim().toLocaleLowerCase('uk-UA');
   const data=rows.map(offer).filter(o=>(!categories||categories.includes(o.categoryId))&&(!term||`${o.title} ${o.variantTitle} ${Object.values(o.attributes).join(' ')}`.toLocaleLowerCase('uk-UA').includes(term))&&(!q.brand||o.attributes.brand===q.brand)&&(!q.attribute||o.attributes[q.attribute]===q.value)&&(q.available===null||o.available===q.available)&&o.price.amountMinor>=q.min&&o.price.amountMinor<=q.max);
   if(q.sort==='price-asc'||q.sort==='price-desc'){const direction=q.sort==='price-asc'?1:-1;data.sort((a,b)=>direction*(a.price.amountMinor-b.price.amountMinor)||a.id.localeCompare(b.id));}
   if(q.sort==='name')data.sort((a,b)=>a.title.localeCompare(b.title,'uk')||a.variantTitle.localeCompare(b.variantTitle,'uk')||a.id.localeCompare(b.id));
   return {contractVersion:1,total:data.length,page:q.page,pageSize:q.limit,items:data.slice((q.page-1)*q.limit,q.page*q.limit)};
  },true);},
  async get(id:string){id=uuid(id);return tx(async c=>{const r=(await c.query("SELECT * FROM bazar.seller_offers WHERE id=$1 AND status='published' AND seller_active AND purchasable",[id])).rows[0];if(!r)throw new ApiError(404,'NOT_FOUND','Offer not found.');return offer(r);},true);},
  async state(actor:string){isolated();actor=uuid(actor);return tx(async c=>{
   const cart=(await c.query("SELECT id,version::text FROM bazar.carts WHERE user_id=$1 AND lifecycle='active'",[actor])).rows[0];
   const lines=cart?(await c.query('SELECT o.*,l.quantity FROM bazar.cart_lines l JOIN bazar.seller_offers o ON o.id=l.variant_id WHERE l.cart_id=$1 ORDER BY o.id LIMIT 1001',[cart.id])).rows:[];
   const wishlist=(await c.query('SELECT o.*,w.created_at AS saved_at FROM bazar.offer_wishlist_items w JOIN bazar.seller_offers o ON o.id=w.variant_id WHERE w.user_id=$1 ORDER BY w.created_at DESC,o.id LIMIT 1001',[actor])).rows;
   const legacy=(await c.query('SELECT product_id FROM bazar.wishlist_items WHERE user_id=$1 ORDER BY product_id LIMIT 1001',[actor])).rows;
   if(lines.length>1000||wishlist.length>1000||legacy.length>1000)throw unavailable();
   const amount=lines.reduce((sum,l)=>sum+BigInt(l.price_minor)*BigInt(l.quantity),0n);if(amount>BigInt(Number.MAX_SAFE_INTEGER))throw unavailable();
   return {contractVersion:1,mode:'integration-test' as const,subtotal:{amountMinor:Number(amount),currency:'UAH' as const},cartVersion:cart?money(cart.version):null,lines:lines.map(l=>({offer:offer(l),quantity:integer(l.quantity,1,2147483647)})),wishlist:wishlist.map(w=>({offer:offer(w),savedAt:(w.saved_at as Date).toISOString()})),legacyWishlist:legacy.map(w=>({productId:uuid(w.product_id)}))};
  },true);},
  async wishlist(actor:string,id:string,add:boolean){isolated();actor=uuid(actor);id=uuid(id);return tx(async c=>{
   if(add){const o=(await c.query("SELECT cv.product_id FROM bazar.catalog_variants cv JOIN bazar.catalog_products cp ON cp.product_id=cv.product_id JOIN bazar.sellers s ON s.id=cp.seller_id AND s.active WHERE cv.variant_id=$1 AND cv.purchasable AND cp.status='published' FOR SHARE OF cp,s",[id])).rows[0];if(!o)throw new ApiError(404,'NOT_FOUND','Offer not found.');await c.query('INSERT INTO bazar.offer_wishlist_items(user_id,variant_id,product_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[actor,id,o.product_id]);}
   else await c.query('DELETE FROM bazar.offer_wishlist_items WHERE user_id=$1 AND variant_id=$2',[actor,id]);
   return {offerId:id,saved:add};
  });}
 };
}
export type OfferService=ReturnType<typeof createOfferService>;
