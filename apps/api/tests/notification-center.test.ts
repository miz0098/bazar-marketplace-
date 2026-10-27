import assert from 'node:assert/strict';
import test from 'node:test';
import { appendNotificationForTest } from '../src/communication/notifications.js';
import { isNotificationSummary } from '../src/contracts/communication.js';
test('F17 events cannot be emitted by ordinary or production processes and summary has no fabricated identity/channel payload',async()=>{
 await assert.rejects(appendNotificationForTest({} as never,'bad','order.created','bad','bad'),/Isolated/);
 assert.ok(isNotificationSummary({mode:'integration-test',resource:'notification-summary',unread:0,throughSequence:0}));
 assert.equal(isNotificationSummary({mode:'integration-test',resource:'notification-summary',unread:1,throughSequence:0}),false);
});
