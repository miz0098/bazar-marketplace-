'use client';
import {useServerCustomer} from '../server/customer-provider';
import {createContext,useContext} from 'react';
import type {Cart} from '../../services/contracts/cart';
import type {ProductSummary} from '../../services/contracts/catalog';
interface Value extends Cart {
  hydrated: boolean;
  notice: string;
  add(p: ProductSummary, q?: number): string | Promise<string>;
  update(id: string, q: number): string | Promise<string>;
  remove(id: string): void;
  clear(): void;
}
const Context = createContext<Value | null>(null);
export function CartProvider(props:{children:React.ReactNode;products:readonly ProductSummary[]}){
 const {store,state}=useServerCustomer();
 if(!store)throw new Error('Server cart provider required');
 const value:Value={...state.cart,hydrated:state.status==='anonymous'||state.status==='authenticated',notice:state.error,add:(p,q=1)=>store.mutate('add',p,q),update:(id,q)=>store.mutate('set',id,q),remove:async(id)=>{await store.mutate('remove',id);},clear:async()=>{for(const l of state.cart.lines){const error=await store.mutate('remove',l.product.variantId??l.product.id);if(error)break;}}};
 return <Context.Provider value={value}>{props.children}</Context.Provider>;
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error('Cart provider required');
  return value;
}
