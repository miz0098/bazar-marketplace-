import {SupportScreen} from '@/components/communication/support-screen';
export default async function Page({searchParams}:{searchParams:Promise<{order?:string;request?:string}>}){const p=await searchParams;return <SupportScreen orderContext={p.order} requestContext={p.request}/>;}
