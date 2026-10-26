import Link from 'next/link';
import { getCatalogService } from '@/services/service-provider.server';
export const metadata = { title: 'Категорії' };
export default async function Collections() {
  const categories = await getCatalogService().getCategories();
  return (
    <div className="container catalog-page">
      <h1>Категорії товарів</h1>
      <p>Демонстраційні категорії BAZAR</p>
      <div className="category-grid">
        {categories.map((c) => (
          <Link
            className="category-card"
            href={`/collections/${c.id}`}
            key={c.id}
          >
            <span aria-hidden="true">{c.icon}</span>
            {c.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
