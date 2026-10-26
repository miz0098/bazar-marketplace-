import 'server-only';
import { createCatalogApiClient } from '@/lib/catalog-api-client';
import { readApiClientConfig } from '@/lib/api-config';
/** Explicit opt-in, not connected to service-provider.server.ts. No credentials leave the server. */
export function getCatalogApiClient() {
  return createCatalogApiClient(readApiClientConfig(process.env));
}
