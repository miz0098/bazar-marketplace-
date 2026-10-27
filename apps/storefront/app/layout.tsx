import {ServerCustomerProvider,ServerCustomerStatus} from '@/components/server/customer-provider';
import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import {WishlistProvider} from '@/components/product/wishlist-provider';
import { CartProvider } from '@/components/cart/cart-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { getCatalogService } from '@/services/service-provider.server';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BAZAR — маркетплейс', template: '%s — BAZAR' },
  description: 'Самостійна вітрина BAZAR. Фундамент міграції з Shopify.',
};

export default async function RootLayout({ children, integration=false }: Readonly<{ children: React.ReactNode;integration?:boolean }>) {
  const catalog = getCatalogService();
  const [categoryState, productState] = await Promise.allSettled([catalog.getCategories(), catalog.listProducts({ limit: 24 })]);
  const categories=categoryState.status==='fulfilled'?categoryState.value:[];
  const products=productState.status==='fulfilled'?productState.value:{items:[]};
  const shellError=categoryState.status==='rejected'||productState.status==='rejected';
  return (
    <html lang="uk">
      <body>
        <ServerCustomerProvider enabled={integration}><WishlistProvider><CartProvider products={products.items}>
          <AuthProvider>
            <a className="skip-link" href="#main-content">Перейти до вмісту</a>
            <SiteHeader categories={categories} products={products.items} />
            <main id="main-content"><ServerCustomerStatus/>{shellError&&<p className="demo-disclaimer" role="alert">Каталог недоступний. Оновіть сторінку, щоб повторити запит.</p>}{process.env.STOREFRONT_DATA_SOURCE==="catalog-v2-preview"&&<p className="demo-disclaimer" role="status">Catalog v2 — тестовий перегляд API. Купівля та серверне обране ще не підключені.</p>}{children}</main>
            <SiteFooter />
          </AuthProvider>
        </CartProvider></WishlistProvider></ServerCustomerProvider>
      </body>
    </html>
  );
}
