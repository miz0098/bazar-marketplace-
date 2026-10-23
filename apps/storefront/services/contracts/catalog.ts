export type Money = Readonly<{ amountMinor: number; currency: 'UAH' }>;
export type ProductVisual = 'phone' | 'laptop' | 'headphones' | 'home' | 'watch' | 'beauty' | 'camera' | 'console';

export interface ProductSummary {
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  readonly vendor: string;
  readonly price: Money;
  readonly visual: ProductVisual;
}

export interface ProductQuery { readonly limit?: number; readonly category?: string; }
export interface ProductPage { readonly items: readonly ProductSummary[]; readonly total: number; }

export interface CatalogService {
  listProducts(input?: ProductQuery): Promise<ProductPage>;
  getProduct(handle: string): Promise<ProductSummary | null>;
}
