import {notFound} from 'next/navigation';
import {getContentService} from '@/services/service-provider.server';
import {InfoContent} from '@/components/layout/info-page';
export default async function Page({params}:{params:Promise<{info:string}>}){const {info}=await params;if(!['about','contacts','careers'].includes(info))notFound();const page=await getContentService().getInfoPage(info);if(!page)notFound();return <InfoContent page={page}/>;}
