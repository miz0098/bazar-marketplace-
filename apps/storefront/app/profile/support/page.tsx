import { SupportScreen } from '@/components/communication/support-screen';
import { readCommunicationScenario } from '@/domain/communication/communication';

export const metadata = { title: 'BAZAR-підтримка' };
export default async function Page({ searchParams }: { searchParams: Promise<{ preview?: string | string[];order?:string;request?:string }> }) {
  const scenario = readCommunicationScenario((await searchParams).preview);
  return <SupportScreen orderContext={(await searchParams).order} requestContext={(await searchParams).request} scenario={scenario} key={scenario} />;
}
