import { readAccountScenario } from '@/components/account/account-format';
import { OrdersScreen } from '@/components/account/orders-screen';

export const metadata = { title: 'Мої замовлення' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return <OrdersScreen scenario={readAccountScenario((await searchParams).preview)} />;
}
