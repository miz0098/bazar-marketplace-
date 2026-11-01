import 'server-only';
import {isolatedCatalogTransport} from './isolated-transport.server';
import {readApiClientConfig} from '../../lib/api-config';
import {createOffersClient} from '../../lib/offers-client';
import {createCatalogV2Client} from '../../lib/catalog-v2-client';
import {OfferCatalogService} from './offer-catalog-service';
export function getOfferCatalogService(integration=false){
 const config=readApiClientConfig({...process.env,BAZAR_API_BASE_URL:process.env.BAZAR_API_BASE_URL??"https://127.0.0.1:4000"});
 if(integration&&(process.env.BAZAR_STOREFRONT_INTEGRATION!=='1'||process.env.BAZAR_BROWSER_INTEGRATION!=='1'||!/^https:\/\/127\.0\.0\.1:\d+$/.test(config.baseUrl)))throw new Error('Use isolated HTTPS storefront runner');
 const transport=integration?isolatedCatalogTransport(config.baseUrl,process.env.BAZAR_PUBLIC_ORIGIN??config.baseUrl):fetch;
 return new OfferCatalogService(createOffersClient(config,transport),createCatalogV2Client(config,transport),true);
}
