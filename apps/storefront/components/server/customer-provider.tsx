'use client';
import Link from 'next/link';
import {createContext,useContext,useEffect,useState,useSyncExternalStore} from 'react';
import {createServerCustomerStore,type ServerCustomerStore} from '../../services/server/customer-store';
const Context=createContext<ServerCustomerStore|null>(null);
const noSubscribe=()=>()=>{};
const disabled={status:'anonymous' as const,session:null,cart:{lines:[],itemCount:0,subtotal:{amountMinor:0,currency:'UAH' as const}},wishlist:[],legacyWishlist:[],error:'',busy:false};
export function ServerCustomerProvider({children,enabled=false}:{children:React.ReactNode;enabled?:boolean}){
 const [store]=useState(()=>enabled?createServerCustomerStore():null);
 useEffect(()=>{if(!store)return;void store.connect(()=>localStorage.getItem('bazar-offer-guest-cart-v1'),v=>localStorage.setItem('bazar-offer-guest-cart-v1',v));
 const refresh=()=>{void store.refresh();};window.addEventListener('focus',refresh);return()=>{window.removeEventListener('focus',refresh);store.disconnect();};},[store]);
 const state=useSyncExternalStore(store?.subscribe??noSubscribe,store?.getSnapshot??(()=>disabled),store?.getServerSnapshot??(()=>disabled));
 useEffect(()=>{if(!store||!state.session)return;const wait=Math.max(0,Date.parse(state.session.expiresAt)-Date.now());const timer=setTimeout(()=>{void store.refresh();},Math.min(wait+25,2147483647));return()=>clearTimeout(timer);},[store,state.session]);
 return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useServerCustomer(){const store=useContext(Context);const state=useSyncExternalStore(store?.subscribe??noSubscribe,store?.getSnapshot??(()=>disabled),store?.getServerSnapshot??(()=>disabled));return {store,enabled:store!==null,state};}
export function ServerCustomerStatus(){const {store,state}=useServerCustomer();if(!store)return null;return <div className="demo-disclaimer"><p role="status">{state.error||(state.status==='loading'?'Перевіряємо серверну сесію…':state.session?'Тестова серверна сесія. Кошик та обране зберігаються у тестовому акаунті.':'Гостьовий кошик локальний. Автоматичного об’єднання немає.')}</p><button type="button" disabled={state.status==='loading'} onClick={()=>{void store.refresh();}}>Оновити серверні дані</button></div>;}
export function ServerAccountGate({children}:{children:React.ReactNode}){const {store,state}=useServerCustomer();if(!store)return children;if(state.status==='loading')return <p role="status">Перевіряємо доступ…</p>;if(!state.session)return <div className="empty-state"><h1>Потрібен вхід</h1><p>{state.error||'Особисті дані доступні лише після перевірки серверної сесії.'}</p><Link className="button" href="/account/login">Увійти</Link></div>;return children;}
