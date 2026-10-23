import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/product-detail';
import { getCatalogService } from '@/services/service-provider.server';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const product = await getCatalogService().getProduct((await params).handle);
  return product ? { title: product.title, description: product.description } : { title: 'Товар не знайдено' };
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const product = await getCatalogService().getProduct((await params).handle);
  if (!product) notFound();
  return <div className="container product-detail"><nav className="breadcrumbs" aria-label="Навігаційний шлях"><Link href="/">Головна</Link><span>/</span><Link href={`/catalog?category=${product.category}`}>Каталог</Link><span>/</span><span>{product.title}</span></nav><ProductDetail product={product} /></div>;
}
