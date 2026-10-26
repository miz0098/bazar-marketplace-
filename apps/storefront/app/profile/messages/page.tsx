import { MessagesScreen } from '@/components/communication/messages-screen';
import { readCommunicationScenario } from '@/domain/communication/communication';

export const metadata = { title: 'Повідомлення' };
export default async function Page({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const scenario = readCommunicationScenario((await searchParams).preview);
  return <MessagesScreen scenario={scenario} key={scenario} />;
}
