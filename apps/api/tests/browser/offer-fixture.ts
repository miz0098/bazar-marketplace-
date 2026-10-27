import type pg from 'pg';
/** Explicit synthetic offers; no real sellers, availability inferred from no quantity field. */
export async function seedBrowserOffers(pool:pg.Pool,category:string){
 const all:{id:string;productId:string;owner:string}[]=[];
 const c=await pool.connect();try{await c.query('BEGIN');
 for(const [index,variants] of [
 [['Чорний, 256 ГБ',3899900,true],['Білий, 256 ГБ',3949900,false],['Чорний, 512 ГБ',4499900,true]],
 [['Чорний, 256 ГБ',3780000,true]],
 [['Білий, 512 ГБ',4520000,true]],
 ].entries()){
  const owner=(await c.query("INSERT INTO bazar.users(first_name,last_name) VALUES('Синтетичний','Продавець') RETURNING id")).rows[0].id;
  const seller=(await c.query('INSERT INTO bazar.sellers(name) VALUES($1) RETURNING id',[`Synthetic seller ${index}`])).rows[0].id;await c.query('INSERT INTO bazar.seller_owners(seller_id,user_id) VALUES($1,$2)',[seller,owner]);
  const pid=(await c.query("INSERT INTO bazar.products(category_id,handle,title,description) VALUES($1,$2,'iPhone 17','Явно синтетична пропозиція: не реальний товар') RETURNING id",[category,'offer-phone-'+index])).rows[0].id;
  await c.query("INSERT INTO bazar.catalog_products(product_id,seller_id,selectable,available,status,attributes,published_at) VALUES($1,$2,true,false,'published','{\"brand\":\"Synthetic\",\"model\":\"iPhone 17\"}',clock_timestamp())",[pid,seller]);
  for(const [position,[label,price,available]] of variants.entries()){
   const id=(await c.query('INSERT INTO bazar.variants(product_id,sku,price_minor) VALUES($1,$2,$3) RETURNING id',[pid,`SYNTHETIC-OFFER-${index}-${position}`,price])).rows[0].id;
   await c.query('INSERT INTO bazar.catalog_variants(variant_id,product_id,title,available,position,attributes) VALUES($1,$2,$3,$4,$5,$6)',[id,pid,label,available,position,JSON.stringify({color:String(label).includes('Білий')?'Білий':'Чорний',storage:String(label).includes('512')?'512':'256'})]);all.push({id,productId:pid,owner});
  }
 }
 await c.query('COMMIT');return all;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
