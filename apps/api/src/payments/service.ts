import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import type {
  PaymentAttempt,
  PaymentInstrument,
} from '../contracts/payments.js';
import type { PaymentAdapter, PaymentObservation } from './adapter.js';
import { fields } from '../checkout/input.js';
import {
  editable,
  hash,
  lockedSession,
  missing,
  state,
  timestamp,
} from '../checkout/state.js';
import type { ShippingOrderGuard } from '../checkout/service.js';
import { integer, money, text, uuid } from '../business/validation.js';
import { providerCall } from '../shipping/adapter.js';

export interface PaymentTestConfig {
  timeoutMs: number;
  /** No production payable amount exists. Explicit synthetic financial plan, never client data or a guessed total. */
  plan(input: {
    checkoutId: string;
    pricingFingerprint: string;
  }): Promise<{ amountMinor: number; currency: 'UAH'; revision: string }>;
}
const conflict = () =>
  new ApiError(
    409,
    'PAYMENT_REJECTED',
    'Payment state does not permit this operation.',
  );
const stale = () =>
  new ApiError(409, 'PAYMENT_STALE', 'Checkout or test payment basis changed.');
function method(v: unknown): PaymentInstrument {
  if (v !== 'card' && v !== 'apple-pay' && v !== 'google-pay')
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid payment method.');
  return v;
}
function opaque(v: unknown, max = 200): string {
  if (typeof v !== 'string' || !new RegExp(`^[A-Za-z0-9_-]{1,${max}}$`).test(v))
    throw new Error('Invalid provider reference');
  return v;
}
export function createPaymentService(
  pool: pg.Pool,
  adapter: PaymentAdapter,
  config: PaymentTestConfig,
  shipping?: ShippingOrderGuard,
) {
  if (process.env.NODE_ENV !== 'test' || adapter.scope !== 'isolated-test')
    throw new Error('Payments require an isolated test adapter');
  integer(config.timeoutMs, 1, 2000);
  opaque(adapter.name, 100);
  opaque(adapter.accountRef);
  adapter.methods.forEach(method);
  async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const value = await fn(c);
      await c.query('COMMIT');
      return value;
    } catch (e) {
      await c.query('ROLLBACK');
      if (e && typeof e === 'object' && 'code' in e && e.code === '23505')
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
  ): Promise<PaymentAttempt> {
    const r = (
      await c.query(
        'SELECT o.*,o.amount_minor::text,o.version::text,i.checkout_id FROM bazar.payment_operations o JOIN bazar.payment_intents i ON i.id=o.intent_id WHERE o.id=$1 AND o.user_id=$2',
        [id, actor],
      )
    ).rows[0];
    if (!r) throw missing();
    if (
      r.currency !== 'UAH' ||
      ![
        'submitting',
        'pending',
        'unknown',
        'declined',
        'cancelled',
        'succeeded',
      ].includes(r.status)
    )
      throw new Error('Invalid stored payment');
    return {
      id: uuid(r.id),
      checkoutId: uuid(r.checkout_id),
      mode: 'integration-test',
      amountBasis: 'isolated-test-plan',
      method: method(r.method),
      status: r.status,
      amount: { amountMinor: money(r.amount_minor), currency: 'UAH' },
      createdAt: timestamp(r.created_at),
      version: money(r.version),
      canRetry: ['declined', 'cancelled'].includes(r.status),
      realPayment: false,
      orderPaid: false,
    };
  }
  async function owned(actor: string, id: string) {
    return tx((c) => read(c, uuid(actor), uuid(id)));
  }
  async function observe(
    value: PaymentObservation,
    source: 'webhook' | 'reconcile' | 'cancel',
  ) {
    let event: PaymentObservation;
    try {
      fields(value, [
        'eventId',
        'operationId',
        'operationRef',
        'accountRef',
        'amountMinor',
        'currency',
        'status',
      ]);
      if (
        value.accountRef !== adapter.accountRef ||
        value.currency !== 'UAH' ||
        !['pending', 'succeeded', 'declined', 'cancelled'].includes(
          value.status,
        )
      )
        throw new Error();
      event = {
        eventId: opaque(value.eventId),
        operationId: uuid(value.operationId),
        operationRef: opaque(value.operationRef),
        accountRef: adapter.accountRef,
        amountMinor: integer(value.amountMinor, 1),
        currency: 'UAH',
        status: value.status,
      };
    } catch {
      throw new ApiError(
        400,
        'PAYMENT_REJECTED',
        'Invalid verified provider observation.',
      );
    }
    return tx(async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        `payment-event:${adapter.name}:${event.eventId}`,
      ]);
      const r = (
        await c.query(
          'SELECT *,amount_minor::text FROM bazar.payment_operations WHERE id=$1 FOR UPDATE',
          [event.operationId],
        )
      ).rows[0];
      if (!r || r.provider !== adapter.name) throw missing();
      if (
        money(r.amount_minor) !== event.amountMinor ||
        r.currency !== event.currency ||
        (r.provider_ref !== null && r.provider_ref !== event.operationRef)
      )
        throw conflict();
      const digest = hash(event),
        prior = (
          await c.query(
            'SELECT digest,operation_id FROM bazar.payment_verified_events WHERE provider=$1 AND event_id=$2',
            [adapter.name, event.eventId],
          )
        ).rows[0];
      if (prior) {
        if (prior.operation_id !== r.id || !prior.digest.equals(digest))
          throw conflict();
        return { attempt: await read(c, r.user_id, r.id), replayed: true };
      }
      if (
        ['succeeded', 'declined', 'cancelled'].includes(r.status) &&
        r.status !== event.status
      )
        throw conflict();
      // Serialize event IDs across operations as well as operation state. A reused provider event is never reassigned.
      await c.query(
        'INSERT INTO bazar.payment_verified_events(provider,event_id,operation_id,digest) VALUES ($1,$2,$3,$4)',
        [adapter.name, event.eventId, r.id, digest],
      );
      if (
        !['succeeded', 'declined', 'cancelled'].includes(r.status) &&
        (r.status !== event.status || r.provider_ref === null)
      ) {
        await c.query(
          'UPDATE bazar.payment_operations SET status=$2,provider_ref=$3,version=version+1,last_source=$4 WHERE id=$1',
          [r.id, event.status, event.operationRef, source],
        );
      }
      return { attempt: await read(c, r.user_id, r.id), replayed: false };
    });
  }
  async function ambiguous(id: string) {
    await tx(async (c) => {
      await c.query(
        "UPDATE bazar.payment_operations SET status='unknown',version=version+1,last_source='submission' WHERE id=$1 AND status IN ('submitting','pending')",
        [id],
      );
    });
  }
  return {
    async capabilities() {
      return {
        mode: 'integration-test' as const,
        methods: [...adapter.methods],
        productionAvailable: false as const,
      };
    },
    get: owned,
    async create(actor: string, value: unknown) {
      actor = uuid(actor);
      const r = fields(value, [
          'checkoutId',
          'expectedVersion',
          'method',
          'idempotencyKey',
        ]),
        id = uuid(r.checkoutId),
        version = integer(r.expectedVersion, 1),
        instrument = method(r.method),
        key = uuid(r.idempotencyKey);
      if (!adapter.methods.includes(instrument)) throw conflict();
      const prepared = await tx(async (c) => {
        await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
          `payment:${actor}:${key}`,
        ]);
        const row = await lockedSession(c, actor, id),
          digest = hash([id, version, instrument]);
        const previous = (
          await c.query(
            'SELECT id,request_digest FROM bazar.payment_operations WHERE user_id=$1 AND request_key=$2',
            [actor, key],
          )
        ).rows[0];
        if (previous) {
          if (!previous.request_digest.equals(digest)) throw conflict();
          return { attempt: await read(c, actor, previous.id), replayed: true };
        }
        editable(row, version);
        const checkout = await state(c, actor, row);
        if (
          checkout.stage !== 'confirmation' ||
          !checkout.pricing?.acknowledged ||
          checkout.paymentSelection !== 'card-online' ||
          row.promo_code !== null
        )
          throw conflict();
        const hasShipping = await c.query(
          'SELECT 1 FROM bazar.checkout_shipping WHERE checkout_id=$1 AND user_id=$2',
          [id, actor],
        );
        if (hasShipping.rowCount) {
          if (!shipping) throw conflict();
          await shipping.validateForOrder(c, actor, row);
        }
        let plan: Awaited<ReturnType<PaymentTestConfig['plan']>>;
        try {
          plan = await providerCall(config.timeoutMs, () =>
            config.plan({
              checkoutId: id,
              pricingFingerprint: checkout.pricing!.fingerprint,
            }),
          );
        } catch {
          throw new ApiError(
            503,
            'SERVICE_UNAVAILABLE',
            'The test financial basis is unavailable.',
          );
        }
        if (
          plan.currency !== 'UAH' ||
          !Number.isSafeInteger(plan.amountMinor) ||
          plan.amountMinor < 1
        )
          throw stale();
        const binding = hash([
          checkout.pricing.fingerprint,
          plan.amountMinor,
          plan.currency,
          text(plan.revision, 200),
        ]).toString('hex');
        let intent = (
          await c.query(
            'SELECT *,amount_minor::text FROM bazar.payment_intents WHERE checkout_id=$1 AND user_id=$2 FOR UPDATE',
            [id, actor],
          )
        ).rows[0];
        if (intent) {
          if (intent.binding !== binding) throw stale();
        } else
          intent = (
            await c.query(
              "INSERT INTO bazar.payment_intents(checkout_id,user_id,amount_minor,currency,basis,binding,mode,cart_id,cart_version) VALUES ($1,$2,$3,'UAH','isolated-test-plan',$4,'integration-test',$5,$6) RETURNING *",
              [
                id,
                actor,
                plan.amountMinor,
                binding,
                row.cart_id,
                row.cart_version,
              ],
            )
          ).rows[0];
        if (
          (
            await c.query(
              "SELECT 1 FROM bazar.payment_operations WHERE intent_id=$1 AND status IN ('submitting','pending','unknown','succeeded')",
              [intent.id],
            )
          ).rowCount
        )
          throw conflict();
        const op = (
          await c.query(
            "INSERT INTO bazar.payment_operations(intent_id,user_id,amount_minor,currency,request_key,request_digest,method,provider,status,last_source) VALUES ($1,$2,$3,'UAH',$4,$5,$6,$7,'submitting','submission') RETURNING id",
            [
              intent.id,
              actor,
              plan.amountMinor,
              key,
              digest,
              instrument,
              adapter.name,
            ],
          )
        ).rows[0];
        return { attempt: await read(c, actor, op.id), replayed: false };
      });
      if (prepared.replayed) return prepared;
      const attempt = prepared.attempt;
      // Durable before transport. A crash/timeout never releases the active-attempt exclusion or blindly resubmits.
      try {
        const submitted = await providerCall(config.timeoutMs, (s) =>
          adapter.submit(
            {
              operationId: attempt.id,
              method: instrument,
              amountMinor: attempt.amount.amountMinor,
              currency: 'UAH',
            },
            s,
          ),
        );
        const providerRef = opaque(submitted.operationRef);
        await tx(async (c) => {
          const current = (
            await c.query(
              'SELECT * FROM bazar.payment_operations WHERE id=$1 FOR UPDATE',
              [attempt.id],
            )
          ).rows[0];
          if (
            current.provider_ref !== null &&
            current.provider_ref !== providerRef
          )
            throw conflict();
          if (current.status === 'submitting')
            await c.query(
              "UPDATE bazar.payment_operations SET provider_ref=$2,status='pending',version=version+1,last_source='submission' WHERE id=$1",
              [attempt.id, providerRef],
            );
        });
      } catch {
        await ambiguous(attempt.id);
      }
      return { attempt: await owned(actor, attempt.id), replayed: false };
    },
    async reconcile(actor: string, id: string) {
      const current = await owned(actor, id);
      try {
        const event = await providerCall(config.timeoutMs, (s) =>
          adapter.inspect(current.id, s),
        );
        if (event.operationId !== current.id) throw conflict();
        return await observe(event, 'reconcile');
      } catch (error) {
        if (error instanceof ApiError && error.code !== 'DELIVERY_UNAVAILABLE')
          throw error;
        throw new ApiError(
          503,
          'SERVICE_UNAVAILABLE',
          'Payment reconciliation is unavailable.',
        );
      }
    },
    async cancel(actor: string, id: string) {
      const current = await owned(actor, id);
      if (['succeeded', 'declined', 'cancelled'].includes(current.status))
        throw conflict();
      try {
        await providerCall(config.timeoutMs, (s) =>
          adapter.requestCancel(current.id, s),
        );
        const event = await providerCall(config.timeoutMs, (s) =>
          adapter.inspect(current.id, s),
        );
        if (event.operationId !== current.id) throw conflict();
        return await observe(event, 'cancel');
      } catch (error) {
        if (error instanceof ApiError && error.code !== 'DELIVERY_UNAVAILABLE')
          throw error;
        throw new ApiError(
          503,
          'SERVICE_UNAVAILABLE',
          'Payment cancellation outcome is unconfirmed.',
        );
      }
    },
    async webhook(raw: Uint8Array, signature: string) {
      let event: PaymentObservation;
      try {
        event = await providerCall(config.timeoutMs, (s) =>
          adapter.verifyWebhook(raw, signature, s),
        );
      } catch {
        throw new ApiError(
          401,
          'PAYMENT_AUTH_FAILED',
          'Payment event authentication failed.',
        );
      }
      return observe(event, 'webhook');
    },
  };
}
export type PaymentService = ReturnType<typeof createPaymentService>;
