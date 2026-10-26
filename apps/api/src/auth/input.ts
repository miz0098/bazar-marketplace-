import { ApiError } from '../contracts/foundation.js';
export const invalidAuth = (): never => {
  throw new ApiError(400, 'INVALID_REQUEST', 'Invalid authentication request.');
};
export function strictObject(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    invalidAuth();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key))) invalidAuth();
  return record;
}
export interface Registration {
  firstName: string;
  lastName: string;
  consent: true;
}
export function registration(value: unknown): Registration {
  const r = strictObject(value, ['firstName', 'lastName', 'consent']);
  for (const key of ['firstName', 'lastName'])
    if (
      typeof r[key] !== 'string' ||
      !(r[key] as string).trim() ||
      (r[key] as string).length > 100 ||
      [...(r[key] as string)].some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      )
    )
      invalidAuth();
  if (r.consent !== true) invalidAuth();
  return {
    firstName: (r.firstName as string).trim(),
    lastName: (r.lastName as string).trim(),
    consent: true,
  };
}
