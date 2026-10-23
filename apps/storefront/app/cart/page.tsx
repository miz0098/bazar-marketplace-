import { CartPage } from '@/components/cart/cart-page';

export const metadata = { title: 'Кошик' };

export default function Page() {
  return <div className="container cart-page"><CartPage /></div>;
}
