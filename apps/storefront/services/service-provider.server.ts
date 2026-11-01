import 'server-only';
import {getOfferCatalogService} from './http/offers.server';
import {StorefrontContentService} from './content-service';
export function getCatalogService(){return getOfferCatalogService(process.env.BAZAR_STOREFRONT_INTEGRATION==='1');}
export function getContentService(){return new StorefrontContentService();}
