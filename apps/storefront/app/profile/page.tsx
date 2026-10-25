import { OverviewScreen } from '@/components/account/overview-screen';
import { readAccountScenario } from '@/components/account/account-format';

export const metadata = { title: 'Мій профіль' };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const scenario = readAccountScenario((await searchParams).preview);
  return <OverviewScreen scenario={scenario} />;
}
