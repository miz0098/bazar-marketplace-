import { ProductCard } from '@/components/product/product-card';
import { getCatalogService } from '@/services/service-provider.server';

export const metadata = { title: 'Каталог' };

export default async function CatalogPage() {
  const result = await getCatalogService().listProducts({ limit: 8 });
  return (
    <div className="container page-shell">
      <p className="eyebrow">Каталог</p>
      <h1>Товари BAZAR</h1>
      <p className="page-intro">Демонстраційні дані першої фази. Фільтри, сортування та живий каталог ще не підключені.</p>
      <div className="mock-notice" role="status">Джерело даних: ізольовані mock-фікстури</div>
      <div className="product-grid">{result.items.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </div>
  );
}
