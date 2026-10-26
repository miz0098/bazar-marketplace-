/** Opt-in same-origin transport boundary. Never selected by the Phase D preview service. */
export interface ServerAuthUser {
  id: string;
  firstName: string;
  lastName: string;
  maskedPhone: string;
}
export interface ServerAuthSession {
  user: ServerAuthUser;
  expiresAt: string;
  csrfToken: string;
  mode: 'test-only';
}
export interface ServerAuthChallenge {
  challengeId: string;
  expiresAt: string;
  resendAfterSeconds: number;
  delivery: 'test-only';
}
export class ServerAuthClientError extends Error {
  constructor(
    readonly code:
      | 'http-error'
      | 'invalid-response'
      | 'unavailable'
      | 'timeout',
    readonly status?: number,
  ) {
    super('Не вдалося виконати серверний запит авторизації.');
    this.name = 'ServerAuthClientError';
  }
}
function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function id(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)
  );
}
function token(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);
}
function date(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) &&
    Number.isFinite(Date.parse(v))
  );
}
function user(v: unknown): v is ServerAuthUser {
  return (
    record(v) &&
    id(v.id) &&
    ['firstName', 'lastName', 'maskedPhone'].every(
      (k) =>
        typeof v[k] === 'string' &&
        (v[k] as string).length > 0 &&
        (v[k] as string).length <= 100,
    )
  );
}
function session(v: unknown): v is ServerAuthSession {
  return (
    record(v) &&
    user(v.user) &&
    date(v.expiresAt) &&
    token(v.csrfToken) &&
    v.mode === 'test-only'
  );
}
function challenge(v: unknown): v is ServerAuthChallenge {
  return (
    record(v) &&
    id(v.challengeId) &&
    date(v.expiresAt) &&
    typeof v.resendAfterSeconds === 'number' &&
    Number.isSafeInteger(v.resendAfterSeconds) &&
    v.resendAfterSeconds > 0 &&
    v.delivery === 'test-only'
  );
}
export function createServerAuthClient(
  transport: typeof fetch = fetch,
  timeoutMs = 3000,
) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000)
    throw new ServerAuthClientError('invalid-response');
  let csrfToken = '';
  async function request<T>(
    path: string,
    validate: (v: unknown) => v is T,
    body?: unknown,
  ): Promise<T> {
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await transport(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          accept: 'application/json',
          ...(body === undefined
            ? {}
            : {
                'content-type': 'application/json',
                'x-csrf-token': csrfToken,
              }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ServerAuthClientError('http-error', response.status);
      }
      if (
        !response.headers
          .get('content-type')
          ?.toLowerCase()
          .startsWith('application/json') ||
        !response.body
      ) {
        await response.body?.cancel();
        throw new ServerAuthClientError('invalid-response');
      }
      const reader = response.body.getReader();
      let bytes = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 65536) {
            await reader.cancel();
            throw new ServerAuthClientError('invalid-response');
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
        throw new ServerAuthClientError('invalid-response');
      }
      if (
        !record(result) ||
        result.ok !== true ||
        !record(result.meta) ||
        !id(result.meta.requestId) ||
        !validate(result.data)
      )
        throw new ServerAuthClientError('invalid-response');
      return result.data;
    } catch (error) {
      if (error instanceof ServerAuthClientError) throw error;
      throw new ServerAuthClientError(
        signal.aborted ? 'timeout' : 'unavailable',
      );
    }
  }
  return {
    async bootstrap() {
      const data = await request(
        '/api/v1/auth/csrf',
        (v): v is { csrfToken: string; mode: 'test-only' } =>
          record(v) && token(v.csrfToken) && v.mode === 'test-only',
      );
      csrfToken = data.csrfToken;
      return data;
    },
    start(input: { phone: string; intent: 'login' | 'register' }) {
      return request('/api/v1/auth/otp/challenges', challenge, input);
    },
    async verify(input: {
      challengeId: string;
      code: string;
      profile?: { firstName: string; lastName: string; consent: true };
    }) {
      const data = await request('/api/v1/auth/otp/verify', session, input);
      csrfToken = data.csrfToken;
      return data;
    },
    async getSession() {
      const data = await request('/api/v1/auth/session', session);
      csrfToken = data.csrfToken;
      return data;
    },
    getCurrentUser() {
      return request('/api/v1/users/me', user);
    },
    async logout(all = false) {
      const data = await request(
        all ? '/api/v1/auth/logout-all' : '/api/v1/auth/logout',
        (v): v is { status: 'revoked' } => record(v) && v.status === 'revoked',
        {},
      );
      csrfToken = '';
      return data;
    },
  };
}
