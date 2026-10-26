import type { Product, ProductPage, ProductQuery, ProductSort, ProductSummary } from '@/services/contracts/catalog';

export const DEFAULT_PAGE_SIZE = 8;
const sorts: readonly ProductSort[] = ['featured', 'price-asc', 'price-desc', 'name'];

export function normalizeSearch(value = '') {
  return value.trim().toLocaleLowerCase('uk-UA');
}

export function parsePositiveInteger(value: string | number | undefined, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseProductSort(value?: string): ProductSort {
  return sorts.includes(value as ProductSort) ? value as ProductSort : 'featured';
}

export function queryProducts(products: readonly Product[], input: ProductQuery = {}): ProductPage {
  const query = normalizeSearch(input.query);
  const minPrice = Math.max(0, input.minPrice ?? 0);
  const maxPrice = input.maxPrice !== undefined && Number.isFinite(input.maxPrice) ? Math.max(0,input.maxPrice) : Number.POSITIVE_INFINITY;
  const pageSize = Math.max(1, Math.min(input.limit ?? DEFAULT_PAGE_SIZE, 24));

  const filtered = products.filter((product) => {
    const haystack = normalizeSearch(`${product.title} ${product.vendor} ${product.subcategory}`);
    return (!query || haystack.includes(query))
      && (!input.category || product.category === input.category)
      && (!input.subcategory || normalizeSearch(product.subcategory) === normalizeSearch(input.subcategory))
      && (!input.vendor || normalizeSearch(product.vendor) === normalizeSearch(input.vendor))
      && product.price.amountMinor >= minPrice
      && product.price.amountMinor <= maxPrice;
  });

  const items = [...filtered];
  if (input.sort === 'price-asc') items.sort((a, b) => a.price.amountMinor - b.price.amountMinor);
  if (input.sort === 'price-desc') items.sort((a, b) => b.price.amountMinor - a.price.amountMinor);
  if (input.sort === 'name') items.sort((a, b) => a.title.localeCompare(b.title, 'uk'));

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(parsePositiveInteger(input.page, 1), pageCount);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize, pageCount };
}

export function suggestProducts(products: readonly ProductSummary[], query: string, limit = 5) {
  const normalized = normalizeSearch(query);
  if (normalized.length < 2) return [];
  return products
    .filter((product) => normalizeSearch(`${product.title} ${product.vendor} ${product.subcategory}`).includes(normalized))
    .slice(0, Math.max(1, limit));
}
