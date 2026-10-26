import { readAccountScenario } from '@/components/account/account-format';
import { PersonalDataScreen } from '@/components/account/personal-data-screen';

export const metadata = { title: 'Особисті дані' };

export default async function PersonalDataPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return <PersonalDataScreen scenario={readAccountScenario((await searchParams).preview)} />;
}
