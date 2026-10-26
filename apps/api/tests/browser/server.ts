import { randomUUID, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import pg from "pg";
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
  if (++resets > 40) throw new Error("Browser test case limit");
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
  const promotion = (
    await pool.query(
      "INSERT INTO bazar.promotions(code,kind,fixed_minor,currency,min_subtotal_minor,starts_at,ends_at,enabled,max_uses,per_user_limit) VALUES('TEST1000','fixed',1000,'UAH',1,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',true,10,10) RETURNING id",
    )
  ).rows[0].id;
  await pool.query(
    "INSERT INTO bazar.promotion_products(promotion_id,product_id) VALUES($1,$2)",
    [promotion, product],
  );
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
    paymentConfig: payment.config,
    isReady: async () => {
      await pool.query("SELECT 1");
      return true;
    },
  });
  const app = createApiServer(
    readConfig({ NODE_ENV: "test", CORS_ORIGINS: info.origin }),
    createLogger("error"),
    {
      ...graph,
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
    if (action === "price")
      await a.pool.query(
        "UPDATE bazar.variants SET price_minor=20000 WHERE id=$1",
        [a.variant],
      );
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
