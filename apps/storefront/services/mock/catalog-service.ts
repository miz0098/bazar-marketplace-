import { mockProducts } from '@/fixtures/home';
import type { CatalogService, ProductQuery } from '@/services/contracts/catalog';

export class MockCatalogService implements CatalogService {
  async listProducts(input: ProductQuery = {}) {
    const limit = Math.max(1, Math.min(input.limit ?? mockProducts.length, mockProducts.length));
    return { items: mockProducts.slice(0, limit), total: mockProducts.length };
  }

  async getProduct(handle: string) {
    return mockProducts.find((product) => product.handle === handle) ?? null;
  }
}
