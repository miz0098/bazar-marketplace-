import {notFound} from 'next/navigation';
import {getContentService} from '@/services/service-provider.server';
import {InfoContent} from '@/components/layout/info-page';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!['how-to-order','delivery','returns'].includes(slug))notFound();const page=await getContentService().getInfoPage(slug);if(!page)notFound();return <InfoContent page={page}/>;}
