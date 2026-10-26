import { SupportScreen } from '@/components/communication/support-screen';
import { readCommunicationScenario } from '@/domain/communication/communication';

export const metadata = { title: 'BAZAR-підтримка' };
export default async function Page({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const scenario = readCommunicationScenario((await searchParams).preview);
  return <SupportScreen scenario={scenario} key={scenario} />;
}
