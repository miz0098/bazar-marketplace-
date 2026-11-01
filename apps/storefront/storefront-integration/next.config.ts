import {createRequire} from 'node:module';
const {storefrontRedirects}=createRequire(import.meta.url)('../lib/redirects.cjs') as typeof import('../lib/redirects.cjs');
import path from 'node:path';
if(process.env.BAZAR_STOREFRONT_INTEGRATION!=='1'||process.env.BAZAR_BROWSER_INTEGRATION!=='1')throw new Error('Isolated storefront entry only');
const config={reactStrictMode:true,async redirects(){return storefrontRedirects();},turbopack:{root:path.resolve(import.meta.dirname,'..')}};export default config;
