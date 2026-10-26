import type pg from "pg";
import { createHash } from "node:crypto";
import { ApiError } from "../contracts/foundation.js";
import { uuid, integer, money, invalid } from "../business/validation.js";
import { fields } from "../checkout/input.js";
import { readOrder } from "../checkout/state.js";
import { createCheckoutBusinessService } from "../checkout/service.js";
import { requestInput } from "./input.js";
import {
  isLifecycleView,
  type LifecycleView,
  type RequestKind,
  type RequestState,
} from "../contracts/lifecycle.js";
import type {
  IsolatedLifecyclePolicy,
  IsolatedRefundAdapter,
} from "./adapter.js";
const missing = () =>
  new ApiError(404, "NOT_FOUND", "Order lifecycle resource not found.");
const conflict = () =>
  new ApiError(
    409,
    "CONFLICT",
    "Order lifecycle request conflicts with current state.",
  );
const blocked = () =>
  new ApiError(
    409,
    "CHECKOUT_POLICY_REQUIRED",
    "Approved lifecycle or financial policy is required.",
  );
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest();
export function createOrderLifecycleService(
  pool: pg.Pool,
  policy?: IsolatedLifecyclePolicy,
  adapter?: IsolatedRefundAdapter,
) {
  if (
    process.env.NODE_ENV !== "test" ||
    (policy && policy.scope !== "isolated-test") ||
    (adapter && adapter.scope !== "isolated-test")
  )
    throw new Error("Order lifecycle requires isolated test composition");
  const orders = createCheckoutBusinessService(pool);
  async function tx<T>(
    actor: string,
    id: string,
    run: (c: pg.PoolClient) => Promise<T>,
  ) {
    actor = uuid(actor);
    id = uuid(id);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      if (
        !(
          await c.query(
            "SELECT id FROM bazar.orders WHERE id=$1 AND user_id=$2 AND foundation_mode='integration-test' FOR UPDATE",
            [id, actor],
          )
        ).rowCount
      )
        throw missing();
      const result = await run(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        ["23503", "23505", "23514", "40001", "40P01"].includes(String(e.code))
      )
        throw conflict();
      throw e;
    } finally {
      c.release();
    }
  }
  async function read(
    c: pg.PoolClient,
    actor: string,
    id: string,
  ): Promise<LifecycleView> {
    const order = await readOrder(c, actor, id);
    const lines = (
      await c.query(
        "SELECT id,title_snapshot,quantity,unit_price_minor::text,line_total_minor::text FROM bazar.order_lines WHERE order_id=$1 AND user_id=$2 ORDER BY id LIMIT 101",
        [id, actor],
      )
    ).rows.map((r) => ({
      id: r.id,
      title: r.title_snapshot,
      quantity: r.quantity,
      unitPriceMinor: money(r.unit_price_minor),
      lineTotalMinor: money(r.line_total_minor),
    }));
    const rows = (
      await c.query(
        "SELECT id,kind,state,version::text,reason,created_at FROM bazar.order_lifecycle_requests WHERE order_id=$1 AND user_id=$2 ORDER BY created_at,id LIMIT 201",
        [id, actor],
      )
    ).rows;
    const items = (
      await c.query(
        "SELECT request_id,order_line_id,quantity FROM bazar.order_return_items WHERE order_id=$1 AND user_id=$2 ORDER BY order_line_id LIMIT 20001",
        [id, actor],
      )
    ).rows;
    const requests = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      state: r.state,
      version: money(r.version),
      reason: r.reason,
      createdAt: r.created_at.toISOString(),
      items: items
        .filter((i) => i.request_id === r.id)
        .map((i) => ({ orderLineId: i.order_line_id, quantity: i.quantity })),
    }));
    const refunds = (
      await c.query(
        "SELECT id,request_id,payment_operation_id,extent,amount_minor::text,currency,state,version::text,basis FROM bazar.order_refund_attempts WHERE order_id=$1 AND user_id=$2 ORDER BY created_at,id LIMIT 201",
        [id, actor],
      )
    ).rows.map((r) => ({
      id: r.id,
      requestId: r.request_id,
      paymentOperationId: r.payment_operation_id,
      extent: r.extent,
      amountMinor: money(r.amount_minor),
      currency: r.currency,
      state: r.state,
      version: money(r.version),
      basis: r.basis,
      realRefund: false,
      fundsReturned: false,
    }));
    const history = (
      await c.query(
        "SELECT id,sequence::text,request_id,refund_id,from_state,to_state,version::text,source,created_at FROM bazar.order_lifecycle_history WHERE order_id=$1 AND user_id=$2 ORDER BY sequence LIMIT 201",
        [id, actor],
      )
    ).rows.map((r) => ({
      id: r.id,
      sequence: money(r.sequence),
      requestId: r.request_id,
      refundId: r.refund_id,
      fromState: r.from_state,
      toState: r.to_state,
      version: money(r.version),
      source: r.source,
      createdAt: r.created_at.toISOString(),
    }));
    if (
      lines.length > 100 ||
      rows.length > 200 ||
      items.length > 20000 ||
      refunds.length > 200 ||
      history.length > 200
    )
      throw new ApiError(
        503,
        "SERVICE_UNAVAILABLE",
        "Refine lifecycle history before further operations.",
      );
    const eligibility = (kind: RequestKind) =>
      !policy
        ? "policy-required"
        : policy.canRequest({ userId: actor, orderId: id, kind })
          ? "request-only"
          : "unavailable";
    const v: unknown = {
      mode: "integration-test",
      resource: "order-lifecycle",
      order: {
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.delivery.status,
        returnStatus: requests.some((r) => r.kind === "return")
          ? "requested-for-test"
          : "not-requested",
        refundStatus: refunds.length ? "test-attempts-only" : "not-initiated",
        orderPaid: false,
        fundsReturned: false,
        lines,
      },
      eligibility: {
        cancellation: eligibility("cancellation"),
        returns: eligibility("return"),
      },
      requests,
      refunds,
      history,
    };
    if (!isLifecycleView(v)) throw new Error("Invalid lifecycle result");
    return v;
  }
  return {
    async list(actor: string, params: URLSearchParams) {
      const page = await orders.listOrders(uuid(actor), params);
      return {
        mode: "integration-test" as const,
        resource: "order-lifecycle-list" as const,
        items: page.items.map((i) => ({
          id: i.id,
          createdAt: i.createdAt,
          status: i.status,
        })),
        nextCursor: page.nextCursor,
      };
    },
    async get(actor: string, id: string) {
      actor = uuid(actor);
      id = uuid(id);
      return tx(actor, id, (c) => read(c, actor, id));
    },
    async request(
      actor: string,
      id: string,
      kind: RequestKind,
      value: unknown,
    ) {
      actor = uuid(actor);
      id = uuid(id);
      if (!["cancellation", "return"].includes(kind)) invalid();
      const input = requestInput(value, kind),
        digest = hash({ orderId: id, kind, ...input });
      return tx(actor, id, async (c) => {
        const old = (
          await c.query(
            "SELECT request_digest FROM bazar.order_lifecycle_requests WHERE user_id=$1 AND request_key=$2",
            [actor, input.idempotencyKey],
          )
        ).rows[0];
        if (old) {
          if (!old.request_digest.equals(digest)) throw conflict();
          return read(c, actor, id);
        }
        if (!policy || !policy.canRequest({ userId: actor, orderId: id, kind }))
          throw blocked();
        // Validate source line ownership/quantity inside the order lock; SQL also enforces cumulative capacity.
        for (const item of input.items)
          if (
            !(
              await c.query(
                "SELECT id FROM bazar.order_lines WHERE id=$1 AND order_id=$2 AND user_id=$3 AND quantity>=$4",
                [item.orderLineId, id, actor, item.quantity],
              )
            ).rowCount
          )
            throw conflict();
        const r = (
          await c.query(
            "INSERT INTO bazar.order_lifecycle_requests(order_id,user_id,kind,request_key,request_digest,reason,source) VALUES($1,$2,$3,$4,$5,$6,'customer-request') RETURNING id",
            [id, actor, kind, input.idempotencyKey, digest, input.reason],
          )
        ).rows[0];
        for (const item of input.items)
          await c.query(
            "INSERT INTO bazar.order_return_items(request_id,order_id,user_id,order_line_id,quantity) VALUES($1,$2,$3,$4,$5)",
            [r.id, id, actor, item.orderLineId, item.quantity],
          );
        return read(c, actor, id);
      });
    },
    /** No employee/role HTTP route exists; explicit isolated policy required even in tests. */
    async reviewForTest(
      actor: string,
      id: string,
      requestId: string,
      value: unknown,
    ) {
      actor = uuid(actor);
      id = uuid(id);
      requestId = uuid(requestId);
      const r = fields(value, ["expectedVersion", "state"]),
        expectedVersion = integer(r.expectedVersion, 1, 9007199254740989);
      if (!["under-review", "closed-for-test"].includes(r.state as string))
        invalid();
      const state = r.state as RequestState;
      return tx(actor, id, async (c) => {
        const old = (
          await c.query(
            "SELECT state,version::text FROM bazar.order_lifecycle_requests WHERE id=$1 AND order_id=$2 AND user_id=$3",
            [requestId, id, actor],
          )
        ).rows[0];
        if (!old) throw missing();
        if (money(old.version) === expectedVersion + 1 && old.state === state)
          return read(c, actor, id);
        if (money(old.version) !== expectedVersion) throw conflict();
        if (
          !policy ||
          !policy.canReview({
            userId: actor,
            orderId: id,
            requestId,
            from: old.state,
            to: state,
          })
        )
          throw blocked();
        await c.query(
          "UPDATE bazar.order_lifecycle_requests SET state=$2,version=version+1,source='isolated-review' WHERE id=$1",
          [requestId, state],
        );
        return read(c, actor, id);
      });
    },
    /** Internal server plan only, never a browser-supplied monetary amount or a real provider call. */
    async prepareRefundForTest(actor: string, id: string, value: unknown) {
      actor = uuid(actor);
      id = uuid(id);
      const r = fields(value, ["requestId", "extent", "idempotencyKey"]),
        requestId = uuid(r.requestId),
        key = uuid(r.idempotencyKey);
      if (!["partial", "full"].includes(r.extent as string)) invalid();
      const extent = r.extent as "partial" | "full",
        digest = hash({ orderId: id, requestId, extent, key });
      return tx(actor, id, async (c) => {
        const old = (
          await c.query(
            "SELECT request_digest FROM bazar.order_refund_attempts WHERE user_id=$1 AND request_key=$2",
            [actor, key],
          )
        ).rows[0];
        if (old) {
          if (!old.request_digest.equals(digest)) throw conflict();
          return read(c, actor, id);
        }
        if (!policy || !adapter) throw blocked();
        if (
          !(
            await c.query(
              "SELECT id FROM bazar.order_lifecycle_requests WHERE id=$1 AND order_id=$2 AND user_id=$3 AND kind='return'",
              [requestId, id, actor],
            )
          ).rowCount
        )
          throw missing();
        const p = (
          await c.query(
            "SELECT p.id,p.amount_minor::text,p.currency,p.provider,p.account_ref FROM bazar.checkout_completion_links l JOIN bazar.payment_operations p ON p.id=l.payment_operation_id AND p.user_id=l.user_id WHERE l.order_id=$1 AND l.user_id=$2 AND p.status='succeeded' AND EXISTS(SELECT 1 FROM bazar.payment_verified_events e WHERE e.operation_id=p.id) FOR UPDATE OF p",
            [id, actor],
          )
        ).rows[0];
        if (
          !p ||
          p.provider !== adapter.name ||
          p.account_ref !== adapter.accountRef
        )
          throw blocked();
        const plan = policy.refundPlan({
          userId: actor,
          orderId: id,
          requestId,
          extent,
          paymentAmountMinor: money(p.amount_minor),
        });
        if (
          !plan ||
          plan.currency !== "UAH" ||
          typeof plan.revision !== "string" ||
          !plan.revision.trim() ||
          plan.revision.length > 100
        )
          throw blocked();
        const amount = integer(plan.amountMinor, 1);
        await c.query(
          "INSERT INTO bazar.order_refund_attempts(order_id,user_id,payment_operation_id,request_id,request_key,request_digest,amount_minor,currency,extent,basis,provider,account_ref,source,plan_revision) VALUES($1,$2,$3,$4,$5,$6,$7,'UAH',$8,'isolated-test-plan',$9,$10,'test-plan',$11)",
          [
            id,
            actor,
            p.id,
            requestId,
            key,
            digest,
            amount,
            extent,
            p.provider,
            p.account_ref,
            plan.revision,
          ],
        );
        return read(c, actor, id);
      });
    },
    async observeRefundForTest(raw: Uint8Array, signature: string) {
      if (
        !adapter ||
        raw.byteLength > 4096 ||
        typeof signature !== "string" ||
        signature.length > 300
      )
        throw new ApiError(
          401,
          "PAYMENT_AUTH_FAILED",
          "Refund event authentication failed.",
        );
      let event: ReturnType<typeof fields>;
      try {
        const signal = AbortSignal.timeout(2000);
        const observed = await Promise.race([
          adapter.verify(raw, signature, signal),
          new Promise<never>((_, reject) =>
            signal.addEventListener(
              "abort",
              () => reject(new Error("timeout")),
              { once: true },
            ),
          ),
        ]);
        event = fields(observed, [
          "eventId",
          "refundId",
          "paymentOperationId",
          "accountRef",
          "amountMinor",
          "currency",
          "state",
        ]);
        uuid(event.eventId);
        uuid(event.refundId);
        uuid(event.paymentOperationId);
        integer(event.amountMinor, 1);
        if (
          event.accountRef !== adapter.accountRef ||
          event.currency !== "UAH" ||
          ![
            "pending",
            "unknown",
            "confirmed-for-test",
            "rejected-for-test",
          ].includes(event.state as string)
        )
          throw new Error();
      } catch {
        throw new ApiError(
          401,
          "PAYMENT_AUTH_FAILED",
          "Refund event authentication failed.",
        );
      }
      const route = (
        await pool.query(
          "SELECT order_id,user_id FROM bazar.order_refund_attempts WHERE id=$1",
          [event.refundId],
        )
      ).rows[0];
      if (!route) throw missing();
      const digest = hash([
        event.eventId,
        event.refundId,
        event.paymentOperationId,
        event.accountRef,
        event.amountMinor,
        event.currency,
        event.state,
      ]);
      return tx(route.user_id, route.order_id, async (c) => {
        const old = (
          await c.query(
            "SELECT * FROM bazar.order_refund_attempts WHERE id=$1 FOR UPDATE",
            [event.refundId],
          )
        ).rows[0];
        if (
          old.provider !== adapter.name ||
          old.account_ref !== event.accountRef ||
          old.payment_operation_id !== event.paymentOperationId ||
          money(String(old.amount_minor)) !== event.amountMinor ||
          old.currency !== event.currency
        )
          throw conflict();
        const receipt = (
          await c.query(
            "SELECT refund_id,digest FROM bazar.refund_verified_events WHERE provider=$1 AND account_ref=$2 AND event_id=$3",
            [adapter.name, adapter.accountRef, event.eventId],
          )
        ).rows[0];
        if (receipt) {
          if (
            receipt.refund_id !== event.refundId ||
            !receipt.digest.equals(digest)
          )
            throw conflict();
          return read(c, route.user_id, route.order_id);
        }
        if (
          ["confirmed-for-test", "rejected-for-test"].includes(old.state) &&
          old.state !== event.state
        )
          throw conflict();
        await c.query(
          "INSERT INTO bazar.refund_verified_events(provider,account_ref,event_id,refund_id,digest) VALUES($1,$2,$3,$4,$5)",
          [
            adapter.name,
            adapter.accountRef,
            event.eventId,
            event.refundId,
            digest,
          ],
        );
        if (old.state !== event.state)
          await c.query(
            "UPDATE bazar.order_refund_attempts SET state=$2,version=version+1,source='verified-test-event' WHERE id=$1",
            [event.refundId, event.state],
          );
        return read(c, route.user_id, route.order_id);
      });
    },
  };
}
export type OrderLifecycleService = ReturnType<
  typeof createOrderLifecycleService
>;
