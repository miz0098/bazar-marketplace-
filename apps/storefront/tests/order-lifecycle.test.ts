import assert from "node:assert/strict";
import test from "node:test";
import { createDemoAccountService } from "../services/mock/account-service";
import { validateDemoReturn } from "../domain/account/order-lifecycle";
import { createOrderLifecycleClient } from "../lib/order-lifecycle-client";
import { isLifecycleView } from "../services/contracts/order-lifecycle";
const options = { wait: async () => {} };
test("F14 demo return persists only in the preview instance; duplicate keys, cumulative quantity and unchanged financial/order statuses stay explicit", async () => {
  const service = createDemoAccountService(options),
    order = (await service.getOrder("demo-order-004"))!,
    line = order.items.find((l) => l.quantity === 2)!;
  const input = {
    requestKey: "test-return-1",
    reason: "Synthetic reason",
    items: [{ orderLineId: line.id, quantity: 1 }],
  };
  const [first, replay] = await Promise.all([
    service.createOrderReturn(order.id, input),
    service.createOrderReturn(order.id, input),
  ]);
  assert.equal(first.persisted, false);
  assert.equal(replay.value.returns.length, 1);
  assert.equal(first.value.refundStatus, "not-initiated");
  assert.equal(first.value.cancellation, "policy-required");
  await assert.rejects(
    service.createOrderReturn(order.id, { ...input, reason: "Different" }),
    { code: "validation" },
  );
  await assert.rejects(
    service.createOrderReturn(order.id, {
      ...input,
      requestKey: "test-2",
      items: [{ orderLineId: line.id, quantity: 2 }],
    }),
    { code: "validation" },
  );
  await service.createOrderReturn(order.id, { ...input, requestKey: "test-2" });
  assert.equal((await service.getOrderLifecycle(order.id))?.returns.length, 2);
  assert.equal((await service.getOrder(order.id))?.status, order.status);
  assert.equal(
    (await createDemoAccountService(options).getOrderLifecycle(order.id))
      ?.returns.length,
    0,
  );
});
test("F14 missing/invalid returns and isolated preview errors never create a request", async () => {
  const service = createDemoAccountService(options);
  assert.equal(await service.getOrderLifecycle("missing"), null);
  for (const draft of [
    { requestKey: "x", reason: "", items: [] },
    {
      requestKey: "x",
      reason: "Synthetic",
      items: [{ orderLineId: "x", quantity: -1 }],
    },
    {
      requestKey: "x",
      reason: "a\u0000b",
      items: [{ orderLineId: "x", quantity: 1 }],
    },
  ])
    assert.ok(validateDemoReturn(draft));
  await assert.rejects(
    service.createOrderReturn("demo-order-004", {
      requestKey: "x",
      reason: "Synthetic",
      items: [{ orderLineId: "foreign", quantity: 1 }],
    }),
    { code: "validation" },
  );
  await assert.rejects(
    createDemoAccountService({
      ...options,
      scenario: "error",
    }).getOrderLifecycle("demo-order-004"),
    { code: "unavailable" },
  );
  assert.equal(
    (await service.getOrderLifecycle("demo-order-004"))?.history.length,
    1,
  );
});
test("F14 future typed client rejects fake production/refund success and uses same-origin CSRF without fallback", async () => {
  const id = "12345678-1234-1234-1234-123456789abc",
    calls: RequestInit[] = [];
  const client = createOrderLifecycleClient(
    () => "a".repeat(43),
    async (_url, init) => {
      calls.push(init!);
      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            mode: "integration-test",
            resource: "order-lifecycle-list",
            items: [],
            nextCursor: null,
          },
          meta: { requestId: id },
        }),
        { headers: { "content-type": "application/json" } },
      );
    },
  );
  assert.equal((await client.listOrders()).items.length, 0);
  assert.equal(calls[0].credentials, "same-origin");
  assert.equal(calls[0].cache, "no-store");
  assert.equal(calls[0].redirect, "error");
  await assert.rejects(
    client.requestCancellation(id, { idempotencyKey: id, reason: "Synthetic" }),
    { code: "invalid-response" },
  );
  assert.equal(
    new Headers(calls[1].headers).get("x-csrf-token"),
    "a".repeat(43),
  );
  assert.throws(() => client.listOrders(101), { code: "invalid-input" });
  assert.throws(
    () =>
      client.requestReturn(id, {
        idempotencyKey: id,
        reason: "Synthetic",
        items: [],
      }),
    { code: "invalid-input" },
  );
  assert.equal(
    isLifecycleView({ mode: "production", fundsReturned: true }),
    false,
  );
  const failed = createOrderLifecycleClient(
    () => "",
    async () => new Response("private provider failure", { status: 503 }),
  );
  await assert.rejects(failed.getOrder(id), {
    code: "http-error",
    status: 503,
  });
});

test('F14 client correlates selected return quantities and rejects false refund/history facts',async()=>{
 const id='12345678-1234-1234-1234-123456789abc';
 const data={mode:'integration-test',resource:'order-lifecycle',order:{id,createdAt:'2026-10-26T12:00:00.000Z',status:'pending',paymentStatus:'not-initiated',deliveryStatus:'not-requested',returnStatus:'requested-for-test',refundStatus:'not-initiated',orderPaid:false,fundsReturned:false,lines:[{id,title:'Synthetic',quantity:2,unitPriceMinor:100,lineTotalMinor:200}]},eligibility:{cancellation:'request-only',returns:'request-only'},requests:[{id,kind:'return',state:'requested',version:1,reason:'Synthetic',items:[{orderLineId:id,quantity:1}],createdAt:'2026-10-26T12:00:00.000Z'}],refunds:[],history:[{id,sequence:1,requestId:null,refundId:null,fromState:null,toState:'pending',version:1,source:'immutable-order',createdAt:'2026-10-26T12:00:00.000Z'}]};
 assert.ok(isLifecycleView(data));assert.equal(isLifecycleView({...data,order:{...data.order,fundsReturned:true}}),false);assert.equal(isLifecycleView({...data,history:[{...data.history[0],toState:'refunded'}]}),false);
 const client=createOrderLifecycleClient(()=>'a'.repeat(43),async()=>new Response(JSON.stringify({ok:true,data,meta:{requestId:id}}),{headers:{'content-type':'application/json'}}));
 await assert.rejects(client.requestReturn(id,{idempotencyKey:id,reason:'Synthetic',items:[{orderLineId:id,quantity:2}]}),{code:'invalid-response'});
 assert.equal((await client.requestReturn(id,{idempotencyKey:id,reason:'Synthetic',items:[{orderLineId:id,quantity:1}]})).requests.length,1);
});
