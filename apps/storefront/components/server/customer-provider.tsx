'use client';
import Link from 'next/link';
import {createContext,useContext,useEffect,useState,useSyncExternalStore} from 'react';
import {createServerCustomerStore,type ServerCustomerStore} from '../../services/server/customer-store';
const Context=createContext<ServerCustomerStore|null>(null);
const noSubscribe=()=>()=>{};
const disabled={status:'anonymous' as const,session:null,cart:{lines:[],itemCount:0,subtotal:{amountMinor:0,currency:'UAH' as const}},wishlist:[],legacyWishlist:[],error:'',busy:false};
export function ServerCustomerProvider({children,autoConnect=true}:{children:React.ReactNode;autoConnect?:boolean}){
 const [store]=useState(()=>createServerCustomerStore());
 useEffect(()=>{if(!store||!autoConnect)return;void store.connect();
 const refresh=()=>{void store.refresh();};window.addEventListener('focus',refresh);return()=>{window.removeEventListener('focus',refresh);store.disconnect();};},[store,autoConnect]);
 const state=useSyncExternalStore(store?.subscribe??noSubscribe,store?.getSnapshot??(()=>disabled),store?.getServerSnapshot??(()=>disabled));
 useEffect(()=>{if(!store||!state.session)return;const wait=Math.max(0,Date.parse(state.session.expiresAt)-Date.now());const timer=setTimeout(()=>{void store.refresh();},Math.min(wait+25,2147483647));return()=>clearTimeout(timer);},[store,state.session]);
 return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useServerCustomer(){const store=useContext(Context);const state=useSyncExternalStore(store?.subscribe??noSubscribe,store?.getSnapshot??(()=>disabled),store?.getServerSnapshot??(()=>disabled));return {store,enabled:store!==null,state};}
export function ServerCustomerStatus(){const {store,state}=useServerCustomer();if(!store||!state.error&&state.status!=='loading')return null;return <div className="server-status"><p role={state.error?'alert':'status'}>{state.error||'Завантажуємо дані…'}</p>{state.error&&<button type="button" onClick={()=>void store.refresh()}>Повторити</button>}</div>;}
export function ServerAccountGate({children}:{children:React.ReactNode}){const {store,state}=useServerCustomer();if(!store)return <p role="alert">Сервіс особистого кабінету недоступний.</p>;if(state.status==='loading')return <p role="status">Перевіряємо доступ…</p>;if(!state.session)return <div className="empty-state"><h1>Потрібен вхід</h1><p>{state.error||'Особисті дані доступні лише після перевірки серверної сесії.'}</p><Link className="button" href="/account/login">Увійти</Link></div>;return children;}
