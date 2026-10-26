import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { paymentFixture } from './helpers/payments.js';
test('isolated webhook protocol authenticates raw bytes, timestamp and private key before parsing', async () => {
  const a = paymentFixture(),
    signed = a.signed({ status: 'pending' });
  await assert.rejects(
    a.adapter.verifyWebhook(
      signed.raw,
      signed.signature + '0',
      new AbortController().signal,
    ),
  );
  await assert.rejects(
    a.adapter.verifyWebhook(
      Buffer.from('{}'),
      signed.signature,
      new AbortController().signal,
    ),
  );
  const old = a.signed({}, Date.now() - 600000);
  await assert.rejects(
    a.adapter.verifyWebhook(
      old.raw,
      old.signature,
      new AbortController().signal,
    ),
  );
  const other = paymentFixture();
  await assert.rejects(
    other.adapter.verifyWebhook(
      signed.raw,
      signed.signature,
      new AbortController().signal,
    ),
  );
});
test('production cannot construct payment protocol test adapter', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      "import assert from 'node:assert/strict';import {createPaymentService} from './src/payments/service.ts';assert.throws(()=>createPaymentService({},{scope:'isolated-test'},{}),/isolated test adapter/);",
    ],
    {
      env: { PATH: process.env.PATH, NODE_ENV: 'production' },
      encoding: 'utf8',
      timeout: 5000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
});
