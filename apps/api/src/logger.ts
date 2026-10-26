import { errorCodes, type ErrorCode } from './contracts/foundation.js';

const events = ['request', 'startup', 'shutdown', 'configuration_error', 'server_error', 'client_error'] as const;
export interface LogRecord {
  event: typeof events[number];
  requestId?: string;
  method?: 'GET' | 'HEAD' | 'OPTIONS' | 'OTHER';
  route?: '/health' | '/ready' | '/api/v1' | '/api/v1/products' | '/api/v1/categories' | '/api/v1/cart' | '/api/v1/auth' | '/api/v1/pricing/promotions/evaluate' | '/api/v1/orders' | '/api/v1/checkouts' | '/api/v1/delivery' | '/api/v1/payments' | 'unmatched';
  status?: number;
  durationMs?: number;
  port?: number;
  code?: ErrorCode;
}
export interface Logger { write(record: LogRecord): void }

/** Build an allow-listed record instead of attempting to redact arbitrary payloads. */
export function createLogger(level: 'info' | 'error' = 'info', sink: (line: string) => void = (line) => { process.stdout.write(`${line}\n`); }): Logger {
  return { write(record) {
    if (!events.includes(record.event)) return;
    const severity = record.event.endsWith('_error') || (record.status ?? 0) >= 500 ? 'error' : 'info';
    if (level === 'error' && severity !== 'error') return;
    const entry: Record<string, string | number> = { timestamp: new Date().toISOString(), level: severity, event: record.event };
    if (record.requestId && /^[a-f0-9-]{36}$/.test(record.requestId)) entry.requestId = record.requestId;
    if (record.method && ['GET', 'HEAD', 'OPTIONS', 'OTHER'].includes(record.method)) entry.method = record.method;
    if (record.route && ['/health', '/ready', '/api/v1', '/api/v1/products', '/api/v1/categories', '/api/v1/cart', '/api/v1/auth', '/api/v1/pricing/promotions/evaluate', '/api/v1/orders', '/api/v1/checkouts', '/api/v1/delivery', '/api/v1/payments', 'unmatched'].includes(record.route)) entry.route = record.route;
    if (Number.isInteger(record.status) && record.status! >= 100 && record.status! <= 599) entry.status = record.status!;
    if (Number.isFinite(record.durationMs) && record.durationMs! >= 0) entry.durationMs = Math.round(record.durationMs! * 100) / 100;
    if (Number.isInteger(record.port) && record.port! >= 0 && record.port! <= 65535) entry.port = record.port!;
    if (record.code && errorCodes.includes(record.code)) entry.code = record.code;
    sink(JSON.stringify(entry));
  } };
}
