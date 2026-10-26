export type Money = Readonly<{ amountMinor: number; currency: 'UAH' }>;
export type ProductVisual =
  | 'phone'
  | 'laptop'
  | 'headphones'
  | 'home'
  | 'watch'
  | 'beauty'
  | 'camera'
  | 'console'
  | 'sport'
  | 'fashion';
export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'name';

export interface Category {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly subcategories: readonly string[];
}

export interface ProductVariant {
  readonly productTitle?: string;
  readonly id: string;
  readonly title: string;
  readonly sku: string;
  readonly price: Money;
  readonly stock: number;
  readonly mediaIndex: number;
}

export interface ProductSummary {
  readonly variants?: readonly ProductVariant[];
  readonly variantId?: string;
  readonly variantLabel?: string;
  readonly stock?: number;
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  readonly vendor: string;
  readonly category: string;
  readonly subcategory: string;
  readonly price: Money;
  readonly compareAtPrice?: Money;
  readonly visual: ProductVisual;
  readonly available: boolean;
  readonly rating: number;
  readonly reviewCount: number;
}

export interface Product extends ProductSummary {
  readonly sku: string;
  readonly description: string;
  readonly gallery: readonly { id: string; label: string; tone: string }[];
  readonly specifications: readonly { label: string; value: string }[];
  readonly reviews: readonly {
    id: string;
    author: string;
    rating: number;
    text: string;
    date: string;
  }[];
}

export interface ProductQuery {
  readonly query?: string;
  readonly category?: string;
  readonly subcategory?: string;
  readonly vendor?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly sort?: ProductSort;
  readonly page?: number;
  readonly limit?: number;
}

export interface ProductPage {
  readonly items: readonly ProductSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
}

export interface CatalogService {
  listProducts(input?: ProductQuery): Promise<ProductPage>;
  getProduct(handle: string): Promise<Product | null>;
  getCategories(): Promise<readonly Category[]>;
  getSuggestions(
    query: string,
    limit?: number,
  ): Promise<readonly ProductSummary[]>;
}
