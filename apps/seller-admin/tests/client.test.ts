import {mock,test} from 'node:test';
import assert from 'node:assert/strict';
import {isSellerSession,sellerCapabilities} from '../../api/src/contracts/seller';
import {money,record,rows,sellerRequest,SellerError} from '../lib/client';

const id='10000000-0000-4000-8000-000000000001';

test('seller session contract requires owner role and excludes staff privileges',()=>{
 const session={mode:'integration-test',actorId:id,staffPrivileges:false,stores:[{id,name:'DEMO',role:'owner',capabilities:sellerCapabilities}]};
 assert.equal(isSellerSession(session),true);
 assert.equal(isSellerSession({...session,staffPrivileges:true}),false);
 assert.equal(isSellerSession({...session,stores:[{...session.stores[0],role:'staff'}]}),false);
});

test('seller response helpers accept only object rows and integer minor-unit money',()=>{
 assert.deepEqual(rows([{id},{id:'next'}]),[{id},{id:'next'}]);
 assert.deepEqual(rows('not rows'),[]);
 assert.equal(record({ok:true}).ok,true);
 assert.throws(()=>record(null));
 assert.match(money(999),/9,99 ₴/);
 assert.throws(()=>money(1.25));
 assert.throws(()=>money(-1));
});

test('seller mutations are same-origin and carry the server CSRF token',async()=>{
 let seen:RequestInit|undefined,url='';
 const restore=mock.method(globalThis,'fetch',async(input:URL|string|Request,init?:RequestInit)=>{url=String(input);seen=init;return new Response(JSON.stringify({ok:true,data:{mode:'integration-test',sellerId:id,resource:'commands',data:{saved:true}},meta:{requestId:id}}),{status:200,headers:{'content-type':'application/json'}});});
 try{const result=await sellerRequest(`stores/${id}/commands`,'csrf-token',{action:'store-save'});assert.equal(result.sellerId,id);assert.equal(url,`/api/v1/seller/stores/${id}/commands`);assert.equal(seen?.credentials,'same-origin');assert.equal((seen?.headers as Record<string,string>)['x-csrf-token'],'csrf-token');assert.equal(seen?.method,'POST');}finally{restore.mock.restore();}
});

test('seller API failures do not expose server payloads or report synthetic success',async()=>{
 const restore=mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({ok:false,error:{code:'FORBIDDEN',message:'internal detail'}}),{status:403,headers:{'content-type':'application/json'}}));
 try{await assert.rejects(()=>sellerRequest(`stores/${id}/dashboard`,'csrf'),e=>e instanceof SellerError&&e.status===403&&!e.message.includes('internal detail'));}finally{restore.mock.restore();}
});
