'use client';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  cartReducer,
  createCart,
  parseStoredCart,
  cartError,
} from '@/domain/cart/cart';
import { selectVariant } from '@/domain/catalog/variants';
import type { Cart } from '@/services/contracts/cart';
import type { ProductSummary } from '@/services/contracts/catalog';
interface Value extends Cart {
  hydrated: boolean;
  notice: string;
  add(p: ProductSummary, q?: number): string;
  update(id: string, q: number): string;
  remove(id: string): void;
  clear(): void;
}
const Context = createContext<Value | null>(null);
export function CartProvider({
  children,
  products,
}: {
  children: React.ReactNode;
  products: readonly ProductSummary[];
}) {
  const [cart, setCart] = useState(() => createCart([])),
    [hydrated, setHydrated] = useState(false),
    [notice, setNotice] = useState('');
  const current = useRef(cart);
  useEffect(() => {
    const timer = setTimeout(() => {
      let stored = null;
      try {
        stored = localStorage.getItem('bazar-demo-cart-v1');
      } catch {
        setNotice(
          'Сховище браузера недоступне. Кошик працює лише до перезавантаження.',
        );
      }
      if (stored)
        setNotice('Кошик відновлено з актуальними demo-цінами та залишками.');
      const restored = createCart(parseStoredCart(stored, products));
      current.current = restored;
      setCart(restored);
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [products]);
  function commit(next: Cart) {
    current.current = next;
    setCart(next);
    try {
      localStorage.setItem('bazar-demo-cart-v1', JSON.stringify(next.lines));
      setNotice('');
    } catch {
      setNotice(
        'Не вдалося зберегти кошик у браузері. Зміни доступні лише до перезавантаження.',
      );
    }
  }
  const value: Value = {
    ...cart,
    hydrated,
    notice,
    add(p, q = 1) {
      if (!hydrated) return 'Кошик ще завантажується. Спробуйте ще раз.';
      const base = products.find((v) => v.id === p.id),
        product = base && selectVariant(base, p.variantId);
      if (!product) return 'Товар не знайдено у демо-каталозі.';
      const error = cartError(current.current, product, q, true);
      if (error) return error;
      commit(
        cartReducer(current.current, { type: 'add', product, quantity: q }),
      );
      return '';
    },
    update(id, q) {
      const line = current.current.lines.find(
        (l) => (l.product.variantId ?? l.product.id) === id,
      );
      if (!line) return 'Товар не знайдено.';
      const error = cartError(current.current, line.product, q);
      if (error) return error;
      commit(
        cartReducer(current.current, {
          type: 'update',
          productId: id,
          quantity: q,
        }),
      );
      return '';
    },
    remove(id) {
      commit(cartReducer(current.current, { type: 'remove', productId: id }));
    },
    clear() {
      commit(createCart([]));
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error('Cart provider required');
  return value;
}
