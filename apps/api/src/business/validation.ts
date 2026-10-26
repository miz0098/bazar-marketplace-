import { ApiError } from '../contracts/foundation.js';
export function invalid(): never {
  throw new ApiError(400, 'INVALID_REQUEST', 'Invalid request parameters.');
}
export function uuid(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    invalid();
  return value.toLowerCase();
}
export function integer(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    invalid();
  return value;
}
export function money(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{1,16}$/.test(value))
    throw new Error('Invalid database money');
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error('Invalid database money');
  return n;
}
export function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > max)
    throw new Error('Invalid database text');
  return value;
}
