import type { IdentityIntent, RegistrationProfile } from '@/domain/identity/identity';

export type { IdentityIntent, RegistrationProfile } from '@/domain/identity/identity';

export type IdentityServiceErrorCode =
  | 'invalid-code'
  | 'expired-code'
  | 'rate-limited'
  | 'network'
  | 'unavailable';

export class IdentityServiceError extends Error {
  readonly code: IdentityServiceErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: IdentityServiceErrorCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'IdentityServiceError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface IdentityChallenge {
  readonly id: string;
  readonly intent: IdentityIntent;
  readonly maskedPhone: string;
  readonly expiresInSeconds: number;
  readonly resendAfterSeconds: number;
  readonly delivery: 'preview-only' | 'test-only';
}

export interface IdentityVerificationResult {
  readonly status: 'preview-only' | 'authenticated' | 'profile-required';
  readonly next: 'profile' | 'complete';
}

export interface IdentityRegistrationResult {
  readonly status: 'preview-only' | 'authenticated' | 'profile-required';
}

export interface IdentitySession {
  readonly status: 'anonymous' | 'authenticated';
}

export interface IdentityService {
  readonly mode?: "preview-only" | "server-test";
  startChallenge(input: { readonly phone: string; readonly intent: IdentityIntent }): Promise<IdentityChallenge>;
  verifyChallenge(input: {
    readonly challengeId: string;
    readonly code: string;
  }): Promise<IdentityVerificationResult>;
  resendChallenge(input: { readonly challengeId: string }): Promise<IdentityChallenge>;
  previewRegistration(input: {
    readonly challengeId: string;
    readonly profile: RegistrationProfile;
  }): Promise<IdentityRegistrationResult>;
  getSession(): Promise<IdentitySession>;
}
