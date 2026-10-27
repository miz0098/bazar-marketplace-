import type {IncomingMessage,ServerResponse} from 'node:http';
import {ApiError} from '../contracts/foundation.js';
import {authorize,readJson} from '../auth/http.js';
import type {AuthService} from '../auth/service.js';
import {rawBody} from '../payments/http.js';
import type {CommerceService} from './service.js';
export async function handleCommerce(req:IncomingMessage,res:ServerResponse,url:URL,service?:CommerceService,auth?:AuthService){
 if(!service||!auth)throw new ApiError(503,'SERVICE_UNAVAILABLE','Commerce is not enabled.');
 if(url.pathname==='/api/v1/commerce/webhook'){if(req.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED','Method denied.');if(url.search)throw new ApiError(400,'INVALID_REQUEST','Queries denied.');const sig=req.headers['x-payment-signature'];if(typeof sig!=='string'||sig.length>300)throw new ApiError(403,'PAYMENT_AUTH_FAILED','Signature required.');return service.webhook(await rawBody(req,res),sig);}
 const read=req.method==='GET'||req.method==='HEAD';const actor=(await authorize(req,auth,!read)).userId;
 if(read&&(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)))throw new ApiError(400,'INVALID_REQUEST','Read body denied.');
 const p=url.pathname.slice('/api/v1/commerce'.length);if(p==='/directory'&&read)return service.directory(url.searchParams);if(url.search)throw new ApiError(400,'INVALID_REQUEST','Queries denied.');
 if(p==='/quotes'&&req.method==='POST')return service.quote(actor,await readJson(req,res));
 if(p==='/orders'&&read)return service.listOrders(actor);
 let match=p.match(/^\/quotes\/([^/]+)$/);if(match&&read)return service.getQuote(actor,match[1]);
 match=p.match(/^\/quotes\/([^/]+)\/pay$/);if(match&&req.method==='POST')return service.initiate(actor,match[1],await readJson(req,res));
 match=p.match(/^\/orders\/([^/]+)$/);if(match&&read)return service.getOrder(actor,match[1]);
 match=p.match(/^\/orders\/([^/]+)\/reconcile$/);if(match&&req.method==='POST'){const b=await readJson(req,res);if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).length)throw new ApiError(400,'INVALID_REQUEST','Empty object required.');return service.reconcile(actor,match[1]);}
 match=p.match(/^\/seller-orders\/([^/]+)$/);if(match&&read)return service.sellerOrder(actor,match[1]);
 throw new ApiError(404,'NOT_FOUND','Commerce route unavailable.');
}
