'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatAccountDate } from '@/components/account/account-format';
import { AccountIcon } from '@/components/account/account-icons';
import { useRequestState } from '@/components/account/use-request-state';
import { useAccountService } from '@/components/account/account-preview-provider';
import { AccountLoading, AccountPageHeading, AccountState, DemoMutationNotice } from '@/components/account/account-ui';
import { hasAccountValidationErrors, validateAccountReview, type AccountReview, type AccountReviewDraft, type AccountReviewErrors, type AccountScenario } from '@/domain/account/account';

const emptyDraft: AccountReviewDraft = { rating: 5, text: '' };

export function ReviewsScreen({ scenario }: { scenario: AccountScenario }) {
  const service = useAccountService(scenario);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccountReviewDraft>(emptyDraft);
  const [errors, setErrors] = useState<AccountReviewErrors>({});
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const requestKey = useMemo(() => ({ attempt, service }), [attempt, service]);
  const [reviews, setReviews] = useRequestState<readonly AccountReview[] | null>(requestKey, null);
  const [loadError, setLoadError] = useRequestState(requestKey, '');

  useEffect(() => {
    let active = true;
    service.listReviews().then((value) => { if (active) setReviews(value); }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : 'Не вдалося завантажити відгуки.');
    });
    return () => { active = false; };
  }, [attempt, service, setReviews, setLoadError]);

  const beginEdit = (review: AccountReview) => {
    setEditingId(review.id);
    setDraft({ rating: review.rating, text: review.text });
    setErrors({});
    setActionError('');
    setNotice('');
  };

  const saveReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    const validation = validateAccountReview(draft);
    setErrors(validation);
    if (hasAccountValidationErrors(validation)) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    setActionError('');
    try {
      const result = await service.updateReview(editingId, draft);
      setReviews(result.value);
      setEditingId(null);
      setNotice('Відгук змінено лише у цьому демо-перегляді. Після оновлення сторінки зміни зникнуть.');
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Не вдалося оновити демо-відгук.');
    } finally {
      setBusy(false);
    }
  };

  const deleteReview = async (id: string) => {
    setBusy(true);
    setActionError('');
    try {
      const result = await service.deleteReview(id);
      setReviews(result.value);
      setEditingId(null);
      setNotice('Відгук прибрано лише з поточного демо-перегляду.');
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Не вдалося прибрати демо-відгук.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AccountPageHeading kicker="Мої оцінки" title="Мої відгуки" description="Редагування потрібне лише для перевірки інтерфейсу й не надсилає дані на сервер." />
      {notice && <DemoMutationNotice>{notice}</DemoMutationNotice>}
      {actionError && <p className="account-action-status account-action-status--error" role="alert">{actionError}</p>}
      {loadError ? (
        <AccountState error icon="warning" title="Відгуки недоступні" text={loadError} action={<button className="account-button account-button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} />
      ) : !reviews ? <AccountLoading label="Завантажуємо демонстраційні відгуки…" /> : reviews.length === 0 ? (
        <AccountState icon="reviews" title="Відгуків ще немає" text="У цьому демонстраційному стані немає опублікованих відгуків." action={<Link className="account-button account-button--primary" href="/catalog">Переглянути каталог</Link>} />
      ) : (
        <div className="account-review-list">
          {reviews.map((review) => (
            <article className="account-review-card" aria-label={`Відгук про ${review.product.title}`} key={review.id}>
              <div className="account-review-card__head">
                <div className="account-review-card__media" aria-hidden="true"><AccountIcon name="reviews" /></div>
                <div className="account-review-card__product">
                  <span>{review.product.vendor}</span>
                  <h2 className="account-review-card__title"><Link href={`/products/${review.product.handle}`}>{review.product.title}</Link></h2>
                  <span className="account-stars" aria-label={`Оцінка ${review.rating} з 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                </div>
                <span className="account-muted">{formatAccountDate(review.updatedAt)}</span>
              </div>
              {editingId === review.id ? (
                <form className="account-review-form account-review-edit" ref={formRef} noValidate onSubmit={saveReview}>
                  <label className="account-field"><span>Оцінка</span><select value={draft.rating} aria-invalid={Boolean(errors.rating)} aria-describedby={errors.rating ? `review-rating-${review.id}` : undefined} onChange={(event) => setDraft((current) => ({ ...current, rating: Number(event.target.value) }))}>{[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} з 5</option>)}</select>{errors.rating && <span className="account-field-error" id={`review-rating-${review.id}`}>{errors.rating}</span>}</label>
                  <label className="account-field account-field--full"><span>Текст відгуку</span><textarea value={draft.text} maxLength={1000} aria-invalid={Boolean(errors.text)} aria-describedby={errors.text ? `review-text-${review.id}` : undefined} onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))} />{errors.text && <span className="account-field-error" id={`review-text-${review.id}`}>{errors.text}</span>}</label>
                  <div className="account-form-actions"><button className="account-button account-button--primary" type="submit" disabled={busy}>Зберегти демо-зміни</button><button className="account-button account-button--ghost" type="button" onClick={() => setEditingId(null)}>Скасувати</button></div>
                </form>
              ) : (
                <>
                  <p className="account-review-card__text">{review.text}</p>
                  <div className="account-row-actions"><button className="account-button account-button--secondary" type="button" onClick={() => beginEdit(review)}><AccountIcon name="edit" />Редагувати</button><button className="account-button account-button--danger" type="button" disabled={busy} onClick={() => void deleteReview(review.id)}><AccountIcon name="trash" />Прибрати з демо</button></div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
