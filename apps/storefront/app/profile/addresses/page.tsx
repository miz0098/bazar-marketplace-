import { readAccountScenario } from '@/components/account/account-format';
import { AddressesScreen } from '@/components/account/addresses-screen';

export const metadata = { title: 'Улюблені адреси' };

export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return <AddressesScreen scenario={readAccountScenario((await searchParams).preview)} />;
}
