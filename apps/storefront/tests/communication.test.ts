import assert from 'node:assert/strict';
import test from 'node:test';
import { chronological, readCommunicationScenario, unreadConversationCount, validateMessage, validateTicket } from '../domain/communication/communication';
import { createDemoMessagingService, createDemoSupportService } from '../services/mock/communication-service';
import { CommunicationError } from '../services/contracts/communication';

const options = { wait: async () => {}, now: () => '2026-10-26T12:00:00.000Z' };

test('communication validation rejects blank and overlong drafts and unsafe attachment metadata', () => {
  assert.ok(validateMessage('   '));
  assert.ok(validateMessage('a'.repeat(2001)));
  assert.equal(validateMessage('Приклад'), '');
  assert.equal(validateMessage('', { name: 'demo.txt', size: 100 }), '');
  for (const size of [0, -1, 1.5, 5 * 1024 * 1024 + 1]) assert.ok(validateMessage('', { name: 'demo.txt', size }));
  assert.ok(validateTicket({ subject: 'X', category: 'other', text: '' }).subject);
  assert.ok(validateTicket({ subject: 'Демо-тема', category: 'other', text: '' }).text);
  assert.equal(Object.values(validateTicket({ subject: 'Демо-тема', category: 'delivery', text: 'Приклад' })).some(Boolean), false);
  assert.equal(readCommunicationScenario('send-error'), 'send-error');
  assert.equal(readCommunicationScenario('arbitrary'), 'ready');
});

test('message chronology sorts ascending without changing source and preserves ties', () => {
  const source = [
    { id: 'later', author: 'customer' as const, text: 'Пізніше', createdAt: '2026-10-26T12:00:00Z' },
    { id: 'first', author: 'contact' as const, text: 'Раніше', createdAt: '2026-10-25T12:00:00Z' },
    { id: 'same', author: 'customer' as const, text: 'Той самий час', createdAt: '2026-10-26T12:00:00Z' },
  ];
  assert.deepEqual(chronological(source).map((item) => item.id), ['first', 'later', 'same']);
  assert.equal(source[0].id, 'later');
});

test('unread total counts conversations rather than individual messages and reading is isolated', async () => {
  const service = createDemoMessagingService(options);
  const before = await service.listConversations();
  assert.equal(unreadConversationCount(before), 2);
  assert.equal(before.reduce((sum, item) => sum + item.unreadMessages, 0), 6);
  const mutation = await service.markRead('demo-chat-1');
  assert.equal(mutation.persisted, false);
  assert.equal(mutation.status, 'preview-only');
  assert.equal(unreadConversationCount(await service.listConversations()), 1);
  assert.equal(unreadConversationCount(before), 2);
  assert.equal(unreadConversationCount(await createDemoMessagingService(options).listConversations()), 2);
});

test('pin changes sort order and only changes this preview instance', async () => {
  const service = createDemoMessagingService(options);
  await service.setPinned('demo-chat-1', true);
  assert.equal((await service.listConversations())[0].id, 'demo-chat-1');
  await service.setPinned('demo-chat-1', false);
  assert.equal((await service.listConversations())[0].id, 'demo-chat-3');
  assert.equal((await createDemoMessagingService(options).getConversation('demo-chat-1'))?.pinned, false);
});

test('demo messages and attachment metadata do not claim delivery or persist across service instances', async () => {
  const service = createDemoMessagingService(options);
  const result = await service.addMessage('demo-chat-1', '  Приклад повідомлення  ', { name: 'demo.txt', size: 100 });
  assert.equal(result.status, 'preview-only');
  assert.equal(result.persisted, false);
  const last = result.value.messages.at(-1)!;
  assert.equal(last.text, 'Приклад повідомлення');
  assert.equal(last.createdAt, options.now());
  assert.deepEqual(last.attachment, { name: 'demo.txt', size: 100 });
  assert.equal('delivered' in last, false);
  assert.equal((await service.getConversation('demo-chat-1'))?.messages.length, 19);
  assert.equal((await createDemoMessagingService(options).getConversation('demo-chat-1'))?.messages.length, 18);
  await assert.rejects(service.addMessage('demo-chat-1', ' '), { code: 'validation' });
  assert.equal((await service.getConversation('demo-chat-1'))?.messages.length, 19);
});

test('missing conversations and deterministic empty, load-error and mutation-error states stay explicit', async () => {
  assert.equal(await createDemoMessagingService(options).getConversation('missing'), null);
  assert.deepEqual(await createDemoMessagingService({ ...options, scenario: 'empty' }).listConversations(), []);
  await assert.rejects(createDemoMessagingService({ ...options, scenario: 'error' }).listConversations(), CommunicationError);
  const failed = createDemoMessagingService({ ...options, scenario: 'send-error' });
  await assert.rejects(failed.addMessage('demo-chat-1', 'Приклад'), { code: 'unavailable' });
  await assert.rejects(failed.setPinned('demo-chat-1', true), { code: 'unavailable' });
  assert.equal((await failed.getConversation('demo-chat-1'))?.messages.length, 18);
  await assert.rejects(createDemoMessagingService(options).markRead('missing'), { code: 'not-found' });
});

test('support creates and replies only in memory, validates drafts and keeps source fixtures unchanged', async () => {
  const service = createDemoSupportService({ ...options, scenario: 'empty' });
  assert.deepEqual(await service.listTickets(), []);
  const created = await service.createTicket({ subject: 'Демо-питання', category: 'other', text: 'Вигаданий опис' });
  assert.equal(created.persisted, false);
  assert.equal(created.status, 'preview-only');
  assert.equal(created.value.status, 'open');
  const replied = await service.addReply(created.value.id, '  Демо-доповнення  ');
  assert.equal(replied.value.messages.length, 2);
  assert.equal(replied.value.messages.at(-1)?.text, 'Демо-доповнення');
  assert.equal(created.value.messages.length, 1);
  assert.equal((await service.listTickets()).length, 1);
  assert.deepEqual(await createDemoSupportService({ ...options, scenario: 'empty' }).listTickets(), []);
  await assert.rejects(service.createTicket({ subject: '', category: 'other', text: '' }), { code: 'validation' });
  assert.equal((await service.listTickets()).length, 1);
});

test('support missing, closed and failing mutations never append messages', async () => {
  const service = createDemoSupportService(options);
  assert.equal(await service.getTicket('missing'), null);
  await assert.rejects(service.addReply('missing', 'Приклад'), { code: 'not-found' });
  await assert.rejects(service.addReply('demo-ticket-3', 'Приклад'), { code: 'closed' });
  assert.equal((await service.getTicket('demo-ticket-3'))?.messages.length, 0);
  const failed = createDemoSupportService({ ...options, scenario: 'send-error' });
  await assert.rejects(failed.createTicket({ subject: 'Демо-питання', category: 'other', text: 'Приклад' }), { code: 'unavailable' });
  await assert.rejects(failed.addReply('demo-ticket-1', 'Приклад'), { code: 'unavailable' });
  assert.equal((await failed.listTickets()).length, 3);
  assert.equal((await failed.getTicket('demo-ticket-1'))?.messages.length, 2);
  await assert.rejects(createDemoSupportService({ ...options, scenario: 'error' }).listTickets(), { code: 'unavailable' });
});

test("F13 demo reads/pins are isolated and concurrent sends do not lose history; controls are rejected", async () => {
  const service = createDemoMessagingService(options);
  await Promise.all([
    service.addMessage("demo-chat-1", "Synthetic one"),
    service.addMessage("demo-chat-1", "Synthetic two"),
  ]);
  const chat = await service.getConversation("demo-chat-1");
  assert.equal(chat?.messages.length, 20);
  assert.equal(new Set(chat?.messages.map((m) => m.id)).size, 20);
  await Promise.all([
    service.markRead("demo-chat-1"),
    service.setPinned("demo-chat-1", true),
  ]);
  const current = await service.getConversation("demo-chat-1");
  assert.equal(current?.unreadMessages, 0);
  assert.equal(current?.pinned, true);
  assert.ok(validateMessage("a\u0000b"));
  assert.equal(validateMessage("Valid\nline\ttext"), "");
  await assert.rejects(service.addMessage("demo-chat-1", "a\u0000b"), {
    code: "validation",
  });
  assert.equal(
    (await service.getConversation("demo-chat-1"))?.messages.length,
    20,
  );
});
