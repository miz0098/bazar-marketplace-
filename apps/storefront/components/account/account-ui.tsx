import Link from 'next/link';
import { AccountIcon, type AccountIconName } from '@/components/account/account-icons';

export function AccountPageHeading({
  kicker,
  title,
  description,
  actions,
}: Readonly<{
  kicker: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}>) {
  return (
    <header className="account-page-head">
      <div>
        <p className="account-kicker">{kicker}</p>
        <h1 className="account-page-title">{title}</h1>
        <p className="account-page-text">{description}</p>
      </div>
      {actions && <div className="account-page-actions">{actions}</div>}
    </header>
  );
}

export function AccountLoading({ label = 'Завантажуємо демонстраційні дані…' }: { label?: string }) {
  return (
    <div className="account-loading" role="status" aria-live="polite">
      <span className="account-skeleton account-skeleton--title" />
      <span className="account-skeleton account-skeleton--line" />
      <div className="account-skeleton-grid"><span /><span /><span /></div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function AccountState({
  icon = 'box',
  title,
  text,
  action,
  error = false,
}: Readonly<{
  icon?: AccountIconName;
  title: string;
  text: string;
  action?: React.ReactNode;
  error?: boolean;
}>) {
  return (
    <section className={`account-state${error ? ' account-state--error' : ''}`} role={error ? 'alert' : undefined}>
      <span className="account-state__icon"><AccountIcon name={icon} /></span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </section>
  );
}

export function DemoMutationNotice({ children }: Readonly<{ children: React.ReactNode }>) {
  return <p className="account-mutation-note" role="status">{children}</p>;
}

export function BackToOrdersLink() {
  return <Link className="account-back-link" href="/profile/orders">← До замовлень</Link>;
}
