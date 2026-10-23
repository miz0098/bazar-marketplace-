'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/cart-provider';
import type { ProductSummary } from '@/services/contracts/catalog';

export function AddToCartButton({ product, quantity = 1, compact = false }: { product: ProductSummary; quantity?: number; compact?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    add(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button className={`button add-cart-button${compact ? ' add-cart-button--compact' : ''}`} type="button" disabled={!product.available} onClick={handleAdd}>
      {!product.available ? 'Немає в наявності' : added ? 'Додано ✓' : compact ? 'У кошик' : 'Додати в кошик'}
    </button>
  );
}
