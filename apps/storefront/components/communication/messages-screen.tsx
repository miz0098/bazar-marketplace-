'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { AccountLoading, AccountPageHeading, AccountState } from '@/components/account/account-ui';
import { messageTime, unreadConversationCount, type CommunicationScenario } from '@/domain/communication/communication';
import { MessageThread } from './message-thread';
import { useCommunicationServices } from './preview-provider';
import { usePreviewQuery } from './use-preview-query';

export function MessagesScreen({ id, scenario }: { id?: string; scenario: CommunicationScenario }) {
  const { messaging } = useCommunicationServices(scenario);
  const [search, setSearch] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [actionError, setActionError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const suffix = scenario === 'ready' ? '' : `?preview=${scenario}`;
  const load = useCallback(async () => {
    const selected = id ? await messaging.getConversation(id) : null;
    if (selected) await messaging.markRead(selected.id);
    return { conversations: await messaging.listConversations(), selected };
  }, [id, messaging]);
  const { data, setData, error } = usePreviewQuery(load, attempt);
  const visible = data?.conversations.filter((item) => item.name.toLocaleLowerCase('uk-UA').includes(search.trim().toLocaleLowerCase('uk-UA'))) ?? [];

  return <div className="communication-screen" data-communication="messages">
    <AccountPageHeading title="Повідомлення" kicker="Діалоги" description="Вигадані розмови для перевірки інтерфейсу. Нічого не надсилається реальним користувачам." />
    {error ? <AccountState error icon="warning" title="Діалоги недоступні" text={error} action={<button className="account-button account-button--primary" onClick={() => setAttempt((value) => value + 1)}>Спробувати ще раз</button>} /> : !data ? <AccountLoading label="Завантажуємо демонстраційні діалоги…" /> : data.conversations.length === 0 && !id ? (
      <AccountState icon="messages" title="У вас поки немає повідомлень" text="Тут з’являться ваші діалоги. У цьому перегляді немає реальних співрозмовників чи повідомлень." />
    ) : <div className={`communication-workspace${id ? ' has-selection' : ''}`}>
      <aside className="communication-dialogs" aria-label="Список діалогів">
        <div className="communication-list-head"><h2>Ваші діалоги</h2><span className="communication-unread-total" aria-label="Непрочитаних діалогів">{unreadConversationCount(data.conversations)}</span></div>
        <label className="account-field communication-search"><span>Пошук діалогів</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        {actionError && <p role="alert" className="account-field-error">{actionError}</p>}
        {visible.length === 0 ? <p className="communication-disclaimer">Діалогів за цим запитом немає.</p> : <ul className="communication-dialog-list">{visible.map((conversation) => {
          const last = conversation.messages.at(-1);
          return <li className={conversation.id === id ? 'is-selected' : ''} key={conversation.id}>
            <Link className="communication-dialog-link" href={`/profile/messages/${conversation.id}${suffix}`} aria-current={conversation.id === id ? 'page' : undefined}>
              <span className="communication-avatar" aria-hidden="true">{conversation.initials}</span>
              <span className="communication-dialog-copy"><strong>{conversation.name}</strong><span>{last?.text || (last?.attachment ? `Файл: ${last.attachment.name}` : 'Повідомлень ще немає')}</span><span className="communication-dialog-meta">{last && <time dateTime={last.createdAt}>{messageTime(last.createdAt)}</time>}{conversation.pinned && <span>Закріплено</span>}{conversation.unreadMessages > 0 && <span className="communication-unread" aria-label="Непрочитаний діалог">Нове</span>}</span></span>
            </Link>
            <button className="communication-pin" type="button" aria-label={`${conversation.pinned ? 'Відкріпити' : 'Закріпити'} ${conversation.name}`} aria-pressed={conversation.pinned} disabled={pinBusy} onClick={async () => {
              setPinBusy(true); setActionError('');
              try {
                await messaging.setPinned(conversation.id, !conversation.pinned);
                const conversations = await messaging.listConversations();
                setData((current) => current ? { ...current, conversations } : current);
              } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Не вдалося змінити демо-закріплення.'); }
              finally { setPinBusy(false); }
            }}>{conversation.pinned ? 'Відкріпити' : 'Закріпити'}</button>
          </li>;
        })}</ul>}
      </aside>
      <div className="communication-conversation">
        {id && <header className="communication-thread-head"><Link className="account-button account-button--ghost" href={`/profile/messages${suffix}`}>← До діалогів</Link><h2>{data.selected?.name ?? 'Діалог недоступний'}</h2><span>Анонімний демо-перегляд</span></header>}
        {!id ? <AccountState icon="messages" title="Оберіть діалог" text="Історія з’явиться тут. Усі записи вигадані й доступні лише у цьому перегляді." /> : !data.selected ? <AccountState icon="messages" title="Діалог не знайдено" text="Такого запису немає в демонстраційних даних." /> : <MessageThread key={`${id}-${scenario}`} title={`Діалог: ${data.selected.name}`} messages={data.selected.messages} attachments onSend={async (text, attachment) => {
          const mutation = await messaging.addMessage(id, text, attachment);
          const conversations = await messaging.listConversations();
          setData({ conversations, selected: mutation.value });
        }} />}
      </div>
    </div>}
  </div>;
}
