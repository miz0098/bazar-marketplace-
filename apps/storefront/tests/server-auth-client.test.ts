import assert from 'node:assert/strict';
import test from 'node:test';
import { createServerAuthClient } from '../lib/server-auth-client';
const token = 'a'.repeat(43),
  id = '12345678-1234-1234-1234-123456789abc';
const response = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data, meta: { requestId: id } }), {
    headers: { 'content-type': 'application/json' },
  });
test('server auth transport keeps cookies browser-managed and CSRF in memory, with explicit test-only results', async () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  const client = createServerAuthClient(async (path, init) => {
    calls.push({ path: String(path), init });
    return String(path).endsWith('/csrf')
      ? response({ csrfToken: token, mode: 'test-only' })
      : response({
          challengeId: id,
          expiresAt: '2026-10-26T12:00:00.000Z',
          resendAfterSeconds: 60,
          delivery: 'test-only',
        });
  });
  await client.bootstrap();
  await client.start({ phone: '+380671234567', intent: 'login' });
  assert.equal(calls[1].path, '/api/v1/auth/otp/challenges');
  assert.equal(calls[1].init?.credentials, 'same-origin');
  assert.equal(calls[1].init?.redirect, 'error');
  assert.equal(calls[1].init?.cache, 'no-store');
  assert.equal(new Headers(calls[1].init?.headers).get('x-csrf-token'), token);
  assert.equal(new Headers(calls[1].init?.headers).get('cookie'), null);
  assert.equal(calls[1].path.includes('380671234567'), false);
});
test('server auth transport rejects false live success, malformed envelopes and provider failures without preview fallback', async () => {
  for (const data of [
    { csrfToken: token, mode: 'live' },
    { csrfToken: 'weak', mode: 'test-only' },
    null,
  ])
    await assert.rejects(
      createServerAuthClient(async () => response(data)).bootstrap(),
      { code: 'invalid-response' },
    );
  let count = 0;
  const client = createServerAuthClient(async () => {
    count++;
    return new Response('provider-secret', { status: 503 });
  });
  await assert.rejects(
    client.bootstrap(),
    (error) =>
      error instanceof Error && !error.message.includes('provider-secret'),
  );
  assert.equal(count, 1);
});
