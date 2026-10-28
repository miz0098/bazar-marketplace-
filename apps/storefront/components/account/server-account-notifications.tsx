'use client';
import {useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import {useServerCustomer} from '../server/customer-provider';
import {createCommunicationBusinessClient} from '../../lib/communication-business-client';
import {NotificationCenter} from '../notifications/notification-center';
export function ServerAccountNotifications(){const {store,state}=useServerCustomer();const client=useMemo(()=>createCommunicationBusinessClient(()=>store!.getSnapshot().session?.csrfToken??''),[store]);return store&&state.session?<NotificationCenter key={state.session.user.id} client={client}/>:null;}
export function ServerConversationBadge(){const {store,state}=useServerCustomer(),path=usePathname();const [unread,setUnread]=useState<number|null>(null);useEffect(()=>{if(!store||!state.session)return;let active=true;const refresh=()=>{void createCommunicationBusinessClient(()=>store.getSnapshot().session?.csrfToken??'').conversations().then(v=>{if(active&&v.resource==='conversations')setUnread(v.unreadChats);}).catch(()=>{if(active)setUnread(null);});};refresh();window.addEventListener('bazar:communications',refresh);window.addEventListener('focus',refresh);return()=>{active=false;window.removeEventListener('bazar:communications',refresh);window.removeEventListener('focus',refresh);};},[store,state.session,path]);return store&&state.session&&unread!==null?<span aria-label={'Непрочитаних діалогів: '+unread}> · {unread}</span>:null;}
