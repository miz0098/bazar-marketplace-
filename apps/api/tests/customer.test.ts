import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  addressInput,
  profileInput,
  reviewBody,
} from '../src/customer/input.js';
import { isCustomerView } from '../src/contracts/customer.js';
test('customer inputs reject PII/contact overrides, invalid address refs and unconstrained review bodies', () => {
  const profile = {
    expectedVersion: 1,
    firstName: 'Тестовий',
    lastName: 'Приклад',
  };
  assert.equal(profileInput(profile).expectedVersion, 1);
  for (const field of ['phone', 'email', 'userId', 'birthday'])
    assert.throws(() => profileInput({ ...profile, [field]: 'private' }), {
      status: 400,
    });
  const address = {
    carrier: 'ukrposhta',
    cityRef: '286-29713',
    locationRef: '2700',
    isDefault: false,
  };
  assert.equal(addressInput(address).carrier, 'ukrposhta');
  for (const patch of [
    { carrier: 'bazar-pickup' },
    { cityRef: '  ' },
    { isDefault: 'true' },
    { recipientName: 'Private' },
    { locationRef: 'street address' },
  ])
    assert.throws(() => addressInput({ ...address, ...patch }), {
      status: 400,
    });
  for (const r of [
    { rating: 0, body: 'x' },
    { rating: 6, body: 'x' },
    { rating: 2.5, body: 'x' },
    { rating: 5, body: ' ' },
    { rating: 5, body: 'x'.repeat(2001) },
  ])
    assert.throws(() => reviewBody(r), { status: 400 });
  assert.equal(
    isCustomerView({
      mode: 'production',
      resource: 'reviews',
      publication: 'not-asserted',
      items: [],
    }),
    false,
  );
});
test('ordinary processes cannot construct the isolated customer service', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      "import assert from 'node:assert/strict';import {createCustomerService} from './src/customer/service.ts';assert.throws(()=>createCustomerService({}),/isolated test/);",
    ],
    {
      env: { PATH: process.env.PATH, NODE_ENV: 'production' },
      encoding: 'utf8',
      timeout: 5000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
});
