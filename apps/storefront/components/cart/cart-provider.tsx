'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { cartReducer, createCart, parseStoredCart } from '@/domain/cart/cart';
import type { Cart } from '@/services/contracts/cart';
import type { ProductSummary } from '@/services/contracts/catalog';

const STORAGE_KEY = 'bazar-demo-cart-v1';

interface CartContextValue extends Cart {
  readonly hydrated: boolean;
  add(product: ProductSummary, quantity?: number): void;
  update(productId: string, quantity: number): void;
  remove(productId: string): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, createCart([]));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      dispatch({ type: 'hydrate', lines: parseStoredCart(window.localStorage.getItem(STORAGE_KEY)) });
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart.lines));
  }, [cart.lines, hydrated]);

  const value = useMemo<CartContextValue>(() => ({
    ...cart,
    hydrated,
    add: (product, quantity) => dispatch({ type: 'add', product, quantity }),
    update: (productId, quantity) => dispatch({ type: 'update', productId, quantity }),
    remove: (productId) => dispatch({ type: 'remove', productId }),
    clear: () => dispatch({ type: 'clear' }),
  }), [cart, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart must be used inside CartProvider');
  return cart;
}
