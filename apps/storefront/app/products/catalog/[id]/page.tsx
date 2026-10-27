import {notFound} from 'next/navigation';
import {getCatalogV2Client} from '@/services/http/catalog-v2.server';
import {mapCatalogV2} from '@/domain/catalog/v2';
import {ProductDetail} from '@/components/product/product-detail';
import {ApiClientError} from '@/lib/api-client';
/** Public product facts only, using the approved product component. No local identity authorizes server data. */
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{variant?:string}>}){
 const {id}=await params;if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id))notFound();
 const p=await getCatalogV2Client().get(id).catch((e:unknown)=>{if(e instanceof ApiClientError&&e.status===404)notFound();throw e;});
 const {variant}=await searchParams;if(variant&&!p.variants.some(v=>v.id===variant&&v.purchasable))notFound();
 return <div className="container product-detail"><p className="demo-disclaimer">Каталог API v2. Серверний кошик звичайного інтерфейсу ще не підключено. Реальні покупки недоступні.</p><ProductDetail key={id+(variant??'')} product={mapCatalogV2(p)} initialVariant={variant}/></div>;
}
