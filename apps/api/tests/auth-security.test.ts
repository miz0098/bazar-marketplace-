import assert from 'node:assert/strict';
import test from 'node:test';
import { authFixture } from './helpers/auth.js';
import {
  csrf,
  digest,
  equal,
  keyed,
  makeFlow,
  otp,
  phone,
  requireCsrf,
  validFlow,
} from '../src/auth/crypto.js';
import { validateAuthConfig } from '../src/auth/config.js';
import { readConfig } from '../src/config.js';

test('OTP generation, scoped HMACs and constant-time comparisons do not use fixed preview codes', () => {
  const key = authFixture().config.phoneKey;
  const values = new Set(Array.from({ length: 100 }, () => otp()));
  assert.ok(values.size > 90);
  for (const value of values) assert.match(value, /^\d{6}$/);
  assert.equal(equal(digest('a'), digest('a')), true);
  assert.equal(equal(digest('a'), digest('b')), false);
  assert.notDeepEqual(keyed(key, 'phone', 'x'), keyed(key, 'otp', 'x'));
  assert.equal(phone('+380671234567'), '+380671234567');
  for (const value of ['0671234567', '+380121234567', '+15555555555', '+380671234567\0'])
    assert.throws(() => phone(value));
});
test('signed flow CSRF rejects tampering, expiry, missing tokens and tokens from another flow', () => {
  const { config } = authFixture();
  const now = Date.now();
  const flow = makeFlow(config, now),
    token = csrf(config, flow);
  assert.equal(validFlow(config, flow, now), true);
  assert.equal(validFlow(config, flow, now + 3601000), false);
  assert.doesNotThrow(() => requireCsrf(config, flow, token));
  for (const [f, t] of [
    [flow, undefined],
    [flow, csrf(config, makeFlow(config))],
    [flow + 'x', token],
  ] as [string, unknown][])
    assert.throws(() => requireCsrf(config, f, t), { status: 403 });
});
test('production and ordinary runtime cannot activate the isolated test authentication adapter', () => {
  assert.throws(() =>
    validateAuthConfig({
      ...authFixture().config,
      environment: 'production',
    } as never),
  );
  for (const mode of ['test', 'enabled', 'live'])
    assert.throws(
      () =>
        readConfig({
          NODE_ENV: 'production',
          CORS_ORIGINS: '',
          AUTH_MODE: mode,
        }),
      /AUTH_MODE/,
    );
  assert.equal(
    readConfig({
      NODE_ENV: 'production',
      CORS_ORIGINS: '',
      AUTH_MODE: 'disabled',
    }).environment,
    'production',
  );
});
