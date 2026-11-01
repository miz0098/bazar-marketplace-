/** F26 staff projections are available only in explicitly isolated test composition. */
export const staffCapabilities = [
  'support.read','support.reply','support.assign','support.note',
  'moderation.read','moderation.review','moderation.question','moderation.answer','moderation.assign',
  'dispatch.read','dispatch.note',
] as const;
export type StaffCapability=(typeof staffCapabilities)[number];
export type StaffCaseKind='support'|'review'|'question'|'answer'|'dispatch';
export type StaffQueueKind='support'|'moderation'|'dispatch';
export type StaffGrant={capability:StaffCapability;scope:'global'|'resource';resourceId?:string};
export type StaffSession={mode:'integration-test';actorId:string;capabilities:StaffGrant[];liveProviders:false;customerDirectory:false};
export type StaffQueueItem={id:string;kind:StaffCaseKind;title:string;status:string;createdAt:string;assignmentVersion:number};
export type StaffQueue={mode:'integration-test';resource:'queue';kind:StaffQueueKind;items:StaffQueueItem[];limit:number;hasMore:boolean};
export type StaffMessage={id:string;sequence:number;author:'buyer'|'staff';body:string;createdAt:string};
export type StaffAuditItem={id:string;action:string;reasonCode:string;actorLabel:string;createdAt:string};
export type StaffNote={id:string;body:string;createdAt:string;authorLabel:string};
export type StaffCaseView=
 |{mode:'integration-test';resource:'case';kind:'support';id:string;title:string;status:'open'|'waiting'|'closed';category:'delivery'|'payment'|'other';createdAt:string;orderId:string|null;requestId:string|null;messages:StaffMessage[];notes:StaffNote[];audit:StaffAuditItem[];version:number}
 |{mode:'integration-test';resource:'case';kind:'review';id:string;status:'pending'|'published'|'rejected'|'hidden';productTitle:string;offerId:string;sellerId:string;rating:number;body:string;version:number;createdAt:string;audit:StaffAuditItem[]}
 |{mode:'integration-test';resource:'case';kind:'question'|'answer';id:string;status:'pending'|'published'|'rejected'|'hidden';answerStatus:'pending'|'published'|'rejected'|'hidden';productTitle:string;offerId:string;sellerId:string;body:string;answer:string|null;version:number;createdAt:string;audit:StaffAuditItem[]}
 |{mode:'integration-test';resource:'case';kind:'dispatch';id:string;status:'open'|'system-cancelled';sellerOrderStatus:string;sellerName:string;orderNumber:string;responseDueAt:string;respondedAt:string|null;ticketId:string;createdAt:string;notes:StaffNote[];audit:StaffAuditItem[]};
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const str=(v:unknown,max=2000)=>typeof v==='string'&&v.length<=max;
const states=['pending','published','rejected','hidden'];
const date=(v:unknown):v is string=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v));
const list=(v:unknown,check:(r:Record<string,unknown>)=>boolean)=>Array.isArray(v)&&v.length<=100&&v.every(x=>object(x)&&check(x));
const auditItem=(x:Record<string,unknown>)=>id(x.id)&&str(x.action,80)&&str(x.reasonCode,80)&&str(x.actorLabel,100)&&date(x.createdAt);
const noteItem=(x:Record<string,unknown>)=>id(x.id)&&str(x.body)&&str(x.authorLabel,100)&&date(x.createdAt);
export function isStaffSession(v:unknown):v is StaffSession{return object(v)&&v.mode==='integration-test'&&id(v.actorId)&&Array.isArray(v.capabilities)&&v.liveProviders===false&&v.customerDirectory===false&&v.capabilities.length<=staffCapabilities.length*20&&v.capabilities.every(g=>object(g)&&staffCapabilities.includes(g.capability as StaffCapability)&&(g.scope==='global'&&g.resourceId===undefined||g.scope==='resource'&&id(g.resourceId)));}
export function isStaffQueue(v:unknown):v is StaffQueue{return object(v)&&v.mode==='integration-test'&&v.resource==='queue'&&['support','moderation','dispatch'].includes(String(v.kind))&&Number.isSafeInteger(v.limit)&&(v.limit as number)>=1&&(v.limit as number)<=100&&typeof v.hasMore==='boolean'&&list(v.items,i=>id(i.id)&&['support','review','question','answer','dispatch'].includes(String(i.kind))&&str(i.title,300)&&str(i.status,60)&&date(i.createdAt)&&Number.isSafeInteger(i.assignmentVersion));}
export function isStaffCase(v:unknown):v is StaffCaseView{
 if(!object(v)||v.mode!=='integration-test'||v.resource!=='case'||!id(v.id)||!date(v.createdAt)||!list(v.audit,auditItem))return false;
 if(v.kind==='support')return str(v.title,120)&&['open','waiting','closed'].includes(String(v.status))&&['delivery','payment','other'].includes(String(v.category))&&(v.orderId===null||id(v.orderId))&&(v.requestId===null||id(v.requestId))&&Number.isSafeInteger(v.version)&&list(v.messages,m=>id(m.id)&&Number.isSafeInteger(m.sequence)&&['buyer','staff'].includes(String(m.author))&&str(m.body)&&date(m.createdAt))&&list(v.notes,noteItem);
 if(v.kind==='review')return states.includes(String(v.status))&&str(v.productTitle,300)&&id(v.offerId)&&id(v.sellerId)&&Number.isSafeInteger(v.rating)&&(v.rating as number)>=1&&(v.rating as number)<=5&&str(v.body)&&Number.isSafeInteger(v.version);
 if(v.kind==='question'||v.kind==='answer')return states.includes(String(v.status))&&states.includes(String(v.answerStatus))&&str(v.productTitle,300)&&id(v.offerId)&&id(v.sellerId)&&str(v.body)&& (v.answer===null||str(v.answer))&&Number.isSafeInteger(v.version);
 if(v.kind==='dispatch')return ['open','system-cancelled'].includes(String(v.status))&&str(v.sellerOrderStatus,40)&&str(v.sellerName,200)&&str(v.orderNumber,100)&&date(v.responseDueAt)&&(v.respondedAt===null||date(v.respondedAt))&&id(v.ticketId)&&list(v.notes,noteItem);
 return false;
}
