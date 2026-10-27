import { Suspense } from 'react';
import { CheckoutRouter } from '@/components/checkout/checkout-router';

export const metadata = { title: 'Оформлення замовлення' };

export default function Page() {
  return <div className="container checkout-page"><Suspense fallback={<div className="loading-state" role="status"><span /><p>Завантажуємо оформлення…</p></div>}><CheckoutRouter /></Suspense></div>;
}
