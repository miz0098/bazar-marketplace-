import Link from 'next/link';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { formatMoney } from '@/lib/money';
import type { ProductSummary } from '@/services/contracts/catalog';

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article className="product-card">
      <Link className="product-card__link" href={`/products/${product.handle}`}>
        <span className={`product-visual product-visual--${product.visual}`} aria-hidden="true"><span /></span>
        <span className="product-card__body">
          <small>{product.vendor}</small>
          <strong>{product.title}</strong>
          <span className="product-card__rating" aria-label={`Рейтинг ${product.rating} з 5`}>★ {product.rating} <small>({product.reviewCount})</small></span>
          <span className="product-card__price"><b>{formatMoney(product.price)}</b>{product.compareAtPrice && <s>{formatMoney(product.compareAtPrice)}</s>}</span>
          <span className={product.available ? 'stock stock--available' : 'stock stock--unavailable'}>{product.available ? 'Є в наявності' : 'Немає в наявності'}</span>
        </span>
      </Link>
      <AddToCartButton product={product} compact />
    </article>
  );
}
