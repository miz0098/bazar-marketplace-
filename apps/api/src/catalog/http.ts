import type {IncomingMessage,ServerResponse} from 'node:http';
import type {AuthService} from '../auth/service.js';
import {authorize,readJson} from '../auth/http.js';
import {ApiError} from '../contracts/foundation.js';
import {parseQuery,type CatalogV2} from './service.js';
export async function handleCatalogV2(req:IncomingMessage,res:ServerResponse,url:URL,service:CatalogV2|undefined,origins:readonly string[],auth?:AuthService){
 if(!service)throw new ApiError(503,'SERVICE_UNAVAILABLE','Catalog v2 is unavailable.');
 const saved=url.pathname==='/api/v1/catalog/saved',wish=url.pathname.match(/^\/api\/v1\/catalog\/wishlist\/([0-9a-f-]+)$/);
 if(saved||wish){
  if(!auth)throw new ApiError(503,'SERVICE_UNAVAILABLE','Customer authentication is unavailable.');
  if(url.search)throw new ApiError(400,'INVALID_REQUEST','Query not accepted.');
  const allowed=saved?['GET','HEAD']:['PUT','DELETE'];if(!allowed.includes(req.method??'')){res.setHeader('allow',allowed.join(', '));throw new ApiError(405,'METHOD_NOT_ALLOWED','Method not allowed.');}
  const actor=await authorize(req,auth,!saved);
  if(saved){if(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)!==0)throw new ApiError(400,'INVALID_REQUEST','Read body not accepted.');return service.saved(actor.userId);}
  const body=await readJson(req,res);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length)throw new ApiError(400,'INVALID_REQUEST','Empty object required.');return service.wishlist(actor.userId,wish![1],req.method==='PUT');
 }
 const mutation=url.pathname.match(/^\/api\/v1\/catalog\/seller\/products\/([0-9a-f-]+)$/);
 if(mutation){
  if(!auth)throw new ApiError(503,'SERVICE_UNAVAILABLE','Seller authentication is unavailable.');
  if(req.method!=='PATCH'){res.setHeader('allow','PATCH');throw new ApiError(405,'METHOD_NOT_ALLOWED','Method not allowed.');}
  if(url.search)throw new ApiError(400,'INVALID_REQUEST','Query not accepted.');
  const actor=await authorize(req,auth,true);return service.update(actor.userId,mutation[1],await readJson(req,res));
 }
 const origin=req.headers.origin;if(origin!==undefined){if(!origins.includes(origin))throw new ApiError(403,'CORS_DENIED','Origin is not permitted.');res.setHeader('access-control-allow-origin',origin);}
 if(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)!==0)throw new ApiError(400,'INVALID_REQUEST','Read body not accepted.');
 if(!['GET','HEAD'].includes(req.method??'')){res.setHeader('allow','GET, HEAD');throw new ApiError(405,'METHOD_NOT_ALLOWED','Method not allowed.');}
 if(url.pathname==='/api/v1/catalog/products')return service.list(parseQuery(url.searchParams));
 if(url.pathname==='/api/v1/catalog/categories'&&!url.search)return service.categories();
 const detail=url.pathname.match(/^\/api\/v1\/catalog\/products\/([^/]+)$/);
 if(detail&&!url.search)return service.get(decodeURIComponent(detail[1]));
 throw new ApiError(404,'NOT_FOUND','Catalog route not found.');
}
