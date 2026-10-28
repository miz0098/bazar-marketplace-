'use client';
import {useServerCustomer} from '../server/customer-provider';
import {ServerAccountScreen} from './server-account';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRequestState } from '@/components/account/use-request-state';
import { useAccountService } from '@/components/account/account-preview-provider';
import { AccountLoading, AccountPageHeading, AccountState, DemoMutationNotice } from '@/components/account/account-ui';
import { hasAccountValidationErrors, validateAccountProfile, type AccountProfile, type AccountProfileDraft, type AccountProfileErrors, type AccountScenario } from '@/domain/account/account';

const emptyDraft: AccountProfileDraft = { firstName: '', lastName: '', email: '', birthday: '', gender: 'unspecified' };

function PersonalDataScreenPreview({ scenario }: { scenario: AccountScenario }) {
  const service = useAccountService(scenario);
  const [draft, setDraft] = useState<AccountProfileDraft>(emptyDraft);
  const [errors, setErrors] = useState<AccountProfileErrors>({});
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const requestKey = useMemo(() => ({ attempt, service }), [attempt, service]);
  const [profile, setProfile] = useRequestState<AccountProfile | null>(requestKey, null);
  const [loadError, setLoadError] = useRequestState(requestKey, '');

  useEffect(() => {
    let active = true;
    service.getProfile().then((value) => {
      if (!active) return;
      setProfile(value);
      setDraft({ firstName: value.firstName, lastName: value.lastName, email: value.email, birthday: value.birthday, gender: value.gender });
    }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : 'Не вдалося завантажити особисті дані.');
    });
    return () => { active = false; };
  }, [attempt, service, setProfile, setLoadError]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateAccountProfile(draft);
    setErrors(validation);
    setNotice('');
    setActionError('');
    if (hasAccountValidationErrors(validation)) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    try {
      const result = await service.updateProfile(draft);
      setProfile(result.value);
      setDraft({ firstName: result.value.firstName, lastName: result.value.lastName, email: result.value.email, birthday: result.value.birthday, gender: result.value.gender });
      setNotice('Демо-форму оновлено лише в памʼяті цієї сторінки. Дані не надіслані та зникнуть після перезавантаження.');
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Не вдалося оновити демо-форму.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AccountPageHeading kicker="Налаштування профілю" title="Особисті дані" description="Використовуйте лише вигадані значення: форма не змінює реальний акаунт." />
      {loadError ? (
        <AccountState error icon="warning" title="Дані недоступні" text={loadError} action={<button className="account-button account-button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} />
      ) : !profile ? <AccountLoading /> : (
        <div className="account-profile-layout">
          <aside className="account-profile-aside" aria-label="Демонстраційний профіль">
            <span className="account-profile-avatar" aria-hidden="true">{profile.firstName.slice(0, 1)}{profile.lastName.slice(0, 1)}</span>
            <strong>{profile.firstName} {profile.lastName}</strong>
            <span>{profile.maskedPhone}</span>
            <p className="account-profile-notice">Телефон показано лише в маскованому вигляді. Його зміна потребуватиме повторної перевірки на сервері й не входить до цього етапу.</p>
          </aside>
          <form className="account-panel account-form-grid" ref={formRef} noValidate onSubmit={submit}>
            {notice && <DemoMutationNotice>{notice}</DemoMutationNotice>}
            {actionError && <p className="account-action-status account-action-status--error" role="alert">{actionError}</p>}
            <label className="account-field"><span>Імʼя</span><input name="firstName" autoComplete="off" value={draft.firstName} aria-invalid={Boolean(errors.firstName)} aria-describedby={errors.firstName ? 'profile-first-name-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))} />{errors.firstName && <span className="account-field-error" id="profile-first-name-error">{errors.firstName}</span>}</label>
            <label className="account-field"><span>Прізвище</span><input name="lastName" autoComplete="off" value={draft.lastName} aria-invalid={Boolean(errors.lastName)} aria-describedby={errors.lastName ? 'profile-last-name-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))} />{errors.lastName && <span className="account-field-error" id="profile-last-name-error">{errors.lastName}</span>}</label>
            <label className="account-field"><span>Телефон</span><input value={profile.maskedPhone} readOnly aria-describedby="profile-phone-hint" /><span className="account-field-hint" id="profile-phone-hint">Недоступний для редагування в демо.</span></label>
            <label className="account-field"><span>Електронна пошта</span><input type="email" name="email" autoComplete="off" value={draft.email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'profile-email-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />{errors.email && <span className="account-field-error" id="profile-email-error">{errors.email}</span>}</label>
            <label className="account-field"><span>Дата народження</span><input type="date" name="birthday" value={draft.birthday} aria-invalid={Boolean(errors.birthday)} aria-describedby={errors.birthday ? 'profile-birthday-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, birthday: event.target.value }))} />{errors.birthday && <span className="account-field-error" id="profile-birthday-error">{errors.birthday}</span>}</label>
            <label className="account-field"><span>Звертання</span><select name="gender" value={draft.gender} aria-invalid={Boolean(errors.gender)} aria-describedby={errors.gender ? 'profile-gender-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, gender: event.target.value as AccountProfileDraft['gender'] }))}><option value="unspecified">Не вказувати</option><option value="female">Жіноче</option><option value="male">Чоловіче</option><option value="other">Інше</option></select>{errors.gender && <span className="account-field-error" id="profile-gender-error">{errors.gender}</span>}</label>
            <div className="account-form-actions"><button className="account-button account-button--primary" type="submit" disabled={busy}>Зберегти демо-зміни</button><button className="account-button account-button--ghost" type="button" onClick={() => { setDraft({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email, birthday: profile.birthday, gender: profile.gender }); setErrors({}); setNotice(''); }}>Скасувати зміни</button></div>
          </form>
        </div>
      )}
    </>
  );
}

export function PersonalDataScreen({scenario}:{scenario:AccountScenario}){const {enabled,state}=useServerCustomer();return enabled?<ServerAccountScreen key={state.session?.user.id} section="profile"/>:<PersonalDataScreenPreview scenario={scenario}/>;}
