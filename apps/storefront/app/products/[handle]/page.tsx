import { RelatedProducts } from '@/components/product/related-products';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/product-detail';
import { getCatalogService } from '@/services/service-provider.server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const product = await getCatalogService().getProduct((await params).handle);
  return product
    ? { title: product.title, description: product.description }
    : { title: 'Товар не знайдено' };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const product = await getCatalogService().getProduct((await params).handle);
  if (!product) notFound();
  const all = await getCatalogService().listProducts({ limit: 24 });
  const { variant } = await searchParams;
  if (variant && !product.variants?.some((v) => v.id === variant)) notFound();
  return (
    <div className="container product-detail">
      <nav className="breadcrumbs" aria-label="Навігаційний шлях">
        <Link href="/">Головна</Link>
        <span>/</span>
        <Link href={`/catalog?category=${product.category}`}>Каталог</Link>
        <span>/</span>
        <span>{product.title}</span>
      </nav>
      <ProductDetail
        key={product.id + (variant ?? '')}
        product={product}
        initialVariant={variant}
      />
      <RelatedProducts products={all.items} current={product} />
    </div>
  );
}
