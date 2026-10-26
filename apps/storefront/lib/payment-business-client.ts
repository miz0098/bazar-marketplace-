import type {
  PaymentAttempt,
  PaymentInstrument,
  CreatePaymentInput,
} from '../services/contracts/payment-business';
export class PaymentClientError extends Error {
  constructor(
    readonly code:
      | 'invalid-input'
      | 'invalid-response'
      | 'http-error'
      | 'timeout'
      | 'unavailable',
    readonly status?: number,
  ) {
    super('Не вдалося перевірити стан тестової оплати.');
    this.name = 'PaymentClientError';
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const method = (v: unknown) =>
  v === 'card' || v === 'apple-pay' || v === 'google-pay';
function attempt(v: unknown): v is PaymentAttempt {
  if (
    !object(v) ||
    !id(v.id) ||
    !id(v.checkoutId) ||
    v.mode !== 'integration-test' ||
    v.amountBasis !== 'isolated-test-plan' ||
    !method(v.method) ||
    ![
      'submitting',
      'pending',
      'unknown',
      'declined',
      'cancelled',
      'succeeded',
    ].includes(String(v.status)) ||
    !object(v.amount) ||
    v.amount.currency !== 'UAH' ||
    typeof v.amount.amountMinor !== 'number' ||
    !Number.isSafeInteger(v.amount.amountMinor) ||
    v.amount.amountMinor < 1 ||
    typeof v.version !== 'number' ||
    !Number.isSafeInteger(v.version) ||
    v.version < 1 ||
    typeof v.createdAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.createdAt) ||
    !Number.isFinite(Date.parse(v.createdAt)) ||
    v.realPayment !== false ||
    v.orderPaid !== false
  )
    return false;
  return v.canRetry === ['declined', 'cancelled'].includes(String(v.status));
}
export function createPaymentBusinessClient(
  getCsrf: () => string,
  transport: typeof fetch = fetch,
  timeoutMs = 5000,
) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new PaymentClientError('invalid-input');
  function path(value: string) {
    if (!id(value)) throw new PaymentClientError('invalid-input');
    return `/api/v1/payments/attempts/${value}`;
  }
  async function request<T>(
    url: string,
    body: unknown,
    validate: (v: unknown) => boolean,
  ): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) {
      const token = getCsrf();
      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        throw new PaymentClientError('invalid-input');
      headers['content-type'] = 'application/json';
      headers['x-csrf-token'] = token;
    }
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await transport(url, {
        method: body === undefined ? 'GET' : 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new PaymentClientError('http-error', response.status);
      }
      if (
        !response.body ||
        !response.headers
          .get('content-type')
          ?.toLowerCase()
          .startsWith('application/json')
      ) {
        await response.body?.cancel();
        throw new PaymentClientError('invalid-response');
      }
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 32768) {
            await reader.cancel();
            throw new PaymentClientError('invalid-response');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const buffer = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        buffer.set(c, offset);
        offset += c.length;
      }
      let value: unknown;
      try {
        value = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(buffer),
        );
      } catch {
        throw new PaymentClientError('invalid-response');
      }
      if (
        !object(value) ||
        value.ok !== true ||
        !object(value.meta) ||
        !id(value.meta.requestId) ||
        !validate(value.data)
      )
        throw new PaymentClientError('invalid-response');
      return value.data as T;
    } catch (error) {
      if (error instanceof PaymentClientError) throw error;
      throw new PaymentClientError(signal.aborted ? 'timeout' : 'unavailable');
    }
  }
  const result = (v: unknown) =>
    object(v) && attempt(v.attempt) && typeof v.replayed === 'boolean';
  return {
    capabilities: () =>
      request<{
        mode: 'integration-test';
        methods: PaymentInstrument[];
        productionAvailable: false;
      }>(
        '/api/v1/payments/capabilities',
        undefined,
        (v) =>
          object(v) &&
          v.mode === 'integration-test' &&
          v.productionAvailable === false &&
          Array.isArray(v.methods) &&
          v.methods.length <= 3 &&
          v.methods.every(method) &&
          new Set(v.methods).size === v.methods.length,
      ),
    create: (input: CreatePaymentInput) =>
      request<{ attempt: PaymentAttempt; replayed: boolean }>(
        '/api/v1/payments/attempts',
        input,
        (v) =>
          result(v) &&
          object(v) &&
          attempt(v.attempt) &&
          v.attempt.checkoutId === input.checkoutId &&
          v.attempt.method === input.method,
      ),
    get: (value: string) =>
      request<PaymentAttempt>(
        path(value),
        undefined,
        (v) => attempt(v) && v.id === value,
      ),
    reconcile: (value: string) =>
      request<{ attempt: PaymentAttempt; replayed: boolean }>(
        path(value) + '/reconcile',
        {},
        (v) =>
          result(v) &&
          object(v) &&
          attempt(v.attempt) &&
          v.attempt.id === value,
      ),
    cancel: (value: string) =>
      request<{ attempt: PaymentAttempt; replayed: boolean }>(
        path(value) + '/cancel',
        {},
        (v) =>
          result(v) &&
          object(v) &&
          attempt(v.attempt) &&
          v.attempt.id === value,
      ),
  };
}
