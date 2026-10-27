'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { accountOrderStatusLabels, formatAccountDate } from '@/components/account/account-format';
import { AccountIcon } from '@/components/account/account-icons';
import { useRequestState } from '@/components/account/use-request-state';
import { useAccountService } from '@/components/account/account-preview-provider';
import { AccountLoading, AccountPageHeading, AccountState } from '@/components/account/account-ui';
import type { AccountOrderPage, AccountOrderStatus, AccountScenario } from '@/domain/account/account';
import { formatMoney } from '@/lib/money';

type OrderFilter = AccountOrderStatus | 'all';

const filters: readonly { value: OrderFilter; label: string }[] = [
 {value:'all',label:'Усі'},{value:'expected',label:'Нові'},{value:'confirmed',label:'Підтверджені'},{value:'preparing',label:'Готуються до відправлення'},
 {value:'shipped',label:'Відправлені'},{value:'delivered',label:'Доставлені'},{value:'canceled',label:'Скасовані'},{value:'system-cancelled',label:'Скасовані системою'},{value:'returning',label:'Повернення'},{value:'returned',label:'Повернені'},
];

export function OrdersScreen({ scenario }: { scenario: AccountScenario }) {
  const service = useAccountService(scenario);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [pageSize, setPageSize] = useState(5);
  const [attempt, setAttempt] = useState(0);

  const requestKey = useMemo(() => ({ attempt, filter, pageSize, service }), [attempt, filter, pageSize, service]);
  const [result, setResult] = useRequestState<AccountOrderPage | null>(requestKey, null);
  const [error, setError] = useRequestState(requestKey, '');

  useEffect(() => {
    let active = true;
    service.listOrders({ status: filter, pageSize }).then((value) => {
      if (active) setResult(value);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити замовлення.');
    });
    return () => { active = false; };
  }, [attempt, filter, pageSize, service, setResult, setError]);

  const selectFilter = (value: OrderFilter) => {
    setFilter(value);
    setPageSize(5);
  };

  return (
    <div className="account-orders-screen">
      <AccountPageHeading kicker="Історія покупок" title="Мої замовлення" description="Демонстраційні записи для перевірки майбутнього кабінету. Це не реальні замовлення." />
      <div className="account-order-tabs" role="group" aria-label="Фільтр за статусом замовлення">
        {filters.map((item) => (
          <button className={`account-order-tab${filter === item.value ? ' is-active' : ''}`} type="button" aria-pressed={filter === item.value} onClick={() => selectFilter(item.value)} key={item.value}>
            {item.label}{result ? ` (${result.counts[item.value]})` : ''}
          </button>
        ))}
      </div>
      {error ? (
        <AccountState error icon="warning" title="Замовлення не завантажилися" text={error} action={<button className="account-button account-button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} />
      ) : !result ? <AccountLoading label="Завантажуємо демонстраційні замовлення…" /> : result.items.length === 0 ? (
        <AccountState title="Тут поки немає замовлень" text={filter === 'all' ? 'У демо-профілі немає записів для показу.' : 'Оберіть інший статус, щоб переглянути доступні демонстраційні записи.'} action={<Link className="account-button account-button--primary" href="/catalog">Перейти до каталогу</Link>} />
      ) : (
        <>
          <div className="account-orders-list" aria-live="polite">
            {result.items.map((order) => (
              <article className="account-order-row" aria-label={`Демо-замовлення ${order.number}`} key={order.id}>
                <div className="account-order-row__product">
                  <span className="account-order-row__image" aria-hidden="true"><AccountIcon name="box" /></span>
                  <div className="account-order-row__info">
                    <h2>Замовлення {order.number}</h2>
                    <p>{formatAccountDate(order.placedAt)}</p>
                  </div>
                </div>
                <span className={`account-order-status account-order-status--${order.status} account-order-row__status`}>{accountOrderStatusLabels[order.status]}</span>
                <div className="account-order-row__summary"><strong>{formatMoney(order.total)}</strong><span>{order.itemCount} товар(и)</span></div>
                <Link className="account-order-row__details" href={`/profile/orders/${order.id}`}>Детальніше</Link>
              </article>
            ))}
          </div>
          {result.hasMore && <div className="account-orders-more"><button className="account-button account-button--secondary" type="button" onClick={() => setPageSize((value) => value + 5)}>Показати ще</button></div>}
        </>
      )}
    </div>
  );
}
