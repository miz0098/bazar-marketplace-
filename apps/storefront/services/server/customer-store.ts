import {createServerAuthClient,ServerAuthClientError,type ServerAuthSession} from '../../lib/server-auth-client';
import {createServerCartClient} from '../../lib/server-cart-client';
import {createCustomerOffersClient,createOffersClient,type SellerOffer} from '../../lib/offers-client';
import {mapSellerOffer} from '../../domain/catalog/offers';
import {createCart,cartReducer,cartError} from '../../domain/cart/cart';
import type {Cart} from '../contracts/cart';
import type {ProductSummary} from '../contracts/catalog';
import type {AccountWishlistItem} from '../../domain/account/account';
import {IdentityServiceError,type IdentityService,type IdentityIntent} from '../contracts/identity';
const empty=createCart([]);
export interface CustomerSnapshot {status:'loading'|'anonymous'|'authenticated'|'error';session:ServerAuthSession|null;cart:Cart;wishlist:readonly AccountWishlistItem[];legacyWishlist:readonly {productId:string}[];error:string;busy:boolean}
/** One memory-only actor-bound store. Server data never enters guest storage. */
export function createServerCustomerStore(transport:typeof fetch=fetch){
 let snapshot:CustomerSnapshot={status:'loading',session:null,cart:empty,wishlist:[],legacyWishlist:[],error:'',busy:false};const initial=snapshot;
 const listeners=new Set<()=>void>();let readRevision=0,epoch=0,version=0,guest:Cart=empty,phone='',intent:IdentityIntent='login',registrationCode='',writer:((v:string)=>void)|undefined;
 let connection:Promise<void>|undefined;
 let pending:{id:string;kind:string;quantity:number;key:string;version:number;actor:string}|null=null;
 const auth=createServerAuthClient(transport),cart=createServerCartClient(()=>snapshot.session?.csrfToken??'',transport),customer=createCustomerOffersClient(()=>snapshot.session?.csrfToken??'',transport);
 const publicOffers=createOffersClient({baseUrl:'',timeoutMs:5000},transport);
 const set=(patch:Partial<CustomerSnapshot>)=>{snapshot={...snapshot,...patch};for(const l of listeners)l();};
 const status=(e:unknown)=>e&&typeof e==='object'&&'status'in e?e.status:undefined;
 async function load(t:number){const read=++readRevision;const data=await customer.get();if(t!==epoch||read!==readRevision||!snapshot.session)return;version=data.cartVersion??0;const lines=data.lines.map(l=>({product:mapSellerOffer(l.offer),quantity:l.quantity}));let total=0n;for(const l of data.lines)total+=BigInt(l.offer.price.amountMinor)*BigInt(l.quantity);if(total>BigInt(Number.MAX_SAFE_INTEGER)||total!==BigInt(data.subtotal.amountMinor))throw new Error('Unsupported cart total');set({status:'authenticated',cart:{lines,itemCount:lines.reduce((n,l)=>n+l.quantity,0),subtotal:data.subtotal},wishlist:data.wishlist.map(w=>({id:w.offer.id,product:mapSellerOffer(w.offer),addedAt:w.savedAt})),legacyWishlist:data.legacyWishlist,error:''});}
 async function refresh(){const t=++epoch;set({status:'loading',cart:empty,wishlist:[],legacyWishlist:[],error:'',busy:false});try{await auth.bootstrap();const session=await auth.getSession();if(t!==epoch)return;set({session});await cart.ensureCurrent();await load(t);}catch(e){if(t!==epoch)return;if(status(e)===401){pending=null;set({status:'anonymous',session:null,cart:guest,wishlist:[],legacyWishlist:[],error:''});}else set({status:'error',session:null,cart:empty,wishlist:[],legacyWishlist:[],error:'Серверні дані недоступні. Повторіть запит.'});}}
 const saveGuest=(next:Cart)=>{guest=next;set({cart:next,error:''});try{writer?.(JSON.stringify(next.lines.map(l=>({variantId:l.product.variantId,quantity:l.quantity}))));}catch{set({error:'Не вдалося зберегти гостьовий кошик.'});}};
 async function mutate(kind:'add'|'set'|'remove',p:ProductSummary|string,quantity=1):Promise<string>{
  if(snapshot.busy||snapshot.status==='loading'||snapshot.status==='error')return 'Дані ще не готові. Оновіть стан.';
  const id=typeof p==='string'?p:p.variantId??p.offerId;
  if(!id)return 'Оберіть конкретну пропозицію.';
  if(snapshot.status==='anonymous'){
   if(kind==='remove'){saveGuest(cartReducer(guest,{type:'remove',productId:id}));return '';}
   const product=typeof p==='string'?guest.lines.find(l=>l.product.variantId===id)?.product:p;if(!product)return 'Пропозицію не знайдено.';
   const error=cartError(guest,product,quantity,kind==='add');if(error)return error;saveGuest(cartReducer(guest,kind==='add'?{type:'add',product,quantity}:{type:'update',productId:id,quantity}));return '';
  }
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
  async previewRegistration(input){if(!registrationCode)throw new IdentityServiceError('invalid-code','Потрібен код.');try{await verified({challengeId:input.challengeId,code:registrationCode,profile:{firstName:input.profile.firstName,lastName:input.profile.lastName,consent:true}});registrationCode='';phone='';return {status:'authenticated'};}catch(e){await refresh();throw new IdentityServiceError(e instanceof ServerAuthClientError&&e.status===429?'rate-limited':e instanceof ServerAuthClientError&&(e.status===400||e.status===401)?'invalid-code':'unavailable','Сервер не підтвердив реєстрацію.',e instanceof ServerAuthClientError?e.retryAfterSeconds:undefined);}},
  async getSession(){try{await auth.getSession();return {status:'authenticated'};}catch(e){if(status(e)===401)return {status:'anonymous'};throw e;}}
 };
 return {auth,identity,getSnapshot:()=>snapshot,getServerSnapshot:()=>initial,subscribe:(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l);};},refresh,mutate,wishlist,
  async logout(){++epoch;registrationCode='';phone='';set({status:'loading',cart:empty,wishlist:[],legacyWishlist:[],busy:false,error:''});try{await auth.logout();pending=null;set({session:null,status:'anonymous',cart:guest,wishlist:[],legacyWishlist:[],error:''});await auth.bootstrap();}catch(e){set({session:null,status:'error',error:'Вихід не підтверджено сервером. Повторіть перевірку.'});throw e;}},
  connect(readGuest:()=>string|null,writeGuest:(s:string)=>void){writer=writeGuest;return connection??=(async()=>{try{const saved:unknown=JSON.parse(readGuest()??'[]');if(Array.isArray(saved)&&saved.length<=100){const restored=[];for(const x of saved){if(x&&typeof x==='object'&&'variantId'in x&&typeof x.variantId==='string'&&'quantity'in x&&typeof x.quantity==='number'&&Number.isInteger(x.quantity)&&x.quantity>0){const o:SellerOffer=await publicOffers.get(x.variantId);restored.push({product:mapSellerOffer(o),quantity:x.quantity});}}guest=createCart(restored);}}catch{guest=empty;}await refresh();})();},
  disconnect(){writer=undefined;},
 };
}
export type ServerCustomerStore=ReturnType<typeof createServerCustomerStore>;
