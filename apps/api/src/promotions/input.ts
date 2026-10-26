import { ApiError } from '../contracts/foundation.js';
import { integer, uuid } from '../business/validation.js';
import type { PromotionPricingInput } from '../contracts/promotions.js';
export function promotionInput(value: unknown): PromotionPricingInput {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid promotion request.');
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (k) => !['cartId', 'expectedCartVersion', 'code'].includes(k),
    )
  )
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid promotion fields.');
  const code = input.code;
  if (
    typeof code !== 'string' ||
    [...code].length < 1 ||
    [...code].length > 64 ||
    code !== code.trim() ||
    [...code].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid promotion code.');
  return {
    cartId: uuid(input.cartId),
    expectedCartVersion: integer(input.expectedCartVersion, 1),
    code,
  };
}
