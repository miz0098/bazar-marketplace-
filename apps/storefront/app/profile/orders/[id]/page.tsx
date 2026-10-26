import { readAccountScenario } from '@/components/account/account-format';
import { OrderDetailScreen } from '@/components/account/order-detail-screen';

export const metadata = { title: 'Деталі замовлення' };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string | string[] }> }) {
  return <OrderDetailScreen id={(await params).id} scenario={readAccountScenario((await searchParams).preview)} />;
}
