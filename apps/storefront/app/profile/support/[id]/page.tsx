import {SupportScreen} from '@/components/communication/support-screen';
export default async function Page({params}:{params:Promise<{id:string}>}){return <SupportScreen id={(await params).id}/>;}
