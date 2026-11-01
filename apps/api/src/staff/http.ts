import type {IncomingMessage,ServerResponse} from 'node:http';
import {authorize,readJson} from '../auth/http.js';
import type {AuthService} from '../auth/service.js';
import {ApiError} from '../contracts/foundation.js';
import {fields} from '../checkout/input.js';
import {integer,uuid,invalid} from '../business/validation.js';
import type {StaffService} from './service.js';
const root='/api/v1/staff';
export const isStaffPath=(path:string)=>path===root||path.startsWith(root+'/');
export async function handleStaff(req:IncomingMessage,res:ServerResponse,url:URL,auth?:AuthService,staff?:StaffService){
 if(!auth||!staff)throw new ApiError(503,'SERVICE_UNAVAILABLE','Staff operations are not configured.');
 const read=req.method==='GET'||req.method==='HEAD',actor=(await authorize(req,auth,!read)).userId;
 if(read&&(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)!==0))invalid();
 if(url.pathname===root+'/session'&&read&&!url.search)return staff.session(actor);
 if(url.pathname===root+'/queue'&&read){for(const key of url.searchParams.keys())if(!['kind','limit'].includes(key)||url.searchParams.getAll(key).length!==1)invalid();const kind=url.searchParams.get('kind'),limit=url.searchParams.get('limit')??'50';if(!['support','moderation','dispatch'].includes(String(kind))||!/^[1-9]\d{0,2}$/.test(limit))invalid();return staff.queue(actor,kind as 'support'|'moderation'|'dispatch',integer(Number(limit),1,100));}
 const assignable=url.pathname.match(/^\/api\/v1\/staff\/assignable\/(support|review|question|answer)\/([^/]+)$/);if(assignable&&read&&!url.search)return staff.assignable(actor,assignable[1] as 'support'|'review'|'question'|'answer',uuid(assignable[2]));
 const match=url.pathname.match(/^\/api\/v1\/staff\/cases\/(support|review|question|answer|dispatch)\/([^/]+)(?:\/(commands))?$/);
 if(!match)throw new ApiError(404,'NOT_FOUND','Staff route not found.');
 const kind=match[1] as 'support'|'review'|'question'|'answer'|'dispatch',id=uuid(match[2]);
 if(!match[3]&&read&&!url.search)return staff.caseView(actor,kind,id);
 if(match[3]&&req.method==='POST'&&!url.search){const body=fields(await readJson(req,res),['action','input']);if(typeof body.action!=='string')invalid();return staff.command(actor,kind,id,body.action,body.input);}
 throw new ApiError(405,'METHOD_NOT_ALLOWED','Method not allowed.');
}
