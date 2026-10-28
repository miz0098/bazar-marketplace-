'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { createCommunicationBusinessClient } from '../../lib/communication-business-client';
import type { NotificationItem, NotificationSummary } from '../../services/contracts/communication-business';
import { notificationPresentation } from './presentation';
type Client=ReturnType<typeof createCommunicationBusinessClient>;
const date=(value:string)=>new Intl.DateTimeFormat('uk-UA',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date(value));
export function NotificationCenter({client}:{client:Client}){
 const [open,setOpen]=useState(false),[items,setItems]=useState<NotificationItem[]>([]),[summary,setSummary]=useState<NotificationSummary|null>(null),[before,setBefore]=useState<number|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const mounted=useRef(true),lock=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  let active=true;
  Promise.all([client.notificationSummary(),client.notifications(undefined,3)]).then(([s,p])=>{
   if(!active)return;
   if(p.resource!=='notifications')throw new Error('Wrong resource');
   setSummary(s);setItems(p.items);setBefore(p.nextBefore);setError('');setLoading(false);
  }).catch(()=>{if(active){setError('Не вдалося завантажити сповіщення. Сесію або серверний стан могло бути змінено.');setLoading(false);}});
  return()=>{active=false;};
 },[client,revision]);
 const mutate=useCallback(async(action:()=>Promise<void>)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{await action();}catch{if(mounted.current)setError('Дія недоступна. Перевірте серверну сесію та повторіть спробу.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 },[]);
 return <section className="checkout-card" aria-labelledby="notification-heading">
  <h2 id="notification-heading">Сповіщення</h2>
  <button type="button" aria-expanded={open} aria-controls="notification-content" onClick={()=>setOpen(x=>!x)}>Сповіщення · непрочитаних: {summary?.unread ?? '…'}</button>
  <div id="notification-content" hidden={!open} style={{overflowWrap:'anywhere'}}>
   <p>Ізольовані тестові події. Це не підтвердження реальної оплати, доставки, скасування чи повернення коштів. Email, SMS і push не надсилаються.</p>
   {loading && <p role="status">Завантажуємо сповіщення…</p>}
   {error && <p role="alert">{error}</p>}
   <button type="button" disabled={busy||loading} onClick={()=>{setLoading(true);setRevision(x=>x+1);}}>Оновити сповіщення / повторити</button>
   {summary && <>
    <p role="status" aria-live="polite">Непрочитаних сповіщень: {summary.unread}</p>
    <button type="button" disabled={busy||loading||summary.unread===0} onClick={()=>void mutate(async()=>{
     const through=summary.throughSequence;const result=await client.readAllNotifications(through);
     if(!mounted.current)return;
     setItems(rows=>rows.map(i=>i.sequence<=through?{...i,read:true}:i));setSummary(result);
    })}>Позначити всі прочитаними</button>
   </>}
   {!loading&&!error&&items.length===0 && <div className="account-empty"><span aria-hidden="true">♧</span><h3>Сповіщень поки немає</h3><p>Нові тестові події з’являться тут після відповідних дій у цьому ізольованому середовищі.</p></div>}
   <ol aria-label="Список сповіщень">
    {items.map(item=>{const p=notificationPresentation(item);return <li key={item.id} data-notification-sequence={item.sequence}>
     <article aria-label={`${p.title} · ${item.read?'прочитано':'непрочитано'}`}>
      <h3>{p.title}</h3><time dateTime={item.createdAt}>{date(item.createdAt)} · Київ</time>
      <p>{item.read?'Прочитано':'Непрочитано'} · тестова подія</p>
      <Link href={p.href}>Відкрити пов’язаний {item.kind==='review.moderated'?'відгук':item.kind==='question.answered'?'запитання':item.kind==='product.availability_restored'?'товар':item.kind==='message.created'?'чат':item.kind==='support.replied'?'запит':'запис замовлення'}</Link>
      <button type="button" disabled={busy||loading||item.read} onClick={()=>void mutate(async()=>{
       await client.readNotification(item.id);const next=await client.notificationSummary();
       if(!mounted.current)return;setItems(rows=>rows.map(i=>i.id===item.id?{...i,read:true}:i));setSummary(next);
      })}>Позначити прочитаним</button>
     </article>
    </li>;})}
   </ol>
   {before!==null && <button type="button" disabled={busy||loading} onClick={()=>void mutate(async()=>{
    const p=await client.notifications(before,3);if(p.resource!=='notifications')throw new Error('Wrong resource');
    if(!mounted.current)return;
    setItems(old=>[...new Map([...old,...p.items].map(i=>[i.id,i])).values()].sort((a,b)=>b.sequence-a.sequence));setBefore(p.nextBefore);
   })}>Завантажити ще сповіщення</button>}
  </div>
 </section>;
}
