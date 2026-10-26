import assert from 'node:assert/strict';
import test from 'node:test';
import { readApiClientConfig } from '../lib/api-config';
import { ApiClientError, createFoundationClient } from '../lib/api-client';

const config = readApiClientConfig({});
const envelope = (data: unknown) => ({ ok: true, data, meta: { requestId: 'abcdefab-abcd-abcd-abcd-abcdefabcdef' } });
const health = { status: 'ok', scope: 'process', uptimeSeconds: 12 };
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

test('future client configuration restricts origins and timeouts without leaking rejected values', () => {
  assert.equal(config.baseUrl, 'http://127.0.0.1:4000');
  assert.equal(readApiClientConfig({ NODE_ENV: 'production', BAZAR_API_BASE_URL: 'https://api.bazar.ua' }).timeoutMs, 3000);
  for (const env of [
    { NODE_ENV: 'production' }, { BAZAR_API_BASE_URL: 'http://remote.invalid' },
    { BAZAR_API_BASE_URL: 'https://secret:password@api.bazar.ua' }, { BAZAR_API_BASE_URL: 'https://api.bazar.ua/path' },
    { BAZAR_API_BASE_URL: 'https://api.bazar.ua?token=secret' }, { BAZAR_API_TIMEOUT_MS: '0' },
    { BAZAR_API_TIMEOUT_MS: '30001' }, { BAZAR_API_TIMEOUT_MS: '1secret' },
  ]) assert.throws(() => readApiClientConfig(env), (error: unknown) => error instanceof Error && /^Invalid BAZAR_API_/.test(error.message) && !error.message.includes('secret'));
});

test('foundation client validates health and version responses and never sends credentials or retries', async () => {
  const calls: RequestInit[] = [];
  const transport: typeof fetch = async (url, init) => {
    calls.push(init!);
    return json(envelope(String(url).endsWith('/health') ? health : { service: 'bazar-api', apiVersion: 'v1', businessModulesAvailable: false }));
  };
  const client = createFoundationClient(config, transport);
  assert.deepEqual(await client.getHealth(), health);
  assert.equal((await client.getVersion()).businessModulesAvailable, false);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.method, 'GET'); assert.equal(call.credentials, 'omit');
    assert.equal(call.redirect, 'error'); assert.equal(call.cache, 'no-store');
    assert.deepEqual(call.headers, { accept: 'application/json' });
  }
});

test('client rejects malformed, wrong-shape, oversized and falsely live responses', async () => {
  for (const response of [
    new Response('private-upstream-details', { headers: { 'content-type': 'application/json' } }),
    new Response('private-upstream-details', { headers: { 'content-type': 'text/plain' } }),
    json({ ok: true, data: health }), json(envelope({ ...health, uptimeSeconds: -1 })),
    json(envelope({ ...health, uptimeSeconds: 1.5 })),
    json(envelope({ padding: 'x'.repeat(70000) })),
  ]) {
    const client = createFoundationClient(config, async () => response);
    await assert.rejects(client.getHealth(), (error: unknown) => error instanceof ApiClientError && error.code === 'invalid-response' && !error.message.includes('private-upstream-details'));
  }
  const live = createFoundationClient(config, async () => json(envelope({ service: 'bazar-api', apiVersion: 'v1', businessModulesAvailable: true })));
  await assert.rejects(live.getVersion(), { code: 'invalid-response' });
});

test('HTTP and network failures are sanitized and preserve no upstream message', async () => {
  const unavailable = createFoundationClient(config, async () => new Response('password=private', { status: 503 }));
  await assert.rejects(unavailable.getHealth(), (error: unknown) => error instanceof ApiClientError && error.code === 'http-error' && error.status === 503 && !error.message.includes('private'));
  const network = createFoundationClient(config, async () => { throw new Error('token=private'); });
  await assert.rejects(network.getHealth(), (error: unknown) => error instanceof ApiClientError && error.code === 'unavailable' && !error.message.includes('private'));
});

test('foundation requests abort with a bounded timeout', async () => {
  const client = createFoundationClient({ ...config, timeoutMs: 100 }, async (_url, init) => new Promise((_resolve, reject) => {
    const guard = setTimeout(() => reject(new Error('Abort was not signalled')), 1500);
    init!.signal!.addEventListener('abort', () => { clearTimeout(guard); reject(new Error('aborted')); }, { once: true });
  }));
  await assert.rejects(client.getHealth(), { code: 'timeout' });
});
