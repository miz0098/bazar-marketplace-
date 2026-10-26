'use client';
import { createDemoRecentViews } from '@/services/mock/recent-service';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ProductSummary } from '@/services/contracts/catalog';
import { ProductCard } from './product-card';
export function RelatedProducts({
  products,
  current,
}: {
  products: readonly ProductSummary[];
  current: ProductSummary;
}) {
  const [history] = useState(() => createDemoRecentViews());
  const recent = useSyncExternalStore(
    history.subscribe,
    history.getSnapshot,
    history.getServerSnapshot,
  );
  useEffect(
    () =>
      history.visit(
        current.id,
        products.map((p) => p.id),
      ),
    [current.id, products, history],
  );
  const recommended = products
      .filter((p) => p.id !== current.id && p.category === current.category)
      .slice(0, 4),
    viewed = recent.flatMap((id) => {
      const p = products.find((p) => p.id === id);
      return p ? [p] : [];
    });
  return (
    <>
      {recommended.length > 0 && (
        <section className="home-section">
          <h2>Рекомендовані товари</h2>
          <p>
            Демонстраційна добірка з тієї самої категорії, без персоналізації.
          </p>
          <div className="product-grid">
            {recommended.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        </section>
      )}
      {viewed.length > 0 && (
        <section className="home-section">
          <h2>Нещодавно переглянуті</h2>
          <p>Лише у поточній вкладці браузера.</p>
          <div className="product-grid">
            {viewed.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
