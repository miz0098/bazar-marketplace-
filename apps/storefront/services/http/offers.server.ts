import 'server-only';
import {readApiClientConfig} from '../../lib/api-config';
import {createOffersClient} from '../../lib/offers-client';
import {createCatalogV2Client} from '../../lib/catalog-v2-client';
import {OfferCatalogService} from './offer-catalog-service';
export function getOfferCatalogService(integration=false){
 const config=readApiClientConfig(process.env);
 const preview=process.env.NODE_ENV==='development'&&Boolean(process.env.BAZAR_PREVIEW_STATE)&&config.baseUrl==='http://127.0.0.1:4000';
 if(integration&&(process.env.BAZAR_STOREFRONT_INTEGRATION!=='1'||process.env.BAZAR_BROWSER_INTEGRATION!=='1'||!preview&&!/^https:\/\/127\.0\.0\.1:\d+$/.test(config.baseUrl)))throw new Error('Use isolated HTTPS storefront runner');
 const transport:typeof fetch=(url,init)=>fetch(url,{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),...(integration&&!preview?{origin:config.baseUrl,'sec-fetch-site':'same-origin'}:{})}});
 return new OfferCatalogService(createOffersClient(config,transport),createCatalogV2Client(config,transport),integration);
}
