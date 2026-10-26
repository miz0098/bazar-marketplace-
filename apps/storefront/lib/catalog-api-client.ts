import { createApiReader } from './api-client';
import type { ApiClientConfig } from './api-config';
export interface ApiMoney {
  amountMinor: number;
  currency: 'UAH';
}
export interface ApiProduct {
  id: string;
  categoryId: string;
  handle: string;
  title: string;
  description: string;
  price: ApiMoney;
  availability: 'available' | 'unavailable';
}
export interface ApiVariant {
  id: string;
  sku: string;
  price: ApiMoney;
  stock: number;
  availability: 'available' | 'unavailable';
}
export interface ApiProductDetail extends ApiProduct {
  variants: ApiVariant[];
}
export interface ApiCategory {
  id: string;
  parentId: string | null;
  handle: string;
  title: string;
}
export interface ApiProductPage {
  items: ApiProduct[];
  nextCursor: string | null;
}
export interface ApiProductQuery {
  query?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'name';
  limit?: number;
  cursor?: string;
}
// Future session-backed transport must implement this boundary; no caller-controlled user/cart ID.
export interface ApiCart {
  id: string;
  version: number;
  lines: {
    productId: string;
    variantId: string;
    quantity: number;
    lineTotal: ApiMoney;
  }[];
  subtotal: ApiMoney;
}
export interface AuthenticatedCartAdapter {
  get(): Promise<ApiCart>;
  add(input: {
    variantId: string;
    quantity: number;
    expectedVersion: number;
  }): Promise<ApiCart>;
  set(input: {
    variantId: string;
    quantity: number;
    expectedVersion: number;
  }): Promise<ApiCart>;
  remove(input: {
    variantId: string;
    expectedVersion: number;
  }): Promise<ApiCart>;
}
function record(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function id(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)
  );
}
function text(v: unknown, max: number) {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}
function amount(v: unknown): v is ApiMoney {
  return (
    record(v) &&
    v.currency === 'UAH' &&
    typeof v.amountMinor === 'number' &&
    Number.isSafeInteger(v.amountMinor) &&
    v.amountMinor >= 0
  );
}
function available(v: unknown) {
  return v === 'available' || v === 'unavailable';
}
function product(v: unknown): v is ApiProduct {
  return (
    record(v) &&
    id(v.id) &&
    id(v.categoryId) &&
    text(v.handle, 200) &&
    text(v.title, 300) &&
    typeof v.description === 'string' &&
    amount(v.price) &&
    available(v.availability)
  );
}
function variant(v: unknown): v is ApiVariant {
  return (
    record(v) &&
    id(v.id) &&
    text(v.sku, 100) &&
    amount(v.price) &&
    typeof v.stock === 'number' &&
    Number.isInteger(v.stock) &&
    v.stock >= 0 &&
    v.stock <= 2147483647 &&
    v.availability === (v.stock > 0 ? 'available' : 'unavailable')
  );
}
function detail(v: unknown): v is ApiProductDetail {
  return (
    product(v) &&
    'variants' in v &&
    Array.isArray(v.variants) &&
    v.variants.length > 0 &&
    v.variants.every(variant)
  );
}
function categories(v: unknown): v is ApiCategory[] {
  return (
    Array.isArray(v) &&
    v.length <= 1000 &&
    v.every(
      (c) =>
        record(c) &&
        id(c.id) &&
        (c.parentId === null || id(c.parentId)) &&
        text(c.handle, 200) &&
        text(c.title, 200),
    )
  );
}
function page(v: unknown): v is ApiProductPage {
  return (
    record(v) &&
    Array.isArray(v.items) &&
    v.items.length <= 100 &&
    v.items.every(product) &&
    (v.nextCursor === null ||
      (typeof v.nextCursor === 'string' &&
        /^[A-Za-z0-9_-]{1,150}$/.test(v.nextCursor)))
  );
}
/** Opt-in transport adapter only. No fabricated media/ratings; never selected by existing UI providers. */
export function createCatalogApiClient(
  config: ApiClientConfig,
  transport: typeof fetch = fetch,
) {
  const { get } = createApiReader(config, transport);
  return {
    list(input: ApiProductQuery = {}) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(input))
        if (value !== undefined) params.set(key, String(value));
      return get(`/api/v1/products${params.size ? `?${params}` : ''}`, page);
    },
    get(handle: string) {
      return get(`/api/v1/products/${encodeURIComponent(handle)}`, detail);
    },
    categories(parentId?: string | null) {
      return get(
        `/api/v1/categories${parentId === undefined ? '' : `?parentId=${encodeURIComponent(parentId ?? 'root')}`}`,
        categories,
      );
    },
  };
}
