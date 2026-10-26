import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import type { AuthConfig } from './config.js';
import { ApiError } from '../contracts/foundation.js';
export const digest = (value: string): Buffer =>
  createHash('sha256').update(value).digest();
export const keyed = (key: Buffer, scope: string, value: string): Buffer =>
  createHmac('sha256', key).update(`${scope}\0${value}`).digest();
export const secret = (): string => randomBytes(32).toString('base64url');
export const otp = (): string =>
  randomInt(0, 1000000).toString().padStart(6, '0');
export function equal(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
export function phone(value: unknown): string {
  if (typeof value !== 'string' || !/^\+380[3-9]\d{8}$/.test(value))
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'A normalized Ukrainian phone number is required.',
    );
  return value;
}
export function makeFlow(config: AuthConfig, now = Date.now()): string {
  const payload = `${secret()}.${Math.floor(now / 1000) + config.policy.flowTtlSeconds}`;
  return `${payload}.${keyed(config.csrfKey, 'flow', payload).toString('base64url')}`;
}
export function validFlow(
  config: AuthConfig,
  flow: string,
  now = Date.now(),
): boolean {
  if (!/^[A-Za-z0-9_-]{43}\.\d{10}\.[A-Za-z0-9_-]{43}$/.test(flow))
    return false;
  const [nonce, expires, mac] = flow.split('.');
  return (
    Number(expires) > Math.floor(now / 1000) &&
    Number(expires) <= Math.floor(now / 1000) + config.policy.flowTtlSeconds &&
    equal(
      Buffer.from(mac, 'base64url'),
      keyed(config.csrfKey, 'flow', `${nonce}.${expires}`),
    )
  );
}
export const csrf = (config: AuthConfig, flow: string): string =>
  keyed(config.csrfKey, 'csrf', flow).toString('base64url');
export function requireCsrf(
  config: AuthConfig,
  flow: string,
  token: unknown,
): void {
  if (
    !validFlow(config, flow) ||
    typeof token !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(token) ||
    !equal(
      Buffer.from(token, 'base64url'),
      Buffer.from(csrf(config, flow), 'base64url'),
    )
  )
    throw new ApiError(403, 'CSRF_DENIED', 'Request verification failed.');
}
