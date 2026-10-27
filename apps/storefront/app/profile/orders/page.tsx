import { readAccountScenario } from '@/components/account/account-format';
import {CommerceOrdersRouter} from '@/components/account/commerce-orders';

export const metadata = { title: 'Мої замовлення' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return <CommerceOrdersRouter scenario={readAccountScenario((await searchParams).preview)} />;
}
