import {isAccountView,isPublicFeedback,type AccountView,type PublicFeedback} from '../services/contracts/customer-account';
import {
  isCustomerView,
  type CustomerView,
  type CustomerProfileInput,
  type CustomerAddressInput,
  type CustomerReviewInput,
} from '../services/contracts/customer-business';
type View<R> = Extract<CustomerView, { resource: R }>;
export class CustomerClientError extends Error {
  constructor(
    readonly code:
      | 'invalid-input'
      | 'invalid-response'
      | 'http-error'
      | 'timeout'
      | 'unavailable',
    readonly status?: number,
  ) {
    super('Сервіс особистого кабінету недоступний.');
    this.name = 'CustomerClientError';
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function createCustomerBusinessClient(
  getCsrf: () => string,
  transport: typeof fetch = fetch,
  timeoutMs = 5000,
) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new CustomerClientError('invalid-input');
  function path(variantId: string) {
    if (!id(variantId)) throw new CustomerClientError('invalid-input');
    return variantId.toLowerCase();
  }
  async function request<T>(
    url: string,
    method: string,
    body: unknown,
    validate: (v: unknown) => boolean,
  ): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (method !== 'GET') {
      const token = getCsrf();
      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        throw new CustomerClientError('invalid-input');
      headers['content-type'] = 'application/json';
      headers['x-csrf-token'] = token;
    }
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await transport(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new CustomerClientError('http-error', response.status);
      }
      if (
        !response.body ||
        !response.headers
          .get('content-type')
          ?.toLowerCase()
          .startsWith('application/json')
      ) {
        await response.body?.cancel();
        throw new CustomerClientError('invalid-response');
      }
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 1048576) {
            await reader.cancel();
            throw new CustomerClientError('invalid-response');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      let value: unknown;
      try {
        value = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(bytes),
        );
      } catch {
        throw new CustomerClientError('invalid-response');
      }
      if (
        !object(value) ||
        value.ok !== true ||
        !object(value.meta) ||
        !id(value.meta.requestId) ||
        !validate(value.data)
      )
        throw new CustomerClientError('invalid-response');
      return value.data as T;
    } catch (error) {
      if (error instanceof CustomerClientError) throw error;
      throw new CustomerClientError(signal.aborted ? 'timeout' : 'unavailable');
    }
  }
  function call<R extends CustomerView['resource']>(
    url: string,
    method: string,
    body: unknown,
    resource: R,
    check?: (view: View<R>) => boolean,
  ) {
    return request<View<R>>(
      url,
      method,
      body,
      (v) =>
        isCustomerView(v) &&
        v.resource === resource &&
        (!check || check(v as View<R>)),
    );
  }
  const normalized = (s: string) => s.trim().normalize('NFC');
  return {
    answerQuestion:(id:string,expectedVersion:number,body:string)=>request<{mode:'integration-test';accepted:true}>('/api/v1/customer/account/questions/'+path(id)+'/answer','POST',{expectedVersion,body},v=>object(v)&&Object.keys(v).sort().join(',')==='accepted,mode'&&v.mode==='integration-test'&&v.accepted===true),
    account:()=>request<AccountView>('/api/v1/customer/account','GET',undefined,isAccountView),
    accountCommand:(action:string,input:Record<string,unknown>)=>request<AccountView>('/api/v1/customer/account','POST',{action,input},isAccountView),
    feedback:(offerId:string)=>request<PublicFeedback>('/api/v1/customer/account/published/'+path(offerId),'GET',undefined,v=>isPublicFeedback(v)&&v.offerId===offerId),
    getProfile: () =>
      call('/api/v1/customer/profile', 'GET', undefined, 'profile'),
    updateProfile: (input: CustomerProfileInput) =>
      call(
        '/api/v1/customer/profile',
        'PATCH',
        input,
        'profile',
        (v) =>
          v.profile.version === input.expectedVersion + 1 &&
          v.profile.firstName === normalized(input.firstName) &&
          v.profile.lastName === normalized(input.lastName),
      ),
    getWishlist: () => call('/api/v1/wishlist', 'GET', undefined, 'wishlist'),
    addWishlist: (id: string) =>
      call('/api/v1/wishlist/items/' + path(id), 'PUT', {}, 'wishlist', (v) =>
        v.items.some((i) => i.productId === id.toLowerCase()),
      ),
    removeWishlist: (id: string) =>
      call(
        '/api/v1/wishlist/items/' + path(id),
        'DELETE',
        {},
        'wishlist',
        (v) => !v.items.some((i) => i.productId === id.toLowerCase()),
      ),
    getAddresses: () =>
      call('/api/v1/customer/addresses', 'GET', undefined, 'addresses'),
    createAddress: (input: CustomerAddressInput) =>
      call('/api/v1/customer/addresses', 'POST', input, 'addresses', (v) =>
        v.items.some(
          (i) =>
            i.carrier === input.carrier &&
            i.cityRef === normalized(input.cityRef) &&
            i.locationRef === normalized(input.locationRef) &&
            i.isDefault === input.isDefault,
        ),
      ),
    updateAddress: (
      id: string,
      input: CustomerAddressInput & { expectedVersion: number },
    ) =>
      call(
        '/api/v1/customer/addresses/' + path(id),
        'PATCH',
        input,
        'addresses',
        (v) =>
          v.items.some(
            (i) =>
              i.id === id.toLowerCase() &&
              i.version === input.expectedVersion + 1,
          ),
      ),
    removeAddress: (id: string, expectedVersion: number) =>
      call(
        '/api/v1/customer/addresses/' + path(id),
        'DELETE',
        { expectedVersion },
        'addresses',
        (v) => !v.items.some((i) => i.id === id.toLowerCase()),
      ),
    setDefaultAddress: (id: string, expectedVersion: number) =>
      call(
        '/api/v1/customer/addresses/' + path(id) + '/default',
        'PUT',
        { expectedVersion },
        'addresses',
        (v) =>
          v.items.some(
            (i) =>
              i.id === id.toLowerCase() &&
              i.isDefault &&
              i.version === expectedVersion + 1,
          ),
      ),
    getReviews: () =>
      call('/api/v1/customer/reviews', 'GET', undefined, 'reviews'),
    createReview: (input: CustomerReviewInput) =>
      call('/api/v1/customer/reviews', 'POST', input, 'reviews', (v) =>
        v.items.some(
          (i) =>
            i.orderLineId === input.orderLineId.toLowerCase() &&
            i.rating === input.rating &&
            i.body === normalized(input.body),
        ),
      ),
    updateReview: (
      id: string,
      input: Omit<CustomerReviewInput, 'orderLineId'>,
    ) =>
      call(
        '/api/v1/customer/reviews/' + path(id),
        'PATCH',
        input,
        'reviews',
        (v) =>
          v.items.some(
            (i) =>
              i.id === id.toLowerCase() &&
              i.rating === input.rating &&
              i.body === normalized(input.body),
          ),
      ),
    removeReview: (id: string) =>
      call(
        '/api/v1/customer/reviews/' + path(id),
        'DELETE',
        {},
        'reviews',
        (v) => !v.items.some((i) => i.id === id.toLowerCase()),
      ),
  };
}
