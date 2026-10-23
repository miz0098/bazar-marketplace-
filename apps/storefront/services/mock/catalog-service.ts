import { queryProducts, suggestProducts } from '@/domain/catalog/query';
import { demoCategories, demoProducts } from '@/fixtures/catalog';
import type { CatalogService, ProductQuery } from '@/services/contracts/catalog';

export class MockCatalogService implements CatalogService {
  async listProducts(input: ProductQuery = {}) {
    return queryProducts(demoProducts, input);
  }

  async getProduct(handle: string) {
    return demoProducts.find((product) => product.handle === handle) ?? null;
  }

  async getCategories() {
    return demoCategories;
  }

  async getSuggestions(query: string, limit = 5) {
    return suggestProducts(demoProducts, query, limit);
  }
}
