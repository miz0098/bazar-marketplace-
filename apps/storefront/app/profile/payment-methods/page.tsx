import { readAccountScenario } from '@/components/account/account-format';
import { PaymentMethodsScreen } from '@/components/account/payment-methods-screen';

export const metadata = { title: 'Платіжні методи' };

export default async function PaymentMethodsPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return <PaymentMethodsScreen scenario={readAccountScenario((await searchParams).preview)} />;
}
