if(process.env.BAZAR_STOREFRONT_INTEGRATION==='1'||process.env.STOREFRONT_DATA_SOURCE==='storefront-test')throw new Error('Use the isolated storefront entry, never production');
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects(){return [
    ['/pages/delivery-payment','/help/delivery'],['/pages/returns','/help/returns'],['/pages/warranty','/help/warranty'],['/pages/order-tracking','/help/order-tracking'],['/pages/about','/about'],['/pages/partners','/help/partners'],['/blogs/news','/help/news'],['/pages/public-offer','/help/public-offer'],['/policies/privacy-policy','/help/privacy-policy'],['/policies/terms-of-service','/help/terms-of-service']
  ].map(([source,destination])=>({source,destination,permanent:true}));},
};

export default nextConfig;
