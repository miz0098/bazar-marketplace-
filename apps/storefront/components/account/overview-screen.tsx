'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AccountIcon } from '@/components/account/account-icons';
import { useAccountService } from '@/components/account/account-preview-provider';
import { AccountLoading, AccountPageHeading, AccountState } from '@/components/account/account-ui';
import type { AccountScenario } from '@/domain/account/account';

interface OverviewData {
  readonly name: string;
  readonly orders: number;
  readonly wishlist: number;
  readonly reviews: number;
}

export function OverviewScreen({ scenario }: { scenario: AccountScenario }) {
  const service = useAccountService(scenario);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    Promise.all([
      service.getProfile(),
      service.listOrders({ pageSize: 1 }),
      service.listWishlist({ pageSize: 1 }),
      service.listReviews(),
    ]).then(([profile, orders, wishlist, reviews]) => {
      if (active) setData({ name: profile.firstName, orders: orders.total, wishlist: wishlist.total, reviews: reviews.length });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити демо-профіль.');
    });
    return () => { active = false; };
  }, [attempt, service]);

  return (
    <>
      <AccountPageHeading
        kicker="Мій BAZAR"
        title={data ? `Вітаємо, ${data.name}` : 'Ваш профіль'}
        description="Швидкий доступ до розділів демонстраційного кабінету покупця."
      />
      {error ? (
        <AccountState error icon="warning" title="Профіль тимчасово недоступний" text={error} action={<button className="account-button account-button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} />
      ) : !data ? <AccountLoading /> : (
        <>
          <section className="account-stats-grid" aria-label="Показники демонстраційного профілю">
            <Link className="account-stat-card" href="/profile/orders"><span className="account-stat-card__icon"><AccountIcon name="orders" /></span><span><strong className="account-stat-card__value">{data.orders}</strong><span className="account-stat-card__label">Замовлення</span></span></Link>
            <Link className="account-stat-card" href="/profile/wishlist"><span className="account-stat-card__icon"><AccountIcon name="wishlist" /></span><span><strong className="account-stat-card__value">{data.wishlist}</strong><span className="account-stat-card__label">В обраному</span></span></Link>
            <Link className="account-stat-card" href="/profile/reviews"><span className="account-stat-card__icon"><AccountIcon name="reviews" /></span><span><strong className="account-stat-card__value">{data.reviews}</strong><span className="account-stat-card__label">Мої відгуки</span></span></Link>
          </section>
          <section className="account-panel account-overview-panel">
            <div>
              <p className="account-kicker">Важливо</p>
              <h2>Це безпечний перегляд інтерфейсу</h2>
              <p>Записи на цій сторінці вигадані. Вхід не виконано, а сервер BAZAR не отримує зміни.</p>
            </div>
            <Link className="account-button account-button--secondary" href="/profile/personal-data">Переглянути особисті дані</Link>
          </section>
        </>
      )}
    </>
  );
}
