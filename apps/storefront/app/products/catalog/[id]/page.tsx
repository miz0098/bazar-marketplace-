import {notFound} from 'next/navigation';
import {getCatalogService} from '@/services/service-provider.server';
import {ProductDetail} from '@/components/product/product-detail';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{variant?:string}>}){const {id}=await params;const {variant}=await searchParams;const product=await getCatalogService().getProduct(id);if(!product||variant&&!product.variants?.some(v=>v.id===variant))notFound();return <div className="container product-detail"><ProductDetail key={id+(variant??'')} product={product} initialVariant={variant}/></div>;}
