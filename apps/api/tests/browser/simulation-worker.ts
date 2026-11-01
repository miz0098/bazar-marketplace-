import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import {ApiError} from '../../src/contracts/foundation.js';
import type {createCommerceService} from '../../src/commerce/service.js';
import type {createCommunicationService} from '../../src/communication/service.js';
import type {createCustomerService} from '../../src/customer/service.js';
import type {orderFlowFixture} from '../helpers/order-flow.js';

type Services={pool:pg.Pool;customer:ReturnType<typeof createCustomerService>;commerce:ReturnType<typeof createCommerceService>;communication:ReturnType<typeof createCommunicationService>;flowFixture:ReturnType<typeof orderFlowFixture>;flowStaff:string;staffTickets:Set<string>;offerSeed:{id:string;owner:string;productId:string}[]};
/** Synthetic counterparts only. All writes use the F23/F24 services and their capability checks. */
export function startSimulationWorker(a:Services,stepMs=15000){
 if(process.env.NODE_ENV!=='test'||process.env.BAZAR_FULL_SIMULATION!=='1'||!Number.isInteger(stepMs)||stepMs<1000||stepMs>60000)throw new Error('Invalid isolated simulation worker');
 let stopped=false,running:Promise<void>|undefined;
 const owners=a.offerSeed.map(o=>o.owner);
 async function tick(){
  a.flowFixture.clock.now=new Date();
  // Each transition is driven by the last committed event, never by a browser-supplied status.
  const orders=(await a.pool.query(`SELECT s.id,s.parent_id,p.user_id,o.user_id AS owner FROM bazar.commerce_seller_orders s
   JOIN bazar.commerce_parent_orders p ON p.id=s.parent_id AND p.payment_state='succeeded'
   JOIN bazar.seller_owners o ON o.seller_id=s.seller_id
   WHERE o.user_id=ANY($1::uuid[]) AND (SELECT max(created_at) FROM bazar.commerce_lifecycle_events WHERE seller_order_id=s.id)<clock_timestamp()-$2::int*interval '1 millisecond' LIMIT 100`,[owners,stepMs])).rows;
  for(const row of orders){if(stopped)return;await safe(async()=>{
   const view=await a.commerce.flow.get(row.user_id,row.parent_id),s=view.sellerOrders.find(s=>s.id===row.id)!;
   const command={idempotencyKey:randomUUID(),expectedVersion:s.version};
   const cancellation=view.requests.find(r=>r.sellerOrderId===s.id&&r.kind==='cancellation'&&r.state==='requested');
   const returned=view.requests.find(r=>r.sellerOrderId===s.id&&r.kind==='return'&&r.state==='requested');
   if(cancellation){await a.commerce.flow.approveCancellation(row.owner,s.id,{...command,requestId:cancellation.id});return;}
   if(returned){await a.commerce.flow.receiveReturn(row.owner,s.id,{...command,requestId:returned.id});return;}
   const refundable=view.requests.find(r=>r.sellerOrderId===s.id&&r.kind==='return'&&r.state==='received-for-test'&&!view.refunds.some(f=>f.requestId===r.id));
   if(refundable){await a.commerce.flow.prepareRefund(row.user_id,s.id,{...command,requestId:refundable.id});return;}
   const refund=view.refunds.find(r=>r.state==='prepared'&&view.requests.some(q=>q.id===r.requestId&&q.sellerOrderId===s.id));
   if(refund){const attempt=(await a.pool.query('SELECT attempt_id FROM bazar.commerce_return_refunds WHERE id=$1',[refund.id])).rows[0];const proof=a.flowFixture.refund.signed({eventId:randomUUID(),refundId:refund.id,paymentOperationId:attempt.attempt_id,accountRef:a.flowFixture.refund.adapter.accountRef,amountMinor:refund.amountMinor,currency:'UAH',state:'confirmed-for-test'});await a.commerce.flow.refundEvent(proof.raw,proof.signature);return;}
   if(s.status==='confirmed')await a.commerce.flow.prepare(row.owner,s.id,command);
   else if(s.status==='preparing'||s.status==='shipped'){
    const proof=a.flowFixture.sign({eventId:randomUUID(),sellerOrderId:s.id,kind:s.status==='preparing'?'shipped':'delivered',trackingRef:'BZ-'+s.id});
    await a.commerce.flow.transport(proof.raw,proof.signature);
   }
  });}
  const reviews=(await a.pool.query("SELECT id,version FROM bazar.commerce_reviews WHERE state='pending' AND NOT withdrawn AND created_at<clock_timestamp()-interval '1 second' LIMIT 100")).rows;
  for(const r of reviews){if(stopped)return;await safe(()=>a.customer.account.moderate(a.flowStaff,'review',r.id,{expectedVersion:Number(r.version),state:'published',reason:'Isolated simulation moderation policy'}));}
  const questions=(await a.pool.query(`SELECT q.*,o.user_id AS owner FROM bazar.product_questions q JOIN bazar.seller_owners o ON o.seller_id=q.seller_id
   WHERE o.user_id=ANY($1::uuid[]) AND q.state IN ('pending','published') AND (q.answer IS NULL OR q.answer_state='pending') AND q.created_at<clock_timestamp()-interval '1 second' LIMIT 100`,[owners])).rows;
  for(const q of questions){if(stopped)return;await safe(async()=>{
   let version=Number(q.version);
   if(q.state==='pending'){await a.customer.account.moderate(a.flowStaff,'question',q.id,{expectedVersion:version,state:'published',reason:'Isolated simulation moderation policy'});version++;}
   if(!q.answer){await a.customer.account.answer(q.owner,q.id,{expectedVersion:version,body:'Дякуємо за запитання! Доступні варіанти та характеристики наведені в картці товару.'});version++;}
   await a.customer.account.moderate(a.flowStaff,'answer',q.id,{expectedVersion:version,state:'published',reason:'Isolated simulation answer moderation policy'});
  });}
  const chats=(await a.pool.query(`SELECT c.conversation_id,c.buyer_id,o.user_id AS owner,m.id FROM bazar.seller_conversation_contexts c
   JOIN bazar.seller_owners o ON o.seller_id=c.seller_id
   JOIN LATERAL(SELECT id,sender_id,created_at FROM bazar.messages WHERE conversation_id=c.conversation_id ORDER BY sequence DESC LIMIT 1)m ON m.sender_id=c.buyer_id
   WHERE o.user_id=ANY($1::uuid[]) AND m.created_at<clock_timestamp()-interval '1 second' LIMIT 100`,[owners])).rows;
  for(const c of chats){if(stopped)return;await safe(()=>a.communication.send(c.owner,c.conversation_id,'messages',{clientMessageId:c.id,body:'Дякуємо за повідомлення! Характеристики товару та умови доставки доступні в картці пропозиції й деталях замовлення.'}));}
  const tickets=(await a.pool.query(`SELECT t.id,m.id AS message_id FROM bazar.support_tickets t
   JOIN LATERAL(SELECT id,staff_actor_id,created_at FROM bazar.support_messages WHERE ticket_id=t.id ORDER BY sequence DESC LIMIT 1)m ON m.staff_actor_id IS NULL
   WHERE t.status<>'closed' AND m.created_at<clock_timestamp()-interval '1 second' LIMIT 100`)).rows;
  for(const t of tickets){if(stopped)return;a.staffTickets.add(t.id);await safe(()=>a.communication.staffReply(a.flowStaff,t.id,{clientMessageId:t.message_id,body:'Дякуємо за звернення! Його збережено. Статус покупки та історію доставки можна переглянути в розділі «Мої замовлення».'}));}
 }
 async function safe(fn:()=>Promise<unknown>){try{await fn();}catch(e){if(!(e instanceof ApiError&&[403,404,409].includes(e.status)))throw e;}}
 const timer=setInterval(()=>{if(stopped||running)return;running=tick().catch(()=>{process.stderr.write('Simulation worker operation failed; retry uses committed service state.\n');}).finally(()=>{running=undefined;});},1000);
 return async()=>{stopped=true;clearInterval(timer);await running;};
}
