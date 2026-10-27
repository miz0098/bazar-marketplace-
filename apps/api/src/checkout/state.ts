import {catalogAvailability} from '../catalog/availability.js';
import { createHash } from 'node:crypto';
import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import { integer, money, text, uuid } from '../business/validation.js';
import { readCartInTransaction } from '../business/cart.js';
import { evaluatePromotionInTransaction } from '../promotions/service.js';
import type {
  CheckoutPricing,
  CheckoutSessionDto,
  DeliveryReference,
  IntegrationOrderDto,
  IntegrationOrderLine,
  PaymentSelection,
} from '../contracts/checkout.js';
export const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest();
export const cash = (amountMinor: number) => ({
  amountMinor,
  currency: 'UAH' as const,
});
export const stale = () =>
  new ApiError(
    409,
    'CHECKOUT_STALE',
    'Checkout or pricing has changed; refresh the draft.',
  );
export const policy = () =>
  new ApiError(
    409,
    'CHECKOUT_POLICY_REQUIRED',
    'This checkout operation requires approved business/provider rules.',
  );
export const missing = () =>
  new ApiError(404, 'NOT_FOUND', 'Resource not found.');
export function timestamp(value: unknown): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    throw new Error('Invalid checkout timestamp');
  return value.toISOString();
}
export function payment(value: unknown): PaymentSelection {
  if (value !== 'card-online' && value !== 'on-receipt')
    throw new Error('Invalid stored payment choice');
  return value;
}
export async function cartSnapshot(
  c: pg.PoolClient,
  actor: string,
  cartId: string,
  expected: number,
) {
  const rows = (
    await c.query(
      'SELECT v.id,v.product_id,v.price_minor::text,v.version::text,v.stock,p.title,l.quantity FROM bazar.cart_lines l JOIN bazar.variants v ON v.id=l.variant_id JOIN bazar.products p ON p.id=v.product_id WHERE l.cart_id=$1 ORDER BY v.id FOR SHARE OF v,p',
      [cartId],
    )
  ).rows;
  const binary=await catalogAvailability(c,rows.map(r=>r.id));
  const cart = await readCartInTransaction(c, cartId, actor, true);
  if (cart.version !== expected) throw stale();
  if (!rows.length)
    throw new ApiError(409, 'CHECKOUT_REJECTED', 'The cart is empty.');
  const lines: IntegrationOrderLine[] = rows.map((r) => {
    if (r.currency !== undefined && r.currency !== 'UAH')
      throw new Error('Invalid currency');
    const quantity = integer(r.quantity, 1, 2147483647);
    const total = BigInt(money(r.price_minor)) * BigInt(quantity);
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw stale();
    return {
      productId: uuid(r.product_id),
      variantId: uuid(r.id),
      title: text(r.title, 300),
      quantity,
      unitPrice: cash(money(r.price_minor)),
      lineTotal: cash(Number(total)),
    };
  });
  return {
    cart,
    lines,
    fingerprint: hash({
      cartId,
      version: cart.version,
      lines,
      inventory: rows.map((r) => ({
        ...(binary.has(r.id)?{available:binary.get(r.id)}:{stock:integer(r.stock, 0, 2147483647)}),
        version: money(r.version),
      })),
    }).toString('hex'),
  };
}
export async function delivery(
  c: pg.PoolClient,
  actor: string,
  addressId: string,
): Promise<DeliveryReference> {
  const r = (
    await c.query(
      'SELECT id,carrier,city_ref,location_ref FROM bazar.addresses WHERE id=$1 AND user_id=$2 FOR SHARE',
      [addressId, actor],
    )
  ).rows[0];
  if (!r) throw missing();
  if (r.carrier !== 'nova-poshta' && r.carrier !== 'meest' && r.carrier !== 'ukrposhta')
    throw new Error('Invalid stored carrier');
  return {
    addressId: uuid(r.id),
    carrier: r.carrier,
    cityRef: text(r.city_ref, 200),
    locationRef: text(r.location_ref, 200),
    cost: null,
    status: 'not-requested',
  };
}
export async function lockedSession(
  c: pg.PoolClient,
  actor: string,
  id: string,
) {
  const reference = (
    await c.query(
      'SELECT cart_id FROM bazar.checkout_sessions WHERE id=$1 AND user_id=$2',
      [id, actor],
    )
  ).rows[0];
  if (!reference) throw missing();
  await c.query(
    'SELECT id FROM bazar.carts WHERE id=$1 AND user_id=$2 FOR UPDATE',
    [reference.cart_id, actor],
  );
  const row = (
    await c.query(
      'SELECT *,version::text,cart_version::text FROM bazar.checkout_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE',
      [id, actor],
    )
  ).rows[0];
  if (!row) throw missing();
  return row;
}
export function editable(
  row: Record<string, unknown>,
  expectedVersion: number,
) {
  if (row.order_id)
    throw new ApiError(409, 'CONFLICT', 'The checkout record is closed.');
  if (
    money(row.version) !== expectedVersion ||
    expectedVersion === Number.MAX_SAFE_INTEGER
  )
    throw stale();
}
export async function state(
  c: pg.PoolClient,
  actor: string,
  row: Record<string, unknown>,
): Promise<CheckoutSessionDto> {
  const id = uuid(row.id),
    version = money(row.version),
    cartId = uuid(row.cart_id),
    cartVersion = money(row.cart_version);
  if (
    !['contact-delivery', 'payment', 'confirmation'].includes(String(row.stage))
  )
    throw new Error('Invalid stored checkout stage');
  if (row.order_id) {
    const order = await readOrder(c, actor, uuid(row.order_id));
    return {
      id,
      mode: 'integration-test',
      version,
      cartId,
      cartVersion,
      stage: 'confirmation',
      appliedPromoCode: order.testFinancials?.promoCode ?? null,
      ...(order.testFinancials ? {testShippingEstimate:order.testFinancials.shipping} : {}),
      delivery: order.delivery,
      paymentSelection: order.paymentSelection,
      pricing: {
        subtotal: order.subtotal,
        discount: order.discount,
        merchandiseTotal: order.merchandiseTotal,
        fingerprint: text(row.pricing_fingerprint, 64),
        acknowledged: true,
      },
      orderId: order.id,
      canRecordIntegrationOrder: false,
      canPlaceRealOrder: false,
      blockers: ['integration-record-only'],
    };
  }
  const q=(await c.query('SELECT q.amount_minor::text FROM bazar.checkout_shipping s JOIN bazar.shipping_quotes q ON q.id=s.quote_id AND q.user_id=s.user_id WHERE s.checkout_id=$1 AND s.user_id=$2',[id,actor])).rows[0];
  // Follow F5 lock order: cart -> campaign (when selected) -> variants -> eligibility/address.
  const promo =
    row.promo_code === null
      ? null
      : await evaluatePromotionInTransaction(
          c,
          actor,
          {
            cartId,
            expectedCartVersion: cartVersion,
            code: text(row.promo_code, 64),
          },
          'SHARE',
        );
  const snapshot = await cartSnapshot(c, actor, cartId, cartVersion);
  const address =
    row.address_id === null
      ? null
      : await delivery(c, actor, uuid(row.address_id));
  const selection =
    row.payment_selection === null ? null : payment(row.payment_selection);
  let pricing: CheckoutPricing | null = null;
  if (address && selection) {
    const fingerprint = hash({
      cart: snapshot.fingerprint,
      address,
      selection,
      promo: promo?.pricingFingerprint ?? null,
    }).toString('hex');
    pricing = {
      subtotal: snapshot.cart.subtotal,
      discount: promo?.discount ?? cash(0),
      merchandiseTotal: promo?.merchandiseTotal ?? snapshot.cart.subtotal,
      fingerprint,
      acknowledged: row.pricing_fingerprint === fingerprint,
    };
  }
  return {
    id,
    mode: 'integration-test',
    version,
    cartId,
    cartVersion,
    stage: row.stage as CheckoutSessionDto['stage'],
    ...(q ? {testShippingEstimate:cash(money(q.amount_minor))} : {}),
    appliedPromoCode: row.promo_code===null ? null : text(row.promo_code,64),
    delivery: address,
    paymentSelection: selection,
    pricing,
    orderId: null,
    canRecordIntegrationOrder:
      row.stage === 'confirmation' &&
      pricing?.acknowledged === true &&
      promo === null,
    canPlaceRealOrder: false,
    blockers: [
      'live-authentication',
      'delivery-provider',
      'payment-provider',
      'inventory-reservation-policy',
      ...(promo ? ['promotion-redemption-policy'] : []),
    ],
  };
}
export async function readOrder(
  c: pg.PoolClient,
  actor: string,
  id: string,
): Promise<IntegrationOrderDto> {
  const r = (
    await c.query(
      "SELECT o.id,o.created_at,o.status,o.address_id,o.total_minor::text,s.*,s.cart_version::text,s.subtotal_minor::text,s.discount_minor::text,s.merchandise_total_minor::text FROM bazar.orders o JOIN bazar.order_checkout_snapshots s ON s.order_id=o.id AND s.user_id=o.user_id WHERE o.id=$1 AND o.user_id=$2 AND o.foundation_mode='integration-test'",
      [id, actor],
    )
  ).rows[0];
  if (!r) throw missing();
  if (
    r.status !== 'pending' ||
    r.currency !== 'UAH' ||
    money(r.total_minor) !== money(r.merchandise_total_minor) ||
    r.payable_total_minor !== null ||
    r.delivery_cost_minor !== null
  )
    throw new Error('Invalid integration order');
  const lines = (
    await c.query(
      'SELECT product_id,variant_id,title_snapshot,quantity,unit_price_minor::text,line_total_minor::text,currency FROM bazar.order_lines WHERE order_id=$1 AND user_id=$2 ORDER BY variant_id,id',
      [id, actor],
    )
  ).rows.map((l) => {
    if (l.currency !== 'UAH') throw new Error('Invalid order currency');
    return {
      productId: uuid(l.product_id),
      variantId: uuid(l.variant_id),
      title: text(l.title_snapshot, 300),
      quantity: integer(l.quantity, 1, 2147483647),
      unitPrice: cash(money(l.unit_price_minor)),
      lineTotal: cash(money(l.line_total_minor)),
    };
  });
  if (
    !lines.length ||
    lines.reduce((sum, l) => sum + BigInt(l.lineTotal.amountMinor), 0n) !==
      BigInt(money(r.subtotal_minor))
  )
    throw new Error('Invalid order aggregate');
  if (r.carrier !== 'nova-poshta' && r.carrier !== 'meest' && r.carrier !== 'ukrposhta')
    throw new Error('Invalid order carrier');
  // Upgrade fixtures can read immutable pre-F16 zero-discount history; runtime readiness still requires the full inventory.
  const installed=(await c.query("SELECT to_regclass('bazar.order_test_financials') IS NOT NULL AS present")).rows[0].present;
  if (!installed && money(r.discount_minor)>0) throw new Error('Missing financial evidence');
  const f=installed ? (await c.query('SELECT *,subtotal_minor::text,discount_minor::text,shipping_minor::text,total_minor::text FROM bazar.order_test_financials WHERE order_id=$1 AND user_id=$2',[id,actor])).rows[0] : undefined;
  return {
    id: uuid(r.id),
    mode: 'integration-test',
    status: 'pending',
    recordState: 'recorded-for-test',
    ...(f ? {testFinancials:{scope:'isolated-test-plan' as const, subtotal:cash(money(f.subtotal_minor)),discount:cash(money(f.discount_minor)),shipping:cash(money(f.shipping_minor)),total:cash(money(f.total_minor)),promoCode:f.promo_code}} : {}),
    createdAt: timestamp(r.created_at),
    cartId: uuid(r.cart_id),
    cartVersion: money(r.cart_version),
    lines,
    subtotal: cash(money(r.subtotal_minor)),
    discount: cash(money(r.discount_minor)),
    merchandiseTotal: cash(money(r.merchandise_total_minor)),
    payableTotal: null,
    delivery: {
      addressId: uuid(r.address_id),
      carrier: r.carrier,
      cityRef: text(r.city_ref, 200),
      locationRef: text(r.location_ref, 200),
      cost: null,
      status: 'not-requested',
    },
    paymentSelection: payment(r.payment_selection),
    paymentStatus: 'not-initiated',
    inventoryStatus: 'not-reserved',
  };
}
