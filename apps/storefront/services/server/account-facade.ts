import type {ProductSummary} from '../contracts/catalog';
import type {ServerCustomerStore} from './customer-store';
import type {AccountWishlistQuery,AccountWishlistPage} from '../../domain/account/account';
/** Wishlist operations use only actor-bound server state. */
export function createServerAccountFacade(store:ServerCustomerStore){
 const snapshot=()=>store.getSnapshot().wishlist;
 return {subscribeWishlist:store.subscribe,getWishlistSnapshot:snapshot,getWishlistNotice:()=>store.getSnapshot().error,isWishlistReady:()=>store.getSnapshot().status!=='loading'&&store.getSnapshot().status!=='error',
 async listWishlist(q:AccountWishlistQuery={}):Promise<AccountWishlistPage>{const state=store.getSnapshot();if(state.status==='error')throw new Error(state.error);const term=q.search?.trim().toLocaleLowerCase('uk-UA')??'';const items=snapshot().filter(w=>w.product.title.toLocaleLowerCase('uk-UA').includes(term)).slice();items.sort((a,b)=>q.sort==='price-asc'?a.product.price.amountMinor-b.product.price.amountMinor:q.sort==='price-desc'?b.product.price.amountMinor-a.product.price.amountMinor:q.sort==='name'?a.product.title.localeCompare(b.product.title,'uk'):b.addedAt.localeCompare(a.addedAt));const pageSize=Math.max(1,Math.min(q.pageSize??4,100)),page=Math.max(1,q.page??1),pageCount=Math.max(1,Math.ceil(items.length/pageSize));return {items:items.slice((page-1)*pageSize,page*pageSize),total:items.length,page,pageSize,pageCount,hasMore:page<pageCount};},
 addWishlistItem:(p:ProductSummary)=>store.wishlist(p,true),removeWishlistItem:(id:string)=>store.wishlist(id,false),
 async removeWishlistItems(ids:readonly string[]){for(const id of ids)await store.wishlist(id,false);return {status:'saved' as const,persisted:true as const,value:snapshot()};},
 };
}
