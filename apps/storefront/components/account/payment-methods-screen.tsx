'use client';
import {useServerCustomer} from '../server/customer-provider';
import {ServerAccountScreen} from './server-account';

import { useEffect, useMemo, useState } from 'react';
import { AccountIcon } from '@/components/account/account-icons';
import { useRequestState } from '@/components/account/use-request-state';
import { useAccountService } from '@/components/account/account-preview-provider';
import { AccountLoading, AccountPageHeading, AccountState } from '@/components/account/account-ui';
import type { AccountPaymentMethod, AccountScenario } from '@/domain/account/account';

function PaymentMethodsScreenPreview({ scenario }: { scenario: AccountScenario }) {
  const service = useAccountService(scenario);
  const [attempt, setAttempt] = useState(0);

  const requestKey = useMemo(() => ({ attempt, service }), [attempt, service]);
  const [methods, setMethods] = useRequestState<readonly AccountPaymentMethod[] | null>(requestKey, null);
  const [error, setError] = useRequestState(requestKey, '');

  useEffect(() => {
    let active = true;
    service.listPaymentMethods().then((value) => { if (active) setMethods(value); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити платіжні методи.');
    });
    return () => { active = false; };
  }, [attempt, service, setMethods, setError]);

  return (
    <>
      <AccountPageHeading kicker="Безпечна інтеграція" title="Платіжні методи" description="Цей етап не підключений до платіжного провайдера й не приймає реквізити карток." />
      {error ? (
        <AccountState error icon="warning" title="Розділ недоступний" text={error} action={<button className="account-button account-button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} />
      ) : !methods ? <AccountLoading label="Завантажуємо безпечний демонстраційний стан…" /> : methods.length === 0 ? (
        <AccountState icon="payments" title="Платіжних методів немає" text="Додавання стане доступним лише після вибору сертифікованого провайдера, юридичного погодження та серверної токенізації. BAZAR не просить вводити номер картки або CVV у цьому демо." />
      ) : (
        <div className="account-payment-grid">
          {methods.map((method) => <article className="account-payment-card" aria-label={`${method.brand}, закінчується на ${method.last4}`} key={method.id}><span className="account-payment-brand"><AccountIcon name="payments" /></span><h2 className="account-payment-card__title">{method.brand} •••• {method.last4}</h2><p className="account-payment-card__text">Тільки токенізоване відображення{method.isDefault ? ', основний метод' : ''}.</p></article>)}
        </div>
      )}
      <aside className="account-payment-safety" role="note"><strong>Безпека</strong><p>Повні номери карток, CVV, платіжні токени й облікові дані не збираються та не зберігаються цим застосунком.</p></aside>
    </>
  );
}

export function PaymentMethodsScreen({scenario}:{scenario:AccountScenario}){const {enabled,state}=useServerCustomer();return enabled?<ServerAccountScreen key={state.session?.user.id} section="payments"/>:<PaymentMethodsScreenPreview scenario={scenario}/>;}
