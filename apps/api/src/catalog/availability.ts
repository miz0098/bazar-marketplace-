import type pg from 'pg';
/** A missing sidecar is legacy, never an inferred binary availability value. */
export async function catalogAvailability(c:pg.PoolClient,ids:readonly string[],lock=false){
 const installed=(await c.query("SELECT to_regclass('bazar.catalog_products') IS NOT NULL AS yes")).rows[0].yes;
 if(!installed)return new Map<string,boolean>();
 const rows=(await c.query('SELECT v.id,bazar.catalog_available(v.product_id,v.id) AS available FROM bazar.variants v JOIN bazar.catalog_products cp ON cp.product_id=v.product_id WHERE v.id=ANY($1::uuid[]) ORDER BY v.id'+(lock?' FOR SHARE OF cp':''),[ids])).rows;
 return new Map<string,boolean>(rows.map(r=>[r.id,Boolean(r.available)]));
}
