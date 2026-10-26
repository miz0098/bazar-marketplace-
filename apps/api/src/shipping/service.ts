import type pg from "pg";
import { ApiError } from "../contracts/foundation.js";
import type {
  Carrier,
  PickupKind,
  ShippingCity,
  ShippingPoint,
  ShippingSelection,
  ShippingQuote,
  ShippingCheck,
} from "../contracts/shipping.js";
import { integer, money, text, uuid } from "../business/validation.js";
import {
  cartSnapshot,
  delivery,
  editable,
  hash,
  lockedSession,
  missing,
  timestamp,
} from "../checkout/state.js";
import { fields } from "../checkout/input.js";
import {
  carrier,
  kind,
  reference,
  query,
  selectInput,
  quoteInput,
} from "./input.js";
import {
  providerCall,
  rejected,
  expired,
  unavailable,
  type ParcelPlan,
  type ShippingAdapter,
} from "./adapter.js";

export interface ShippingTestConfig {
  /** Explicit synthetic test policy, not a carrier guarantee or production default. */
  timeoutMs: number;
  quoteTtlMs: number;
  plan(cartId: string): Promise<ParcelPlan>;
}
type Row = Record<string, unknown>;
export function createShippingService(
  pool: pg.Pool,
  adapters: readonly ShippingAdapter[],
  config: ShippingTestConfig,
) {
  if (
    process.env.NODE_ENV !== "test" ||
    adapters.some((a) => a.scope !== "isolated-test")
  )
    throw new Error("Shipping requires isolated test adapters");
  integer(config.timeoutMs, 1, 2000);
  integer(config.quoteTtlMs, 1, 3600000);
  if (new Set(adapters.map((a) => a.carrier)).size !== adapters.length)
    throw new Error("Duplicate shipping adapters");
  for (const a of adapters) {
    carrier(a.carrier);
    if (
      a.pickupKinds.length > 2 ||
      new Set(a.pickupKinds).size !== a.pickupKinds.length
    )
      throw new Error("Invalid capabilities");
    a.pickupKinds.forEach(kind);
  }
  function adapter(code: Carrier, pickup?: PickupKind) {
    const a = adapters.find((a) => a.carrier === code);
    if (!a) throw unavailable();
    if (pickup && !a.pickupKinds.includes(pickup)) throw rejected();
    return a;
  }
  const call = <T>(fn: (signal: AbortSignal) => Promise<T>) =>
    providerCall(config.timeoutMs, fn);
  async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    } finally {
      c.release();
    }
  }
  function cityResult(v: ShippingCity): ShippingCity {
    try {
      return { ref: reference(v.ref), name: text(v.name, 200) };
    } catch {
      throw unavailable();
    }
  }
  function pointResult(v: ShippingPoint): ShippingPoint {
    try {
      if (typeof v.available !== "boolean") throw unavailable();
      return {
        ref: reference(v.ref),
        cityRef: reference(v.cityRef),
        kind: kind(v.kind),
        name: text(v.name, 200),
        available: v.available,
        revision: text(v.revision, 200),
      };
    } catch {
      throw unavailable();
    }
  }
  async function currentPoint(
    a: ShippingAdapter,
    cityRef: string,
    ref: string,
    pickup: PickupKind,
  ) {
    const result = await call((s) => a.point(cityRef, ref, pickup, s));
    if (!result) throw rejected();
    const p = pointResult(result);
    if (
      p.ref !== ref ||
      p.cityRef !== cityRef ||
      p.kind !== pickup ||
      !p.available
    )
      throw rejected();
    return p;
  }
  async function saveCity(c: pg.PoolClient, code: Carrier, city: ShippingCity) {
    await c.query(
      "INSERT INTO bazar.shipping_carriers(code,mode) VALUES ($1,'integration-test') ON CONFLICT DO NOTHING",
      [code],
    );
    await c.query(
      "INSERT INTO bazar.shipping_cities(carrier,ref,name,observed_at) VALUES ($1,$2,$3,clock_timestamp()) ON CONFLICT(carrier,ref) DO UPDATE SET name=EXCLUDED.name,observed_at=EXCLUDED.observed_at",
      [code, city.ref, city.name],
    );
  }
  async function savePoint(c: pg.PoolClient, code: Carrier, p: ShippingPoint) {
    await c.query(
      "INSERT INTO bazar.shipping_points(carrier,ref,city_ref,kind,name,available,revision,observed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,clock_timestamp()) ON CONFLICT(carrier,ref) DO UPDATE SET name=EXCLUDED.name,available=EXCLUDED.available,revision=EXCLUDED.revision,observed_at=EXCLUDED.observed_at WHERE shipping_points.city_ref=EXCLUDED.city_ref AND shipping_points.kind=EXCLUDED.kind",
      [code, p.ref, p.cityRef, p.kind, p.name, p.available, p.revision],
    );
  }
  function selection(row: Row, version: number): ShippingSelection {
    return {
      mode: "integration-test",
      checkoutId: uuid(row.checkout_id),
      checkoutVersion: version,
      addressId: uuid(row.address_id),
      carrier: carrier(row.carrier),
      cityRef: reference(row.city_ref),
      pointRef: reference(row.point_ref),
      kind: kind(row.kind),
      pointRevision: text(row.point_revision, 200),
      quoteId: row.quote_id === null ? null : uuid(row.quote_id),
      canCreateShipment: false,
    };
  }
  function quote(row: Row): ShippingQuote {
    if (
      row.currency !== "UAH" ||
      row.mode !== "integration-test" ||
      row.validity_source !== "integration-policy"
    )
      throw new Error("Invalid stored shipping quote");
    return {
      mode: "integration-test",
      id: uuid(row.id),
      checkoutId: uuid(row.checkout_id),
      checkoutVersion: money(row.checkout_version),
      carrier: carrier(row.carrier),
      kind: kind(row.kind),
      cost: { amountMinor: money(row.amount_minor), currency: "UAH" },
      quotedAt: timestamp(row.quoted_at),
      expiresAt: timestamp(row.expires_at),
      validitySource: "integration-policy",
      binding: text(row.binding, 64),
      status: "estimate-for-test",
      canCreateShipment: false,
    };
  }
  async function selected(c: pg.PoolClient, actor: string, row: Row) {
    const selected = (
      await c.query(
        "SELECT * FROM bazar.checkout_shipping WHERE checkout_id=$1 AND user_id=$2 FOR UPDATE",
        [row.id, actor],
      )
    ).rows[0];
    if (!selected) throw missing();
    if (row.address_id !== selected.address_id) throw expired();
    return selected;
  }
  async function evaluation(
    c: pg.PoolClient,
    actor: string,
    row: Row,
    selected: Row,
  ) {
    const code = carrier(selected.carrier),
      pickup = kind(selected.kind),
      a = adapter(code, pickup);
    const snapshot = await cartSnapshot(
      c,
      actor,
      uuid(row.cart_id),
      money(row.cart_version),
    );
    const address = await delivery(c, actor, uuid(selected.address_id));
    if (
      address.carrier !== code ||
      address.cityRef !== selected.city_ref ||
      address.locationRef !== selected.point_ref
    )
      throw expired();
    const point = await currentPoint(
      a,
      address.cityRef,
      address.locationRef,
      pickup,
    );
    if (point.revision !== selected.point_revision) throw expired();
    const raw = await call(() => config.plan(uuid(row.cart_id)));
    if (
      !raw ||
      !Array.isArray(raw.sizeMm) ||
      raw.sizeMm.length !== 3 ||
      !Number.isSafeInteger(raw.massGrams) ||
      raw.massGrams < 1 ||
      raw.sizeMm.some((x) => !Number.isSafeInteger(x) || x < 1)
    )
      throw unavailable();
    const plan: ParcelPlan = {
      originCityRef: reference(raw.originCityRef),
      massGrams: integer(raw.massGrams, 1),
      sizeMm: [
        integer(raw.sizeMm[0], 1),
        integer(raw.sizeMm[1], 1),
        integer(raw.sizeMm[2], 1),
      ],
      revision: text(raw.revision, 200),
    };
    const estimate = await call((s) =>
      a.estimate(
        {
          plan,
          cityRef: address.cityRef,
          pointRef: address.locationRef,
          kind: pickup,
          merchandiseSubtotalMinor: snapshot.cart.subtotal.amountMinor,
        },
        s,
      ),
    );
    if (
      !estimate ||
      estimate.currency !== "UAH" ||
      !Number.isSafeInteger(estimate.amountMinor) ||
      estimate.amountMinor < 0
    )
      throw unavailable();
    const amount = integer(estimate.amountMinor),
      revision = text(estimate.revision, 200);
    return {
      amount,
      binding: hash({
        snapshot: snapshot.fingerprint,
        address,
        point,
        plan,
        amount,
        revision,
      }).toString("hex"),
    };
  }
  async function checkInTransaction(
    c: pg.PoolClient,
    actor: string,
    row: Row,
    expectedId?: string,
  ): Promise<ShippingCheck> {
    const s = await selected(c, actor, row);
    if (!s.quote_id || (expectedId && s.quote_id !== expectedId))
      throw expired();
    const q = (
      await c.query(
        "SELECT *,checkout_version::text,amount_minor::text FROM bazar.shipping_quotes WHERE id=$1 AND checkout_id=$2 AND user_id=$3 FOR SHARE",
        [s.quote_id, row.id, actor],
      )
    ).rows[0];
    if (!q) throw expired();
    const evaluated = await evaluation(c, actor, row, s);
    const now = (await c.query("SELECT clock_timestamp() AS now")).rows[0].now;
    if (
      q.expires_at <= now ||
      q.binding !== evaluated.binding ||
      money(q.amount_minor) !== evaluated.amount
    )
      throw expired();
    return {
      mode: "integration-test",
      quoteId: uuid(q.id),
      current: true,
      checkedAt: timestamp(now),
      canPlaceRealOrder: false,
    };
  }
  return {
    async carriers() {
      return {
        mode: "integration-test" as const,
        carriers: adapters.map((a) => ({
          code: a.carrier,
          pickupKinds: [...a.pickupKinds],
          liveAvailable: false as const,
        })),
        bazarPickup: { available: false as const },
      };
    },
    async cities(value: unknown) {
      const r = fields(value, ["carrier", "query"]),
        code = carrier(r.carrier),
        a = adapter(code);
      const rows = await call((s) => a.cities(query(r.query), s));
      if (!Array.isArray(rows) || rows.length > 100) throw unavailable();
      const items = rows.map(cityResult);
      if (new Set(items.map((x) => x.ref)).size !== items.length)
        throw unavailable();
      await tx(async (c) => {
        for (const city of items) await saveCity(c, code, city);
      });
      return { mode: "integration-test" as const, carrier: code, items };
    },
    async points(value: unknown) {
      const r = fields(value, ["carrier", "cityRef", "kind"]),
        code = carrier(r.carrier),
        cityRef = reference(r.cityRef),
        pickup = kind(r.kind),
        a = adapter(code, pickup);
      const city = await call((s) => a.city(cityRef, s));
      if (!city || city.ref !== cityRef) throw rejected();
      const rows = await call((s) => a.points(cityRef, pickup, s));
      if (!Array.isArray(rows) || rows.length > 100) throw unavailable();
      const items = rows.map(pointResult);
      if (
        items.some((p) => p.cityRef !== cityRef || p.kind !== pickup) ||
        new Set(items.map((p) => p.ref)).size !== items.length
      )
        throw unavailable();
      await tx(async (c) => {
        await saveCity(c, code, cityResult(city));
        for (const p of items) await savePoint(c, code, p);
      });
      return { mode: "integration-test" as const, carrier: code, items };
    },
    async getSelection(actor: string, id: string) {
      actor = uuid(actor);
      id = uuid(id);
      return tx(async (c) => {
        const row = await lockedSession(c, actor, id);
        return selection(await selected(c, actor, row), money(row.version));
      });
    },
    async select(actor: string, id: string, value: unknown) {
      actor = uuid(actor);
      id = uuid(id);
      const input = selectInput(value);
      return tx(async (c) => {
        const row = await lockedSession(c, actor, id);
        editable(row, input.expectedVersion);
        const address = await delivery(c, actor, input.addressId),
          a = adapter(address.carrier, input.kind);
        const city = await call((s) => a.city(address.cityRef, s));
        if (!city || city.ref !== address.cityRef) throw rejected();
        const p = await currentPoint(
          a,
          address.cityRef,
          address.locationRef,
          input.kind,
        );
        await saveCity(c, a.carrier, cityResult(city));
        await savePoint(c, a.carrier, p);
        await c.query(
          "UPDATE bazar.checkout_sessions SET address_id=$3,stage='payment',pricing_fingerprint=NULL,version=version+1 WHERE id=$1 AND user_id=$2",
          [id, actor, input.addressId],
        );
        const result = (
          await c.query(
            "INSERT INTO bazar.checkout_shipping(checkout_id,user_id,address_id,carrier,city_ref,point_ref,kind,point_revision) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(checkout_id) DO UPDATE SET address_id=EXCLUDED.address_id,carrier=EXCLUDED.carrier,city_ref=EXCLUDED.city_ref,point_ref=EXCLUDED.point_ref,kind=EXCLUDED.kind,point_revision=EXCLUDED.point_revision,quote_id=NULL RETURNING *",
            [
              id,
              actor,
              input.addressId,
              address.carrier,
              address.cityRef,
              address.locationRef,
              input.kind,
              p.revision,
            ],
          )
        ).rows[0];
        return selection(result, input.expectedVersion + 1);
      });
    },
    async quote(actor: string, id: string, value: unknown) {
      actor = uuid(actor);
      id = uuid(id);
      const input = quoteInput(value);
      return tx(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
          `shipping:${actor}:${input.idempotencyKey}`,
        ]);
        const row = await lockedSession(c, actor, id),
          digest = hash([id, input.expectedVersion]);
        const previous = (
          await c.query(
            "SELECT *,checkout_version::text,amount_minor::text FROM bazar.shipping_quotes WHERE user_id=$1 AND request_key=$2",
            [actor, input.idempotencyKey],
          )
        ).rows[0];
        if (previous) {
          if (!previous.request_digest.equals(digest))
            throw new ApiError(
              409,
              "CONFLICT",
              "The estimate key was used with different input.",
            );
          return { quote: quote(previous), replayed: true };
        }
        editable(row, input.expectedVersion);
        const s = await selected(c, actor, row),
          result = await evaluation(c, actor, row, s);
        const q = (
          await c.query(
            "WITH moment AS (SELECT clock_timestamp() AS now) INSERT INTO bazar.shipping_quotes(checkout_id,user_id,checkout_version,request_key,request_digest,carrier,city_ref,point_ref,kind,amount_minor,currency,binding,quoted_at,expires_at,validity_source,mode) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'UAH',$11,now,now+($12::int*interval '1 millisecond'),'integration-policy','integration-test' FROM moment RETURNING *,checkout_version::text,amount_minor::text",
            [
              id,
              actor,
              input.expectedVersion,
              input.idempotencyKey,
              digest,
              s.carrier,
              s.city_ref,
              s.point_ref,
              s.kind,
              result.amount,
              result.binding,
              config.quoteTtlMs,
            ],
          )
        ).rows[0];
        await c.query(
          "UPDATE bazar.checkout_shipping SET quote_id=$3 WHERE checkout_id=$1 AND user_id=$2",
          [id, actor, q.id],
        );
        return { quote: quote(q), replayed: false };
      });
    },
    async check(actor: string, id: string, value: unknown) {
      actor = uuid(actor);
      id = uuid(id);
      const r = fields(value, ["expectedVersion", "quoteId"]),
        version = integer(r.expectedVersion, 1),
        quoteId = uuid(r.quoteId);
      return tx(async (c) => {
        const row = await lockedSession(c, actor, id);
        editable(row, version);
        return checkInTransaction(c, actor, row, quoteId);
      });
    },
    /** F6 calls this inside its final transaction when an F7 selection exists. No live order activation. */
    async validateForOrder(c: pg.PoolClient, actor: string, row: Row) {
      await checkInTransaction(c, actor, row);
    },
  };
}
export type ShippingService = ReturnType<typeof createShippingService>;
