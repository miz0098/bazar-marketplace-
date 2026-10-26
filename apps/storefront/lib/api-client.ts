import type { ApiClientConfig } from './api-config';

export type FoundationHealth = Readonly<{ status: 'ok'; scope: 'process'; uptimeSeconds: number }>;
export type FoundationVersion = Readonly<{ service: 'bazar-api'; apiVersion: 'v1'; businessModulesAvailable: false }>;
export class ApiClientError extends Error {
  constructor(readonly code: 'timeout' | 'unavailable' | 'invalid-response' | 'http-error', readonly status?: number) {
    super('The API foundation request could not be completed.');
    this.name = 'ApiClientError';
  }
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function isHealth(value: unknown): value is FoundationHealth {
  return record(value) && value.status === 'ok' && value.scope === 'process' && typeof value.uptimeSeconds === 'number' && Number.isSafeInteger(value.uptimeSeconds) && value.uptimeSeconds >= 0;
}
function isVersion(value: unknown): value is FoundationVersion {
  return record(value) && value.service === 'bazar-api' && value.apiVersion === 'v1' && value.businessModulesAvailable === false;
}

/** Health/discovery only. No business mutation, credentials, cookies, redirects or automatic retry. */
export function createFoundationClient(config: ApiClientConfig, transport: typeof fetch = fetch) {
  async function get<T>(path: '/health' | '/api/v1', validate: (data: unknown) => data is T): Promise<T> {
    const signal = AbortSignal.timeout(config.timeoutMs);
    try {
      const response = await transport(`${config.baseUrl}${path}`, { method: 'GET', headers: { accept: 'application/json' }, credentials: 'omit', cache: 'no-store', redirect: 'error', signal });
      if (!response.ok) { await response.body?.cancel(); throw new ApiClientError('http-error', response.status); }
      if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json') || !response.body) {
        await response.body?.cancel();
        throw new ApiClientError('invalid-response');
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 65536) { await reader.cancel(); throw new ApiClientError('invalid-response'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const all = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
      let body: unknown;
      try { body = JSON.parse(new TextDecoder().decode(all)); } catch { throw new ApiClientError('invalid-response'); }
      if (!record(body) || body.ok !== true || !record(body.meta) || typeof body.meta.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.meta.requestId) || !validate(body.data)) throw new ApiClientError('invalid-response');
      return body.data;
    } catch (reason) {
      if (reason instanceof ApiClientError) throw reason;
      throw new ApiClientError(signal.aborted ? 'timeout' : 'unavailable');
    }
  }
  return { getHealth: () => get('/health', isHealth), getVersion: () => get('/api/v1', isVersion) };
}
