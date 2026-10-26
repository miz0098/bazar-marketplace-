'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { accountDeliveryLabels } from '@/components/account/account-format';
import { AccountIcon } from '@/components/account/account-icons';
import { useRequestState } from '@/components/account/use-request-state';
import { useAccountService } from '@/components/account/account-preview-provider';
import { AccountLoading, AccountPageHeading, AccountState, DemoMutationNotice } from '@/components/account/account-ui';
import { hasAccountValidationErrors, validateAccountAddress, type AccountAddress, type AccountAddressDraft, type AccountAddressErrors, type AccountScenario } from '@/domain/account/account';

const emptyDraft: AccountAddressDraft = {
  label: '',
  recipientName: '',
  deliveryMethod: 'nova-poshta',
  city: '',
  location: '',
  makeDefault: false,
};

export function AddressesScreen({ scenario }: { scenario: AccountScenario }) {
  const service = useAccountService(scenario);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<AccountAddressDraft>(emptyDraft);
  const [errors, setErrors] = useState<AccountAddressErrors>({});
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const requestKey = useMemo(() => ({ attempt, service }), [attempt, service]);
  const [addresses, setAddresses] = useRequestState<readonly AccountAddress[] | null>(requestKey, null);
  const [loadError, setLoadError] = useRequestState(requestKey, '');

  useEffect(() => {
    let active = true;
    service.listAddresses().then((value) => { if (active) setAddresses(value); }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : 'Не вдалося завантажити адреси.');
    });
    return () => { active = false; };
  }, [attempt, service, setAddresses, setLoadError]);

  const openNew = () => {
    setEditingId('new');
    setDraft(emptyDraft);
    setErrors({});
    setActionError('');
    setNotice('');
    window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input')?.focus());
  };

  const openEdit = (address: AccountAddress) => {
    setEditingId(address.id);
    setDraft({ label: address.label, recipientName: address.recipientName, deliveryMethod: address.deliveryMethod, city: address.city, location: address.location, makeDefault: address.isDefault });
    setErrors({});
    setActionError('');
    setNotice('');
    window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input')?.focus());
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    const validation = validateAccountAddress(draft);
    setErrors(validation);
    setActionError('');
    if (hasAccountValidationErrors(validation)) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    try {
      const result = editingId === 'new' ? await service.addAddress(draft) : await service.updateAddress(editingId, draft);
      setAddresses(result.value);
      setEditingId(null);
      setNotice(editingId === 'new' ? 'Адресу додано лише до поточного демо-перегляду.' : 'Адресу змінено лише у поточному демо-перегляді.');
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Не вдалося виконати демо-дію.');
    } finally {
      setBusy(false);
    }
  };

  const mutate = async (operation: () => Promise<{ value: readonly AccountAddress[] }>, success: string) => {
    setBusy(true);
    setActionError('');
    try {
      const result = await operation();
      setAddresses(result.value);
      setEditingId(null);
      setNotice(success);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Не вдалося виконати демо-дію.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AccountPageHeading kicker="Доставка" title="Улюблені адреси" description="Демонстраційні адреси не перевіряються службами доставки й не зберігаються в акаунті." actions={<button className="account-button account-button--primary" type="button" onClick={openNew}><AccountIcon name="plus" />Додати адресу</button>} />
      {notice && <DemoMutationNotice>{notice} Зміна скинеться після оновлення сторінки.</DemoMutationNotice>}
      {actionError && <p className="account-action-status account-action-status--error" role="alert">{actionError}</p>}
      {editingId && (
        <form className="account-address-form account-panel" ref={formRef} noValidate onSubmit={submit}>
          <div className="account-panel__head"><div><h2 className="account-panel__title">{editingId === 'new' ? 'Нова адреса' : 'Редагування адреси'}</h2><p className="account-panel__text">Відділення та адреси не завантажуються від перевізників. Вводьте лише вигадані дані.</p></div></div>
          <div className="account-form-grid">
            <label className="account-field"><span>Назва адреси</span><input value={draft.label} placeholder="Наприклад, Дім" aria-invalid={Boolean(errors.label)} aria-describedby={errors.label ? 'address-label-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} />{errors.label && <span className="account-field-error" id="address-label-error">{errors.label}</span>}</label>
            <label className="account-field"><span>Отримувач</span><input value={draft.recipientName} autoComplete="off" aria-invalid={Boolean(errors.recipientName)} aria-describedby={errors.recipientName ? 'address-recipient-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, recipientName: event.target.value }))} />{errors.recipientName && <span className="account-field-error" id="address-recipient-error">{errors.recipientName}</span>}</label>
            <label className="account-field"><span>Спосіб доставки</span><select value={draft.deliveryMethod} aria-invalid={Boolean(errors.deliveryMethod)} aria-describedby={errors.deliveryMethod ? 'address-method-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, deliveryMethod: event.target.value as AccountAddressDraft['deliveryMethod'] }))}><option value="nova-poshta">Нова пошта</option><option value="meest">Meest</option><option value="courier">Курʼєрська адреса</option></select>{errors.deliveryMethod && <span className="account-field-error" id="address-method-error">{errors.deliveryMethod}</span>}</label>
            <label className="account-field"><span>Населений пункт</span><input value={draft.city} autoComplete="off" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'address-city-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} />{errors.city && <span className="account-field-error" id="address-city-error">{errors.city}</span>}</label>
            <label className="account-field account-field--full"><span>{draft.deliveryMethod === 'courier' ? 'Адреса' : 'Відділення або поштомат'}</span><input value={draft.location} autoComplete="off" aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? 'address-location-error' : 'address-location-hint'} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} />{errors.location ? <span className="account-field-error" id="address-location-error">{errors.location}</span> : <span className="account-field-hint" id="address-location-hint">Без автоматичного пошуку чи перевірки перевізником.</span>}</label>
            <label className="account-field account-field--full"><span><input type="checkbox" checked={Boolean(draft.makeDefault)} onChange={(event) => setDraft((current) => ({ ...current, makeDefault: event.target.checked }))} /> Зробити основною</span></label>
            <div className="account-form-actions"><button className="account-button account-button--primary" type="submit" disabled={busy}>Зберегти демо-адресу</button><button className="account-button account-button--ghost" type="button" onClick={() => setEditingId(null)}>Скасувати</button></div>
          </div>
        </form>
      )}
      {loadError ? (
        <AccountState error icon="warning" title="Адреси недоступні" text={loadError} action={<button className="account-button account-button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} />
      ) : !addresses ? <AccountLoading label="Завантажуємо демонстраційні адреси…" /> : addresses.length === 0 ? (
        <AccountState icon="addresses" title="Збережених адрес немає" text="Додайте вигадану адресу, щоб перевірити форму. Вона залишиться лише до перезавантаження." action={<button className="account-button account-button--primary" type="button" onClick={openNew}>Додати демо-адресу</button>} />
      ) : (
        <div className="account-address-grid">
          {addresses.map((address) => (
            <article className="account-address-card" aria-label={`Адреса ${address.label}`} key={address.id}>
              <div className="account-address-card__head"><div><h2 className="account-address-card__title">{address.label}</h2>{address.isDefault && <span className="account-pill account-pill--blue">Основна</span>}</div></div>
              <p className="account-address-card__text"><strong>{address.recipientName}</strong><br />{address.city}, {address.location}</p>
              <p className="account-address-card__meta">{accountDeliveryLabels[address.deliveryMethod]}</p>
              <div className="account-address-card__actions">
                <button className="account-button account-button--secondary" type="button" onClick={() => openEdit(address)}><AccountIcon name="edit" />Редагувати</button>
                {!address.isDefault && <button className="account-button account-button--ghost" type="button" disabled={busy} onClick={() => void mutate(() => service.setDefaultAddress(address.id), `${address.label} позначено основною лише в демо.`)}>Зробити основною</button>}
                <button className="account-button account-button--danger" type="button" disabled={busy} onClick={() => void mutate(() => service.removeAddress(address.id), `${address.label} прибрано лише з демо.`)}><AccountIcon name="trash" />Видалити</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
