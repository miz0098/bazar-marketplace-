import path from 'node:path';
if(process.env.BAZAR_STOREFRONT_INTEGRATION!=='1'||process.env.BAZAR_BROWSER_INTEGRATION!=='1')throw new Error('Isolated storefront entry only');
const config={reactStrictMode:true,turbopack:{root:path.resolve(import.meta.dirname,'..')}};export default config;
