'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { accountOrderStatusLabels, formatAccountDate } from '@/components/account/account-format';
import { AccountIcon } from '@/components/account/account-icons';
import { useRequestState } from '@/components/account/use-request-state';
import { useAccountService } from '@/components/account/account-preview-provider';
import { AccountLoading, AccountState, BackToOrdersLink } from '@/components/account/account-ui';
import type { AccountOrderDetail, AccountScenario } from '@/domain/account/account';
import { formatMoney } from '@/lib/money';

export function OrderDetailScreen({ id, scenario }: { id: string; scenario: AccountScenario }) {
  const service = useAccountService(scenario);
  const [attempt, setAttempt] = useState(0);

  const requestKey = useMemo(() => ({ attempt, id, service }), [attempt, id, service]);
  const [order, setOrder] = useRequestState<AccountOrderDetail | null | undefined>(requestKey, undefined);
  const [error, setError] = useRequestState(requestKey, '');

  useEffect(() => {
    let active = true;
    service.getOrder(id).then((value) => { if (active) setOrder(value); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити запис.');
    });
    return () => { active = false; };
  }, [attempt, id, service, setOrder, setError]);

  if (error) return <AccountState error icon="warning" title="Деталі недоступні" text={error} action={<button className="account-button account-button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} />;
  if (order === undefined) return <AccountLoading label="Завантажуємо деталі демонстраційного замовлення…" />;
  if (order === null) return <AccountState title="Замовлення не знайдено" text="Цього запису немає серед демонстраційних даних." action={<BackToOrdersLink />} />;

  return (
    <article className="account-order-detail" aria-label={`Деталі демо-замовлення ${order.number}`}>
      <header className="account-order-detail__header">
        <BackToOrdersLink />
        <div className="account-order-detail__title-row">
          <h1>Замовлення {order.number}</h1>
          <span className={`account-order-status account-order-status--${order.status}`}>{accountOrderStatusLabels[order.status]}</span>
        </div>
        <p className="account-page-text">Демонстраційний запис від {formatAccountDate(order.placedAt)}.</p>
      </header>
      <div className="account-order-detail__grid">
        <div className="account-order-detail__main">
          <section className="account-order-detail-card">
            <h2 className="account-order-detail-card__title">Товари</h2>
            <div className="account-order-detail-products">
              {order.items.map((item) => (
                <div className="account-order-detail-product" key={item.id}>
                  <span className="account-order-product__image" aria-hidden="true"><AccountIcon name="box" /></span>
                  <div><Link href={`/products/${item.product.handle}`}><strong>{item.product.title}</strong></Link><p className="account-muted">Кількість: {item.quantity}</p></div>
                  <div className="account-order-detail-product__price"><strong>{formatMoney(item.lineTotal)}</strong><span className="account-muted">демо-ціна</span></div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="account-order-detail__side" aria-label="Підсумок замовлення">
          <section className="account-order-detail-card">
            <h2 className="account-order-detail-card__title">Підсумок</h2>
            <dl className="account-order-detail-list">
              <div><dt>Номер</dt><dd>{order.number}</dd></div>
              <div><dt>Дата</dt><dd>{formatAccountDate(order.placedAt)}</dd></div>
              <div><dt>Товари</dt><dd>{order.itemCount}</dd></div>
              <div><dt>Разом</dt><dd>{formatMoney(order.total)}</dd></div>
            </dl>
          </section>
          <p className="account-order-detail__notice">Дані про оплату, продавця, доставку, відстеження та часову шкалу навмисно не показані: демо-сервіс не має перевірених фактів.</p>
        </aside>
      </div>
    </article>
  );
}
