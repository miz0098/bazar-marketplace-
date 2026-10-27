'use client';

import { useState } from 'react';
import { cartKey } from '@/domain/catalog/variants';
import { quantityLimit } from '@/domain/cart/cart';
import Link from 'next/link';
import { useCart } from '@/components/cart/cart-provider';
import { formatMoney } from '@/lib/money';

export function CartPage() {
  const cart = useCart();
  const [error, setError] = useState('');
  if (!cart.hydrated)
    return (
      <div className="loading-state" role="status">
        <span />
        <p>Завантажуємо кошик…</p>
      </div>
    );
  if (!cart.lines.length)
    return (
      <div className="empty-cart">
        <span aria-hidden="true">🛒</span>
        <h1>Ваш кошик порожній</h1>
        <p>
          Додайте товари з каталогу — демонстраційний кошик збережеться після
          оновлення сторінки.
        </p>
        <Link className="button" href="/catalog">
          Перейти до каталогу
        </Link>
      </div>
    );

  return (
    <div>
      <p role="status">{error || cart.notice}</p>
      <div className="cart-layout">
        <section className="cart-lines">
          <div className="cart-title">
            <div>
              <p className="eyebrow">Кошик</p>
              <h1>Ваші товари</h1>
            </div>
            <button type="button" onClick={cart.clear}>
              Очистити кошик
            </button>
          </div>
          {cart.lines.map((line) => (
            <article className="cart-line" data-unavailable={!line.product.available} key={cartKey(line.product)}>
              <Link
                className={`cart-line__visual product-visual product-visual--${line.product.visual}`}
                href={`/products/${line.product.handle}${line.product.variantId ? `?variant=${encodeURIComponent(line.product.variantId)}` : ''}`}
                aria-label={line.product.title}
              >
                <span />
              </Link>
              <div className="cart-line__info">
                <small>{line.product.vendor}</small>
                <Link
                  href={`/products/${line.product.handle}${line.product.variantId ? `?variant=${encodeURIComponent(line.product.variantId)}` : ''}`}
                >
                  {line.product.title}
                </Link>
                <small>{line.product.variantLabel}</small>
                {!line.product.available&&<p className="stock stock--unavailable">Немає в наявності</p>}
                <strong>{formatMoney(line.product.price)}</strong>
              </div>
              <label className="cart-line__quantity" aria-disabled={!line.product.available}>
                Кількість
                <span className="quantity-control">
                  <button
                    type="button"
                    disabled={!line.product.available}
                    aria-label={`Зменшити кількість ${line.product.title}`}
                    onClick={() =>
                      line.quantity === 1
                        ? cart.remove(cartKey(line.product))
                        : setError(
                            cart.update(
                              cartKey(line.product),
                              line.quantity - 1,
                            ),
                          )
                    }
                  >
                    −
                  </button>
                  <input
                    aria-label={`Кількість ${line.product.title}`}
                    disabled={!line.product.available}
                    type="number"
                    min="1"
                    max={quantityLimit(line.product)}
                    value={line.quantity}
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      setError(cart.update(cartKey(line.product), quantity));
                    }}
                  />
                  <button
                    type="button"
                    disabled={!line.product.available}
                    aria-label={`Збільшити кількість ${line.product.title}`}
                    onClick={() =>
                      setError(
                        cart.update(cartKey(line.product), line.quantity + 1),
                      )
                    }
                  >
                    +
                  </button>
                </span>
              </label>
              <strong className="cart-line__total">
                {formatMoney({
                  ...line.product.price,
                  amountMinor: line.product.price.amountMinor * line.quantity,
                })}
              </strong>
              <button
                className="cart-line__remove"
                type="button"
                onClick={() => cart.remove(cartKey(line.product))}
                aria-label={`Видалити ${line.product.title}`}
              >
                Видалити
              </button>
            </article>
          ))}
        </section>
        <aside className="cart-summary">
          <h2>Разом</h2>
          <div>
            <span>Товарів</span>
            <strong>{cart.itemCount}</strong>
          </div>
          <div>
            <span>Сума</span>
            <strong>{formatMoney(cart.subtotal)}</strong>
          </div>
          <p>Доставка: вартість за тарифами перевізника.</p>
          {cart.lines.some(l=>!l.product.available)?<p role="alert">Недоступні варіанти залишаються у кошику. Оформлення недоступне.</p>:<Link className="button" href="/checkout">
            Перейти до оформлення
          </Link>}
          <Link href="/catalog">Продовжити покупки</Link>
          <div className="demo-disclaimer">
            Це локальний демонстраційний кошик. Оформлення не створює замовлення
            й не проводить оплату.
          </div>
        </aside>
      </div>
    </div>
  );
}
