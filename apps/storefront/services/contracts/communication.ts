import type { Conversation, DemoMessage, DemoMutation, SupportTicket, TicketDraft } from '@/domain/communication/communication';

export class CommunicationError extends Error {
  constructor(readonly code: 'unavailable' | 'validation' | 'not-found' | 'closed', message: string) {
    super(message);
    this.name = 'CommunicationError';
  }
}

export interface MessagingService {
  readonly mode: 'preview-only';
  listConversations(): Promise<readonly Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  markRead(id: string): Promise<DemoMutation<Conversation>>;
  setPinned(id: string, pinned: boolean): Promise<DemoMutation<Conversation>>;
  addMessage(id: string, text: string, attachment?: DemoMessage['attachment']): Promise<DemoMutation<Conversation>>;
}

export interface SupportService {
  readonly mode: 'preview-only';
  listTickets(): Promise<readonly SupportTicket[]>;
  getTicket(id: string): Promise<SupportTicket | null>;
  createTicket(draft: TicketDraft): Promise<DemoMutation<SupportTicket>>;
  addReply(id: string, text: string): Promise<DemoMutation<SupportTicket>>;
}
