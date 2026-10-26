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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const catalog = getCatalogService();
  const [categories, products] = await Promise.all([catalog.getCategories(), catalog.listProducts({ limit: 24 })]);
  return (
    <html lang="uk">
      <body>
        <WishlistProvider><CartProvider products={products.items}>
          <AuthProvider>
            <a className="skip-link" href="#main-content">Перейти до вмісту</a>
            <SiteHeader categories={categories} products={products.items} />
            <main id="main-content">{children}</main>
            <SiteFooter />
          </AuthProvider>
        </CartProvider></WishlistProvider>
      </body>
    </html>
  );
}
