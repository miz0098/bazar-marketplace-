import type {OrderStatus} from '../commerce/order-status.js';
export const sellerCapabilities=['catalog.read','catalog.write','orders.read','orders.process','promotions.draft','finance.read','settings.write','bank.write','communications.write','documents.read','notifications.read'] as const;
export type SellerStore={id:string;name:string;role:'owner';capabilities:readonly (typeof sellerCapabilities)[number][]};
export type SellerSession={mode:'integration-test';actorId:string;stores:SellerStore[];staffPrivileges:false};
export type SellerOrder={id:string;parentId:string;number:string;status:OrderStatus;version:number;paymentState:string;createdAt:string;netMinor:number;commissionMinor:number;trackingRef:string|null;dispatchDueAt:string|null};
export type SellerProduct={id:string;title:string;description:string;categoryId:string;status:'draft'|'published'|'archived';version:number;attributes:Record<string,string>;offers:{id:string;sku:string;title:string;priceMinor:number;available:boolean;purchasable:boolean}[];media:{path:string;alt:string;position:number;variantId:string|null}[]};
export type SellerView={mode:'integration-test';sellerId:string;resource:string;data:Record<string,unknown>};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
export function isSellerSession(v:unknown):v is SellerSession{return obj(v)&&v.mode==='integration-test'&&id(v.actorId)&&v.staffPrivileges===false&&Array.isArray(v.stores)&&v.stores.length<=100&&v.stores.every(s=>obj(s)&&id(s.id)&&typeof s.name==='string'&&s.role==='owner'&&Array.isArray(s.capabilities)&&s.capabilities.length===sellerCapabilities.length&&s.capabilities.every((c,i)=>c===sellerCapabilities[i]));}
export function isSellerView(v:unknown):v is SellerView{return obj(v)&&Object.keys(v).sort().join(',')==='data,mode,resource,sellerId'&&v.mode==='integration-test'&&id(v.sellerId)&&typeof v.resource==='string'&&['dashboard','orders','order','products','product','promotions','finance','settings','communications','conversation','notifications','documents','export','command'].includes(v.resource)&&obj(v.data);}
/** Capability contracts are owner-only; employees/staff grants need separately approved scope. */
export type FutureStaffSellerCapability={actorId:string;assignmentId:string;permission:string;sellerId:string;expiresAt:string};
