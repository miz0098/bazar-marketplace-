'use client';
import { useState } from 'react';
import { useCart } from './cart-provider';
import type { ProductSummary } from '@/services/contracts/catalog';
export function AddToCartButton({
  product,
  quantity = 1,
  compact = false,
}: {
  product: ProductSummary;
  quantity?: number;
  compact?: boolean;
}) {
  const cart = useCart();
  const [feedback, setFeedback] = useState('');
  return (
    <div className="cart-action">
      <button
        className={`button add-cart-button${compact ? ' add-cart-button--compact' : ''}`}
        type="button"
        disabled={!product.available || product.requiresVariantSelection || product.purchaseEnabled===false || !cart.hydrated}
        onClick={() => {
          const error = cart.add(product, quantity);
          setFeedback(error || 'Додано ✓ до демо-кошика');
        }}
      >
        {!product.available
          ? 'Немає в наявності'
          : feedback.startsWith('Додано')
            ? 'Додано ✓'
            : compact
              ? 'У кошик'
              : 'Додати в кошик'}
      </button>
      <span role="status" className="cart-feedback">
        {feedback}
        {cart.notice && ` ${cart.notice}`}
      </span>
    </div>
  );
}
