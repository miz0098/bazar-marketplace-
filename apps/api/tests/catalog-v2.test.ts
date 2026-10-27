import assert from 'node:assert/strict';
import test from 'node:test';
import {parseQuery,attributes,createCatalogV2} from '../src/catalog/service.js';
import type pg from 'pg';
test('F20 query parsing bounds rejects arbitrary SQL sorts duplicate keys invalid money and unsupported facets',()=>{
 for(const value of ['sort=rating','sort=price%3BDROP','available=1','page=0','limit=101','minPrice=-1','minPrice=20&maxPrice=10','query=a&query=b','attribute=color','attribute=x%27&value=y','ownerId=forged'])assert.throws(()=>parseQuery(new URLSearchParams(value)));
 assert.equal(parseQuery(new URLSearchParams('query=телефон&available=false&page=2&limit=5')).available,false);
});
test('F20 approved attributes are bounded strings, not nested queries or fabricated ratings',()=>{
 assert.deepEqual(attributes({brand:'Синтетичний',color:'Чорний'}),{brand:'Синтетичний',color:'Чорний'});
 for(const value of [null,[],{brand:2},{'bad.key':'x'},{color:'x'.repeat(201)}])assert.throws(()=>attributes(value));
});
test('F20 seller mutation cannot activate in ordinary runtime even with a directly supplied actor',async()=>{
 const prior=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{await assert.rejects(createCatalogV2({} as pg.Pool).update('12345678-1234-1234-1234-123456789abc','12345678-1234-1234-1234-123456789abc',{}),{status:503});}finally{if(prior===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prior;}
});
