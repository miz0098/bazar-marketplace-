import {orderFlowFixture} from '../helpers/order-flow.js';
import {createCommerceService} from '../../src/commerce/service.js';
import {insertUniquePromo} from '../../src/commerce/finance.js';
import {createCatalogV2} from '../../src/catalog/service.js';
import {createOfferService} from '../../src/catalog/offers.js';
import {seedBrowserOffers} from './offer-fixture.js';
import { randomUUID, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import pg from "pg";
import { createCommunicationService } from "../../src/communication/service.js";
import { appendNotificationForTest } from "../../src/communication/notifications.js";
import { ApiError } from "../../src/contracts/foundation.js";
import { discountedTestPlan } from "../../src/payments/test-pricing.js";
import {
  createBrowserGateway,
  requireBrowserTest,
  browserOrigin,
} from "./gateway.js";
import { createApiServer } from "../../src/server.js";
import { readConfig } from "../../src/config.js";
import { createLogger } from "../../src/logger.js";
import { migrate } from "../../src/database/migrations.js";
import { readDatabaseConfig } from "../../src/database/config.js";
import { createCheckoutIntegrationServices } from "../../src/integration/checkout.js";
import { createCustomerService } from "../../src/customer/service.js";
import { createOrderLifecycleService } from "../../src/lifecycle/service.js";
import {
  authorize,
  cookies,
  readJson,
  requireOrigin,
} from "../../src/auth/http.js";
import { digest, requireCsrf } from "../../src/auth/crypto.js";
import { fields } from "../../src/checkout/input.js";
import { uuid } from "../../src/business/validation.js";
import { authFixture } from "../helpers/auth.js";
import { shippingFixture } from "../helpers/shipping.js";
import { paymentFixture } from "../helpers/payments.js";
import type { ShippingAdapter } from "../../src/shipping/adapter.js";
requireBrowserTest();
const info = JSON.parse(
  readFileSync(process.env.BAZAR_BROWSER_STATE!, "utf8"),
) as {
  origin: string;
  uiPort: number;
  secret: string;
  cert: string;
  key: string;
};
browserOrigin(info.origin);
const source = new URL(process.env.DATABASE_TEST_URL!);
if (source.hostname !== "127.0.0.1" || source.pathname !== "/bazar_f2_test")
  throw new Error("Browser DB must be disposable loopback test PostgreSQL");
const admin = new pg.Pool({ connectionString: source.toString() });
let active: Awaited<ReturnType<typeof reset>> | undefined,
  resets = 0;
async function reset() {
  if (++resets > 100) throw new Error("Browser test case limit");
  if (active) {
    await active.app.shutdown();
    await active.pool.end();
  }
  const name = "bazar_f15_" + randomUUID().replaceAll("-", "");
  await admin.query(`CREATE DATABASE "${name}"`);
  const url = new URL(source);
  url.pathname = "/" + name;
  const config = readDatabaseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: "test",
  })!;
  await migrate(config);
  const pool = new pg.Pool({ connectionString: url.toString() }),
    auth = authFixture({ resendSeconds: 1, challengePhoneLimit: 20 }),
    shipping = shippingFixture(),
    payment = paymentFixture();
  auth.config.publicOrigin = info.origin;
  const category = (
    await pool.query(
      "INSERT INTO bazar.categories(handle,title) VALUES('test-category','Тестова категорія') RETURNING id",
    )
  ).rows[0].id;
  const product = (
    await pool.query(
      "INSERT INTO bazar.products(category_id,handle,title,description) VALUES($1,'browser-product','Тестовий товар BAZAR','Вигаданий товар із PostgreSQL') RETURNING id",
      [category],
    )
  ).rows[0].id;
  const offerSeed=process.env.BAZAR_STOREFRONT_INTEGRATION==='1'?await seedBrowserOffers(pool,category):[];
  const offerService=createOfferService(pool),offerFailure={fail:false,public:false};
  const promotion = (
    await pool.query(
      "INSERT INTO bazar.promotions(code,kind,fixed_minor,currency,min_subtotal_minor,starts_at,ends_at,enabled,max_uses,per_user_limit) VALUES('TEST1000','fixed',1000,'UAH',1,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',true,10,10) RETURNING id",
    )
  ).rows[0].id;
  await pool.query(
    "INSERT INTO bazar.promotion_products(promotion_id,product_id) VALUES($1,$2)",
    [promotion, product],
  );
  for(const [code,kind,start,end,minimum,limit,eligible] of [
    ['PERCENT20','percentage','-1 day','1 day',1,10,true],
    ['EXPIRED','fixed','-2 days','-1 day',1,10,true],
    ['FUTURE','fixed','1 day','2 days',1,10,true],
    ['MINIMUM','fixed','-1 day','1 day',1000000,10,true],
    ['INELIGIBLE','fixed','-1 day','1 day',1,10,false],
    ['LIMIT1','fixed','-1 day','1 day',1,1,true],
    ['FRACTION','percentage','-1 day','1 day',1,10,true],
  ] as const){
    const p=(await pool.query("INSERT INTO bazar.promotions(code,kind,fixed_minor,percentage_basis_points,currency,min_subtotal_minor,starts_at,ends_at,enabled,max_uses,per_user_limit) VALUES($1,$2,$3,$4,'UAH',$5,clock_timestamp()+$6::interval,clock_timestamp()+$7::interval,true,$8,$8) RETURNING id",[code,kind,kind==='fixed'?1000:null,kind==='percentage'?(code==='FRACTION'?1000:2000):null,minimum,start,end,limit])).rows[0].id;
    if(eligible)await pool.query('INSERT INTO bazar.promotion_products(promotion_id,product_id) VALUES($1,$2)',[p,product]);
  }
  const variant = (
    await pool.query(
      "INSERT INTO bazar.variants(product_id,sku,price_minor,stock) VALUES($1,'BROWSER-TEST',12345,5) RETURNING id",
      [product],
    )
  ).rows[0].id;
  const sold = (
    await pool.query(
      "INSERT INTO bazar.products(category_id,handle,title) VALUES($1,'unavailable-product','Недоступний тестовий товар') RETURNING id",
      [category],
    )
  ).rows[0].id;
  await pool.query(
    "INSERT INTO bazar.variants(product_id,sku,price_minor,stock) VALUES($1,'UNAVAILABLE',100,0)",
    [sold],
  );
  const ukr: ShippingAdapter = {
    ...shipping.adapters[0],
    carrier: "ukrposhta",
  };
  const graph = createCheckoutIntegrationServices(pool, {
    auth: auth.config,
    sms: auth.sms,
    shipping: [...shipping.adapters, ukr],
    shippingConfig: shipping.config,
    payment: payment.adapter,
    paymentConfig: {...payment.config,discountedCheckoutForTest:true,plan:async ({pricing,shippingCostMinor})=>discountedTestPlan(pricing!,shippingCostMinor!)},
    discountedCheckoutForTest:true,
    isReady: async () => {
      await pool.query("SELECT 1");
      return true;
    },
  });
  const communication=createCommunicationService(pool), notices={fail:false,delay:0};
  const flowStaff=offerSeed.length?(await pool.query("INSERT INTO bazar.users(first_name,last_name) VALUES('Synthetic','Staff') RETURNING id")).rows[0].id:null;const flowFixture=flowStaff?orderFlowFixture(flowStaff):undefined;
  const commerce=offerSeed.length?createCommerceService(pool,payment.adapter,[...shipping.adapters,ukr],flowFixture?.policy):undefined;
  const commercePromos:Record<string,string>={};
  if(commerce){for(const [label,kind,scope] of [['fixed','fixed','order'],['percent','percentage','order'],['category','fixed','category'],['product','fixed','product'],['fractional','percentage','product']] as const){let promoId='';commercePromos[label]=await insertUniquePromo(async code=>{const r=await pool.query("INSERT INTO bazar.promotions(code,kind,fixed_minor,percentage_basis_points,currency,min_subtotal_minor,starts_at,ends_at,enabled,max_uses,per_user_limit) VALUES($1,$2,$3,$4,'UAH',1,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',true,10,10) ON CONFLICT(code) DO NOTHING RETURNING id",[code,kind,kind==='fixed'?100000:null,kind==='percentage'?1000:null]);if(!r.rows.length)return false;promoId=r.rows[0].id;return true;});await pool.query('INSERT INTO bazar.commerce_promotions(promotion_id,scope,code) VALUES($1,$2,$3)',[promoId,scope,commercePromos[label]]);if(scope==='category')await pool.query('INSERT INTO bazar.commerce_promotion_categories(promotion_id,category_id) VALUES($1,$2)',[promoId,category]);if(scope==='product')await pool.query('INSERT INTO bazar.promotion_products(promotion_id,product_id) VALUES($1,$2)',[promoId,offerSeed[0].productId]);}}
  const app = createApiServer(
    readConfig({ NODE_ENV: "test", CORS_ORIGINS: info.origin }),
    createLogger("error"),
    {
      ...graph,commerce,
      catalogV2:createCatalogV2(pool),offers:{...offerService,list:async q=>{if(offerFailure.public)throw new ApiError(503,'SERVICE_UNAVAILABLE','Test public failure');return offerService.list(q);},state:async actor=>{if(offerFailure.fail)throw new ApiError(503,'SERVICE_UNAVAILABLE','Test customer failure');return offerService.state(actor);}},
      communication:{...communication,notificationSummary:async(actor:string)=>{if(notices.delay)await new Promise(r=>setTimeout(r,notices.delay));if(notices.fail)throw new ApiError(503,"SERVICE_UNAVAILABLE","Test notifications unavailable.");return communication.notificationSummary(actor);}},
      customer: createCustomerService(pool),
      lifecycle: createOrderLifecycleService(pool),
    },
  );
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("API listener");
  return {
    pool,
    auth,
    shipping,
    payment,
    graph,
    app,
    communication,notices,offerSeed,offerFailure,commerce,commercePromos,flowFixture,
    port: address.port,
    product,
    variant,
  };
}
active = await reset();
const reply = (res: import("node:http").ServerResponse, value: unknown) => {
  res.writeHead(200, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(value));
};
const gateway = createBrowserGateway({
  origin: info.origin,
  uiPort: info.uiPort,
  apiPort: () => active!.port,
  tls: { key: readFileSync(info.key), cert: readFileSync(info.cert) },
  async helper(req, res) {
    const a = active!;
    requireOrigin(req, a.graph.auth);
    if (req.method !== "POST") throw new Error("method");
    const body = await readJson(req, res);
    if (req.url === "/__browser/otp") {
      requireCsrf(
        a.auth.config,
        cookies(req).flow,
        req.headers["x-csrf-token"],
      );
      const r = fields(body, ["challengeId"]),
        id = uuid(r.challengeId);
      const row = (
        await a.pool.query(
          "SELECT id FROM bazar.otp_challenges WHERE id=$1 AND flow_digest=$2 AND consumed_at IS NULL AND expires_at>clock_timestamp() AND delivery_state='test-only'",
          [id, digest(cookies(req).flow)],
        )
      ).rowCount;
      const sent = a.auth.sent.get(id);
      if (!row || !sent) throw new Error("own challenge required");
      reply(res, { code: sent.code });
      return;
    }
    if(req.url==='/__browser/commerce-payment'){
      const actor=(await authorize(req,a.graph.auth,true)).userId,r=fields(body,['operationId','result']),id=uuid(r.operationId);
      if(!a.commerce||!['succeeded','declined'].includes(String(r.result))||!(await a.pool.query('SELECT id FROM bazar.commerce_payment_attempts WHERE id=$1 AND user_id=$2',[id,actor])).rowCount)throw new Error('Owner/result denied');
      const proof=a.payment.signed(a.payment.event(id,r.result as 'succeeded'|'declined'));await a.commerce.webhook(proof.raw,proof.signature);reply(res,{recordedForTest:true});return;
    }
    if (req.url === "/__browser/payment") {
      const actor = (await authorize(req, a.graph.auth, true)).userId,
        r = fields(body, ["operationId", "result"]),
        id = uuid(r.operationId);
      if (!["succeeded", "declined"].includes(r.result as string))
        throw new Error("result");
      if (
        !(
          await a.pool.query(
            "SELECT id FROM bazar.payment_operations WHERE id=$1 AND user_id=$2",
            [id, actor],
          )
        ).rowCount
      )
        throw new Error("owner");
      const event = a.payment.signed(
        a.payment.event(id, r.result as "succeeded" | "declined"),
      );
      await a.graph.payments.webhook(event.raw, event.signature);
      reply(res, { recordedForTest: true });
      return;
    }
    throw new Error("unknown helper");
  },
  async control(req, res) {
    if (
      req.headers.origin ||
      req.headers["sec-fetch-site"] ||
      req.method !== "POST"
    )
      throw new Error("Node controller only");
    const key = req.headers["x-browser-control"];
    if (
      typeof key !== "string" ||
      key.length !== info.secret.length ||
      !timingSafeEqual(Buffer.from(key), Buffer.from(info.secret))
    )
      throw new Error("controller");
    const body = await readJson(req, res),
      r = fields(body, ["action"]);
    const action = r.action;
    if (action === "reset") {
      active = await reset();
      reply(res, { ready: true });
      return;
    }
    const a = active!;
    if(typeof action==='string'&&action.startsWith('f23-')){if(!a.commerce||!a.flowFixture||!['f23-prepare','f23-ship','f23-transport','f23-deliver','f23-receive','f23-refund-plan','f23-refund-confirm'].includes(action))throw new Error('Isolated flow action unavailable');const parent=(await a.pool.query('SELECT id,user_id FROM bazar.commerce_parent_orders ORDER BY created_at DESC,id DESC LIMIT 1')).rows[0];const seller=(await a.pool.query('SELECT s.id FROM bazar.commerce_seller_orders s JOIN bazar.seller_offers o ON o.seller_id=s.seller_id WHERE s.parent_id=$1 AND o.id=$2',[parent.id,a.offerSeed[0].id])).rows[0];const view=await a.commerce.flow.get(parent.user_id,parent.id),state=view.sellerOrders.find(s=>s.id===seller.id)!;const body={idempotencyKey:randomUUID(),expectedVersion:state.version};if(action==='f23-prepare')await a.commerce.flow.prepare(a.offerSeed[0].owner,seller.id,body);else if(action==='f23-refund-plan'){const request=view.requests.find(r=>r.sellerOrderId===seller.id&&r.kind==='return'&&r.state==='received-for-test'&&!view.refunds.some(f=>f.requestId===r.id));if(!request)throw new Error('Received return required');await a.commerce.flow.prepareRefund(parent.user_id,seller.id,{...body,requestId:request.id});}else if(action==='f23-refund-confirm'){const refund=view.refunds.find(f=>f.state==='prepared'&&view.requests.some(r=>r.id===f.requestId&&r.sellerOrderId===seller.id));if(!refund)throw new Error('Prepared refund required');const row=(await a.pool.query('SELECT attempt_id FROM bazar.commerce_return_refunds WHERE id=$1',[refund.id])).rows[0];const event={eventId:randomUUID(),refundId:refund.id,paymentOperationId:row.attempt_id,accountRef:a.flowFixture.refund.adapter.accountRef,amountMinor:refund.amountMinor,currency:'UAH' as const,state:'confirmed-for-test' as const};const proof=a.flowFixture.refund.signed(event);await a.commerce.flow.refundEvent(proof.raw,proof.signature);}else if(action==='f23-receive'){const request=view.requests.find(r=>r.sellerOrderId===seller.id&&r.kind==='return'&&r.state==='requested');if(!request)throw new Error('Return required');await a.commerce.flow.receiveReturn(a.offerSeed[0].owner,seller.id,{...body,requestId:request.id});}else{const proof=a.flowFixture.sign({eventId:randomUUID(),sellerOrderId:seller.id,kind:action==='f23-ship'?'shipped':action==='f23-deliver'?'delivered':'transport',trackingRef:'SYNTHETIC-'+seller.id});await a.commerce.flow.transport(proof.raw,proof.signature);}reply(res,{ok:true});return;}
    if(action==='f22-fixture'){if(!a.offerSeed.length)throw new Error('Offer fixtures required');await a.pool.query('UPDATE bazar.variants SET price_minor=800000 WHERE id=$1',[a.offerSeed[0].id]);await a.pool.query('UPDATE bazar.variants SET price_minor=200000 WHERE id=$1',[a.offerSeed[3].id]);await a.pool.query('UPDATE bazar.variants SET price_minor=400000 WHERE id=$1',[a.offerSeed[2].id]);reply(res,{offers:a.offerSeed,promos:a.commercePromos});return;}
    else if(action==='f221-fractional'){await a.pool.query('UPDATE bazar.variants SET price_minor=3333 WHERE id=$1',[a.offerSeed[0].id]);await a.pool.query('UPDATE bazar.variants SET price_minor=10 WHERE id=$1',[a.offerSeed[3].id]);}
    else if(action==='f22-price')await a.pool.query('UPDATE bazar.variants SET price_minor=900000 WHERE id=$1',[a.offerSeed[0].id]);
    else if(action==='f22-unknown')a.payment.state.failSubmit=true;
    else if(action==='f22-pay-ok')a.payment.state.failSubmit=false;
    else if(action==='catalog-error')a.offerFailure.public=true;
    else if(action==='catalog-ok')a.offerFailure.public=false;
    else if(action==='offers-error')a.offerFailure.fail=true;
    else if(action==='offers-ok')a.offerFailure.fail=false;
    else if(action==='offer-out'||action==='offer-restored'){
      const selected=a.offerSeed[0];if(!selected)throw new Error('Offer fixture missing');const cp=(await a.pool.query('SELECT version::text FROM bazar.catalog_products WHERE product_id=$1',[selected.productId])).rows[0];await createCatalogV2(a.pool).update(selected.owner,selected.productId,{expectedVersion:Number(cp.version),idempotencyKey:randomUUID(),variantId:selected.id,available:action==='offer-restored'});
    }
    else if(action==='expire-sessions')await a.pool.query("UPDATE bazar.sessions SET expires_at=created_at+interval '1 millisecond'");
    else if(action==='offer-info'){reply(res,{offers:a.offerSeed});return;}
    else if(action==="notifications-slow")a.notices.delay=1500;
    else if(action==="notifications-fast")a.notices.delay=0;
    else if(action==="notifications-error")a.notices.fail=true;
    else if(action==="notifications-ok")a.notices.fail=false;
    else if(action==="notification-demo") {
      const order=(await a.pool.query("SELECT id,user_id FROM bazar.orders WHERE foundation_mode='integration-test' ORDER BY created_at LIMIT 1")).rows[0];
      if(!order)throw new Error('Test order required');
      const actor=order.user_id;
      const c=await a.pool.connect();
      try {
        await c.query('BEGIN');
        // Stable source IDs are derived from this owned test order; replay must preserve read state.
        for(const kind of ['order.status_changed','order.cancelled'] as const)
          await appendNotificationForTest(c,actor,kind,order.id,order.id);
        let chat=(await c.query('SELECT conversation_id FROM bazar.conversation_members WHERE user_id=$1 ORDER BY conversation_id LIMIT 1',[actor])).rows[0]?.conversation_id;
        if(!chat){chat=(await c.query('INSERT INTO bazar.conversations DEFAULT VALUES RETURNING id')).rows[0].id;await c.query('INSERT INTO bazar.conversation_members(conversation_id,user_id) VALUES($1,$2)',[chat,actor]);}
        let message=(await c.query('SELECT id FROM bazar.messages WHERE conversation_id=$1 LIMIT 1',[chat])).rows[0]?.id;
        if(!message)message=(await c.query('INSERT INTO bazar.messages(conversation_id,sender_id,client_message_id,body) VALUES($1,$2,$3,$4) RETURNING id',[chat,actor,randomUUID(),'Ізольоване тестове повідомлення. Не доставлено реальному користувачу. '+'ДовгеТестовеСлово'.repeat(60)])).rows[0].id;
        await appendNotificationForTest(c,actor,'message.created',message,chat);
        let ticket=(await c.query('SELECT id FROM bazar.support_tickets WHERE user_id=$1 LIMIT 1',[actor])).rows[0]?.id;
        if(!ticket)ticket=(await c.query("INSERT INTO bazar.support_tickets(user_id,subject,category) VALUES($1,'Ізольоване тестове звернення','other') RETURNING id",[actor])).rows[0].id;
        let reply=(await c.query('SELECT id FROM bazar.support_messages WHERE ticket_id=$1 LIMIT 1',[ticket])).rows[0]?.id;
        if(!reply)reply=(await c.query("INSERT INTO bazar.support_messages(ticket_id,user_id,body) VALUES($1,$2,'Симуляція відповіді підтримки. CRM і співробітники не підключені; це тестовий запис, а не відповідь реального оператора.') RETURNING id",[ticket,actor])).rows[0].id;
        await appendNotificationForTest(c,actor,'support.replied',reply,ticket);
        await c.query('COMMIT');
      }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
    }
    else if (action === "price")
      await a.pool.query(
        "UPDATE bazar.variants SET price_minor=20000 WHERE id=$1",
        [a.variant],
      );
    else if (action === "expire-promo") await a.pool.query("UPDATE bazar.promotions SET ends_at=clock_timestamp() WHERE code='TEST1000'");
    else if (action === "sold-out")
      await a.pool.query("UPDATE bazar.variants SET stock=0 WHERE id=$1", [
        a.variant,
      ]);
    else if (action === "shipping-error") a.shipping.state.fail = true;
    else if (action === "shipping-ok") a.shipping.state.fail = false;
    else if (action === "stale-tariff") a.shipping.state.amount++;
    else if (action === "short-quote") a.shipping.config.quoteTtlMs = 4000;
    else if (action === "sms-error") a.auth.setFailure(true);
    else if (action === "revoke")
      await a.pool.query(
        "UPDATE bazar.sessions SET revoked_at=clock_timestamp()",
      );
    else if (action === "counts") {
      reply(res, {
        orders: (
          await a.pool.query(
            "SELECT count(*)::int n FROM bazar.orders WHERE foundation_mode='integration-test'",
          )
        ).rows[0].n,
        claims: (await a.pool.query("SELECT count(*)::int n FROM bazar.promotion_usage_claims")).rows[0].n,
        links: (
          await a.pool.query(
            "SELECT count(*)::int n FROM bazar.checkout_completion_links",
          )
        ).rows[0].n,
      });
      return;
    } else throw new Error("control action");
    reply(res, { ready: true });
  },
});
gateway.listen(Number(new URL(info.origin).port), "127.0.0.1");
await once(gateway, "listening");
process.stdout.write("Isolated HTTPS browser gateway ready\n");
async function close() {
  gateway.closeAllConnections();
  await new Promise<void>((resolve) => gateway.close(() => resolve()));
  if (active) {
    await active.app.shutdown();
    await active.pool.end();
  }
  await admin.end();
}
process.once("SIGTERM", () => {
  void close().then(() => process.exit(0));
});
process.once("SIGINT", () => {
  void close().then(() => process.exit(0));
});
