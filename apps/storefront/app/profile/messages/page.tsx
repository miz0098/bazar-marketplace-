import { DeferredAccountScreen } from '@/components/account/deferred-account-screen';

export const metadata = { title: 'Повідомлення' };

export default function MessagesPage() {
  return <DeferredAccountScreen title="Повідомлення" description="Майбутній канал спілкування покупця з продавцями у межах BAZAR." icon="messages" pending="Потрібні авторизація, API діалогів, правила доступу, статуси доставки, вкладення, модерація та політика зберігання. Ми не вигадуємо переписки й не показуємо поле надсилання без цих меж." />;
}
