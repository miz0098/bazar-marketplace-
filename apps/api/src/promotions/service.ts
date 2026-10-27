import { createHash, timingSafeEqual } from 'node:crypto';
import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import type {
  IntegrationClaim,
  IntegrationClaimInput,
  PromotionPricingInput,
  PromotionQuote,
} from '../contracts/promotions.js';
import { integer, money, uuid } from '../business/validation.js';
import {
  calculateDiscount,
  PricingPolicyError,
  type DiscountRule,
} from './pricing.js';
import { promotionInput } from './input.js';
const rejected = () =>
  new ApiError(
    409,
    'PROMOTION_REJECTED',
    'The promotion cannot be used for this cart.',
  );
const changed = () =>
  new ApiError(
    409,
    'PRICING_CHANGED',
    'Cart or pricing has changed; request a new evaluation.',
  );
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest();
function instant(value: unknown): Date {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    throw new Error('Invalid pricing timestamp');
  return value;
}
const moneyDto = (amountMinor: number) => ({
  amountMinor,
  currency: 'UAH' as const,
});
export async function evaluatePromotionInTransaction(
  client: pg.PoolClient,
  actor: string,
  input: PromotionPricingInput,
  lock: 'UPDATE' | 'SHARE',
): Promise<PromotionQuote> {
  const cart = (
    await client.query(
      `SELECT id,version::text FROM bazar.carts WHERE id=$1 AND user_id=$2 FOR ${lock}`,
      [input.cartId, actor],
    )
  ).rows[0];
  if (!cart) throw new ApiError(404, 'NOT_FOUND', 'Cart not found.');
  const version = money(cart.version);
  if (version !== input.expectedCartVersion) throw changed();
  const campaign = (
    await client.query(
      `SELECT *,clock_timestamp() AS db_now FROM bazar.promotions WHERE code=$1 FOR ${lock}`,
      [input.code],
    )
  ).rows[0];
  if (!campaign) throw rejected();
  if((await client.query("SELECT to_regclass('bazar.commerce_promotions') IS NOT NULL AS yes")).rows[0].yes&&(await client.query('SELECT 1 FROM bazar.commerce_promotions WHERE promotion_id=$1',[campaign.id])).rowCount)throw new PricingPolicyError();
  const now = instant(
      (await client.query('SELECT clock_timestamp() AS now')).rows[0].now,
    ),
    starts = instant(campaign.starts_at),
    ends = instant(campaign.ends_at);
  if (
    campaign.enabled !== true ||
    now < starts ||
    now >= ends ||
    campaign.currency !== 'UAH'
  )
    throw rejected();
  const campaignVersion = money(campaign.version),
    maxUses = money(campaign.max_uses),
    perUser = money(campaign.per_user_limit);
  const counts = (
    await client.query(
      'SELECT count(*)::text AS total,count(*) FILTER(WHERE user_id=$2)::text AS owned FROM bazar.promotion_usage_claims WHERE promotion_id=$1',
      [campaign.id, actor],
    )
  ).rows[0];
  if (money(counts.total) >= maxUses || money(counts.owned) >= perUser)
    throw rejected();
  const rows = (
    await client.query(
      'SELECT v.id,v.product_id,v.price_minor::text,v.currency,v.stock,v.version::text,l.quantity FROM bazar.cart_lines l JOIN bazar.variants v ON v.id=l.variant_id WHERE l.cart_id=$1 ORDER BY v.id FOR SHARE OF v',
      [input.cartId],
    )
  ).rows;
  // No seller identity/allocation policy exists. Only one product/variant line is evaluable.
  if (rows.length === 0) throw rejected();
  if (rows.length !== 1) throw new PricingPolicyError();
  const line = rows[0],
    quantity = integer(line.quantity, 1, 2147483647),
    stock = integer(line.stock, 0, 2147483647);
  if (quantity > stock || line.currency !== 'UAH') throw rejected();
  const eligible = await client.query(
    'SELECT product_id FROM bazar.promotion_products WHERE promotion_id=$1 AND product_id=$2 FOR SHARE',
    [campaign.id, line.product_id],
  );
  if (!eligible.rowCount) throw rejected();
  const price = money(line.price_minor),
    subtotalBig = BigInt(price) * BigInt(quantity);
  if (subtotalBig > BigInt(Number.MAX_SAFE_INTEGER)) throw changed();
  const subtotal = Number(subtotalBig),
    minimum = money(campaign.min_subtotal_minor);
  if (subtotal < minimum) throw rejected();
  const rule: DiscountRule =
    campaign.kind === 'percentage'
      ? {
          kind: 'percentage',
          basisPoints: integer(campaign.percentage_basis_points, 1, 10000),
        }
      : campaign.kind === 'fixed'
        ? { kind: 'fixed', amountMinor: money(campaign.fixed_minor) }
        : (() => {
            throw new Error('Invalid promotion kind');
          })();
  const result = calculateDiscount(subtotal, rule);
  if (result.discount === 0) throw new PricingPolicyError();
  const evaluatedAt = instant(
    (await client.query('SELECT clock_timestamp() AS now')).rows[0].now,
  );
  if (evaluatedAt < starts || evaluatedAt >= ends) throw rejected();
  const fingerprint = hash({
    cartId: input.cartId,
    version,
    variantId: uuid(line.id),
    productId: uuid(line.product_id),
    variantVersion: money(line.version),
    quantity,
    stock,
    price,
    promotionId: uuid(campaign.id),
    campaignVersion,
    code: input.code,
    rule,
    minimum,
    maxUses,
    perUser,
    starts: starts.toISOString(),
    ends: ends.toISOString(),
  }).toString('hex');
  return {
    mode: 'integration-test',
    scope: 'single-product-merchandise',
    cartId: uuid(cart.id),
    cartVersion: version,
    promotionId: uuid(campaign.id),
    promotionVersion: campaignVersion,
    subtotal: moneyDto(subtotal),
    discount: moneyDto(result.discount),
    merchandiseTotal: moneyDto(result.merchandiseTotal),
    pricingFingerprint: fingerprint,
    evaluatedAt: evaluatedAt.toISOString(),
    promotionEndsAt: ends.toISOString(),
    checkoutAvailable: false,
  };
}
async function insertClaim(
  c: pg.PoolClient,
  actor: string,
  input: PromotionPricingInput,
  key: string,
  requestDigest: Buffer,
  quote: PromotionQuote,
): Promise<string> {
  const row = await c.query(
    "INSERT INTO bazar.promotion_usage_claims(promotion_id,user_id,cart_id,cart_version,idempotency_key,request_digest,pricing_fingerprint,subtotal_minor,discount_minor,merchandise_total_minor,currency,mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'UAH','integration-test') RETURNING id",
    [quote.promotionId, actor, input.cartId, input.expectedCartVersion, key,
      requestDigest, quote.pricingFingerprint, quote.subtotal.amountMinor,
      quote.discount.amountMinor, quote.merchandiseTotal.amountMinor],
  );
  return uuid(row.rows[0].id);
}
/** Caller holds cart/campaign locks and transaction. Same F5 caps/evaluation; no real redemption. */
export async function claimPromotionForCheckout(
  c: pg.PoolClient, actor: string, input: PromotionPricingInput,
  key: string, expected: string,
) {
  if (process.env.NODE_ENV !== 'test') throw new Error('Test claims only');
  const quote = await evaluatePromotionInTransaction(c, actor, input, 'UPDATE');
  if (quote.pricingFingerprint !== expected) throw changed();
  return insertClaim(c, actor, input, key, hash({checkout: input, expected}), quote);
}
/** Isolated technical composition, never constructed by main.ts or the existing checkout provider. */
export function createPromotionService(pool: pg.Pool) {
  if (process.env.NODE_ENV !== 'test')
    throw new Error('Promotion integration requires an isolated test process');
  return {
    async evaluate(
      actor: string,
      value: PromotionPricingInput,
    ): Promise<PromotionQuote> {
      actor = uuid(actor);
      const input = promotionInput(value),
        client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await evaluatePromotionInTransaction(client, actor, input, 'SHARE');
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    /** No HTTP entry point: exercises usage caps only, not real order/payment redemption semantics. */
    async claimForTest(
      actor: string,
      value: IntegrationClaimInput,
    ): Promise<IntegrationClaim> {
      if (process.env.NODE_ENV !== 'test')
        throw new Error(
          'Promotion usage claims are isolated integration operations',
        );
      actor = uuid(actor);
      const { idempotencyKey, expectedFingerprint, ...pricing } = value;
      const input = promotionInput(pricing),
        key = uuid(idempotencyKey);
      if (
        typeof expectedFingerprint !== 'string' ||
        !/^[a-f0-9]{64}$/.test(expectedFingerprint)
      )
        throw new ApiError(
          400,
          'INVALID_REQUEST',
          'Invalid pricing fingerprint.',
        );
      const requestDigest = hash({ ...input, expectedFingerprint }),
        lock = hash(['promotion-claim', actor, key]);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'SELECT pg_advisory_xact_lock($1::integer,$2::integer)',
          [lock.readInt32BE(0), lock.readInt32BE(4)],
        );
        const owned = await client.query(
          'SELECT id FROM bazar.carts WHERE id=$1 AND user_id=$2 FOR UPDATE',
          [input.cartId, actor],
        );
        if (!owned.rowCount)
          throw new ApiError(404, 'NOT_FOUND', 'Cart not found.');
        const previous = (
          await client.query(
            'SELECT id,request_digest FROM bazar.promotion_usage_claims WHERE user_id=$1 AND idempotency_key=$2',
            [actor, key],
          )
        ).rows[0];
        if (previous) {
          if (
            previous.request_digest.length !== requestDigest.length ||
            !timingSafeEqual(previous.request_digest, requestDigest)
          )
            throw new ApiError(
              409,
              'CONFLICT',
              'The request key was already used with different input.',
            );
          await client.query('COMMIT');
          return {
            id: uuid(previous.id),
            mode: 'integration-test',
            status: 'recorded-for-test',
            replayed: true,
          };
        }
        const result = await evaluatePromotionInTransaction(client, actor, input, 'UPDATE');
        if (result.pricingFingerprint !== expectedFingerprint) throw changed();
        const claimId = await insertClaim(client, actor, input, key, requestDigest, result);
        await client.query('COMMIT');
        return {
          id: claimId,
          mode: 'integration-test',
          status: 'recorded-for-test',
          replayed: false,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        if (error && typeof error === 'object' && 'code' in error) {
          if (error.code === '23505')
            throw new ApiError(
              409,
              'CONFLICT',
              'This cart version already has a usage claim.',
            );
          if (error.code === '23514') throw rejected();
        }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
export type PromotionService = ReturnType<typeof createPromotionService>;
