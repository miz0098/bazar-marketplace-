import type {IncomingMessage,ServerResponse} from 'node:http';
import type {AuthService} from '../auth/service.js';
import {authorize,readJson} from '../auth/http.js';
import {ApiError} from '../contracts/foundation.js';
import {parseQuery} from './service.js';
import type {OfferService} from './offers.js';
export const isOfferPath=(p:string)=>p==='/api/v1/catalog/offers'||p.startsWith('/api/v1/catalog/offers/')||p==='/api/v1/catalog/customer-state'||p.startsWith('/api/v1/catalog/wishlist/offers/');
export async function handleOffers(req:IncomingMessage,res:ServerResponse,url:URL,service?:OfferService,auth?:AuthService,origins:readonly string[]=[]){
 if(!service)throw new ApiError(503,'SERVICE_UNAVAILABLE','Offers are unavailable.');
 const state=url.pathname==='/api/v1/catalog/customer-state',wish=url.pathname.match(/^\/api\/v1\/catalog\/wishlist\/offers\/([^/]+)$/);
 if(state||wish){if(!auth)throw new ApiError(503,'SERVICE_UNAVAILABLE','Server sessions are unavailable.');if(url.search)throw new ApiError(400,'INVALID_REQUEST','No owner/query accepted.');
 const methods=state?['GET','HEAD']:['PUT','DELETE'];if(!methods.includes(req.method??'')){res.setHeader('allow',methods.join(', '));throw new ApiError(405,'METHOD_NOT_ALLOWED','Method denied.');}
 const actor=await authorize(req,auth,!state);
 if(state){if(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)!==0)throw new ApiError(400,'INVALID_REQUEST','Read body denied.');return service.state(actor.userId);}
 const body=await readJson(req,res);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length)throw new ApiError(400,'INVALID_REQUEST','Empty object required.');return service.wishlist(actor.userId,wish![1],req.method==='PUT');}
 if(req.headers.origin!==undefined){if(!origins.includes(req.headers.origin))throw new ApiError(403,'CORS_DENIED','Origin denied.');res.setHeader('access-control-allow-origin',req.headers.origin);}
 if(!['GET','HEAD'].includes(req.method??''))throw new ApiError(405,'METHOD_NOT_ALLOWED','Read only.');
 if(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)!==0)throw new ApiError(400,'INVALID_REQUEST','Read body denied.');
 if(url.pathname==='/api/v1/catalog/offers')return service.list(parseQuery(url.searchParams));
 const detail=url.pathname.match(/^\/api\/v1\/catalog\/offers\/([^/]+)$/);if(detail&&!url.search)return service.get(detail[1]);throw new ApiError(404,'NOT_FOUND','Offer route not found.');
}
