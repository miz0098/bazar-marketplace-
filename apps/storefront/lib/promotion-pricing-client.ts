import type {
  PromotionMoney,
  PromotionPricingService,
  PromotionQuote,
} from '../services/contracts/promotion-pricing.js';
export class PromotionPricingClientError extends Error {
  constructor(
    readonly code:
      | 'http-error'
      | 'invalid-response'
      | 'invalid-input'
      | 'unavailable'
      | 'timeout',
    readonly status?: number,
  ) {
    super('Не вдалося перевірити промокод на сервері.');
    this.name = 'PromotionPricingClientError';
  }
}
function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function uuid(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}
function integer(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
}
function money(v: unknown): v is PromotionMoney {
  return record(v) && integer(v.amountMinor) && v.currency === 'UAH';
}
function date(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) &&
    Number.isFinite(Date.parse(v))
  );
}
function quote(v: unknown): v is PromotionQuote {
  return (
    record(v) &&
    v.mode === 'integration-test' &&
    v.scope === 'single-product-merchandise' &&
    v.checkoutAvailable === false &&
    uuid(v.cartId) &&
    uuid(v.promotionId) &&
    integer(v.cartVersion) &&
    v.cartVersion > 0 &&
    integer(v.promotionVersion) &&
    v.promotionVersion > 0 &&
    money(v.subtotal) &&
    money(v.discount) &&
    v.discount.amountMinor > 0 &&
    money(v.merchandiseTotal) &&
    BigInt(v.subtotal.amountMinor) - BigInt(v.discount.amountMinor) ===
      BigInt(v.merchandiseTotal.amountMinor) &&
    typeof v.pricingFingerprint === 'string' &&
    /^[0-9a-f]{64}$/.test(v.pricingFingerprint) &&
    date(v.evaluatedAt) &&
    date(v.promotionEndsAt) &&
    Date.parse(v.promotionEndsAt) > Date.parse(v.evaluatedAt)
  );
}
/** No provider selection, code persistence, price input, auto retry or payment/order claim. */
export function createPromotionPricingClient(
  getCsrfToken: () => string,
  transport: typeof fetch = fetch,
  timeoutMs = 3000,
): PromotionPricingService {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000)
    throw new PromotionPricingClientError('invalid-input');
  return {
    async evaluate(input) {
      if (
        !record(input) ||
        Object.keys(input).some(
          (k) => !['cartId', 'expectedCartVersion', 'code'].includes(k),
        ) ||
        !uuid(input.cartId) ||
        !integer(input.expectedCartVersion) ||
        input.expectedCartVersion < 1 ||
        typeof input.code !== 'string' ||
        [...input.code].length < 1 ||
        [...input.code].length > 64 ||
        input.code.trim() !== input.code ||
        [...input.code].some(
          (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
        )
      )
        throw new PromotionPricingClientError('invalid-input');
      const csrf = getCsrfToken();
      if (!/^[A-Za-z0-9_-]{43}$/.test(csrf))
        throw new PromotionPricingClientError('invalid-input');
      const signal = AbortSignal.timeout(timeoutMs);
      try {
        const response = await transport(
          '/api/v1/pricing/promotions/evaluate',
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'x-csrf-token': csrf,
            },
            body: JSON.stringify(input),
            credentials: 'same-origin',
            cache: 'no-store',
            redirect: 'error',
            signal,
          },
        );
        if (!response.ok) {
          await response.body?.cancel();
          throw new PromotionPricingClientError('http-error', response.status);
        }
        if (
          !response.body ||
          !response.headers
            .get('content-type')
            ?.toLowerCase()
            .startsWith('application/json')
        ) {
          await response.body?.cancel();
          throw new PromotionPricingClientError('invalid-response');
        }
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.length;
            if (bytes > 16384) {
              await reader.cancel();
              throw new PromotionPricingClientError('invalid-response');
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const all = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
          all.set(chunk, offset);
          offset += chunk.length;
        }
        let result: unknown;
        try {
          result = JSON.parse(new TextDecoder().decode(all));
        } catch {
          throw new PromotionPricingClientError('invalid-response');
        }
        if (
          !record(result) ||
          result.ok !== true ||
          !record(result.meta) ||
          !uuid(result.meta.requestId) ||
          !quote(result.data) ||
          result.data.cartId.toLowerCase() !== input.cartId.toLowerCase() ||
          result.data.cartVersion !== input.expectedCartVersion
        )
          throw new PromotionPricingClientError('invalid-response');
        return result.data;
      } catch (error) {
        if (error instanceof PromotionPricingClientError) throw error;
        throw new PromotionPricingClientError(
          signal.aborted ? 'timeout' : 'unavailable',
        );
      }
    },
  };
}
