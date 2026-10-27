import {productHref} from '@/domain/catalog/offers';
import {CatalogImage} from './catalog-image';
import { WishlistButton } from './wishlist-button';
import Link from 'next/link';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { formatMoney } from '@/lib/money';
import type { ProductSummary } from '@/services/contracts/catalog';

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article className="product-card" data-offer-id={product.offerId??product.variantId} data-seller-id={product.sellerId}>
      <WishlistButton product={product} />
      <Link className="product-card__link" href={productHref(product)}>
        <span
          className={`product-visual product-visual--${product.visual}`}
          aria-hidden="true"
        >
          {product.media?.[0]?<CatalogImage src={product.media[0].src} alt={product.media[0].alt} width={product.media[0].width} height={product.media[0].height}/>:<span />}
        </span>
        <span className="product-card__body">
          <small>{product.vendor}</small>
          {product.sellerName&&<small>Продавець: {product.sellerName}</small>}
          <strong>{product.title}</strong>
          {product.variantLabel&&!product.title.includes(product.variantLabel)&&<small>{product.variantLabel}</small>}
          {product.reviewCount>0&&<span
            className="product-card__rating"
            aria-label={`Рейтинг ${product.rating} з 5`}
          >
            ★ {product.rating} <small>({product.reviewCount})</small>
          </span>}
          <span className="product-card__price">
            <b>{product.requiresVariantSelection?"Оберіть варіант":formatMoney(product.price)}</b>
            {product.compareAtPrice && (
              <s>{formatMoney(product.compareAtPrice)}</s>
            )}
          </span>
          <span
            className={
              product.available
                ? 'stock stock--available'
                : 'stock stock--unavailable'
            }
          >
            {product.available ? 'Є в наявності' : 'Немає в наявності'}
          </span>
        </span>
      </Link>
      <AddToCartButton product={product} compact />
    </article>
  );
}
