'use client';

import {CatalogImage} from './catalog-image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';
import { WishlistButton } from './wishlist-button';
import { selectVariant } from '@/domain/catalog/variants';
import { quantityLimit } from '@/domain/cart/cart';
import { useState } from 'react';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { formatMoney } from '@/lib/money';
import type { Product } from '@/services/contracts/catalog';

const tabs = [
  'description',
  'specs',
  'reviews',
  'questions',
  'delivery',
] as const;
type Tab = (typeof tabs)[number];

export function ProductDetail({
  product,
  initialVariant,
}: {
  product: Product;
  initialVariant?: string;
}) {
  const router = useRouter(),
    cart = useCart();
  const [purchaseError, setPurchaseError] = useState('');
  const [variantId, setVariantId] = useState(initialVariant ?? (product.requiresVariantSelection?"":(product.variants?.[0]?.id??product.id)));
  const selected = (variantId?selectVariant(product, variantId):undefined) ?? product;
  const [mediaIndex, setMediaIndex] = useState(
    product.variants?.find((v) => v.id === variantId)?.mediaIndex ?? 0,
  );
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<Tab>('description');
  const media = product.gallery[mediaIndex] ?? product.gallery[0];

  const selectTab = (next: Tab) => {
    setTab(next);
    window.requestAnimationFrame(() =>
      document.getElementById(`product-tab-${next}`)?.focus(),
    );
  };

  return (
    <>
      <div className="product-detail__top">
        <section className="product-gallery" aria-label="Галерея товару">
          <div
            className={`product-gallery__main product-visual product-visual--${product.visual}`}
            style={{ backgroundColor: media?.tone }}
            role="img"
            aria-label={media?.label??`${product.title}: зображення недоступне`}
          >
            {media?.src?<CatalogImage key={media.src} src={media.src} alt={media.label} width={media.width} height={media.height}/>:<span />}
          </div>
          <div className="product-gallery__thumbs">
            {product.gallery.map((item, index) => (
              <button
                className={index === mediaIndex ? 'is-active' : ''}
                type="button"
                aria-label={`Показати: ${item.label}`}
                aria-pressed={index === mediaIndex}
                onClick={() => setMediaIndex(index)}
                key={item.id}
              >
                <span style={{ background: item.tone }} />
              </button>
            ))}
          </div>
        </section>
        <section className="product-summary">
          <h1>{selected.title}</h1>
          <WishlistButton product={product} />
          <div className="product-summary__meta">
            {product.reviewCount>0&&<span aria-label={`Рейтинг ${product.rating} з 5`}>
              ★★★★★ <strong>{product.rating}</strong> · {product.reviewCount}{' '}
              відгуків
            </span>}
            <span>
              Артикул:{' '}
              {product.variants?.find((v) => v.id === variantId)?.sku ??
                product.sku}
            </span>
          </div>
          <div className="product-summary__price">
            <strong>{selected.requiresVariantSelection?"Оберіть варіант для перегляду ціни":formatMoney(selected.price)}</strong>
            {selected.compareAtPrice && (
              <s>{formatMoney(selected.compareAtPrice)}</s>
            )}
          </div>
          <p
            className={
              selected.available
                ? 'stock stock--available'
                : 'stock stock--unavailable'
            }
          >
            {selected.available ? '✓ Є в наявності' : 'Немає в наявності'}
          </p>
          {product.variants && product.variants.length > 1 && (
            <label className="variant-selector">
              Варіант товару
              <select
                value={variantId}
                onChange={(event) => {
                  const id = event.target.value;
                  setVariantId(id);
                  setPurchaseError('');
                  setQuantity(1);
                  setMediaIndex(
                    product.variants?.find((v) => v.id === id)?.mediaIndex ?? 0,
                  );
                  const url = new URL(window.location.href);
                  url.searchParams.set('variant', id);
                  window.history.replaceState(null, '', url);
                }}
              >
                {product.requiresVariantSelection&&<option value="">Оберіть варіант</option>}
                {product.variants.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.title}
                    {v.available === false ? ' — немає в наявності' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="demo-stock">
            {selected.availabilityModel === "binary" ? "Наявність визначається для обраного варіанта. Складські залишки не ведуться." : `Демо-залишок: ${quantityLimit(selected)} шт. Не є реальним залишком.`}
          </p>
          <div className="product-purchase">
            <label>
              Кількість
              <span className="quantity-control">
                <button
                  type="button"
                  aria-label="Зменшити кількість"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  −
                </button>
                <input
                  aria-label="Кількість"
                  type="number"
                  min="1"
                  max={Math.max(1, quantityLimit(selected))}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setQuantity(next);
                    setPurchaseError(
                      Number.isInteger(next) &&
                        next > 0 &&
                        next <= quantityLimit(selected)
                        ? ''
                        : `Вкажіть цілу кількість від 1 до ${quantityLimit(selected)}.`,
                    );
                  }}
                />
                <button
                  type="button"
                  aria-label="Збільшити кількість"
                  onClick={() =>
                    setQuantity((value) =>
                      Math.min(Math.max(1, quantityLimit(selected)), value + 1),
                    )
                  }
                >
                  +
                </button>
              </span>
            </label>
            <AddToCartButton
              key={variantId}
              product={selected}
              quantity={quantity}
            />
            <button
              className="button button--secondary buy-now-button"
              type="button"
              disabled={!selected.available || selected.requiresVariantSelection || product.purchaseEnabled===false || !cart.hydrated}
              onClick={() => {
                const error = cart.add(selected, quantity);
                setPurchaseError(error);
                if (!error) router.push('/checkout');
              }}
            >
              Купити зараз
            </button>
            <span role="status">{purchaseError}</span>
          </div>
          <div className="product-service-list">
            <article>
              <span>✓</span>
              <div>
                <h2>Наявність</h2>
                <p>
                  {selected.available
                    ? 'Демонстраційно доступний'
                    : 'Демонстраційно недоступний'}
                </p>
              </div>
            </article>
            <article>
              <span>↗</span>
              <div>
                <h2>Доставка</h2>
                <p>вартість за тарифами перевізника</p>
              </div>
            </article>
            <article>
              <span>₴</span>
              <div>
                <h2>Оплата</h2>
                <p>Платіжні методи буде підключено окремо</p>
              </div>
            </article>
            <article>
              <span>↺</span>
              <div>
                <h2>Повернення</h2>
                <p>Умови повернення потребують підтвердження</p>
              </div>
            </article>
          </div>
          <div className="demo-disclaimer" role="note">
            Демонстраційні ціни й наявність. Реальне резервування товару не
            виконується.
          </div>
        </section>
      </div>

      <section className="product-tabs">
        <div
          className="product-tabs__list"
          role="tablist"
          aria-label="Інформація про товар"
        >
          {tabs.map((item, index) => (
            <button
              id={`product-tab-${item}`}
              type="button"
              role="tab"
              aria-selected={tab === item}
              aria-controls={`product-panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              className={tab === item ? 'is-active' : ''}
              onClick={() => setTab(item)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight')
                  selectTab(tabs[(index + 1) % tabs.length]);
                if (event.key === 'ArrowLeft')
                  selectTab(tabs[(index - 1 + tabs.length) % tabs.length]);
              }}
              key={item}
            >
              {item === 'description'
                ? 'Опис'
                : item === 'specs'
                  ? 'Характеристики'
                  : item === 'reviews'
                    ? 'Відгуки'
                    : item === 'questions'
                      ? 'Питання та відповіді'
                      : 'Доставка та оплата'}
            </button>
          ))}
        </div>
        <div
          className="product-tabs__panel"
          id={`product-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`product-tab-${tab}`}
        >
          {tab === 'description' && <p>{product.description}</p>}
          {tab === 'specs' && (
            <table>
              <tbody>
                {product.specifications.map((spec) => (
                  <tr key={spec.label}>
                    <th>{spec.label}</th>
                    <td>{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'reviews' && (
            <div className="reviews">
              <header>
                <strong>{product.rating}/5</strong>
                <span>
                  На основі {product.reviewCount} демонстраційних оцінок
                </span>
              </header>
              {product.reviews.length ? (
                product.reviews.map((review) => (
                  <article key={review.id}>
                    <div>
                      <strong>{review.author}</strong>
                      <span>{'★'.repeat(review.rating)}</span>
                      <time dateTime={review.date}>
                        {new Intl.DateTimeFormat('uk-UA').format(
                          new Date(review.date),
                        )}
                      </time>
                    </div>
                    <p>{review.text}</p>
                  </article>
                ))
              ) : (
                <p>Відгуків поки що немає.</p>
              )}
            </div>
          )}
          {tab === 'questions' && (
            <p>Питань поки що немає. Надсилання запитань у демо недоступне.</p>
          )}
          {tab === 'delivery' && (
            <div className="delivery-copy">
              <p>
                <strong>Доставка:</strong> вартість за тарифами перевізника.
              </p>
              <p>
                <strong>Оплата:</strong> платіжна інтеграція не входить до
                демонстраційної фази.
              </p>
              <p>
                <strong>Повернення:</strong> остаточні правила мають бути
                підтверджені власником сервісу.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
