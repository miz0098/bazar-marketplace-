import {MessagesScreen} from '@/components/communication/messages-screen';
export default async function Page({params}:{params:Promise<{id:string}>}){return <MessagesScreen id={(await params).id}/>;}
