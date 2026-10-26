import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  ukrposhtaCityUrl,
  ukrposhtaOfficeUrl,
  createUkrposhtaTestAdapter,
} from '../src/shipping/ukrposhta.js';
test('Ukrposhta official directory paths encode searches and fail closed on unknown availability and malformed entries', async (t) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
  const url = new URL(ukrposhtaCityUrl('Київ&apiKey=forbidden'));
  assert.equal(url.searchParams.size, 1);
  assert.equal(url.searchParams.get('city_ua'), 'Київ&apiKey=forbidden');
  assert.equal(
    new URL(ukrposhtaOfficeUrl('286', '29713')).searchParams.get('region_id'),
    '286',
  );
  assert.throws(() => ukrposhtaOfficeUrl('286?token=secret', '29713'));
  const adapter = createUkrposhtaTestAdapter({
    scope: 'isolated-test',
    async directory() {
      return {
        Entries: {
          Entry: [
            {
              ID: '1',
              REGION_ID: '286',
              CITY_ID: '29713',
              PO_LONG: 'Synthetic office',
              LOCK_CODE: '0',
            },
          ],
        },
      };
    },
    async resolveCity() {
      return { REGION_ID: '286', CITY_ID: '29713', CITY_UA: 'Synthetic city' };
    },
    async estimateForTest() {
      return { amountMinor: 1, currency: 'UAH', revision: 'test' };
    },
  });
  assert.equal(
    (
      await adapter.points('286-29713', 'branch', new AbortController().signal)
    )[0].available,
    false,
  );
  await assert.rejects(
    adapter.point('another-city', '1', 'branch', new AbortController().signal),
  );
});
test('Ukrposhta test adapter cannot be constructed in production', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      "import assert from 'node:assert/strict';import {createUkrposhtaTestAdapter} from './src/shipping/ukrposhta.ts';assert.throws(()=>createUkrposhtaTestAdapter({}),/isolated tests/);",
    ],
    {
      env: { PATH: process.env.PATH, NODE_ENV: 'production' },
      encoding: 'utf8',
      timeout: 5000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
});
