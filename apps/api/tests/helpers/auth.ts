import { randomBytes } from 'node:crypto';
import type { AuthConfig } from '../../src/auth/config.js';
import type { SmsAdapter } from '../../src/auth/sms.js';
/** Synthetic policy and ephemeral keys. Never imported by src/ or the production entry point. */
export function authFixture(overrides: Partial<AuthConfig['policy']> = {}) {
  const config: AuthConfig = {
    environment: 'test',
    publicOrigin: 'https://auth.bazar.test',
    phoneKey: randomBytes(32),
    otpKey: randomBytes(32),
    csrfKey: randomBytes(32),
    policy: {
      otpTtlSeconds: 300,
      otpAttempts: 5,
      resendSeconds: 60,
      sessionTtlSeconds: 3600,
      flowTtlSeconds: 3600,
      rateWindowSeconds: 3600,
      challengeClientLimit: 50,
      challengePhoneLimit: 5,
      challengeGlobalLimit: 100,
      verifyClientLimit: 100,
      verifyGlobalLimit: 1000,
      smsTimeoutMs: 100,
      ...overrides,
    },
  };
  const sent = new Map<string, { phone: string; code: string }>();
  let fail = false,
    stall = false;
  const sms: SmsAdapter = {
    kind: 'isolated-test',
    async send(input) {
      if (fail) throw new Error('provider-secret-should-not-leak');
      if (stall)
        await new Promise<void>((_, reject) =>
          input.signal.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          ),
        );
      sent.set(input.challengeId, { phone: input.phone, code: input.code });
      return { status: 'test-only' };
    },
  };
  return {
    config,
    sms,
    sent,
    setFailure(value: boolean) {
      fail = value;
    },
    setStall(value: boolean) {
      stall = value;
    },
  };
}
