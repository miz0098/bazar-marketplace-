'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountLoading, AccountPageHeading, AccountState } from '@/components/account/account-ui';
import { messageDate, ticketCategoryLabels, ticketStatusLabels, validateTicket, type CommunicationScenario, type TicketCategory, type TicketDraft } from '@/domain/communication/communication';
import { MessageThread } from './message-thread';
import { useCommunicationServices } from './preview-provider';
import { usePreviewQuery } from './use-preview-query';

function NewTicketForm({ onCreate, onCancel }: { onCreate: (draft: TicketDraft) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<TicketDraft>({ subject: '', category: 'delivery', text: '' });
  const [errors, setErrors] = useState<ReturnType<typeof validateTicket>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const creatingRef = useRef(false);
  useEffect(() => { formRef.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
  useEffect(() => {
    if (Object.values(errors).some(Boolean)) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);
  return <form className="account-panel communication-new-ticket" aria-label="Нове демонстраційне звернення" ref={formRef} noValidate onSubmit={async (event) => {
    event.preventDefault();
    if (creatingRef.current) return;
    const validation = validateTicket(draft);
    setErrors(validation); setError('');
    if (Object.values(validation).some(Boolean)) return;
    creatingRef.current = true;
    setBusy(true);
    try { await onCreate(draft); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося створити демо-звернення.'); }
    finally { creatingRef.current = false; setBusy(false); }
  }}>
    <h2>Нове демо-звернення</h2>
    <p className="communication-disclaimer">Ця форма не зв’язується з оператором. Вводьте лише вигадані дані; запис зникне після перезавантаження.</p>
    <label className="account-field"><span>Тема звернення</span><input value={draft.subject} disabled={busy} maxLength={120} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? 'ticket-subject-error' : undefined} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />{errors.subject && <span className="account-field-error" id="ticket-subject-error">{errors.subject}</span>}</label>
    <label className="account-field"><span>Категорія</span><select value={draft.category} disabled={busy} aria-invalid={Boolean(errors.category)} onChange={(event) => setDraft({ ...draft, category: event.target.value as TicketCategory })}>{Object.entries(ticketCategoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label className="account-field"><span>Опис звернення</span><textarea value={draft.text} disabled={busy} rows={4} maxLength={2000} aria-invalid={Boolean(errors.text)} aria-describedby={errors.text ? 'ticket-text-error' : undefined} onChange={(event) => setDraft({ ...draft, text: event.target.value })} />{errors.text && <span className="account-field-error" id="ticket-text-error">{errors.text}</span>}</label>
    {error && <p className="account-field-error" role="alert">{error}</p>}
    <div className="account-form-actions"><button className="account-button account-button--primary" type="submit" disabled={busy}>{busy ? 'Створюємо в демо…' : 'Створити лише в демо'}</button><button className="account-button account-button--ghost" type="button" disabled={busy} onClick={onCancel}>Скасувати</button></div>
  </form>;
}

export function SupportScreen({ id, scenario }: { id?: string; scenario: CommunicationScenario }) {
  const { support } = useCommunicationServices(scenario);
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const suffix = scenario === 'ready' ? '' : `?preview=${scenario}`;
  const load = useCallback(async () => ({ tickets: await support.listTickets(), selected: id ? await support.getTicket(id) : null }), [id, support]);
  const { data, setData, error } = usePreviewQuery(load, attempt);

  return <div className="communication-screen" data-communication="support">
    <AccountPageHeading title="BAZAR-підтримка" kicker="Центр допомоги" description="Демонстраційний центр звернень. Реальних операторів, строків відповіді та надсилання тут немає." actions={!id && <button ref={triggerRef} className="account-button account-button--primary" type="button" onClick={() => setCreating(true)}>Нове демо-звернення</button>} />
    {creating && !id && <NewTicketForm onCancel={() => { setCreating(false); triggerRef.current?.focus(); }} onCreate={async (draft) => {
      const mutation = await support.createTicket(draft);
      setCreating(false);
      router.push(`/profile/support/${mutation.value.id}${suffix}`);
    }} />}
    {error ? <AccountState error icon="warning" title="Звернення недоступні" text={error} action={<button className="account-button account-button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} /> : !data ? <AccountLoading label="Завантажуємо демонстраційні звернення…" /> : id ? <div className="communication-ticket-detail">
      <header className="communication-thread-head"><Link className="account-button account-button--ghost" href={`/profile/support${suffix}`}>← До звернень</Link><h2>{data.selected?.subject ?? 'Звернення недоступне'}</h2>{data.selected && <span className={`communication-ticket-status is-${data.selected.status}`}>{ticketStatusLabels[data.selected.status]}</span>}</header>
      {!data.selected ? <AccountState icon="support" title="Звернення не знайдено" text="Такого запису немає в поточному демонстраційному перегляді." /> : <>
        <p className="communication-ticket-meta">{ticketCategoryLabels[data.selected.category]} · {messageDate(data.selected.createdAt)} · лише демо</p>
        <MessageThread key={`${id}-${scenario}`} title={`Звернення: ${data.selected.subject}`} closed={data.selected.status === 'closed'} messages={data.selected.messages} onSend={async (text) => {
          const mutation = await support.addReply(id, text);
          setData((current) => current ? { ...current, selected: mutation.value } : current);
        }} />
      </>}
    </div> : <>
      <section className="account-panel communication-support-intro" aria-label="Про демо-підтримку"><h2>Як працює цей перегляд</h2><p>Оберіть приклад звернення або створіть вигадане. Статуси та відповіді — демонстраційні, записи зберігаються лише до перезавантаження сторінки.</p></section>
      {data.tickets.length === 0 ? <AccountState icon="support" title="Звернень поки немає" text="Тут відображатиметься історія звернень. У цьому перегляді дані не надсилаються підтримці." /> : <ul className="communication-ticket-list" aria-label="Демонстраційні звернення">{data.tickets.map((ticket) => <li key={ticket.id}><Link href={`/profile/support/${ticket.id}${suffix}`}><span><strong>{ticket.subject}</strong><span>{ticketCategoryLabels[ticket.category]} · {messageDate(ticket.createdAt)}</span></span><span className={`communication-ticket-status is-${ticket.status}`}>{ticketStatusLabels[ticket.status]}</span></Link></li>)}</ul>}
    </>}
  </div>;
}
