import {getOfferCatalogService} from './http/offers.server';
import 'server-only';
import { MockCatalogService } from '@/services/mock/catalog-service';
import { MockContentService } from '@/services/mock/content-service';

function assertMockMode() {
  const source = process.env.STOREFRONT_DATA_SOURCE ?? 'mock';
  if (source !== 'mock') throw new Error(`Unsupported STOREFRONT_DATA_SOURCE: ${source}. Phase 1 supports "mock" only.`);
}

export function getCatalogService() {
 if(process.env.STOREFRONT_DATA_SOURCE==='storefront-test')return getOfferCatalogService(true);
 if(process.env.STOREFRONT_DATA_SOURCE==='catalog-v2-preview'){
  if(process.env.NODE_ENV==='production')throw new Error('Catalog preview cannot activate production storefront');
  return getOfferCatalogService(false);
 }
 assertMockMode(); return new MockCatalogService();
}
export function getContentService() { if(!["catalog-v2-preview","storefront-test"].includes(process.env.STOREFRONT_DATA_SOURCE??""))assertMockMode(); return new MockContentService(); }
