import { MessagesScreen } from '@/components/communication/messages-screen';
import { readCommunicationScenario } from '@/domain/communication/communication';

export const metadata = { title: 'Повідомлення' };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string | string[] }> }) {
  const { id } = await params;
  const scenario = readCommunicationScenario((await searchParams).preview);
  return <MessagesScreen id={id} scenario={scenario} key={scenario} />;
}
