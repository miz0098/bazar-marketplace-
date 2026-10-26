import { ApiError } from '../contracts/foundation.js';
export type DiscountRule =
  | { kind: 'percentage'; basisPoints: number }
  | { kind: 'fixed'; amountMinor: number };
export class PricingPolicyError extends ApiError {
  constructor() {
    super(
      409,
      'PROMOTION_POLICY_REQUIRED',
      'This pricing scenario requires approved business rules.',
    );
  }
}
export function safeAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid integer amount.');
  return value;
}
/** Exact integer arithmetic only. No implicit rounding, capping, stacking or per-unit allocation. */
export function calculateDiscount(
  subtotal: number,
  rule: DiscountRule,
): { discount: number; merchandiseTotal: number } {
  safeAmount(subtotal);
  let discount: bigint;
  if (rule.kind === 'percentage') {
    if (
      !Number.isInteger(rule.basisPoints) ||
      rule.basisPoints < 1 ||
      rule.basisPoints > 10000
    )
      throw new ApiError(400, 'INVALID_REQUEST', 'Invalid percentage.');
    const numerator = BigInt(subtotal) * BigInt(rule.basisPoints);
    if (numerator % 10000n !== 0n) throw new PricingPolicyError();
    discount = numerator / 10000n;
  } else if (rule.kind === 'fixed') {
    safeAmount(rule.amountMinor);
    if (rule.amountMinor === 0)
      throw new ApiError(400, 'INVALID_REQUEST', 'Invalid fixed amount.');
    discount = BigInt(rule.amountMinor);
  } else throw new ApiError(400, 'INVALID_REQUEST', 'Invalid discount kind.');
  if (discount > BigInt(subtotal)) throw new PricingPolicyError();
  return {
    discount: Number(discount),
    merchandiseTotal: Number(BigInt(subtotal) - discount),
  };
}
