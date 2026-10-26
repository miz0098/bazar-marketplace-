export type CommunicationScenario = 'ready' | 'empty' | 'error' | 'send-error';
export type DemoMessage = Readonly<{
  id: string;
  author: 'customer' | 'contact';
  text: string;
  createdAt: string;
  attachment?: Readonly<{ name: string; size: number }>;
}>;
export type Conversation = Readonly<{
  id: string;
  name: string;
  initials: string;
  pinned: boolean;
  unreadMessages: number;
  messages: readonly DemoMessage[];
}>;
export type TicketStatus = 'open' | 'waiting' | 'closed';
export type TicketCategory = 'delivery' | 'payment' | 'other';
export type SupportTicket = Readonly<{
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  messages: readonly DemoMessage[];
}>;
export type TicketDraft = Readonly<{ subject: string; category: TicketCategory; text: string }>;
export type DemoMutation<T> = Readonly<{ status: 'preview-only'; persisted: false; value: T }>;

export const ticketStatusLabels: Readonly<Record<TicketStatus, string>> = {
  open: 'Нове', waiting: 'Очікує відповіді', closed: 'Закрите',
};
export const ticketCategoryLabels: Readonly<Record<TicketCategory, string>> = {
  delivery: 'Доставка', payment: 'Оплата', other: 'Інше',
};

export function readCommunicationScenario(value: string | string[] | undefined): CommunicationScenario {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'empty' || candidate === 'error' || candidate === 'send-error' ? candidate : 'ready';
}

export function chronological(messages: readonly DemoMessage[]): readonly DemoMessage[] {
  return [...messages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function unreadConversationCount(conversations: readonly Conversation[]): number {
  return conversations.filter((conversation) => conversation.unreadMessages > 0).length;
}

export function validateMessage(text: string, attachment?: DemoMessage['attachment']): string {
  if (!text.trim() && !attachment) return 'Напишіть повідомлення.';
  if (/\p{Cc}/u.test(text.replace(/[\n\t]/g, ''))) return 'Повідомлення містить недопустимі символи.';
  if (text.trim().length > 2000) return 'Повідомлення має містити не більше 2000 символів.';
  if (attachment && (!attachment.name.trim() || attachment.name.length > 255 || !Number.isInteger(attachment.size) || attachment.size <= 0 || attachment.size > 5 * 1024 * 1024)) {
    return 'Оберіть непорожній файл до 5 МБ із назвою до 255 символів.';
  }
  return '';
}

export function validateTicket(draft: TicketDraft): Readonly<{ subject?: string; category?: string; text?: string }> {
  const subject = draft.subject.trim();
  return {
    subject: subject.length < 5 || subject.length > 120 ? 'Тема має містити від 5 до 120 символів.' : undefined,
    category: Object.hasOwn(ticketCategoryLabels, draft.category) ? undefined : 'Оберіть тему звернення.',
    text: validateMessage(draft.text) || undefined,
  };
}

export function messageTime(value: string): string {
  return new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' }).format(new Date(value));
}

export function messageDate(value: string): string {
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).format(new Date(value));
}
