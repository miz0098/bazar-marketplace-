import {CommerceOrdersRouter} from '@/components/account/commerce-orders';
export default async function Page({params}:{params:Promise<{id:string}>}){return <CommerceOrdersRouter id={(await params).id}/>;}
