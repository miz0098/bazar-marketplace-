import {createServerAuthClient,ServerAuthClientError,type ServerAuthSession} from '../../lib/server-auth-client';
import {createServerCartClient} from '../../lib/server-cart-client';
import {createCustomerOffersClient} from '../../lib/offers-client';
import {mapSellerOffer} from '../../domain/catalog/offers';
import {createCart} from '../../domain/cart/cart';
import type {Cart} from '../contracts/cart';
import type {ProductSummary} from '../contracts/catalog';
import type {AccountWishlistItem} from '../../domain/account/account';
import {IdentityServiceError,type IdentityService,type IdentityIntent} from '../contracts/identity';
const empty=createCart([]);
export interface CustomerSnapshot {status:'loading'|'anonymous'|'authenticated'|'error';session:ServerAuthSession|null;cart:Cart;wishlist:readonly AccountWishlistItem[];legacyWishlist:readonly {productId:string}[];error:string;busy:boolean}
/** One memory-only actor-bound store. Server data never enters guest storage. */
export function createServerCustomerStore(transport:typeof fetch=fetch){
 let snapshot:CustomerSnapshot={status:'loading',session:null,cart:empty,wishlist:[],legacyWishlist:[],error:'',busy:false};const initial=snapshot;
 const listeners=new Set<()=>void>();let readRevision=0,epoch=0,version=0,phone='',intent:IdentityIntent='login',registrationCode='';
 let connection:Promise<void>|undefined;
 let pending:{id:string;kind:string;quantity:number;key:string;version:number;actor:string}|null=null;
 const auth=createServerAuthClient(transport),cart=createServerCartClient(()=>snapshot.session?.csrfToken??'',transport),customer=createCustomerOffersClient(()=>snapshot.session?.csrfToken??'',transport);
 const set=(patch:Partial<CustomerSnapshot>)=>{snapshot={...snapshot,...patch};for(const l of listeners)l();};
 const status=(e:unknown)=>e&&typeof e==='object'&&'status'in e?e.status:undefined;
 async function load(t:number){const read=++readRevision;const data=await customer.get();if(t!==epoch||read!==readRevision||!snapshot.session)return;version=data.cartVersion??0;const lines=data.lines.map(l=>({product:mapSellerOffer(l.offer),quantity:l.quantity}));let total=0n;for(const l of data.lines)total+=BigInt(l.offer.price.amountMinor)*BigInt(l.quantity);if(total>BigInt(Number.MAX_SAFE_INTEGER)||total!==BigInt(data.subtotal.amountMinor))throw new Error('Unsupported cart total');set({status:'authenticated',cart:{lines,itemCount:lines.reduce((n,l)=>n+l.quantity,0),subtotal:data.subtotal},wishlist:data.wishlist.map(w=>({id:w.offer.id,product:mapSellerOffer(w.offer),addedAt:w.savedAt})),legacyWishlist:data.legacyWishlist,error:''});}
 async function refresh(){const t=++epoch;set({status:'loading',cart:empty,wishlist:[],legacyWishlist:[],error:'',busy:false});try{await auth.bootstrap();const session=await auth.getSession();if(t!==epoch)return;set({session});await cart.ensureCurrent();await load(t);}catch(e){if(t!==epoch)return;if(status(e)===401){pending=null;set({status:'anonymous',session:null,cart:empty,wishlist:[],legacyWishlist:[],error:''});}else set({status:'error',session:null,cart:empty,wishlist:[],legacyWishlist:[],error:'Серверні дані недоступні. Повторіть запит.'});}}

 async function mutate(kind:'add'|'set'|'remove',p:ProductSummary|string,quantity=1):Promise<string>{
  if(snapshot.busy||snapshot.status==='loading'||snapshot.status==='error')return 'Дані ще не готові. Оновіть стан.';
  const id=typeof p==='string'?p:p.variantId??p.offerId;
  if(!id)return 'Оберіть конкретну пропозицію.';
  if(snapshot.status==='anonymous')return 'Увійдіть, щоб зберегти кошик у вашому акаунті.';
  const actor=snapshot.session!.user.id,t=epoch;
  if(pending&&(pending.actor!==actor||pending.id!==id||pending.kind!==kind||pending.quantity!==quantity))return 'Попередній запит потребує перевірки. Повторіть його або оновіть сторінку.';
  pending??={actor,id,kind,quantity,key:crypto.randomUUID(),version};const command=pending;let accepted=false;set({busy:true,error:''});
  try{const input={expectedVersion:command.version,idempotencyKey:command.key};if(kind==='add')await cart.add({...input,variantId:id,quantity});else if(kind==='set')await cart.set(id,{...input,quantity});else await cart.remove(id,input);accepted=true;if(t!==epoch||snapshot.session?.user.id!==actor)return 'Сесію змінено.';await load(t);pending=null;return '';}catch(e){if(t===epoch){if(!accepted&&[400,401,403,404,405,409,422,429].includes(Number(status(e))))pending=null;if(status(e)===401){await refresh();return 'Сесія завершилася. Увійдіть знову.';}try{await load(t);}catch{set({cart:empty,wishlist:[]});}set({error:'Сервер не підтвердив зміну. Перевірте актуальний стан і повторіть запит.'});}return 'Не вдалося змінити серверний кошик.';}finally{if(t===epoch)set({busy:false});}
 }
 async function wishlist(p:ProductSummary|string,add:boolean){if(snapshot.status!=='authenticated'||!snapshot.session)throw new Error('Увійдіть для серверного обраного.');const id=typeof p==='string'?p:p.offerId??p.variantId;if(!id)throw new Error('Оберіть пропозицію.');const t=epoch,actor=snapshot.session.user.id;try{await customer.save(id,add);if(t!==epoch||snapshot.session?.user.id!==actor)throw new Error('Сесію змінено.');await load(t);return {status:'saved' as const,persisted:true as const,value:snapshot.wishlist};}catch(e){if(status(e)===401)await refresh();if(t===epoch)set({error:'Не вдалося змінити обране на сервері.'});throw e;}}
 async function verified(input:Parameters<typeof auth.verify>[0]){const t=++epoch;set({status:'loading',session:null,cart:empty,wishlist:[],error:'',busy:false});const session=await auth.verify(input);if(t!==epoch)throw new Error('Сесію змінено.');pending=null;set({session});await cart.ensureCurrent();await load(t);}
 const identity:IdentityService={mode:"server-test",
  async startChallenge(input){await auth.bootstrap();phone=input.phone;intent=input.intent;registrationCode='';let c;try{c=await auth.start(input);}catch(e){throw new IdentityServiceError(e instanceof ServerAuthClientError&&e.status===429?'rate-limited':'unavailable','Сервер не підтвердив запит коду.',e instanceof ServerAuthClientError?e.retryAfterSeconds:undefined);}return {id:c.challengeId,intent,maskedPhone:'+380 •• ••• •• ••',expiresInSeconds:Math.max(1,Math.floor((Date.parse(c.expiresAt)-Date.now())/1000)),resendAfterSeconds:c.resendAfterSeconds,delivery:'test-only'};},
  async verifyChallenge(input){try{if(intent==='register'){registrationCode=input.code;return {status:'profile-required',next:'profile'};}await verified(input);return {status:'authenticated',next:'complete'};}catch(e){await refresh();throw new IdentityServiceError(e instanceof ServerAuthClientError&&e.status===429?'rate-limited':e instanceof ServerAuthClientError&&(e.status===400||e.status===401)?'invalid-code':'unavailable','Сервер не підтвердив код.',e instanceof ServerAuthClientError?e.retryAfterSeconds:undefined);}},
  async resendChallenge(){return identity.startChallenge({phone,intent});},
  async register(input){if(!registrationCode)throw new IdentityServiceError('invalid-code','Потрібен код.');try{await verified({challengeId:input.challengeId,code:registrationCode,profile:{firstName:input.profile.firstName,lastName:input.profile.lastName,consent:true}});registrationCode='';phone='';return {status:'authenticated'};}catch(e){await refresh();throw new IdentityServiceError(e instanceof ServerAuthClientError&&e.status===429?'rate-limited':e instanceof ServerAuthClientError&&(e.status===400||e.status===401)?'invalid-code':'unavailable','Сервер не підтвердив реєстрацію.',e instanceof ServerAuthClientError?e.retryAfterSeconds:undefined);}},
  async getSession(){try{await auth.getSession();return {status:'authenticated'};}catch(e){if(status(e)===401)return {status:'anonymous'};throw e;}}
 };
 return {auth,identity,getSnapshot:()=>snapshot,getServerSnapshot:()=>initial,subscribe:(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l);};},refresh,mutate,wishlist,
  async logout(){++epoch;registrationCode='';phone='';set({status:'loading',cart:empty,wishlist:[],legacyWishlist:[],busy:false,error:''});try{await auth.logout();pending=null;set({session:null,status:'anonymous',cart:empty,wishlist:[],legacyWishlist:[],error:''});await auth.bootstrap();}catch(e){set({session:null,status:'error',error:'Вихід не підтверджено сервером. Повторіть перевірку.'});throw e;}},
  connect(){return connection??=refresh();},
  disconnect(){connection=undefined;},
 };
}
export type ServerCustomerStore=ReturnType<typeof createServerCustomerStore>;
