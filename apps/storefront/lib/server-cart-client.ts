import {
  isServerCartView,
  type ServerCartView,
  type ServerCartMutationInput,
} from '../services/contracts/server-cart';
export class ServerCartClientError extends Error {
  constructor(
    readonly code:
      | 'invalid-input'
      | 'invalid-response'
      | 'http-error'
      | 'timeout'
      | 'unavailable',
    readonly status?: number,
  ) {
    super('Не вдалося оновити серверний кошик.');
    this.name = 'ServerCartClientError';
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function createServerCartClient(
  getCsrf: () => string,
  transport: typeof fetch = fetch,
  timeoutMs = 5000,
) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new ServerCartClientError('invalid-input');
  function path(variantId: string) {
    if (!id(variantId)) throw new ServerCartClientError('invalid-input');
    return '/api/v1/cart/lines/' + variantId;
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
        throw new ServerCartClientError('invalid-input');
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
        throw new ServerCartClientError('http-error', response.status);
      }
      if (
        !response.body ||
        !response.headers
          .get('content-type')
          ?.toLowerCase()
          .startsWith('application/json')
      ) {
        await response.body?.cancel();
        throw new ServerCartClientError('invalid-response');
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
            throw new ServerCartClientError('invalid-response');
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
        throw new ServerCartClientError('invalid-response');
      }
      if (
        !object(value) ||
        value.ok !== true ||
        !object(value.meta) ||
        !id(value.meta.requestId) ||
        !validate(value.data)
      )
        throw new ServerCartClientError('invalid-response');
      return value.data as T;
    } catch (error) {
      if (error instanceof ServerCartClientError) throw error;
      throw new ServerCartClientError(
        signal.aborted ? 'timeout' : 'unavailable',
      );
    }
  }
  function mutate(
    url: string,
    method: string,
    input: Omit<ServerCartMutationInput, 'variantId'>,
    variantId: string,
  ) {
    return request<{ view: ServerCartView; replayed: boolean }>(
      url,
      method,
      input,
      (v) =>
        object(v) &&
        isServerCartView(v.view) &&
        typeof v.replayed === 'boolean' &&
        v.view.freshness === (v.replayed ? 'historical-replay' : 'current') &&
        v.view.cart.version === input.expectedVersion + 1 &&
        (method !== 'DELETE' ||
          !v.view.cart.lines.some((l) => l.variantId === variantId)),
    );
  }
  return {
    get: () =>
      request<ServerCartView>(
        '/api/v1/cart',
        'GET',
        undefined,
        (v) => isServerCartView(v) && v.freshness === 'current',
      ),
    ensureCurrent: () =>
      request<ServerCartView>(
        '/api/v1/cart',
        'POST',
        {},
        (v) => isServerCartView(v) && v.freshness === 'current',
      ),
    add: (input: ServerCartMutationInput & { quantity: number }) =>
      mutate('/api/v1/cart/lines', 'POST', input, input.variantId),
    set: (
      variantId: string,
      input: Omit<ServerCartMutationInput, 'variantId'> & { quantity: number },
    ) => mutate(path(variantId), 'PATCH', input, variantId),
    remove: (
      variantId: string,
      input: Omit<ServerCartMutationInput, 'variantId' | 'quantity'>,
    ) => mutate(path(variantId), 'DELETE', input, variantId),
  };
}
