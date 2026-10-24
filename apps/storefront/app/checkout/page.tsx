import { Suspense } from 'react';
import { CheckoutPage } from '@/components/checkout/checkout-page';

export const metadata = { title: 'Оформлення замовлення' };

export default function Page() {
  return <div className="container checkout-page"><Suspense fallback={<div className="loading-state" role="status"><span /><p>Завантажуємо оформлення…</p></div>}><CheckoutPage /></Suspense></div>;
}
