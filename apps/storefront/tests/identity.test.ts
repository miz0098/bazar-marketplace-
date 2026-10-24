import assert from 'node:assert/strict';
import test from 'node:test';
import {
  distributeOtpDigits,
  extractNationalDigits,
  formatNationalPhone,
  maskUkrainianPhone,
  normalizeOtpDigits,
  normalizeUkrainianPhone,
  validateRegistrationProfile,
} from '../domain/identity/identity';
import { IdentityServiceError, type IdentityServiceErrorCode } from '../services/contracts/identity';
import { createDemoIdentityService } from '../services/mock/identity-service';

test('normalizes, formats and masks valid Ukrainian phone values', () => {
  assert.equal(extractNationalDigits('067 123 45 67'), '671234567');
  assert.equal(extractNationalDigits('+380 (67) 123-45-67'), '671234567');
  assert.equal(formatNationalPhone('671234567'), '67 123 45 67');
  assert.equal(normalizeUkrainianPhone('380671234567'), '+380671234567');
  assert.equal(normalizeUkrainianPhone('067 123 45 67'), '+380671234567');
  assert.equal(maskUkrainianPhone('+380671234567'), '+380 67 *** ** 67');
});

test('rejects malformed, foreign, incomplete and overlong phone values', () => {
  assert.equal(extractNationalDigits('067 hello 123'), null);
  assert.equal(extractNationalDigits('06712345678'), null);
  assert.equal(extractNationalDigits('67+1234567'), null);
  assert.equal(normalizeUkrainianPhone('+48123456789'), null);
  assert.equal(normalizeUkrainianPhone('067123456'), null);
  assert.equal(normalizeUkrainianPhone('+380201234567'), null);
  assert.equal(normalizeUkrainianPhone('0000000000'), null);
  assert.equal(formatNationalPhone('06712345678'), '');
});

test('normalizes and distributes OTP digits for typing and paste', () => {
  assert.equal(normalizeOtpDigits('12 3a45-67'), '123456');
  assert.deepEqual(distributeOtpDigits('123456'), ['1', '2', '3', '4', '5', '6']);
  assert.deepEqual(distributeOtpDigits('987', 2, ['1', '2']), ['1', '2', '9', '8', '7', '']);
});

test('validates the approved registration profile and consent fields', () => {
  assert.deepEqual(
    validateRegistrationProfile({ firstName: 'Олена', lastName: 'Коваль', email: 'olena@example.com', termsAccepted: true }),
    {},
  );
  assert.deepEqual(
    validateRegistrationProfile({ firstName: '', lastName: '', email: 'invalid@', termsAccepted: false }),
    {
      firstName: 'Вкажіть імʼя.',
      lastName: 'Вкажіть прізвище.',
      email: 'Введіть коректну електронну пошту.',
      termsAccepted: 'Підтвердьте участь у демо-перегляді.',
    },
  );
});

test('demo challenges expose only a masked phone and never create a session', async () => {
  const service = createDemoIdentityService();
  const challenge = await service.startChallenge({ phone: '067 123 45 67', intent: 'login' });

  assert.equal(challenge.maskedPhone, '+380 67 *** ** 67');
  assert.equal(challenge.resendAfterSeconds, 120);
  assert.equal(challenge.expiresInSeconds, 300);
  assert.equal(challenge.delivery, 'preview-only');
  assert.equal(challenge.id.includes('0671234567'), false);
  assert.deepEqual(await service.verifyChallenge({ challengeId: challenge.id, code: '123456' }), {
    status: 'preview-only',
    next: 'complete',
  });
  assert.deepEqual(await service.getSession(), { status: 'anonymous' });
});

test('demo registration advances to profile but remains preview-only', async () => {
  const service = createDemoIdentityService();
  const challenge = await service.startChallenge({ phone: '+380501234567', intent: 'register' });

  assert.deepEqual(await service.verifyChallenge({ challengeId: challenge.id, code: '123456' }), {
    status: 'preview-only',
    next: 'profile',
  });
  assert.deepEqual(
    await service.previewRegistration({
      challengeId: challenge.id,
      profile: { firstName: 'Іван', lastName: 'Петренко', email: '', termsAccepted: true },
    }),
    { status: 'preview-only' },
  );
  assert.deepEqual(await service.getSession(), { status: 'anonymous' });
});

test('demo adapter returns deterministic typed verification errors', async () => {
  const cases: ReadonlyArray<{
    code: string;
    expected: IdentityServiceErrorCode;
    retryAfterSeconds?: number;
  }> = [
    { code: '111111', expected: 'invalid-code' },
    { code: '654321', expected: 'expired-code' },
    { code: '999999', expected: 'rate-limited', retryAfterSeconds: 60 },
    { code: '000000', expected: 'network' },
  ];

  for (const scenario of cases) {
    const service = createDemoIdentityService();
    const challenge = await service.startChallenge({ phone: '+380931234567', intent: 'login' });

    await assert.rejects(
      service.verifyChallenge({ challengeId: challenge.id, code: scenario.code }),
      (error: unknown) => {
        assert.ok(error instanceof IdentityServiceError);
        assert.equal(error.code, scenario.expected);
        assert.equal(error.retryAfterSeconds, scenario.retryAfterSeconds);
        return true;
      },
    );
  }
});

test('rate-limited preview challenge cannot immediately bypass the claimed wait', async () => {
  const service = createDemoIdentityService();
  const challenge = await service.startChallenge({ phone: '+380931234567', intent: 'login' });

  await assert.rejects(
    service.verifyChallenge({ challengeId: challenge.id, code: '999999' }),
    (error: unknown) => error instanceof IdentityServiceError && error.code === 'rate-limited',
  );
  await assert.rejects(
    service.verifyChallenge({ challengeId: challenge.id, code: '123456' }),
    (error: unknown) => (
      error instanceof IdentityServiceError
      && error.code === 'rate-limited'
      && (error.retryAfterSeconds ?? 0) > 0
    ),
  );
  assert.deepEqual(await service.getSession(), { status: 'anonymous' });
});

test('resend replaces the preview challenge without exposing or persisting credentials', async () => {
  const service = createDemoIdentityService();
  const initial = await service.startChallenge({ phone: '+380671234567', intent: 'login' });
  const resent = await service.resendChallenge({ challengeId: initial.id });

  assert.notEqual(resent.id, initial.id);
  assert.equal(resent.maskedPhone, initial.maskedPhone);
  await assert.rejects(
    service.verifyChallenge({ challengeId: initial.id, code: '123456' }),
    (error: unknown) => error instanceof IdentityServiceError && error.code === 'unavailable',
  );
  assert.deepEqual(await service.getSession(), { status: 'anonymous' });
});
