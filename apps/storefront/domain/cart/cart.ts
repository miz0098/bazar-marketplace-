import type { Cart, CartAction, CartLine } from '@/services/contracts/cart';

export const MAX_DEMO_QUANTITY = 99;

export function normalizeQuantity(value: unknown, fallback = 1) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 ? Math.min(quantity, MAX_DEMO_QUANTITY) : fallback;
}

export function createCart(lines: readonly CartLine[]): Cart {
  const validLines = lines
    .filter((line) => line.product?.id && line.product.available)
    .map((line) => ({ ...line, quantity: normalizeQuantity(line.quantity) }));
  return {
    lines: validLines,
    itemCount: validLines.reduce((total, line) => total + line.quantity, 0),
    subtotal: {
      amountMinor: validLines.reduce((total, line) => total + line.product.price.amountMinor * line.quantity, 0),
      currency: 'UAH',
    },
  };
}

export function cartReducer(cart: Cart, action: CartAction): Cart {
  if (action.type === 'hydrate') return createCart(action.lines);
  if (action.type === 'clear') return createCart([]);
  if (action.type === 'remove') return createCart(cart.lines.filter((line) => line.product.id !== action.productId));
  if (action.type === 'update') {
    if (!Number.isInteger(action.quantity) || action.quantity <= 0) return cart;
    return createCart(cart.lines.map((line) => line.product.id === action.productId ? { ...line, quantity: action.quantity } : line));
  }
  if (!action.product.available) return cart;
  const quantity = normalizeQuantity(action.quantity);
  const existing = cart.lines.find((line) => line.product.id === action.product.id);
  return createCart(existing
    ? cart.lines.map((line) => line.product.id === action.product.id ? { ...line, quantity: Math.min(line.quantity + quantity, MAX_DEMO_QUANTITY) } : line)
    : [...cart.lines, { product: action.product, quantity }]);
}

export function parseStoredCart(value: string | null): readonly CartLine[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line): line is CartLine => Boolean(
      line && typeof line === 'object'
      && 'quantity' in line
      && 'product' in line
      && line.product && typeof line.product === 'object'
      && 'id' in line.product
      && 'price' in line.product,
    ));
  } catch {
    return [];
  }
}
