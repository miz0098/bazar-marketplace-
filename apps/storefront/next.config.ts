import {createRequire} from 'node:module';
const {storefrontRedirects}=createRequire(import.meta.url)('./lib/redirects.cjs') as typeof import('./lib/redirects.cjs');
if(process.env.BAZAR_FULL_SIMULATION==='1')throw new Error('Simulation requires isolated storefront');
if(process.env.BAZAR_STOREFRONT_INTEGRATION==='1'||process.env.STOREFRONT_DATA_SOURCE==='storefront-test')throw new Error('Use the isolated storefront entry, never production');
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects(){return storefrontRedirects();},
};

export default nextConfig;
