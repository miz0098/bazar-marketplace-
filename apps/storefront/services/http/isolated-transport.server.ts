import 'server-only';
import {request} from 'node:https';
import {Readable} from 'node:stream';
/** Public catalog reads over the private TLS gateway; no browser cookies or proxy identity are forwarded. */
export function isolatedCatalogTransport(baseUrl:string,publicOrigin:string):typeof fetch{
 const base=new URL(baseUrl),publicUrl=new URL(publicOrigin);
 if(base.protocol!=='https:'||base.hostname!=='127.0.0.1'||publicUrl.protocol!=='https:'||publicUrl.origin!==publicOrigin)throw new Error('Invalid isolated catalog transport');
 return async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(url.origin!==base.origin||!(/^\/api\/v1\/catalog\/(offers|products)(\/|$)/.test(url.pathname)||url.pathname==='/api/v1/catalog/categories')||!['GET','HEAD'].includes(init?.method??'GET'))throw new Error('Public catalog reads only');
  return new Promise<Response>((resolve,reject)=>{
   const req=request(url,{method:init?.method??'GET',signal:init?.signal??undefined,headers:{accept:'application/json',host:publicUrl.host,origin:publicOrigin,'sec-fetch-site':'same-origin'}},res=>{
    const status=res.statusCode??502;
    if(status>=300&&status<400){res.resume();reject(new Error('Unexpected catalog redirect'));return;}
    const headers=new Headers();for(const key of ['content-type','content-length','cache-control','x-request-id']){const value=res.headers[key];if(typeof value==='string')headers.set(key,value);}
    res.on('error',reject);
    resolve(new Response([204,205,304].includes(status)||init?.method==='HEAD'?null:Readable.toWeb(res) as ReadableStream<Uint8Array>,{status,headers}));
   });
   req.on('error',reject);req.end();
  });
 };
}
