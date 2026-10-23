import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BAZAR — маркетплейс', template: '%s — BAZAR' },
  description: 'Самостійна вітрина BAZAR. Фундамент міграції з Shopify.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>
        <a className="skip-link" href="#main-content">Перейти до вмісту</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
