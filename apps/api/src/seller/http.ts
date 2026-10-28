import type {IncomingMessage,ServerResponse} from 'node:http';
import {authorize,readJson} from '../auth/http.js';
import type {AuthService} from '../auth/service.js';
import {ApiError} from '../contracts/foundation.js';
import {fields} from '../checkout/input.js';
import {uuid} from '../business/validation.js';
import type {SellerService} from './service.js';
export async function handleSeller(req:IncomingMessage,res:ServerResponse,url:URL,auth?:AuthService,seller?:SellerService){
 if(!auth||!seller)throw new ApiError(503,'SERVICE_UNAVAILABLE','Seller integration is not configured.');
 const read=req.method==='GET'||req.method==='HEAD';
 const actor=(await authorize(req,auth,!read)).userId;
 if(read&&(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)!==0))throw new ApiError(400,'INVALID_REQUEST','Unexpected body.');
 if(url.pathname==='/api/v1/seller/session'&&read&&!url.search)return seller.session(actor);
 const match=url.pathname.match(/^\/api\/v1\/seller\/stores\/([^/]+)\/([^/]+)$/);
 if(!match)throw new ApiError(404,'NOT_FOUND','Seller route not found.');
 const id=uuid(match[1]),resource=match[2];
 if(read){for(const key of url.searchParams.keys())if(!['id','section','limit','query','categoryId','available','before','from','to','format'].includes(key)||url.searchParams.getAll(key).length!==1)throw new ApiError(400,'INVALID_REQUEST','Invalid seller query.');return seller.view(actor,id,resource,url.searchParams);}
 if(req.method!=='POST'||resource!=='commands'||url.search)throw new ApiError(405,'METHOD_NOT_ALLOWED','Method not allowed.');
 const b=fields(await readJson(req,res),['action','input']);if(typeof b.action!=='string')throw new ApiError(400,'INVALID_REQUEST','Action required.');return seller.command(actor,id,b.action,b.input);
}
