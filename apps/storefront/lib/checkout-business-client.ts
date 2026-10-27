import type {
  IntegratedConfirmationInput,
  IntegratedConfirmationResult,
  CheckoutSessionDto,
  DeliveryStepInput,
  IntegrationOrderDto,
  PaymentStepInput,
  RecordedOrderResult,
  RecordOrderInput,
  StartCheckoutInput,
} from '../services/contracts/checkout-business.js';
export class CheckoutBusinessClientError extends Error {
  constructor(
    readonly code:
      | 'invalid-response'
      | 'invalid-input'
      | 'http-error'
      | 'timeout'
      | 'unavailable',
    readonly status?: number,
  ) {
    super('Не вдалося виконати серверний запит checkout.');
    this.name = 'CheckoutBusinessClientError';
  }
}
function object(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function id(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)
  );
}
function count(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
}
function text(v: unknown, max: number) {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}
function money(v: unknown): v is { amountMinor: number; currency: 'UAH' } {
  return object(v) && count(v.amountMinor) && v.currency === 'UAH';
}
function date(v: unknown) {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) &&
    Number.isFinite(Date.parse(v))
  );
}
function choice(v: unknown) {
  return v === 'card-online' || v === 'on-receipt';
}
function delivery(v: unknown) {
  return (
    object(v) &&
    id(v.addressId) &&
    (v.carrier === 'nova-poshta' ||
      v.carrier === 'meest' ||
      v.carrier === 'ukrposhta') &&
    text(v.cityRef, 200) &&
    text(v.locationRef, 200) &&
    v.cost === null &&
    v.status === 'not-requested'
  );
}
function pricing(v: unknown) {
  return (
    object(v) &&
    money(v.subtotal) &&
    money(v.discount) &&
    money(v.merchandiseTotal) &&
    BigInt(v.subtotal.amountMinor) - BigInt(v.discount.amountMinor) ===
      BigInt(v.merchandiseTotal.amountMinor) &&
    typeof v.fingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(v.fingerprint) &&
    typeof v.acknowledged === 'boolean'
  );
}
function checkout(v: unknown): v is CheckoutSessionDto {
  if (
    !object(v) ||
    !id(v.id) ||
    v.mode !== 'integration-test' ||
    !(v.testShippingEstimate===undefined || money(v.testShippingEstimate)) ||
    !(v.appliedPromoCode===undefined || v.appliedPromoCode===null || text(v.appliedPromoCode,64)) ||
    !count(v.version) ||
    v.version < 1 ||
    !id(v.cartId) ||
    !count(v.cartVersion) ||
    v.cartVersion < 1 ||
    !['contact-delivery', 'payment', 'confirmation'].includes(
      String(v.stage),
    ) ||
    !(v.delivery === null || delivery(v.delivery)) ||
    !(v.paymentSelection === null || choice(v.paymentSelection)) ||
    !(v.pricing === null || pricing(v.pricing)) ||
    !(v.orderId === null || id(v.orderId)) ||
    typeof v.canRecordIntegrationOrder !== 'boolean' ||
    v.canPlaceRealOrder !== false ||
    !Array.isArray(v.blockers) ||
    !v.blockers.every((b) => text(b, 100))
  )
    return false;
  if (v.stage !== 'contact-delivery' && v.delivery === null) return false;
  if (
    v.stage === 'confirmation' &&
    (v.paymentSelection === null || v.pricing === null)
  )
    return false;
  if (
    v.canRecordIntegrationOrder &&
    (v.stage !== 'confirmation' ||
      v.orderId !== null ||
      !object(v.pricing) ||
      v.pricing.acknowledged !== true ||
      !money(v.pricing.discount) ||
      v.pricing.discount.amountMinor !== 0)
  )
    return false;
  return (
    v.orderId === null ||
    (v.stage === 'confirmation' && !v.canRecordIntegrationOrder)
  );
}
function order(v: unknown): v is IntegrationOrderDto {
  if (
    !object(v) ||
    !id(v.id) ||
    v.mode !== 'integration-test' ||
    v.status !== 'pending' ||
    v.recordState !== 'recorded-for-test' ||
    !date(v.createdAt) ||
    !id(v.cartId) ||
    !count(v.cartVersion) ||
    v.cartVersion < 1 ||
    !Array.isArray(v.lines) ||
    !v.lines.length ||
    !money(v.subtotal) ||
    !money(v.discount) ||
    !money(v.merchandiseTotal) ||
    BigInt(v.merchandiseTotal.amountMinor) !== BigInt(v.subtotal.amountMinor)-BigInt(v.discount.amountMinor) ||
    v.payableTotal !== null ||
    !delivery(v.delivery) ||
    !choice(v.paymentSelection) ||
    v.paymentStatus !== 'not-initiated' ||
    v.inventoryStatus !== 'not-reserved'
  )
    return false;
  let total = 0n;
  for (const line of v.lines) {
    if (
      !object(line) ||
      !id(line.productId) ||
      !id(line.variantId) ||
      !text(line.title, 300) ||
      !count(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 2147483647 ||
      !money(line.unitPrice) ||
      !money(line.lineTotal) ||
      BigInt(line.quantity) * BigInt(line.unitPrice.amountMinor) !==
        BigInt(line.lineTotal.amountMinor)
    )
      return false;
    total += BigInt(line.lineTotal.amountMinor);
  }
  const f=v.testFinancials;
  if(f!==undefined && (!object(f) || f.scope!=='isolated-test-plan' || !money(f.subtotal) || !money(f.discount) || !money(f.shipping) || !money(f.total) || !(f.promoCode===null || text(f.promoCode,64)) || f.subtotal.amountMinor!==v.subtotal.amountMinor || f.discount.amountMinor!==v.discount.amountMinor || BigInt(f.total.amountMinor)!==BigInt(v.merchandiseTotal.amountMinor)+BigInt(f.shipping.amountMinor)))return false;
  if(v.discount.amountMinor>0 && f===undefined)return false;
  return total === BigInt(v.subtotal.amountMinor);
}
/** Opt-in future controller only. No cookie/token storage, live selector, provider action or automatic retry. */
export function createCheckoutBusinessClient(
  getCsrfToken: () => string,
  transport: typeof fetch = fetch,
  timeoutMs = 3000,
) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000)
    throw new CheckoutBusinessClientError('invalid-input');
  function pathId(value: string) {
    if (!id(value)) throw new CheckoutBusinessClientError('invalid-input');
    return value;
  }
  async function request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH',
    validate: (v: unknown) => v is T,
    body?: unknown,
  ): Promise<T> {
    const csrf = getCsrfToken();
    if (method !== 'GET' && !/^[A-Za-z0-9_-]{43}$/.test(csrf))
      throw new CheckoutBusinessClientError('invalid-input');
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const r = await transport(path, {
        method,
        headers: {
          accept: 'application/json',
          ...(method === 'GET'
            ? {}
            : { 'content-type': 'application/json', 'x-csrf-token': csrf }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        credentials: 'same-origin',
        redirect: 'error',
        cache: 'no-store',
        signal,
      });
      if (!r.ok) {
        await r.body?.cancel();
        throw new CheckoutBusinessClientError('http-error', r.status);
      }
      if (
        !r.body ||
        !r.headers
          .get('content-type')
          ?.toLowerCase()
          .startsWith('application/json')
      ) {
        await r.body?.cancel();
        throw new CheckoutBusinessClientError('invalid-response');
      }
      const reader = r.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 1048576) {
            await reader.cancel();
            throw new CheckoutBusinessClientError('invalid-response');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const all = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        all.set(chunk, offset);
        offset += chunk.length;
      }
      let result: unknown;
      try {
        result = JSON.parse(new TextDecoder().decode(all));
      } catch {
        throw new CheckoutBusinessClientError('invalid-response');
      }
      if (
        !object(result) ||
        result.ok !== true ||
        !object(result.meta) ||
        !id(result.meta.requestId) ||
        !validate(result.data)
      )
        throw new CheckoutBusinessClientError('invalid-response');
      return result.data;
    } catch (error) {
      if (error instanceof CheckoutBusinessClientError) throw error;
      throw new CheckoutBusinessClientError(
        signal.aborted ? 'timeout' : 'unavailable',
      );
    }
  }
  return {
    confirmIntegratedForTest(
      checkoutId: string,
      input: IntegratedConfirmationInput,
    ) {
      return request<IntegratedConfirmationResult>(
        `/api/v1/checkouts/${pathId(checkoutId)}/confirmation`,
        'POST',
        (v: unknown): v is IntegratedConfirmationResult =>
          object(v) &&
          object(v.order) &&
          order(v.order) &&
          typeof v.replayed === 'boolean' &&
          v.paymentAttemptId === input.paymentAttemptId &&
          v.confirmationScope === 'integration-test-only' &&
          v.orderPaid === false,
        input,
      );
    },
    start(input: StartCheckoutInput) {
      return request('/api/v1/checkouts', 'POST', checkout, input);
    },
    get(checkoutId: string) {
      return request(
        `/api/v1/checkouts/${pathId(checkoutId)}`,
        'GET',
        checkout,
      );
    },
    setDelivery(checkoutId: string, input: DeliveryStepInput) {
      return request(
        `/api/v1/checkouts/${pathId(checkoutId)}/contact-delivery`,
        'PATCH',
        checkout,
        input,
      );
    },
    setPayment(checkoutId: string, input: PaymentStepInput) {
      return request(
        `/api/v1/checkouts/${pathId(checkoutId)}/payment`,
        'PATCH',
        checkout,
        input,
      );
    },
    recordOrderForTest(checkoutId: string, input: RecordOrderInput) {
      return request(
        `/api/v1/checkouts/${pathId(checkoutId)}/orders`,
        'POST',
        (v): v is RecordedOrderResult =>
          object(v) && order(v.order) && typeof v.replayed === 'boolean',
        input,
      );
    },
    getOrder(orderId: string) {
      return request(`/api/v1/orders/${pathId(orderId)}`, 'GET', order);
    },
    listOrders(input: { limit?: number; cursor?: string } = {}) {
      const params = new URLSearchParams();
      if (input.limit !== undefined) params.set('limit', String(input.limit));
      if (input.cursor !== undefined) params.set('cursor', input.cursor);
      return request(
        `/api/v1/orders${params.size ? '?' + params : ''}`,
        'GET',
        (v): v is { items: IntegrationOrderDto[]; nextCursor: string | null } =>
          object(v) &&
          Array.isArray(v.items) &&
          v.items.length <= 100 &&
          v.items.every(order) &&
          (v.nextCursor === null ||
            (typeof v.nextCursor === 'string' &&
              /^[A-Za-z0-9_-]{1,150}$/.test(v.nextCursor))),
      );
    },
  };
}
