export interface ApiClientConfig { readonly baseUrl: string; readonly timeoutMs: number }

/** Called by the server-only factory; the current mock provider does not call this. */
export function readApiClientConfig(env: Readonly<Record<string, string | undefined>>): ApiClientConfig {
  const baseUrl = env.BAZAR_API_BASE_URL ?? 'http://127.0.0.1:4000';
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new Error('Invalid BAZAR_API_BASE_URL'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (baseUrl !== url.origin || !['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && (!local || env.NODE_ENV === 'production'))) throw new Error('Invalid BAZAR_API_BASE_URL');
  const timeout = env.BAZAR_API_TIMEOUT_MS ?? '3000';
  if (!/^\d+$/.test(timeout) || Number(timeout) < 100 || Number(timeout) > 30000) throw new Error('Invalid BAZAR_API_TIMEOUT_MS');
  return { baseUrl, timeoutMs: Number(timeout) };
}
