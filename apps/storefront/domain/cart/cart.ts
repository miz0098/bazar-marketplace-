import type { Cart, CartAction, CartLine } from '@/services/contracts/cart';
import type { ProductSummary } from '@/services/contracts/catalog';
import { cartKey, selectVariant } from '@/domain/catalog/variants';
export const MAX_DEMO_QUANTITY = 99;
export const quantityLimit = (product: ProductSummary) =>
  Math.min(MAX_DEMO_QUANTITY, product.stock ?? MAX_DEMO_QUANTITY);
export function normalizeQuantity(value: unknown, fallback = 1) {
  const q = Number(value);
  return Number.isInteger(q) && q > 0
    ? Math.min(q, MAX_DEMO_QUANTITY)
    : fallback;
}
export function cartError(
  cart: Cart,
  product: ProductSummary,
  quantity: number,
  add = false,
) {
  if (!product.available) return 'Товару немає в демонстраційній наявності.';
  if (!Number.isInteger(quantity) || quantity < 1)
    return 'Введіть цілу кількість від 1.';
  const total =
    quantity +
    (add
      ? (cart.lines.find((l) => cartKey(l.product) === cartKey(product))
          ?.quantity ?? 0)
      : 0);
  if (total > quantityLimit(product))
    return `Доступно лише ${quantityLimit(product)} шт. у демо. Реальний залишок не перевіряється.`;
  return '';
}
export function createCart(lines: readonly CartLine[]): Cart {
  const merged = new Map<string, CartLine>();
  for (const l of lines) {
    if (
      !l.product?.available ||
      !Number.isSafeInteger(l.product.price?.amountMinor) ||
      l.product.price.amountMinor < 0 ||
      l.product.price.currency !== 'UAH'
    )
      continue;
    const key = cartKey(l.product),
      q = Math.min(normalizeQuantity(l.quantity), quantityLimit(l.product));
    if (q < 1) continue;
    merged.set(key, {
      product: l.product,
      quantity: Math.min(
        q + (merged.get(key)?.quantity ?? 0),
        quantityLimit(l.product),
      ),
    });
  }
  const valid = [...merged.values()],
    amount = valid.reduce(
      (n, l) => n + l.quantity * l.product.price.amountMinor,
      0,
    );
  if (!Number.isSafeInteger(amount))
    return {
      lines: [],
      itemCount: 0,
      subtotal: { amountMinor: 0, currency: 'UAH' },
    };
  return {
    lines: valid,
    itemCount: valid.reduce((n, l) => n + l.quantity, 0),
    subtotal: { amountMinor: amount, currency: 'UAH' },
  };
}
export function cartReducer(cart: Cart, action: CartAction): Cart {
  if (action.type === 'hydrate') return createCart(action.lines);
  if (action.type === 'clear') return createCart([]);
  if (action.type === 'remove')
    return createCart(
      cart.lines.filter((l) => cartKey(l.product) !== action.productId),
    );
  if (action.type === 'update') {
    const line = cart.lines.find(
      (l) => cartKey(l.product) === action.productId,
    );
    if (!line || cartError(cart, line.product, action.quantity)) return cart;
    return createCart(
      cart.lines.map((l) =>
        cartKey(l.product) === action.productId
          ? { ...l, quantity: action.quantity }
          : l,
      ),
    );
  }
  const q = action.quantity ?? 1;
  if (cartError(cart, action.product, q, true)) return cart;
  const old = cart.lines.find(
    (l) => cartKey(l.product) === cartKey(action.product),
  );
  return createCart(
    old
      ? cart.lines.map((l) =>
          cartKey(l.product) === cartKey(action.product)
            ? { product: action.product, quantity: l.quantity + q }
            : l,
        )
      : [...cart.lines, { product: action.product, quantity: q }],
  );
}
/** Restore only catalog references; browser-stored price/stock/title are never authoritative. */
export function parseStoredCart(
  value: string | null,
  products: readonly ProductSummary[] = [],
): readonly CartLine[] {
  try {
    const rows: unknown = JSON.parse(value ?? '[]');
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row) => {
      if (
        !row ||
        typeof row !== 'object' ||
        !row.product ||
        typeof row.product.id !== 'string' ||
        !Number.isInteger(row.quantity) ||
        row.quantity < 1
      )
        return [];
      const base = products.find((p) => p.id === row.product.id),
        product = base ? selectVariant(base, row.product.variantId) : undefined;
      return product ? [{ product, quantity: row.quantity }] : [];
    });
  } catch {
    return [];
  }
}
