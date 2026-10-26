'use client';
import { useState } from 'react';
import { useWishlist } from './wishlist-provider';
import type { ProductSummary } from '@/services/contracts/catalog';
export function WishlistButton({ product }: { product: ProductSummary }) {
  const { service, items, ready, notice } = useWishlist();
  const item = items.find((i) => i.product.id === product.id);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <span className="wishlist-control">
      <button
        className="wishlist-toggle"
        type="button"
        disabled={busy || !ready}
        aria-pressed={Boolean(item)}
        aria-label={`${item ? 'Видалити' : 'Додати'} ${product.title} ${item ? 'з обраного' : 'до обраного'}`}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            if (item) await service.removeWishlistItem(item.id);
            else await service.addWishlistItem(product);
          } catch {
            setError('Не вдалося змінити демо-обране. Спробуйте ще раз.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 5.5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z" />
        </svg>
      </button>
      {(error || notice) && <small role="alert">{error || notice}</small>}
    </span>
  );
}
