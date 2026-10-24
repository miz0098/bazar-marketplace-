import { maskUkrainianPhone, normalizeUkrainianPhone, validateRegistrationProfile } from '@/domain/identity/identity';
import {
  IdentityServiceError,
  type IdentityChallenge,
  type IdentityIntent,
  type IdentityService,
} from '@/services/contracts/identity';

const CHALLENGE_EXPIRY_SECONDS = 300;
const RESEND_AFTER_SECONDS = 120;
const PREVIEW_DELAY_MS = 300;

interface PreviewChallengeRecord {
  readonly challenge: IdentityChallenge;
  rateLimitedUntil: number | null;
  verified: boolean;
}

function unavailable(message: string): IdentityServiceError {
  return new IdentityServiceError('unavailable', message);
}

function previewDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, PREVIEW_DELAY_MS));
}

export function createDemoIdentityService(): IdentityService {
  const challenges = new Map<string, PreviewChallengeRecord>();
  let challengeSequence = 0;

  function createChallenge(intent: IdentityIntent, maskedPhone: string): IdentityChallenge {
    challengeSequence += 1;
    const challenge: IdentityChallenge = {
      id: `identity-preview-${challengeSequence}`,
      intent,
      maskedPhone,
      expiresInSeconds: CHALLENGE_EXPIRY_SECONDS,
      resendAfterSeconds: RESEND_AFTER_SECONDS,
      delivery: 'preview-only',
    };
    challenges.set(challenge.id, { challenge, rateLimitedUntil: null, verified: false });
    return challenge;
  }

  return {
    async startChallenge({ phone, intent }) {
      await previewDelay();
      const normalizedPhone = normalizeUkrainianPhone(phone);
      const maskedPhone = normalizedPhone ? maskUkrainianPhone(normalizedPhone) : null;
      if (!maskedPhone) {
        throw unavailable('Введіть коректний український номер телефону.');
      }

      // The preview retains only the masked representation. It neither sends
      // an SMS nor stores the complete phone number in browser storage.
      return createChallenge(intent, maskedPhone);
    },

    async verifyChallenge({ challengeId, code }) {
      await previewDelay();
      const record = challenges.get(challengeId);
      if (!record || record.verified) {
        throw unavailable('Демо-виклик недоступний. Почніть перевірку знову.');
      }

      if (record.rateLimitedUntil && record.rateLimitedUntil > Date.now()) {
        const retryAfterSeconds = Math.max(1, Math.ceil((record.rateLimitedUntil - Date.now()) / 1000));
        throw new IdentityServiceError('rate-limited', 'Забагато спроб. Спробуйте пізніше.', retryAfterSeconds);
      }
      record.rateLimitedUntil = null;

      const submittedCode = code.trim();
      if (!/^\d{6}$/.test(submittedCode)) {
        throw new IdentityServiceError('invalid-code', 'Введіть усі 6 цифр коду.');
      }
      if (submittedCode === '654321') {
        throw new IdentityServiceError('expired-code', 'Термін дії демо-коду минув.');
      }
      if (submittedCode === '999999') {
        record.rateLimitedUntil = Date.now() + 60_000;
        throw new IdentityServiceError('rate-limited', 'Забагато спроб. Спробуйте пізніше.', 60);
      }
      if (submittedCode === '000000') {
        throw new IdentityServiceError('network', 'Не вдалося перевірити код через помилку мережі.');
      }
      if (submittedCode !== '123456') {
        throw new IdentityServiceError('invalid-code', 'Невірний демо-код. Перевірте цифри та спробуйте ще раз.');
      }

      record.verified = true;
      return {
        status: 'preview-only',
        next: record.challenge.intent === 'register' ? 'profile' : 'complete',
      };
    },

    async resendChallenge({ challengeId }) {
      await previewDelay();
      const record = challenges.get(challengeId);
      if (!record) {
        throw unavailable('Демо-виклик недоступний. Почніть перевірку знову.');
      }

      challenges.delete(challengeId);
      return createChallenge(record.challenge.intent, record.challenge.maskedPhone);
    },

    async previewRegistration({ challengeId, profile }) {
      await previewDelay();
      const record = challenges.get(challengeId);
      if (!record || record.challenge.intent !== 'register' || !record.verified) {
        throw unavailable('Спочатку завершіть демо-перевірку номера для реєстрації.');
      }

      const errors = validateRegistrationProfile(profile);
      const firstError = Object.values(errors)[0];
      if (firstError) throw unavailable(firstError);

      return { status: 'preview-only' };
    },

    async getSession() {
      return { status: 'anonymous' };
    },
  };
}

export const demoIdentityService = createDemoIdentityService();
