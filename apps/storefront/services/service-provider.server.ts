import 'server-only';
import { MockCatalogService } from '@/services/mock/catalog-service';
import { MockContentService } from '@/services/mock/content-service';

function assertMockMode() {
  const source = process.env.STOREFRONT_DATA_SOURCE ?? 'mock';
  if (source !== 'mock') throw new Error(`Unsupported STOREFRONT_DATA_SOURCE: ${source}. Phase 1 supports "mock" only.`);
}

export function getCatalogService() { assertMockMode(); return new MockCatalogService(); }
export function getContentService() { assertMockMode(); return new MockContentService(); }
