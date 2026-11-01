import assert from 'node:assert/strict';
import test from 'node:test';
import {isStaffCase,isStaffQueue,isStaffSession,staffCapabilities} from '../../api/src/contracts/staff';

const id='00000000-0000-4000-8000-000000000001';
const date='2026-01-01T00:00:00.000Z';

test('staff session contract accepts least-privilege isolated grants and rejects malformed capability scopes',()=>{
  const value={mode:'integration-test',actorId:id,capabilities:[{capability:'support.read',scope:'resource',resourceId:id}],liveProviders:false,customerDirectory:false};
  assert.equal(isStaffSession(value),true);
  assert.equal(isStaffSession({...value,capabilities:[{capability:'support.read',scope:'resource'}]}),false);
  assert.equal(isStaffSession({...value,liveProviders:true}),false);
  assert.equal(isStaffSession({...value,capabilities:[{capability:'admin.root',scope:'global'}]}),false);
});

test('staff queue contract rejects invalid item identity, state shape and oversized result',()=>{
  const value={mode:'integration-test',resource:'queue',kind:'support',items:[{id,kind:'support',title:'Звернення',status:'open',createdAt:date,assignmentVersion:1}],limit:50,hasMore:false};
  assert.equal(isStaffQueue(value),true);
  assert.equal(isStaffQueue({...value,items:[{...value.items[0],id:'not-an-id'}]}),false);
  assert.equal(isStaffQueue({...value,items:Array(101).fill(value.items[0])}),false);
});

test('staff case contracts require scoped case fields and valid audit history',()=>{
  const support={mode:'integration-test',resource:'case',kind:'support',id,title:'Тестове звернення',status:'open',category:'other',createdAt:date,orderId:null,requestId:null,messages:[{id,sequence:1,author:'buyer',body:'Тест',createdAt:date}],notes:[],audit:[],version:1};
  assert.equal(isStaffCase(support),true);
  assert.equal(isStaffCase({...support,messages:[{...support.messages[0],author:'unknown'}]}),false);
  assert.equal(isStaffCase({...support,orderId:'another-customer-order'}),false);
  const review={mode:'integration-test',resource:'case',kind:'review',id,status:'pending',productTitle:'Тестовий товар',offerId:id,sellerId:id,rating:5,body:'Тестовий відгук',version:1,createdAt:date,audit:[{id,action:'moderation.review',reasonCode:'review',actorLabel:'DEMO',createdAt:date}]};
  assert.equal(isStaffCase(review),true);
  assert.equal(isStaffCase({...review,status:'unknown'}),false);
});

test('staff capability vocabulary remains explicit and excludes customer-directory access',()=>{
  assert.deepEqual(staffCapabilities.includes('support.read'),true);
  assert.equal((staffCapabilities as readonly string[]).some(x=>/customer|impersonat|admin\.root/.test(x)),false);
});
