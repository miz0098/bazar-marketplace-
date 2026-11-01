'use client';

import { useEffect, useRef, useState } from 'react';
import { AccountState } from '@/components/account/account-ui';
import { messageDate, messageTime, validateMessage, type DemoMessage } from '@/domain/communication/communication';

export function MessageThread({ messages, title, closed = false, onSend }: {
  messages: readonly DemoMessage[];
  title: string;
  closed?: boolean;
  onSend: (text: string, attachment?: DemoMessage['attachment']) => Promise<void>;
}) {
  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previousScroll=useRef<{first?:string;last?:string;height:number}>({height:0});
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    const history = historyRef.current;
    if (history){const previous=previousScroll.current,first=messages[0]?.id,last=messages.at(-1)?.id;history.scrollTop=previous.first&&first!==previous.first&&last===previous.last?history.scrollTop+history.scrollHeight-previous.height:history.scrollHeight;previousScroll.current={first,last,height:history.scrollHeight};}
  }, [messages]);

  useEffect(() => {
    if (notice && !busy) inputRef.current?.focus();
  }, [busy, notice]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sendingRef.current || closed) return;
    const validation = validateMessage(text);
    setError(validation);
    setNotice('');
    if (validation) { inputRef.current?.focus(); return; }
    sendingRef.current = true;
    setBusy(true);
    try {
      await onSend(text);
      setText('');
      setNotice('Повідомлення збережено.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося надіслати повідомлення. Спробуйте ще раз.');
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
      {messages.length === 0 ? <AccountState icon="messages" title="Тут поки немає повідомлень" text={('Напишіть перше повідомлення.')} /> : (
        <ol className="communication-message-list">
          {messages.map((message, index) => <li className={`communication-message${message.author === 'customer' ? ' is-own' : ''}`} key={message.id} data-message-id={message.id} data-created-at={message.createdAt}>
            {(index === 0 || messageDate(messages[index - 1].createdAt) !== messageDate(message.createdAt)) && <p className="communication-date">{messageDate(message.createdAt)}</p>}
            <div className="communication-bubble">
              <span className="communication-author">{message.author === 'customer' ? 'Ви' : 'Співрозмовник'}</span>
              {message.text && <p>{message.text}</p>}
              {message.attachment && <p className="communication-attachment">Файл: {message.attachment.name} · лише назва, без завантаження</p>}
              <footer><time dateTime={message.createdAt}>{messageTime(message.createdAt)}</time>{message.author === 'customer' && <span>{('Збережено')}</span>}</footer>
            </div>
          </li>)}
        </ol>
      )}
    </div>
    {closed ? <p className="communication-disclaimer">Звернення закрите. Додавання повідомлень недоступне.</p> : <form className="communication-composer" onSubmit={submit} noValidate aria-label={('Повідомлення')}>
      <p className="communication-disclaimer" id="message-hint">{('Напишіть повідомлення.')}</p>
      <label className="account-field"><span>Ваше повідомлення</span><textarea ref={inputRef} value={text} maxLength={2000} rows={2} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={`message-hint${error ? ' message-error' : ''}`} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }} /></label>
      {error && <p className="account-field-error" id="message-error" role="alert">{error}</p>}
      {notice && <p className="communication-notice" role="status">{notice}</p>}
      <div className="communication-send-row"><span>{('Enter — надіслати, Shift+Enter — новий рядок')}</span><button className="account-button account-button--primary" type="submit" disabled={busy}>{busy ? ("Надсилаємо…") : ("Надіслати")}</button></div>
    </form>}
  </section>;
}
