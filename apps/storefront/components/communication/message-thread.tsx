'use client';

import { useEffect, useRef, useState } from 'react';
import { AccountState } from '@/components/account/account-ui';
import { messageDate, messageTime, validateMessage, type DemoMessage } from '@/domain/communication/communication';

export function MessageThread({ messages, title, closed = false, attachments = false, onSend }: {
  messages: readonly DemoMessage[];
  title: string;
  closed?: boolean;
  attachments?: boolean;
  onSend: (text: string, attachment?: DemoMessage['attachment']) => Promise<void>;
}) {
  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<DemoMessage['attachment']>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (notice && !busy) inputRef.current?.focus();
  }, [busy, notice]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sendingRef.current || closed) return;
    const validation = validateMessage(text, attachment);
    setError(validation);
    setNotice('');
    if (validation) { inputRef.current?.focus(); return; }
    sendingRef.current = true;
    setBusy(true);
    try {
      await onSend(text, attachment);
      setText('');
      setAttachment(undefined);
      if (fileRef.current) fileRef.current.value = '';
      setNotice('Додано лише до демо-історії. Нікому не доставлено; після перезавантаження запис зникне.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Демо-дію не виконано. Спробуйте ще раз.');
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  };

  return <section className="communication-thread" aria-label={title}>
    <div className="communication-history" ref={historyRef} tabIndex={0} role="region" aria-label="Історія повідомлень" onKeyDown={(event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        event.currentTarget.scrollTop = event.key === 'Home' ? 0 : event.currentTarget.scrollHeight;
      }
    }}>
      {messages.length === 0 ? <AccountState icon="messages" title="Тут поки немає повідомлень" text="Це порожня демонстраційна історія. Реального зв’язку зі співрозмовником немає." /> : (
        <ol className="communication-message-list">
          {messages.map((message, index) => <li className={`communication-message${message.author === 'customer' ? ' is-own' : ''}`} key={message.id} data-message-id={message.id} data-created-at={message.createdAt}>
            {(index === 0 || messageDate(messages[index - 1].createdAt) !== messageDate(message.createdAt)) && <p className="communication-date">{messageDate(message.createdAt)}</p>}
            <div className="communication-bubble">
              <span className="communication-author">{message.author === 'customer' ? 'Ви · демо' : 'Вигаданий співрозмовник'}</span>
              {message.text && <p>{message.text}</p>}
              {message.attachment && <p className="communication-attachment">Файл: {message.attachment.name} · лише назва, без завантаження</p>}
              <footer><time dateTime={message.createdAt}>{messageTime(message.createdAt)}</time>{message.author === 'customer' && <span>Лише демо · не доставлено</span>}</footer>
            </div>
          </li>)}
        </ol>
      )}
    </div>
    {closed ? <p className="communication-disclaimer">Демо-звернення закрите. Додавання повідомлень недоступне.</p> : <form className="communication-composer" onSubmit={submit} noValidate aria-label="Демонстраційне повідомлення">
      <p className="communication-disclaimer" id="demo-message-hint">Лише демонстрація. Вводьте вигаданий текст: сервер і реальні користувачі його не отримують.</p>
      <label className="account-field"><span>Ваше повідомлення</span><textarea ref={inputRef} value={text} maxLength={2000} rows={2} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={`demo-message-hint${error ? ' demo-message-error' : ''}`} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }} /></label>
      {attachments && <div className="communication-file">
        <label>Демо-вкладення (до 5 МБ)<input className="sr-only" aria-label="Демо-вкладення (до 5 МБ)" ref={fileRef} type="file" disabled={busy} onChange={(event) => {
          const file = event.target.files?.[0];
          const candidate = file ? { name: file.name, size: file.size } : undefined;
          const validation = candidate ? validateMessage('', candidate) : '';
          setError(validation);
          setAttachment(validation ? undefined : candidate);
          if (validation) event.target.value = '';
        }} /><span className="account-button account-button--secondary communication-file-trigger">Обрати файл</span></label>
        <span>{attachment?.name ?? 'Файл не обрано'}</span>
        <span>Читається лише назва й розмір. Вміст не відкривається і не передається.</span>
        {attachment && <button className="account-button account-button--ghost" type="button" disabled={busy} onClick={() => { setAttachment(undefined); if (fileRef.current) fileRef.current.value = ''; }}>Прибрати вкладення</button>}
      </div>}
      {error && <p className="account-field-error" id="demo-message-error" role="alert">{error}</p>}
      {notice && <p className="communication-notice" role="status">{notice}</p>}
      <div className="communication-send-row"><span>Enter — додати в демо, Shift+Enter — новий рядок</span><button className="account-button account-button--primary" type="submit" disabled={busy}>{busy ? 'Додаємо в демо…' : 'Надіслати в демо'}</button></div>
    </form>}
  </section>;
}
