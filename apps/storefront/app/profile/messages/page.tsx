import { MessagesScreen } from '@/components/communication/messages-screen';
import { readCommunicationScenario } from '@/domain/communication/communication';

export const metadata = { title: 'Повідомлення' };
export default async function Page({ searchParams }: { searchParams: Promise<{ preview?: string | string[];id?:string }> }) {
  const scenario = readCommunicationScenario((await searchParams).preview);
  return <MessagesScreen id={(await searchParams).id} scenario={scenario} key={scenario} />;
}
