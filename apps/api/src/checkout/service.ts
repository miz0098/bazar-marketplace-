import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import { money, uuid } from '../business/validation.js';
import type {
  CheckoutSessionDto,
  IntegrationOrderDto,
  RecordedOrderResult,
} from '../contracts/checkout.js';
import {
  deliveryInput,
  paymentInput,
  recordInput,
  startInput,
} from './input.js';
import {
  cartSnapshot,
  editable,
  hash,
  lockedSession,
  missing,
  policy,
  readOrder,
  stale,
  state,
} from './state.js';

export interface ShippingOrderGuard {
  validateForOrder(c: pg.PoolClient, actor: string, row: Record<string, unknown>): Promise<void>;
}
export function createCheckoutBusinessService(pool: pg.Pool, shipping?: ShippingOrderGuard) {
  if (process.env.NODE_ENV !== 'test')
    throw new Error('Checkout integration requires an isolated test process');
  async function transaction<T>(
    fn: (c: pg.PoolClient) => Promise<T>,
  ): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const result = await fn(c);
      await c.query('COMMIT');
      return result;
    } catch (error) {
      await c.query('ROLLBACK');
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      )
        throw new ApiError(
          409,
          'CONFLICT',
          'The checkout/cart version or request key was already recorded.',
        );
      throw error;
    } finally {
      c.release();
    }
  }
  return {
    async start(actor: string, value: unknown): Promise<CheckoutSessionDto> {
      actor = uuid(actor);
      const input = startInput(value);
      return transaction(async (c) => {
        const cart = await c.query(
          'SELECT id FROM bazar.carts WHERE id=$1 AND user_id=$2 FOR UPDATE',
          [input.cartId, actor],
        );
        if (!cart.rowCount) throw missing();
        const digest = hash({
          cartId: input.cartId,
          version: input.expectedCartVersion,
        });
        const previous = (
          await c.query(
            'SELECT *,version::text,cart_version::text FROM bazar.checkout_sessions WHERE user_id=$1 AND create_key=$2',
            [actor, input.idempotencyKey],
          )
        ).rows[0];
        if (previous) {
          if (!previous.create_digest.equals(digest))
            throw new ApiError(
              409,
              'CONFLICT',
              'The creation key was used with different input.',
            );
          return state(c, actor, previous);
        }
        await cartSnapshot(c, actor, input.cartId, input.expectedCartVersion);
        const row = (
          await c.query(
            "INSERT INTO bazar.checkout_sessions(user_id,cart_id,cart_version,stage,create_key,create_digest,mode) VALUES ($1,$2,$3,'contact-delivery',$4,$5,'integration-test') RETURNING *,version::text,cart_version::text",
            [
              actor,
              input.cartId,
              input.expectedCartVersion,
              input.idempotencyKey,
              digest,
            ],
          )
        ).rows[0];
        return state(c, actor, row);
      });
    },
    async get(actor: string, id: string): Promise<CheckoutSessionDto> {
      actor = uuid(actor);
      id = uuid(id);
      return transaction(async (c) =>
        state(c, actor, await lockedSession(c, actor, id)),
      );
    },
    async setDelivery(
      actor: string,
      id: string,
      value: unknown,
    ): Promise<CheckoutSessionDto> {
      actor = uuid(actor);
      id = uuid(id);
      const input = deliveryInput(value);
      return transaction(async (c) => {
        const row = await lockedSession(c, actor, id);
        editable(row, input.expectedVersion);
        const ownedAddress = await c.query(
          'SELECT id FROM bazar.addresses WHERE id=$1 AND user_id=$2',
          [input.addressId, actor],
        );
        if (!ownedAddress.rowCount) throw missing();
        const updated = (
          await c.query(
            "UPDATE bazar.checkout_sessions SET address_id=$3,stage='payment',pricing_fingerprint=NULL,version=version+1 WHERE id=$1 AND user_id=$2 RETURNING *,version::text,cart_version::text",
            [id, actor, input.addressId],
          )
        ).rows[0];
        return state(c, actor, updated);
      });
    },
    async setPayment(
      actor: string,
      id: string,
      value: unknown,
    ): Promise<CheckoutSessionDto> {
      actor = uuid(actor);
      id = uuid(id);
      const input = paymentInput(value);
      return transaction(async (c) => {
        const row = await lockedSession(c, actor, id);
        editable(row, input.expectedVersion);
        if (!row.address_id)
          throw new ApiError(
            409,
            'CHECKOUT_REJECTED',
            'Complete contact/delivery references first.',
          );
        const candidate = {
          ...row,
          payment_selection: input.paymentSelection,
          promo_code: input.promoCode,
          pricing_fingerprint: null,
        };
        const preview = await state(c, actor, candidate);
        if (!preview.pricing) throw policy();
        const updated = (
          await c.query(
            "UPDATE bazar.checkout_sessions SET payment_selection=$3,promo_code=$4,pricing_fingerprint=$5,stage='confirmation',version=version+1 WHERE id=$1 AND user_id=$2 RETURNING *,version::text,cart_version::text",
            [
              id,
              actor,
              input.paymentSelection,
              input.promoCode,
              preview.pricing.fingerprint,
            ],
          )
        ).rows[0];
        return state(c, actor, updated);
      });
    },
    async recordOrderForTest(
      actor: string,
      id: string,
      value: unknown,
    ): Promise<RecordedOrderResult> {
      if (process.env.NODE_ENV !== 'test')
        throw new Error('Real order placement is not enabled');
      actor = uuid(actor);
      id = uuid(id);
      const input = recordInput(value);
      return transaction(async (c) => {
        const keyHash = hash(['checkout-order', actor, input.idempotencyKey]);
        await c.query('SELECT pg_advisory_xact_lock($1::integer,$2::integer)', [
          keyHash.readInt32BE(0),
          keyHash.readInt32BE(4),
        ]);
        const digest = hash({
          id,
          expectedVersion: input.expectedVersion,
          expectedFingerprint: input.expectedFingerprint,
        });
        const previous = (
          await c.query(
            'SELECT order_id,request_digest FROM bazar.checkout_order_requests WHERE user_id=$1 AND key=$2',
            [actor, input.idempotencyKey],
          )
        ).rows[0];
        if (previous) {
          if (!previous.request_digest.equals(digest))
            throw new ApiError(
              409,
              'CONFLICT',
              'The order key was used with different input.',
            );
          return {
            order: await readOrder(c, actor, previous.order_id),
            replayed: true,
          };
        }
        const row = await lockedSession(c, actor, id);
        editable(row, input.expectedVersion);
        if (row.stage !== 'confirmation')
          throw new ApiError(
            409,
            'CHECKOUT_REJECTED',
            'Checkout confirmation step is required.',
          );
        const preview = await state(c, actor, row);
        if (
          !preview.pricing ||
          !preview.pricing.acknowledged ||
          preview.pricing.fingerprint !== input.expectedFingerprint
        )
          throw stale();
        if (row.promo_code !== null || !preview.canRecordIntegrationOrder)
          throw policy();
        const hasShipping = await c.query('SELECT 1 FROM bazar.checkout_shipping WHERE checkout_id=$1 AND user_id=$2', [id, actor]);
        if (hasShipping.rowCount) {
          if (!shipping) throw policy();
          await shipping.validateForOrder(c, actor, row);
        }
        const snapshot = await cartSnapshot(
          c,
          actor,
          row.cart_id,
          money(row.cart_version),
        );
        const address = preview.delivery!;
        const order = (
          await c.query(
            "INSERT INTO bazar.orders(user_id,address_id,total_minor,currency,foundation_mode) VALUES ($1,$2,$3,'UAH','integration-test') RETURNING id",
            [
              actor,
              address.addressId,
              preview.pricing.merchandiseTotal.amountMinor,
            ],
          )
        ).rows[0];
        for (const line of snapshot.lines)
          await c.query(
            "INSERT INTO bazar.order_lines(order_id,user_id,product_id,variant_id,title_snapshot,quantity,unit_price_minor,line_total_minor,currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'UAH')",
            [
              order.id,
              actor,
              line.productId,
              line.variantId,
              line.title,
              line.quantity,
              line.unitPrice.amountMinor,
              line.lineTotal.amountMinor,
            ],
          );
        await c.query(
          "INSERT INTO bazar.order_checkout_snapshots(order_id,user_id,checkout_id,cart_id,cart_version,subtotal_minor,discount_minor,merchandise_total_minor,currency,carrier,city_ref,location_ref,payment_selection,pricing_fingerprint,mode) VALUES ($1,$2,$3,$4,$5,$6,0,$6,'UAH',$7,$8,$9,$10,$11,'integration-test')",
          [
            order.id,
            actor,
            id,
            row.cart_id,
            money(row.cart_version),
            snapshot.cart.subtotal.amountMinor,
            address.carrier,
            address.cityRef,
            address.locationRef,
            preview.paymentSelection,
            input.expectedFingerprint,
          ],
        );
        await c.query(
          'INSERT INTO bazar.checkout_order_requests(user_id,key,request_digest,checkout_id,order_id) VALUES ($1,$2,$3,$4,$5)',
          [actor, input.idempotencyKey, digest, id, order.id],
        );
        await c.query(
          'UPDATE bazar.checkout_sessions SET order_id=$3,version=version+1 WHERE id=$1 AND user_id=$2',
          [id, actor, order.id],
        );
        return { order: await readOrder(c, actor, order.id), replayed: false };
      });
    },
    async getOrder(actor: string, id: string): Promise<IntegrationOrderDto> {
      actor = uuid(actor);
      id = uuid(id);
      return transaction((c) => readOrder(c, actor, id));
    },
    async listOrders(actor: string, params: URLSearchParams) {
      actor = uuid(actor);
      for (const key of params.keys())
        if (
          !['limit', 'cursor'].includes(key) ||
          params.getAll(key).length !== 1
        )
          throw new ApiError(400, 'INVALID_REQUEST', 'Invalid order query.');
      const limitText = params.get('limit') ?? '20';
      if (
        !/^\d{1,3}$/.test(limitText) ||
        Number(limitText) < 1 ||
        Number(limitText) > 100
      )
        throw new ApiError(400, 'INVALID_REQUEST', 'Invalid order limit.');
      const limit = Number(limitText);
      let offset = 0;
      const cursor = params.get('cursor');
      if (cursor !== null) {
        try {
          if (!/^[A-Za-z0-9_-]{1,150}$/.test(cursor)) throw new Error();
          const parsed = JSON.parse(
            Buffer.from(cursor, 'base64url').toString(),
          );
          if (
            !Array.isArray(parsed) ||
            parsed.length !== 2 ||
            parsed[1] !== hash([actor, limit]).toString('hex').slice(0, 16) ||
            !Number.isSafeInteger(parsed[0]) ||
            parsed[0] < 1 ||
            parsed[0] > 10000
          )
            throw new Error();
          offset = parsed[0];
        } catch {
          throw new ApiError(400, 'INVALID_REQUEST', 'Invalid order cursor.');
        }
      }
      return transaction(async (c) => {
        const rows = (
          await c.query(
            "SELECT id FROM bazar.orders WHERE user_id=$1 AND foundation_mode='integration-test' ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3",
            [actor, limit + 1, offset],
          )
        ).rows;
        const more = rows.length > limit;
        if (more && offset + limit > 10000)
          throw new ApiError(400, 'INVALID_REQUEST', 'Refine the order query.');
        const items = [];
        for (const row of rows.slice(0, limit))
          items.push(await readOrder(c, actor, row.id));
        return {
          items,
          nextCursor: more
            ? Buffer.from(
                JSON.stringify([
                  offset + limit,
                  hash([actor, limit]).toString('hex').slice(0, 16),
                ]),
              ).toString('base64url')
            : null,
        };
      });
    },
  };
}
export type CheckoutBusinessService = ReturnType<
  typeof createCheckoutBusinessService
>;
