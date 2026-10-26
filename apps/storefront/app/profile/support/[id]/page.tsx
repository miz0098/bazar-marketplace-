import { SupportScreen } from '@/components/communication/support-screen';
import { readCommunicationScenario } from '@/domain/communication/communication';

export const metadata = { title: 'BAZAR-підтримка' };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string | string[] }> }) {
  const { id } = await params;
  const scenario = readCommunicationScenario((await searchParams).preview);
  return <SupportScreen id={id} scenario={scenario} key={scenario} />;
}
