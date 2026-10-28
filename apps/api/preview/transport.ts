import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import type {IncomingMessage} from 'node:http';
import {ApiError} from '../src/contracts/foundation.js';
import {expectPreviewBody} from '../src/auth/preview-context.js';
export function previewOrigin(value:string){const u=new URL(value);if(u.origin!==value||u.protocol!=='https:'||!(u.hostname==='localhost'||u.hostname==='127.0.0.1'||/^[a-z0-9-]+-(3000|3001)\.app\.github\.dev$/.test(u.hostname)))throw new Error('Exact isolated HTTPS origin required');return u;}
const deny=()=>new ApiError(403,'CSRF_DENIED','Preview transport denied.');
function material(origin:string,method:string,path:string,cookie:string,csrf:string,body:string,time:string,nonce:string){return JSON.stringify([origin,method,path,cookie,csrf,body,time,nonce]);}
export function signTransport(key:Buffer,origin:string,method:string,path:string,cookie:string,csrf:string,bytes:Buffer){const body=createHash('sha256').update(bytes).digest('hex'),time=String(Date.now()),nonce=randomUUID(),mac=createHmac('sha256',key).update(material(origin,method,path,cookie,csrf,body,time,nonce)).digest('hex');return {'x-bazar-preview-origin':origin,'x-bazar-preview-body':body,'x-bazar-preview-time':time,'x-bazar-preview-nonce':nonce,'x-bazar-preview-mac':mac};}
/** Explicit test-only capability transport, not CORS relaxation or production impersonation. */
export function transportResolver<T>(key:Buffer,realms:ReadonlyMap<string,T>){if(process.env.NODE_ENV!=='test'||key.length!==32||realms.size!==2)throw new Error('Isolated preview only');for(const origin of realms.keys())previewOrigin(origin);const used=new Map<string,number>();return (req:IncomingMessage):T|undefined=>{
 const origin=req.headers['x-bazar-preview-origin'];
 if(!origin){if(req.url?.startsWith('/api/v1/offers')||req.url?.startsWith('/api/v1/catalog/')||req.url==='/health'||req.url==='/ready')return;throw deny();}
 if(typeof origin!=='string'||!realms.has(origin))throw deny();const read=(k:string)=>{const v=req.headers[k];if(typeof v!=='string')throw deny();return v;},time=read('x-bazar-preview-time'),nonce=read('x-bazar-preview-nonce'),body=read('x-bazar-preview-body'),mac=read('x-bazar-preview-mac');
 if(!/^\d{13}$/.test(time)||Math.abs(Date.now()-Number(time))>30000||!/^[a-f0-9-]{36}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(body)||!/^[a-f0-9]{64}$/.test(mac)||req.headers.host!==new URL(origin).host)throw deny();
 const actual=createHmac('sha256',key).update(material(origin,req.method??'',req.url??'',String(req.headers.cookie??''),String(req.headers['x-csrf-token']??''),body,time,nonce)).digest();if(!timingSafeEqual(actual,Buffer.from(mac,'hex')))throw deny();for(const [n,expires] of used)if(expires<Date.now())used.delete(n);if(used.has(nonce)||used.size>=10000)throw deny();used.set(nonce,Date.now()+30000);if(req.method!=='GET'&&req.method!=='HEAD')expectPreviewBody(req,body);return realms.get(origin);
 };}
