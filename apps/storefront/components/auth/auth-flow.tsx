'use client';
import {useServerCustomer} from '../server/customer-provider';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { OtpInput } from '@/components/auth/otp-input';
import {
  extractNationalDigits,
  formatNationalPhone,
  normalizeUkrainianPhone,
  validateRegistrationProfile,
  type RegistrationProfile,
  type RegistrationProfileErrors,
} from '@/domain/identity/identity';
import {
  IdentityServiceError,
  type IdentityChallenge,
  type IdentityIntent,
  type IdentityService,
} from '@/services/contracts/identity';
import { demoIdentityService } from '@/services/mock/identity-service';

type AuthStep = 'phone' | 'code' | 'profile' | 'complete';
type AuthSurface = 'modal' | 'page';

const emptyOtp = (): [string, string, string, string, string, string] => ['', '', '', '', '', ''];
const emptyProfile = (): RegistrationProfile => ({ firstName: '', lastName: '', email: '', termsAccepted: false });

interface AuthFlowProps {
  readonly idPrefix: string;
  readonly initialIntent: IdentityIntent;
  readonly onClose?: () => void;
  readonly service?: IdentityService;
  readonly surface: AuthSurface;
}

function errorMessage(error: unknown, server=false): string {
  if (!(error instanceof IdentityServiceError)) return 'Сталася неочікувана помилка. Спробуйте ще раз.';
  switch (error.code) {
    case 'invalid-code': if(server)return 'Код або дані не підтверджені сервером.';return 'Код не підтверджено. Для демо використайте 123456.';
    case 'expired-code': return 'Термін дії демо-коду минув. Повторіть демо-запит.';
    case 'rate-limited': return `Забагато спроб. Повторіть через ${error.retryAfterSeconds ?? 60} с.`;
    case 'network': return 'Помилка мережі. SMS не надсилалося, вхід не виконано.';
    case 'unavailable': return 'Демо-сервіс тимчасово недоступний. Почніть перевірку знову.';
  }
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function AuthFlowImplementation({ idPrefix, initialIntent, onClose, service = demoIdentityService, surface }: AuthFlowProps) {
  const server=service.mode==='server-test';
  const rootRef = useRef<HTMLDivElement>(null);
  const requestRevisionRef = useRef(0);
  const [intent, setIntent] = useState<IdentityIntent>(initialIntent);
  const [step, setStep] = useState<AuthStep>('phone');
  const [nationalDigits, setNationalDigits] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [challenge, setChallenge] = useState<IdentityChallenge | null>(null);
  const [otp, setOtp] = useState<readonly string[]>(emptyOtp());
  const [codeError, setCodeError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [verificationCountdown, setVerificationCountdown] = useState(0);
  const [profile, setProfile] = useState<RegistrationProfile>(emptyProfile());
  const [profileErrors, setProfileErrors] = useState<RegistrationProfileErrors>({});
  const [loadingMessage, setLoadingMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const busy = Boolean(loadingMessage);
  const titleId = `${idPrefix}-title`;
  const demoNoteId = `${idPrefix}-demo-note`;
  const phoneErrorId = `${idPrefix}-phone-error`;
  const codeErrorId = `${idPrefix}-code-error`;
  const otpLabelId = `${idPrefix}-otp-label`;

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLElement>('[data-auth-initial-focus]')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [step, intent]);

  const resendCountdownActive = (step === 'code'||step === 'phone') && countdown > 0;
  const verificationCountdownActive = step === 'code' && verificationCountdown > 0;

  useEffect(() => {
    if (!resendCountdownActive) return;
    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge?.id, resendCountdownActive]);

  useEffect(() => {
    if (!verificationCountdownActive) return;
    const timer = window.setInterval(() => {
      setVerificationCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge?.id, verificationCountdownActive]);

  const resetToPhone = (nextIntent: IdentityIntent = intent) => {
    requestRevisionRef.current += 1;
    setIntent(nextIntent);
    setStep('phone');
    setNationalDigits('');
    setPhoneError('');
    setChallenge(null);
    setOtp(emptyOtp());
    setCodeError('');
    setCountdown(0);
    setVerificationCountdown(0);
    setProfile(emptyProfile());
    setProfileErrors({});
    setLoadingMessage('');
    setStatusMessage('');
  };

  const submitPhone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phone = normalizeUkrainianPhone(nationalDigits);
    if (!phone) {
      setPhoneError('Введіть 9 цифр українського номера після +380.');
      rootRef.current?.querySelector<HTMLInputElement>('[data-auth-phone-input]')?.focus();
      return;
    }

    setPhoneError('');
    setStatusMessage('');
    setLoadingMessage('Готуємо безпечний демо-перегляд…');
    const requestRevision = ++requestRevisionRef.current;
    try {
      const nextChallenge = await service.startChallenge({ phone, intent });
      if (requestRevision !== requestRevisionRef.current) return;
      setChallenge(nextChallenge);
      setOtp(emptyOtp());
      setCountdown(nextChallenge.resendAfterSeconds);
      setVerificationCountdown(0);
      setStep('code');
    } catch (error) {
      if (requestRevision !== requestRevisionRef.current) return;
      setPhoneError(errorMessage(error,server));
      if(error instanceof IdentityServiceError&&error.code==='rate-limited')setCountdown(error.retryAfterSeconds??60);
    } finally {
      if (requestRevision === requestRevisionRef.current) setLoadingMessage('');
    }
  };

  const submitCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challenge) {
      setCodeError('Демо-виклик відсутній. Поверніться до введення номера.');
      return;
    }
    const code = otp.join('');
    if (!/^\d{6}$/.test(code)) {
      setCodeError('Введіть усі 6 цифр коду.');
      rootRef.current?.querySelector<HTMLInputElement>('.auth-otp__input')?.focus();
      return;
    }

    setCodeError('');
    setStatusMessage('');
    setLoadingMessage('Перевіряємо демо-стан…');
    const requestRevision = ++requestRevisionRef.current;
    try {
      const result = await service.verifyChallenge({ challengeId: challenge.id, code });
      if (requestRevision !== requestRevisionRef.current) return;
      setVerificationCountdown(0);
      setStep(result.next === 'profile' ? 'profile' : 'complete');
      if(result.status==='profile-required')setStatusMessage('Код ще не перевірено: сервер перевірить його разом із тестовими даними реєстрації.');
    } catch (error) {
      if (requestRevision !== requestRevisionRef.current) return;
      setCodeError(errorMessage(error,server));
      if (error instanceof IdentityServiceError && error.code === 'rate-limited') {
        setVerificationCountdown(error.retryAfterSeconds ?? 60);
      }
      if (error instanceof IdentityServiceError && error.code === 'expired-code') setCountdown(0);
      rootRef.current?.querySelector<HTMLInputElement>('.auth-otp__input')?.focus();
    } finally {
      if (requestRevision === requestRevisionRef.current) setLoadingMessage('');
    }
  };

  const resend = async () => {
    if (!challenge || countdown > 0 || busy) return;
    setCodeError('');
    setStatusMessage('');
    setLoadingMessage('Оновлюємо демо-виклик…');
    const requestRevision = ++requestRevisionRef.current;
    try {
      const nextChallenge = await service.resendChallenge({ challengeId: challenge.id });
      if (requestRevision !== requestRevisionRef.current) return;
      setChallenge(nextChallenge);
      setOtp(emptyOtp());
      setCountdown(nextChallenge.resendAfterSeconds);
      setVerificationCountdown(0);
      setStatusMessage('Демо-запит оновлено. SMS не надсилалося.');
    } catch (error) {
      if (requestRevision !== requestRevisionRef.current) return;
      setCodeError(errorMessage(error,server));
    } finally {
      if (requestRevision === requestRevisionRef.current) setLoadingMessage('');
    }
  };

  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challenge) return;
    const errors = validateRegistrationProfile(profile);
    setProfileErrors(errors);
    if (Object.keys(errors).length) {
      window.requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setLoadingMessage(server?'Перевіряємо код і створюємо ізольований тестовий акаунт…':'Перевіряємо форму без створення акаунту…');
    setStatusMessage('');
    const requestRevision = ++requestRevisionRef.current;
    try {
      await service.previewRegistration({ challengeId: challenge.id, profile });
      if (requestRevision !== requestRevisionRef.current) return;
      setStep('complete');
    } catch (error) {
      if (requestRevision !== requestRevisionRef.current) return;
      setStatusMessage(errorMessage(error,server));
    } finally {
      if (requestRevision === requestRevisionRef.current) setLoadingMessage('');
    }
  };

  const demoNote = (
    <p className="auth-demo-note" id={demoNoteId}>
      {server?'Ізольоване тестування: справжній серверний OTP і сесія, жодних реальних SMS. Використовуйте лише синтетичні дані.':<>Демо-перегляд: SMS не надсилається, вхід і сесія не створюються. Для переходу між екранами використайте код <strong>123456</strong>.</>}
    </p>
  );

  return (
    <div className="auth-widget" ref={rootRef} aria-busy={busy} data-auth-surface={surface}>
      {step === 'phone' && (
        <article className="auth-card">
          <AuthIcon name="phone" />
          <h1 className="auth-card__title" id={titleId}>{intent === 'login' ? 'Вхід' : 'Створити акаунт'}</h1>
          <p className="auth-card__text">
            {intent === 'login' ? 'Введіть номер телефону, щоб перейти до перевірки коду' : 'Введіть номер телефону, щоб почати реєстрацію'}
          </p>
          <form className="auth-flow" noValidate onSubmit={submitPhone}>
            <div className="auth-phone-field">
              <label className="auth-phone-field__label" htmlFor={`${idPrefix}-phone`}>Номер телефону</label>
              <div className="auth-phone-field__control">
                <span className="auth-phone-field__prefix">+380</span>
                <input
                  className="auth-phone-field__input"
                  id={`${idPrefix}-phone`}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={16}
                  placeholder="XX XXX XX XX"
                  aria-describedby={`${phoneErrorId} ${demoNoteId}`}
                  aria-invalid={Boolean(phoneError)}
                  data-auth-phone-input
                  data-auth-initial-focus
                  value={formatNationalPhone(nationalDigits)}
                  onChange={(event) => {
                    const nextDigits = extractNationalDigits(event.currentTarget.value);
                    if (nextDigits === null) {
                      setPhoneError('Використовуйте лише цифри українського номера.');
                      return;
                    }
                    setNationalDigits(nextDigits);
                    setPhoneError('');
                  }}
                />
              </div>
              <p className="auth-error" id={phoneErrorId} aria-live="polite">{phoneError}</p>
            </div>
            <button className="auth-primary" type="submit" disabled={busy||countdown>0}>{busy ? 'Зачекайте…' : countdown>0?`Повторити через ${countdown} с`:'Продовжити'}</button>
            {loadingMessage && <p className="auth-status" role="status">{loadingMessage}</p>}
            {demoNote}
          </form>
          <p className="auth-card__bottom">
            {intent === 'login' ? 'Ще не маєте акаунту? ' : 'Вже маєте акаунт? '}
            {surface === 'modal' ? (
              <button className="auth-link" type="button" disabled={busy} onClick={() => resetToPhone(intent === 'login' ? 'register' : 'login')}>
                {intent === 'login' ? 'Зареєструватися' : 'Увійти'}
              </button>
            ) : (
              <Link
                className="auth-link"
                href={intent === 'login' ? '/account/register' : '/account/login'}
                aria-disabled={busy}
                tabIndex={busy ? -1 : undefined}
                onClick={(event) => { if (busy) event.preventDefault(); }}
              >
                {intent === 'login' ? 'Зареєструватися' : 'Увійти'}
              </Link>
            )}
          </p>
        </article>
      )}

      {step === 'code' && challenge && (
        <article className="auth-card">
          <AuthIcon name="sms" />
          <h1 className="auth-card__title" id={titleId}>Код з SMS</h1>
          <p className="auth-card__text">У демо-режимі SMS не надсилається. Перевірте інтерфейс для номера</p>
          <p className="auth-card__phone">{challenge.maskedPhone}</p>
          <button className="auth-link" type="button" disabled={busy} onClick={() => resetToPhone(intent)}>Змінити номер</button>
          <form className="auth-flow" noValidate onSubmit={submitCode}>
            <OtpInput
              errorId={codeErrorId}
              invalid={Boolean(codeError)}
              labelId={otpLabelId}
              value={otp}
              onChange={(next) => { setOtp(next); setCodeError(''); setStatusMessage(''); }}
            />
            <p className="auth-error" id={codeErrorId} role={codeError ? 'alert' : undefined}>{codeError}</p>
            <button className="auth-primary" type="submit" disabled={busy || verificationCountdown > 0 || otp.join('').length !== 6}>
              {busy
                ? 'Зачекайте…'
                : verificationCountdown > 0
                  ? `Повторіть через ${formatCountdown(verificationCountdown)}`
                  : intent === 'login' ? 'Увійти' : 'Продовжити'}
            </button>
            <button className="auth-secondary" type="button" disabled={busy || countdown > 0} onClick={resend}>
              {countdown > 0 ? `Надіслати повторно через ${formatCountdown(countdown)}` : 'Повторити демо-запит'}
            </button>
            {(loadingMessage || statusMessage) && <p className="auth-status" role="status" aria-live="polite">{loadingMessage || statusMessage}</p>}
            {demoNote}
          </form>
        </article>
      )}

      {step === 'profile' && (
        <article className="auth-card">
          <AuthIcon name="user" />
          <h1 className="auth-card__title" id={titleId}>Особиста інформація</h1>
          <p className="auth-card__text">Заповніть затверджені поля реєстрації. Дані не зберігаються.</p>
          <form className="auth-flow" noValidate onSubmit={submitProfile}>
            <div className="auth-profile-row">
              <ProfileField id={`${idPrefix}-first-name`} label="Імʼя" value={profile.firstName} error={profileErrors.firstName} autoComplete="given-name" initialFocus onChange={(firstName) => { setProfile({ ...profile, firstName }); setProfileErrors({ ...profileErrors, firstName: undefined }); }} />
              <ProfileField id={`${idPrefix}-last-name`} label="Прізвище" value={profile.lastName} error={profileErrors.lastName} autoComplete="family-name" onChange={(lastName) => { setProfile({ ...profile, lastName }); setProfileErrors({ ...profileErrors, lastName: undefined }); }} />
            </div>
            <ProfileField id={`${idPrefix}-email`} label="Електронна пошта (необовʼязково, не для входу)" value={profile.email ?? ''} error={profileErrors.email} type="email" autoComplete="email" onChange={(email) => { setProfile({ ...profile, email }); setProfileErrors({ ...profileErrors, email: undefined }); }} />
            <label className="auth-consent">
              <input
                type="checkbox"
                checked={profile.termsAccepted}
                aria-invalid={Boolean(profileErrors.termsAccepted)}
                aria-describedby={`${idPrefix}-consent-note ${idPrefix}-terms-error`}
                onChange={(event) => { setProfile({ ...profile, termsAccepted: event.currentTarget.checked }); setProfileErrors({ ...profileErrors, termsAccepted: undefined }); }}
              />
              <span className="auth-consent__label">
                {server?'Я погоджуюсь створити ізольований тестовий акаунт із синтетичними даними':'Я погоджуюсь пройти лише демонстраційний перегляд форми без створення акаунту'}
              </span>
            </label>
            <p className="auth-consent-note" id={`${idPrefix}-consent-note`}>
              Юридичні тексти Умов використання та Політики конфіденційності ще не затверджені й не приймаються в цьому демо.
            </p>
            <p className="auth-error" id={`${idPrefix}-terms-error`} aria-live="polite">{profileErrors.termsAccepted}</p>
            <button className="auth-primary" type="submit" disabled={busy}>{busy ? 'Зачекайте…' : 'Зареєструватися'}</button>
            {(loadingMessage || statusMessage) && <p className="auth-status" role="status">{loadingMessage || statusMessage}</p>}
            {demoNote}
          </form>
        </article>
      )}

      {step === 'complete' && (
        <article className="auth-card">
          <AuthIcon name="check" />
          <h1 className="auth-card__title" id={titleId}>{server?"Серверний тестовий вхід підтверджено":"Демо-перегляд завершено"}</h1>
          <p className="auth-card__text">
            {server?'Тестову сесію підтверджено сервером. Кошик та обране зберігаються в PostgreSQL.':<>{intent === 'login' ? 'Вхід не виконано.' : 'Акаунт не створено.'} Серверної сесії немає, захищені дані недоступні.</>}
          </p>
          {demoNote}
          <div className="auth-flow">
            <button className="auth-primary" type="button" data-auth-initial-focus onClick={() => resetToPhone(intent)}>Почати спочатку</button>
            {surface === 'modal' && onClose ? (
              <button className="auth-secondary" type="button" onClick={onClose}>Закрити</button>
            ) : (
              <Link className="auth-secondary" href="/">Повернутися на головну</Link>
            )}
          </div>
        </article>
      )}
    </div>
  );
}

interface ProfileFieldProps {
  readonly autoComplete: string;
  readonly error?: string;
  readonly id: string;
  readonly initialFocus?: boolean;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly type?: 'email' | 'text';
  readonly value: string;
}

function ProfileField({ autoComplete, error, id, initialFocus = false, label, onChange, type = 'text', value }: ProfileFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={id}>{label}</label>
      <input
        className="auth-field__input"
        id={id}
        type={type}
        autoComplete={autoComplete}
        maxLength={type === 'email' ? 254 : 80}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        data-auth-initial-focus={initialFocus ? '' : undefined}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <p className="auth-error" id={errorId} aria-live="polite">{error}</p>
    </div>
  );
}

function AuthIcon({ name }: Readonly<{ name: 'phone' | 'sms' | 'user' | 'check' }>) {
  return (
    <span className="auth-card__icon" aria-hidden="true">
      {name === 'phone' && <svg viewBox="0 0 24 24"><path d="M7 3h3l1.3 4-2 1.5a15 15 0 0 0 6.2 6.2l1.5-2L21 14v3a4 4 0 0 1-4 4C9.3 20.5 3.5 14.7 3 7a4 4 0 0 1 4-4Z" /></svg>}
      {name === 'sms' && <svg viewBox="0 0 24 24"><path d="M4 5h16v12H8l-4 3V5Z" /><path d="M8 10h8M8 13h5" /></svg>}
      {name === 'user' && <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>}
      {name === 'check' && <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>}
    </span>
  );
}

export function AuthFlow(props:AuthFlowProps){const {store}=useServerCustomer();return <AuthFlowImplementation {...props} service={store?.identity??props.service}/>;}
