export interface ServerCartView {
  mode: 'integration-test';
  guestMerge: 'none';
  freshness: 'current' | 'historical-replay';
  canCheckout: boolean;
  cart: {
    id: string;
    version: number;
    lines: readonly {
      productId: string;
      variantId: string;
      quantity: number;
      lineTotal: { amountMinor: number; currency: 'UAH' };
    }[];
    subtotal: { amountMinor: number; currency: 'UAH' };
  };
  inventory: readonly {
    variantId: string;
    stock: number | null;
    availabilityModel?: 'binary';
    available: boolean;
    unitPrice: { amountMinor: number; currency: 'UAH' };
  }[];
}
export interface ServerCartMutationInput {
  variantId: string;
  quantity?: number;
  expectedVersion: number;
  idempotencyKey: string;
}
/** Shared portable DTO validator; no transport, session or provider selection. */
export function isServerCartView(v: unknown): v is ServerCartView {
  const object = (x: unknown): x is Record<string, unknown> =>
    x !== null && typeof x === 'object' && !Array.isArray(x);
  const id = (x: unknown) =>
    typeof x === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
  const count = (x: unknown): x is number =>
    typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
  const money = (x: unknown): x is { amountMinor: number; currency: 'UAH' } =>
    object(x) && x.currency === 'UAH' && count(x.amountMinor);
  if (
    !object(v) ||
    v.mode !== 'integration-test' ||
    v.guestMerge !== 'none' ||
    !['current', 'historical-replay'].includes(String(v.freshness)) ||
    !object(v.cart) ||
    !id(v.cart.id) ||
    !count(v.cart.version) ||
    v.cart.version < 1 ||
    !Array.isArray(v.cart.lines) ||
    !money(v.cart.subtotal) ||
    !Array.isArray(v.inventory) ||
    v.inventory.length !== v.cart.lines.length
  )
    return false;
  let sum = 0n;
  const seen = new Set();
  let ready = v.cart.lines.length > 0;
  for (let i = 0; i < v.cart.lines.length; i++) {
    const l = v.cart.lines[i],
      stock = v.inventory[i];
    if (
      !object(l) ||
      !id(l.productId) ||
      !id(l.variantId) ||
      seen.has(String(l.variantId).toLowerCase()) ||
      !count(l.quantity) ||
      l.quantity < 1 ||
      l.quantity > 2147483647 ||
      !money(l.lineTotal) ||
      !object(stock) ||
      stock.variantId !== l.variantId ||
      (stock.availabilityModel === 'binary' ? stock.stock !== null : !count(stock.stock) || stock.stock > 2147483647) ||
      (stock.availabilityModel !== undefined && stock.availabilityModel !== 'binary') ||
      !money(stock.unitPrice) ||
      typeof stock.available !== 'boolean' ||
      (stock.availabilityModel !== 'binary' && stock.available !== (l.quantity <= (stock.stock as number))) ||
      BigInt(stock.unitPrice.amountMinor) * BigInt(l.quantity) !==
        BigInt(l.lineTotal.amountMinor)
    )
      return false;
    sum += BigInt(l.lineTotal.amountMinor);
    seen.add(String(l.variantId).toLowerCase());
    ready = ready && stock.available;
  }
  return sum === BigInt(v.cart.subtotal.amountMinor) && v.canCheckout === ready;
}
