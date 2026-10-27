import 'server-only';
import {readApiClientConfig} from '@/lib/api-config';
import {createCatalogV2Client} from '@/lib/catalog-v2-client';
export const getCatalogV2Client=()=>createCatalogV2Client(readApiClientConfig(process.env));
