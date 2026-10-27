import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationPresentation } from '../components/notifications/presentation';
import { isNotificationSummary, notificationKinds } from '../services/contracts/communication-business';
const id='12345678-1234-1234-1234-123456789abc';
test('F17 all existing notification kinds map only to bounded local owner-checked routes and honest test titles',()=>{
 for(const kind of notificationKinds){
  const p=notificationPresentation({id,sequence:1,kind,scopeId:id,sourceId:id,read:false,createdAt:'2026-10-27T00:00:00.000Z'});
  assert.match(p.href,/^\/profile\/(orders\/|messages\?id=|support\/)[a-f0-9-]+$/);assert.match(p.title,/тест|Тест|Симуляція|Ізольована/);
 }
 assert.throws(()=>notificationPresentation({scopeId:'//evil.example',kind:'order.created'} as never));
 assert.throws(()=>notificationPresentation({scopeId:id,kind:'payment.success'} as never));
});
test('F17 summary rejects fabricated live modes, extra fields, unsafe counts and invalid high-water marks',()=>{
 const valid={mode:'integration-test',resource:'notification-summary',unread:2,throughSequence:20};assert.ok(isNotificationSummary(valid));
 for(const patch of [{mode:'production'},{unread:-1},{unread:21},{throughSequence:0},{unread:1.5},{throughSequence:Number.MAX_SAFE_INTEGER+1},{userId:id}])assert.equal(isNotificationSummary({...valid,...patch}),false);
});
