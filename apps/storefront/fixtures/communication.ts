import type { Conversation, DemoMessage, SupportTicket } from '@/domain/communication/communication';

const history: readonly DemoMessage[] = Array.from({ length: 18 }, (_, index) => ({
  id: `demo-history-${String(index).padStart(2, '0')}`,
  author: index % 2 ? 'customer' as const : 'contact' as const,
  text: index % 2 ? `Приклад повідомлення покупця ${index + 1}. Це вигадана розмова для перевірки інтерфейсу.` : `Демонстраційна відповідь ${index + 1}. Дані про доставку тут не перевіряються.`,
  createdAt: new Date(Date.UTC(2026, 9, 20, 8, index * 5)).toISOString(),
}));

export const demoConversations: readonly Conversation[] = [
  { id: 'demo-chat-1', name: 'Техніка · демо-магазин', initials: 'ТМ', pinned: false, unreadMessages: 4, messages: history },
  { id: 'demo-chat-2', name: 'Спорт · демо-магазин', initials: 'СМ', pinned: false, unreadMessages: 2, messages: [
    { id: 'demo-sport-1', author: 'contact', text: 'Вітаємо! Це приклад діалогу про спортивні товари.', createdAt: '2026-10-21T10:15:00.000Z' },
  ] },
  { id: 'demo-chat-3', name: 'Дім · демо-магазин', initials: 'ДМ', pinned: true, unreadMessages: 0, messages: [] },
];

export const demoTickets: readonly SupportTicket[] = [
  { id: 'demo-ticket-1', subject: 'Питання про доставку · демо', category: 'delivery', status: 'waiting', createdAt: '2026-10-19T08:00:00.000Z', messages: [
    { id: 'demo-ticket-message-1', author: 'customer', text: 'Хочу перевірити, як виглядає звернення про доставку.', createdAt: '2026-10-19T08:00:00.000Z' },
    { id: 'demo-ticket-message-2', author: 'contact', text: 'Це вигадана відповідь підтримки. Реальний оператор не отримує цього звернення.', createdAt: '2026-10-19T09:00:00.000Z' },
  ] },
  { id: 'demo-ticket-2', subject: 'Уточнення щодо оплати · демо', category: 'payment', status: 'open', createdAt: '2026-10-20T08:00:00.000Z', messages: [
    { id: 'demo-ticket-message-3', author: 'customer', text: 'Це приклад нового звернення без реальної платіжної інформації.', createdAt: '2026-10-20T08:00:00.000Z' },
  ] },
  { id: 'demo-ticket-3', subject: 'Приклад закритого звернення', category: 'other', status: 'closed', createdAt: '2026-10-18T08:00:00.000Z', messages: [] },
];
