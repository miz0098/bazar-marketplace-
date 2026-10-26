import { DeferredAccountScreen } from '@/components/account/deferred-account-screen';

export const metadata = { title: 'BAZAR-підтримка' };

export default function SupportPage() {
  return <DeferredAccountScreen title="BAZAR-підтримка" description="Навігаційна оболонка майбутнього центру допомоги." icon="support" pending="Потрібні погоджені канали підтримки, графік, SLA, авторизовані звернення, приватність та маршрути ескалації. Фіктивні контакти чи успішні заявки тут не показуються." />;
}
