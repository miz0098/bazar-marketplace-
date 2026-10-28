import type pg from 'pg';
import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/foundation.js';
import {integer,uuid,text,money,invalid} from '../business/validation.js';
const missing=()=>new ApiError(404,'NOT_FOUND','Catalog resource not found.');
export function parseQuery(p:URLSearchParams){
 const allowed=['query','categoryId','brand','attribute','value','available','minPrice','maxPrice','sort','page','limit'];
 for(const k of p.keys())if(!allowed.includes(k)||p.getAll(k).length!==1)invalid();
 const n=(k:string,d:number)=>p.has(k)?integer(Number(p.get(k)),k==='page'||k==='limit'?1:0,k==='limit'?100:k==='page'?10000:Number.MAX_SAFE_INTEGER):d;
 const min=n('minPrice',0),max=n('maxPrice',Number.MAX_SAFE_INTEGER),sort=p.get('sort')??'default';
 if(min>max||!['default','newest','price-asc','price-desc','name'].includes(sort))invalid();
 const available=p.get('available');if(available!==null&&!['true','false'].includes(available))invalid();
 const query=p.get('query')??'';if(query.length>200)invalid();
 const brand=p.get('brand')??'',attribute=p.get('attribute')??'',value=p.get('value')??'';
 if(brand.length>100||value.length>200||attribute.length>60||Boolean(attribute)!==Boolean(value)||attribute&&!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(attribute))invalid();
 return {query,category:p.has('categoryId')?uuid(p.get('categoryId')):null,brand,attribute,value,available:available===null?null:available==='true',min,max,sort,page:n('page',1),limit:n('limit',20)};
}
export type CatalogQuery=ReturnType<typeof parseQuery>;
export function attributes(v:unknown,limit=30):Record<string,string>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length>limit)invalid();
 for(const [k,val] of Object.entries(v))if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/.test(k)||typeof val!=='string'||val.length>200||!val.trim())invalid();
 return v as Record<string,string>;
}
export function createCatalogV2(pool:pg.Pool){
 async function rows(c:pg.PoolClient){
  const products=(await c.query("SELECT p.id,p.handle,p.title,p.description,p.category_id,cp.*,s.name AS seller_name,bazar.catalog_available(p.id) AS effective FROM bazar.products p JOIN bazar.catalog_products cp ON cp.product_id=p.id JOIN bazar.sellers s ON s.id=cp.seller_id WHERE cp.status='published' AND s.active ORDER BY cp.published_at DESC,p.id LIMIT 1001")).rows;
  if(products.length>1000)throw new ApiError(503,'SERVICE_UNAVAILABLE','Catalog requires a narrower data source.');
  const variants=(await c.query('SELECT v.id,v.product_id,v.sku,v.price_minor::text,v.currency,cv.title,cv.position,cv.purchasable,bazar.catalog_available(v.product_id,v.id) AS available FROM bazar.variants v JOIN bazar.catalog_variants cv ON cv.variant_id=v.id WHERE v.product_id=ANY($1::uuid[]) ORDER BY cv.position,v.id LIMIT 200001',[products.map(p=>p.id)])).rows;
  const media=(await c.query('SELECT * FROM bazar.catalog_media WHERE product_id=ANY($1::uuid[]) ORDER BY position,id LIMIT 100001',[products.map(p=>p.id)])).rows;
  if(variants.length>200000||media.length>100000)throw new ApiError(503,'SERVICE_UNAVAILABLE','Catalog resource bound exceeded.');
  return products.map(p=>{
   const vs=variants.filter(v=>v.product_id===p.id).map(v=>({id:uuid(v.id),sku:text(v.sku,100),title:text(v.title,200),price:{amountMinor:money(v.price_minor),currency:'UAH' as const},available:Boolean(v.available),purchasable:Boolean(v.purchasable)}));
   // No invented merchandising aggregate for differently priced variants.
   const prices=vs.filter(v=>v.purchasable).map(v=>v.price.amountMinor),uniform=prices.length>0&&prices.every(v=>v===prices[0]);
   return {contractVersion:2 as const,id:uuid(p.id),sellerId:uuid(p.seller_id),handle:text(p.handle,200),title:text(p.title,300),description:p.description as string,categoryId:uuid(p.category_id),attributes:attributes(p.attributes),status:'published' as const,publishedAt:(p.published_at as Date).toISOString(),version:money(String(p.version)),available:Boolean(p.effective),selectable:Boolean(p.selectable),price:uniform?{amountMinor:prices[0],currency:'UAH' as const}:null,pricePolicy:uniform?'uniform':'selection-required',variants:vs,media:media.filter(m=>m.product_id===p.id).map(m=>({id:uuid(m.id),variantId:m.variant_id===null?null:uuid(m.variant_id),src:text(m.path,300),alt:text(m.alt,300),width:integer(m.width,1,10000),height:integer(m.height,1,10000),position:integer(m.position,0)}))};
  });
 }
 async function read<T>(fn:(c:pg.PoolClient)=>Promise<T>){const c=await pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 return {
  async list(q:CatalogQuery){return read(async c=>{
   let data=await rows(c);
   let ids:string[]|null=null;
   if(q.category)ids=(await c.query('WITH RECURSIVE tree AS (SELECT id FROM bazar.categories WHERE id=$1 UNION SELECT c.id FROM bazar.categories c JOIN tree t ON c.parent_id=t.id) SELECT id FROM tree',[q.category])).rows.map(r=>r.id);
   const query=q.query.trim().toLocaleLowerCase('uk-UA');
   data=data.filter(p=>(!ids||ids.includes(p.categoryId))&&(!query||`${p.title} ${Object.values(p.attributes).join(' ')}`.toLocaleLowerCase('uk-UA').includes(query))&&(!q.brand||p.attributes.brand===q.brand)&&(!q.attribute||p.attributes[q.attribute]===q.value)&&(q.available===null||p.available===q.available)&&p.variants.some(v=>v.purchasable&&(q.available!==true||v.available)&&v.price.amountMinor>=q.min&&v.price.amountMinor<=q.max));
   if(q.sort.startsWith('price')&&data.some(p=>p.price===null))throw new ApiError(409,'CATALOG_PRICE_POLICY_REQUIRED','Select a variant; aggregate price ordering requires a merchandising decision.');
   const direction=q.sort==='price-desc'?-1:1;
   if(q.sort.startsWith('price'))data.sort((a,b)=>direction*(a.price!.amountMinor-b.price!.amountMinor)||a.id.localeCompare(b.id));
   if(q.sort==='name')data.sort((a,b)=>a.title.localeCompare(b.title,'uk')||a.id.localeCompare(b.id));
   // Default/newest use verified publishedAt with stable ID ties, already ordered in SQL.
   return {contractVersion:2,total:data.length,page:q.page,pageSize:q.limit,items:data.slice((q.page-1)*q.limit,q.page*q.limit)};
  });},
  async get(handle:string){return read(async c=>{const all=await rows(c),r=all.find(p=>p.handle===handle||p.id===handle);if(!r)throw missing();return r;});},
  async categories(){return read(async c=>{const r=(await c.query("SELECT c.id,c.parent_id,c.handle,c.title,count(cp.product_id)::int AS product_count FROM bazar.categories c LEFT JOIN bazar.products p ON p.category_id=c.id LEFT JOIN bazar.catalog_products cp ON cp.product_id=p.id AND cp.status='published' AND EXISTS(SELECT 1 FROM bazar.sellers s WHERE s.id=cp.seller_id AND s.active) GROUP BY c.id ORDER BY c.handle,c.id LIMIT 1001")).rows;if(r.length>1000)throw new ApiError(503,'SERVICE_UNAVAILABLE','Category limit exceeded.');const parents=new Map<string,string|null>(r.map(x=>[x.id,x.parent_id]));for(const id of parents.keys()){const visited=new Set<string>();let current:string|null=id;while(current!==null){if(visited.has(current)||!parents.has(current))throw new ApiError(503,'SERVICE_UNAVAILABLE','Invalid category hierarchy.');visited.add(current);current=parents.get(current)!;}}return r.map(c=>({id:uuid(c.id),parentId:c.parent_id===null?null:uuid(c.parent_id),handle:text(c.handle,200),title:text(c.title,200),directProductCount:integer(c.product_count,0)}));});},
  async saved(actor:string){
   actor=uuid(actor);if(process.env.NODE_ENV!=='test')throw new ApiError(503,'SERVICE_UNAVAILABLE','Saved catalog integration is test-only.');
   return read(async c=>{
    const cart=(await c.query("SELECT v.product_id,v.id AS variant_id,l.quantity,bazar.catalog_available(v.product_id,v.id) AS available,v.price_minor::text FROM bazar.carts ca JOIN bazar.cart_lines l ON l.cart_id=ca.id JOIN bazar.variants v ON v.id=l.variant_id JOIN bazar.catalog_products cp ON cp.product_id=v.product_id WHERE ca.user_id=$1 AND ca.lifecycle='active' ORDER BY v.id LIMIT 1001",[actor])).rows;
    const wishlist=(await c.query('SELECT w.product_id,bazar.catalog_available(w.product_id) AS available FROM bazar.wishlist_items w JOIN bazar.catalog_products cp ON cp.product_id=w.product_id WHERE w.user_id=$1 ORDER BY w.product_id LIMIT 1001',[actor])).rows;
    if(cart.length>1000||wishlist.length>1000)throw new ApiError(503,'SERVICE_UNAVAILABLE','Saved catalog bound exceeded.');
    return {contractVersion:2,mode:'integration-test',cart:cart.map(x=>({productId:uuid(x.product_id),variantId:uuid(x.variant_id),quantity:integer(x.quantity,1),available:Boolean(x.available),price:{amountMinor:money(x.price_minor),currency:'UAH'}})),wishlist:wishlist.map(x=>({productId:uuid(x.product_id),available:Boolean(x.available)}))};
   });
  },
  async wishlist(actor:string,pid:string,add:boolean){
   actor=uuid(actor);pid=uuid(pid);if(process.env.NODE_ENV!=='test')throw new ApiError(503,'SERVICE_UNAVAILABLE','Wishlist integration is test-only.');
   const c=await pool.connect();try{await c.query('BEGIN');if(add){const row=(await c.query("SELECT cp.product_id FROM bazar.catalog_products cp JOIN bazar.sellers s ON s.id=cp.seller_id AND s.active WHERE cp.product_id=$1 AND cp.status='published' FOR SHARE OF cp,s",[pid])).rows[0];if(!row)throw missing();await c.query('INSERT INTO bazar.wishlist_items(user_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[actor,pid]);}else await c.query('DELETE FROM bazar.wishlist_items WHERE user_id=$1 AND product_id=$2',[actor,pid]);await c.query('COMMIT');return {productId:pid,saved:add};}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  },
  async update(actor:string,pid:string,input:unknown){
   actor=uuid(actor);pid=uuid(pid);
   if(process.env.NODE_ENV!=='test')throw new ApiError(503,'SERVICE_UNAVAILABLE','Seller mutation is isolated-test only.');
   if(!input||typeof input!=='object'||Array.isArray(input))invalid();const b=input as Record<string,unknown>;
   const keys=['expectedVersion','idempotencyKey','title','description','attributes','available','variantId','priceMinor','purchasable','categoryId','status','media'];
   if(Object.keys(b).some(k=>!keys.includes(k)))invalid();
   const version=integer(b.expectedVersion,1),key=uuid(b.idempotencyKey),vid=b.variantId===undefined?null:uuid(b.variantId);
   if(b.available!==undefined&&typeof b.available!=='boolean'||b.purchasable!==undefined&&typeof b.purchasable!=='boolean')invalid();
   if(b.title!==undefined)text(b.title,vid?200:300);if(b.description!==undefined&&(typeof b.description!=='string'||b.description.length>10000))invalid();
   if(b.attributes!==undefined)attributes(b.attributes);if(b.priceMinor!==undefined)integer(b.priceMinor,0);
   if(vid&&(b.description!==undefined||b.attributes!==undefined)||!vid&&(b.priceMinor!==undefined||b.purchasable!==undefined))invalid();
   if(b.categoryId!==undefined)uuid(b.categoryId);if(b.status!==undefined&&!['published','archived'].includes(String(b.status)))invalid();
   if(vid&&(b.categoryId!==undefined||b.status!==undefined||b.media!==undefined))invalid();
   if(b.media!==undefined){if(!Array.isArray(b.media)||b.media.length>12)invalid();for(const m of b.media){if(!m||typeof m!=='object'||Array.isArray(m))invalid();const r=m as Record<string,unknown>;if(Object.keys(r).some(k=>!['path','alt','variantId','width','height'].includes(k))||typeof r.path!=='string'||!/^\/images\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpg)$/.test(r.path))invalid();text(r.alt,300);integer(r.width,1,10000);integer(r.height,1,10000);if(r.variantId!==null)uuid(r.variantId);}}
   const digest=createHash('sha256').update(JSON.stringify({pid,...Object.fromEntries(Object.entries(b).sort())})).digest('hex');
   const c=await pool.connect();try{
    await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,20))',[actor+key]);
    // Authorization rechecked on replay; lock seller membership against revocation.
    const owner=(await c.query('SELECT cp.seller_id FROM bazar.catalog_products cp JOIN bazar.sellers s ON s.id=cp.seller_id AND s.active JOIN bazar.seller_owners so ON so.seller_id=cp.seller_id AND so.user_id=$2 WHERE cp.product_id=$1 FOR SHARE OF so,s',[pid,actor])).rows[0];if(!owner)throw missing();
    const receipt=(await c.query('SELECT digest,audit_id FROM bazar.catalog_commands WHERE actor_id=$1 AND key=$2',[actor,key])).rows[0];
    if(receipt){if(receipt.digest!==digest)throw new ApiError(409,'CONFLICT','Idempotency conflict.');await c.query('COMMIT');return {auditId:receipt.audit_id,replayed:true};}
    await c.query('SELECT id FROM bazar.variants WHERE product_id=$1 ORDER BY id FOR UPDATE',[pid]);
    const before=(await c.query('SELECT *,bazar.catalog_available(product_id) AS effective FROM bazar.catalog_products WHERE product_id=$1 FOR UPDATE',[pid])).rows[0];
    if(Number(before.version)!==version)throw new ApiError(409,'CONFLICT','Catalog version changed.');
    const oldMedia=(await c.query('SELECT * FROM bazar.catalog_media WHERE product_id=$1 ORDER BY position,id',[pid])).rows;
    const oldBase=(await c.query('SELECT title,description,category_id FROM bazar.products WHERE id=$1',[pid])).rows[0];
    if(b.categoryId!==undefined&&!(await c.query('SELECT 1 FROM bazar.categories WHERE id=$1',[b.categoryId])).rowCount)throw missing();
    if(b.media!==undefined){for(const m of b.media as Record<string,unknown>[])if(m.variantId!==null&&!(await c.query('SELECT 1 FROM bazar.variants WHERE id=$1 AND product_id=$2',[m.variantId,pid])).rowCount)throw missing();await c.query('DELETE FROM bazar.catalog_media WHERE product_id=$1',[pid]);for(const [position,m]of (b.media as Record<string,unknown>[]).entries())await c.query('INSERT INTO bazar.catalog_media(product_id,variant_id,path,alt,width,height,position) VALUES($1,$2,$3,$4,$5,$6,$7)',[pid,m.variantId,m.path,m.alt,m.width,m.height,position]);}
    if(b.categoryId!==undefined)await c.query('UPDATE bazar.products SET category_id=$2 WHERE id=$1',[pid,b.categoryId]);
    if(b.status!==undefined)await c.query('UPDATE bazar.catalog_products SET status=$2 WHERE product_id=$1',[pid,b.status]);
    const oldPrices=(await c.query('SELECT id,price_minor::text,version::text FROM bazar.variants WHERE product_id=$1 ORDER BY id',[pid])).rows;
    const vb=vid?(await c.query('SELECT *,bazar.catalog_available(product_id,variant_id) AS effective FROM bazar.catalog_variants WHERE variant_id=$1 AND product_id=$2 FOR UPDATE',[vid,pid])).rows[0]:null;
    if(vid&&!vb)throw missing();
    if(!vid&&before.selectable&&b.available!==undefined)invalid();
    if(vid){await c.query('UPDATE bazar.catalog_variants SET available=coalesce($3,available),purchasable=coalesce($4,purchasable),title=coalesce($5,title) WHERE variant_id=$1 AND product_id=$2',[vid,pid,b.available??null,b.purchasable??null,b.title??null]);if(b.priceMinor!==undefined)await c.query('UPDATE bazar.variants SET price_minor=$2 WHERE id=$1',[vid,b.priceMinor]);}
    else {await c.query('UPDATE bazar.products SET title=coalesce($2,title),description=coalesce($3,description) WHERE id=$1',[pid,b.title??null,b.description??null]);await c.query('UPDATE bazar.catalog_products SET available=coalesce($2,available),attributes=coalesce($3::jsonb,attributes) WHERE product_id=$1',[pid,b.available??null,b.attributes===undefined?null:JSON.stringify(b.attributes)]);}
    await c.query('UPDATE bazar.variants SET version=version+1 WHERE product_id=$1',[pid]);
    await c.query('UPDATE bazar.catalog_products SET version=version+1 WHERE product_id=$1',[pid]);
    const after=(await c.query('SELECT *,bazar.catalog_available(product_id) AS effective FROM bazar.catalog_products WHERE product_id=$1',[pid])).rows[0];
    const va=vid?(await c.query('SELECT *,bazar.catalog_available(product_id,variant_id) AS effective FROM bazar.catalog_variants WHERE variant_id=$1',[vid])).rows[0]:null;
    const audit=(await c.query('INSERT INTO bazar.catalog_audit(product_id,variant_id,seller_id,actor_id,revision,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[pid,vid,owner.seller_id,actor,after.version,JSON.stringify({product:before,variant:vb,prices:oldPrices,media:oldMedia,base:oldBase}),JSON.stringify({product:after,variant:va,base:(await c.query('SELECT title,description,category_id FROM bazar.products WHERE id=$1',[pid])).rows[0],media:(await c.query('SELECT * FROM bazar.catalog_media WHERE product_id=$1 ORDER BY position,id',[pid])).rows,prices:(await c.query('SELECT id,price_minor::text,version::text FROM bazar.variants WHERE product_id=$1 ORDER BY id',[pid])).rows})])).rows[0].id;
    // Same transition may create two event scopes; union recipients per event, no retry duplication.
    const restored:('product'|'variant')[]=[];
    if(!before.effective&&after.effective)restored.push('product');if(vid&&!vb.effective&&va.effective)restored.push('variant');
    for(const kind of restored){
     const event=(await c.query('INSERT INTO bazar.availability_events(audit_id,product_id,variant_id,kind) VALUES($1,$2,$3,$4) RETURNING id',[audit,pid,vid,kind])).rows[0].id;
     // If both restore scopes occur, cart+wishlist overlap is unioned onto the product event.
     if(kind==='variant'&&restored.includes('product'))continue;
     const hasOffers=(await c.query("SELECT to_regclass('bazar.offer_wishlist_items') IS NOT NULL AS yes")).rows[0].yes;
     const recipients=(await c.query("SELECT DISTINCT user_id FROM (SELECT w.user_id FROM bazar.wishlist_items w WHERE $3::boolean AND w.product_id=$1 UNION SELECT ca.user_id FROM bazar.carts ca JOIN bazar.cart_lines l ON l.cart_id=ca.id JOIN bazar.variants v ON v.id=l.variant_id WHERE ca.lifecycle='active' AND v.product_id=$1 AND ($2::uuid IS NULL OR v.id=$2) AND bazar.catalog_available(v.product_id,v.id)"+(hasOffers?" UNION SELECT ow.user_id FROM bazar.offer_wishlist_items ow WHERE ow.product_id=$1 AND ($2::uuid IS NULL OR ow.variant_id=$2) AND bazar.catalog_available(ow.product_id,ow.variant_id)":"")+") r ORDER BY user_id",[pid,vid,kind==='product'])).rows;
     for(const r of recipients)await c.query("INSERT INTO bazar.notification_events(user_id,kind,source_id,scope_id) VALUES($1,'product.availability_restored',$2,$3) ON CONFLICT(user_id,kind,source_id) DO NOTHING",[r.user_id,event,pid]);
    }
    await c.query('INSERT INTO bazar.catalog_commands(actor_id,key,digest,audit_id) VALUES($1,$2,$3,$4)',[actor,key,digest,audit]);
    await c.query('COMMIT');return {auditId:audit,replayed:false};
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
 };
}
export type CatalogV2=ReturnType<typeof createCatalogV2>;
