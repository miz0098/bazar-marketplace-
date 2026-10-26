import { ApiError } from '../contracts/foundation.js';
import { integer, uuid } from '../business/validation.js';
import { promotionInput } from '../promotions/input.js';
import type {
  DeliveryStepInput,
  PaymentStepInput,
  RecordOrderInput,
  StartCheckoutInput,
} from '../contracts/checkout.js';
export function fields(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid checkout fields.');
  return value as Record<string, unknown>;
}
export function startInput(value: unknown): StartCheckoutInput {
  const r = fields(value, ['cartId', 'expectedCartVersion', 'idempotencyKey']);
  return {
    cartId: uuid(r.cartId),
    expectedCartVersion: integer(r.expectedCartVersion, 1),
    idempotencyKey: uuid(r.idempotencyKey),
  };
}
export function deliveryInput(value: unknown): DeliveryStepInput {
  const r = fields(value, ['expectedVersion', 'addressId']);
  return {
    expectedVersion: integer(r.expectedVersion, 1),
    addressId: uuid(r.addressId),
  };
}
export function paymentInput(value: unknown): PaymentStepInput {
  const r = fields(value, ['expectedVersion', 'paymentSelection', 'promoCode']);
  if (
    r.paymentSelection !== 'card-online' &&
    r.paymentSelection !== 'on-receipt'
  )
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid payment selection.');
  if (r.promoCode !== null)
    promotionInput({
      cartId: '00000000-0000-0000-0000-000000000000',
      expectedCartVersion: 1,
      code: r.promoCode,
    });
  return {
    expectedVersion: integer(r.expectedVersion, 1),
    paymentSelection:
      r.paymentSelection as PaymentStepInput['paymentSelection'],
    promoCode: r.promoCode as string | null,
  };
}
export function recordInput(value: unknown): RecordOrderInput {
  const r = fields(value, [
    'expectedVersion',
    'expectedFingerprint',
    'idempotencyKey',
  ]);
  if (
    typeof r.expectedFingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/.test(r.expectedFingerprint)
  )
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid checkout fingerprint.');
  return {
    expectedVersion: integer(r.expectedVersion, 1),
    expectedFingerprint: r.expectedFingerprint as string,
    idempotencyKey: uuid(r.idempotencyKey),
  };
}
