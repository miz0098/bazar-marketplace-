import {MessagesScreen} from '@/components/communication/messages-screen';
export default async function Page({searchParams}:{searchParams:Promise<{id?:string}>}){return <MessagesScreen id={(await searchParams).id}/>;}
