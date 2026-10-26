import { chronological, validateMessage, validateTicket, type CommunicationScenario, type Conversation, type DemoMessage, type DemoMutation, type SupportTicket } from '@/domain/communication/communication';
import { demoConversations, demoTickets } from '@/fixtures/communication';
import { CommunicationError, type MessagingService, type SupportService } from '@/services/contracts/communication';

interface Options {
  readonly scenario?: CommunicationScenario;
  readonly wait?: () => Promise<void>;
  readonly now?: () => string;
}

function runtime(options: Options) {
  const wait = options.wait ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 160)));
  return {
    now: options.now ?? (() => new Date().toISOString()),
    async run<T>(operation: () => T, mutation = false): Promise<T> {
      await wait();
      if (options.scenario === 'error' || (mutation && options.scenario === 'send-error')) {
        throw new CommunicationError('unavailable', mutation ? 'Демо-дію не виконано. Текст залишився у формі — спробуйте ще раз.' : 'Не вдалося завантажити демонстраційні дані. Спробуйте ще раз.');
      }
      return operation();
    },
  };
}
const result = <T>(value: T): DemoMutation<T> => ({ status: 'preview-only', persisted: false, value: structuredClone(value) });
const copyConversation = (value: Conversation): Conversation => ({ ...structuredClone(value), messages: chronological(value.messages) });
const copyTicket = (value: SupportTicket): SupportTicket => ({ ...structuredClone(value), messages: chronological(value.messages) });

export function createDemoMessagingService(options: Options = {}): MessagingService {
  const { run, now } = runtime(options);
  const conversations = options.scenario === 'empty' ? [] : structuredClone(demoConversations) as Conversation[];
  let sequence = 0;
  const indexOf = (id: string) => {
    const index = conversations.findIndex((item) => item.id === id);
    if (index < 0) throw new CommunicationError('not-found', 'Демонстраційного діалогу не знайдено.');
    return index;
  };
  return {
    mode: 'preview-only',
    listConversations: () => run(() => conversations.map(copyConversation).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (Date.parse(b.messages.at(-1)?.createdAt ?? '1970-01-01') - Date.parse(a.messages.at(-1)?.createdAt ?? '1970-01-01')))),
    getConversation: (id) => run(() => { const found = conversations.find((item) => item.id === id); return found ? copyConversation(found) : null; }),
    markRead: (id) => run(() => {
      const index = indexOf(id);
      conversations[index] = { ...conversations[index], unreadMessages: 0 };
      return result(copyConversation(conversations[index]));
    }),
    setPinned: (id, pinned) => run(() => {
      const index = indexOf(id);
      conversations[index] = { ...conversations[index], pinned };
      return result(copyConversation(conversations[index]));
    }, true),
    addMessage: (id, text, attachment) => run(() => {
      const error = validateMessage(text, attachment);
      if (error) throw new CommunicationError('validation', error);
      const index = indexOf(id);
      const message: DemoMessage = { id: `demo-outgoing-${++sequence}`, author: 'customer', text: text.trim(), createdAt: now(), ...(attachment ? { attachment: { ...attachment } } : {}) };
      conversations[index] = { ...conversations[index], messages: chronological([...conversations[index].messages, message]) };
      return result(copyConversation(conversations[index]));
    }, true),
  };
}

export function createDemoSupportService(options: Options = {}): SupportService {
  const { run, now } = runtime(options);
  const tickets = options.scenario === 'empty' ? [] : structuredClone(demoTickets) as SupportTicket[];
  let sequence = 0;
  return {
    mode: 'preview-only',
    listTickets: () => run(() => tickets.map(copyTicket).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))),
    getTicket: (id) => run(() => { const found = tickets.find((item) => item.id === id); return found ? copyTicket(found) : null; }),
    createTicket: (draft) => run(() => {
      const errors = validateTicket(draft);
      if (Object.values(errors).some(Boolean)) throw new CommunicationError('validation', Object.values(errors).find(Boolean)!);
      const createdAt = now();
      const id = `demo-new-ticket-${++sequence}`;
      const ticket: SupportTicket = { id, subject: draft.subject.trim(), category: draft.category, status: 'open', createdAt, messages: [{ id: `${id}-first`, author: 'customer', text: draft.text.trim(), createdAt }] };
      tickets.push(ticket);
      return result(ticket);
    }, true),
    addReply: (id, text) => run(() => {
      const error = validateMessage(text);
      if (error) throw new CommunicationError('validation', error);
      const index = tickets.findIndex((item) => item.id === id);
      if (index < 0) throw new CommunicationError('not-found', 'Демонстраційного звернення не знайдено.');
      const ticket = tickets[index];
      if (ticket.status === 'closed') throw new CommunicationError('closed', 'Закрите демонстраційне звернення недоступне для доповнення.');
      tickets[index] = { ...ticket, messages: chronological([...ticket.messages, { id: `demo-reply-${++sequence}`, author: 'customer', text: text.trim(), createdAt: now() }]) };
      return result(copyTicket(tickets[index]));
    }, true),
  };
}
