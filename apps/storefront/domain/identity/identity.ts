export type IdentityIntent = 'login' | 'register';

export interface RegistrationProfile {
  readonly firstName: string;
  readonly lastName: string;
  readonly email?: string;
  readonly termsAccepted: boolean;
}

export type RegistrationProfileErrors = Partial<Record<keyof RegistrationProfile, string>>;

const PHONE_CHARACTERS = /^[+\d\s().-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Extracts the nine-digit national part of a Ukrainian phone number.
 * Partial values are supported for controlled inputs; malformed and
 * overlong values return null instead of being silently truncated.
 */
export function extractNationalDigits(value: string): string | null {
  const input = value.trim();
  if (!input) return '';
  if (!PHONE_CHARACTERS.test(input)) return null;

  const plusCount = (input.match(/\+/g) ?? []).length;
  if (plusCount > 1 || (plusCount === 1 && !input.startsWith('+'))) return null;

  const digits = input.replace(/\D/g, '');
  let nationalDigits: string;

  if (input.startsWith('+')) {
    if (!digits.startsWith('380')) return null;
    nationalDigits = digits.slice(3);
  } else if (digits.startsWith('380') && digits.length > 9) {
    nationalDigits = digits.slice(3);
  } else if (digits.startsWith('0')) {
    nationalDigits = digits.slice(1);
  } else {
    nationalDigits = digits;
  }

  return nationalDigits.length <= 9 ? nationalDigits : null;
}

/** Formats a full or partial phone value as the approved national input. */
export function formatNationalPhone(value: string): string {
  const digits = extractNationalDigits(value);
  if (digits === null) return '';

  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean)
    .join(' ');
}

/** Returns a validated E.164 Ukrainian phone number, or null when invalid. */
export function normalizeUkrainianPhone(value: string): string | null {
  const digits = extractNationalDigits(value);
  if (digits === null || !/^[3-9]\d{8}$/.test(digits)) return null;
  return `+380${digits}`;
}

/** Produces a display-safe phone value without exposing the complete number. */
export function maskUkrainianPhone(value: string): string | null {
  const normalized = normalizeUkrainianPhone(value);
  if (!normalized) return null;

  const nationalDigits = normalized.slice(4);
  return `+380 ${nationalDigits.slice(0, 2)} *** ** ${nationalDigits.slice(-2)}`;
}

/** Keeps at most six OTP digits for controlled inputs and paste handling. */
export function normalizeOtpDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

/**
 * Distributes pasted OTP digits into the six visual positions. Existing
 * positions may be supplied by the UI; omitted positions stay empty.
 */
export function distributeOtpDigits(
  value: string,
  startIndex = 0,
  currentDigits: readonly string[] = [],
): [string, string, string, string, string, string] {
  const result: [string, string, string, string, string, string] = ['', '', '', '', '', ''];
  currentDigits.slice(0, 6).forEach((digit, index) => {
    result[index] = normalizeOtpDigits(digit).slice(0, 1);
  });

  const safeStartIndex = Math.min(6, Math.max(0, Math.trunc(startIndex)));
  normalizeOtpDigits(value)
    .split('')
    .forEach((digit, index) => {
      const targetIndex = safeStartIndex + index;
      if (targetIndex < result.length) result[targetIndex] = digit;
    });

  return result;
}

export function validateRegistrationProfile(profile: RegistrationProfile): RegistrationProfileErrors {
  const errors: RegistrationProfileErrors = {};
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName.trim();
  const email = profile.email?.trim() ?? '';

  if (!firstName) errors.firstName = 'Вкажіть імʼя.';
  else if (firstName.length > 80) errors.firstName = 'Імʼя має містити не більше 80 символів.';

  if (!lastName) errors.lastName = 'Вкажіть прізвище.';
  else if (lastName.length > 80) errors.lastName = 'Прізвище має містити не більше 80 символів.';

  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) {
    errors.email = 'Введіть коректну електронну пошту.';
  }

  if (!profile.termsAccepted) errors.termsAccepted = 'Підтвердьте участь у демо-перегляді.';

  return errors;
}
