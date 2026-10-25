import { AccountIcon, type AccountIconName } from '@/components/account/account-icons';
import { AccountPageHeading } from '@/components/account/account-ui';

export function DeferredAccountScreen({
  title,
  description,
  icon,
  pending,
}: Readonly<{
  title: string;
  description: string;
  icon: AccountIconName;
  pending: string;
}>) {
  return (
    <>
      <AccountPageHeading kicker="Наступний етап" title={title} description={description} />
      <section className="account-deferred" aria-labelledby="deferred-title">
        <span className="account-deferred__icon"><AccountIcon name={icon} /></span>
        <h2 id="deferred-title">Функціональність запланована для Phase E2</h2>
        <p>{pending}</p>
        <p className="account-mutation-note" role="note">Зараз нічого не надсилається, не створюється й не зберігається. Це лише затверджена навігаційна оболонка.</p>
      </section>
    </>
  );
}
