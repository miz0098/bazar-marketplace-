import { isIP } from 'node:net';

export interface ApiConfig {
  readonly environment: 'development' | 'test' | 'production';
  readonly host: string;
  readonly port: number;
  readonly corsOrigins: readonly string[];
  readonly logLevel: 'info' | 'error';
  readonly shutdownTimeoutMs: number;
}

function integer(value: string, name: string, minimum: number, maximum: number): number {
  if (!/^\d+$/.test(value) || Number(value) < minimum || Number(value) > maximum) throw new Error(`Invalid ${name}`);
  return Number(value);
}

/** Error messages contain names only, never rejected environment values. */
export function readConfig(env: Readonly<Record<string, string | undefined>>): ApiConfig {
  const environment = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(environment)) throw new Error('Invalid NODE_ENV');
  const host = env.HOST ?? '127.0.0.1';
  if (!isIP(host)) throw new Error('Invalid HOST');
  const port = integer(env.PORT ?? '4000', 'PORT', environment === 'test' ? 0 : 1, 65535);
  if (environment === 'production' && env.CORS_ORIGINS === undefined) throw new Error('CORS_ORIGINS must be explicit in production');
  const corsOrigins = [...new Set((env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000').split(',').map((value) => value.trim()).filter(Boolean))];
  for (const origin of corsOrigins) {
    let url: URL;
    try { url = new URL(origin); } catch { throw new Error('Invalid CORS_ORIGINS'); }
    if (!['http:', 'https:'].includes(url.protocol) || origin !== url.origin || (environment === 'production' && url.protocol !== 'https:')) throw new Error('Invalid CORS_ORIGINS');
  }
  const logLevel = env.LOG_LEVEL ?? 'info';
  if (logLevel !== 'info' && logLevel !== 'error') throw new Error('Invalid LOG_LEVEL');
  return Object.freeze({
    environment: environment as ApiConfig['environment'], host, port,
    corsOrigins: Object.freeze(corsOrigins), logLevel,
    shutdownTimeoutMs: integer(env.SHUTDOWN_TIMEOUT_MS ?? '5000', 'SHUTDOWN_TIMEOUT_MS', 100, 30000),
  });
}
