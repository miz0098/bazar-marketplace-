import Link from 'next/link';
import type { ProductSummary } from '@/services/contracts/catalog';

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link className="product-card" href={`/catalog?product=${product.handle}`}>
      <span className={`product-visual product-visual--${product.visual}`} aria-hidden="true"><span /></span>
      <span className="product-card__body"><small>{product.vendor}</small><strong>{product.title}</strong><b>{formatMoney(product.price)}</b></span>
    </Link>
  );
}

function formatMoney(money: ProductSummary['price']) {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: money.currency, maximumFractionDigits: 0 }).format(money.amountMinor / 100);
}
