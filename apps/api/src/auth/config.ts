export interface AuthPolicy {
  otpTtlSeconds: number;
  otpAttempts: number;
  resendSeconds: number;
  sessionTtlSeconds: number;
  flowTtlSeconds: number;
  rateWindowSeconds: number;
  challengeClientLimit: number;
  challengePhoneLimit: number;
  challengeGlobalLimit: number;
  verifyClientLimit: number;
  verifyGlobalLimit: number;
  smsTimeoutMs: number;
}
export interface AuthConfig {
  environment: 'test';
  publicOrigin: string;
  phoneKey: Buffer;
  otpKey: Buffer;
  csrfKey: Buffer;
  policy: AuthPolicy;
}
/** No production defaults or test-provider environment switch. All policy values are explicit. */
export function validateAuthConfig(config: AuthConfig): void {
  if (config.environment !== 'test' || process.env.NODE_ENV !== 'test')
    throw new Error(
      'Authentication test adapter requires an isolated test process',
    );
  let origin: URL;
  try {
    origin = new URL(config.publicOrigin);
  } catch {
    throw new Error('Invalid authentication origin');
  }
  if (origin.origin !== config.publicOrigin || origin.protocol !== 'https:')
    throw new Error('Invalid authentication origin');
  const keys = [config.phoneKey, config.otpKey, config.csrfKey];
  if (
    keys.some((key) => !Buffer.isBuffer(key) || key.length !== 32) ||
    new Set(keys.map((k) => k.toString('hex'))).size !== 3
  )
    throw new Error('Invalid authentication key configuration');
  const p = config.policy;
  const names: readonly (keyof AuthPolicy)[] = [
    'otpTtlSeconds',
    'otpAttempts',
    'resendSeconds',
    'sessionTtlSeconds',
    'flowTtlSeconds',
    'rateWindowSeconds',
    'challengeClientLimit',
    'challengePhoneLimit',
    'challengeGlobalLimit',
    'verifyClientLimit',
    'verifyGlobalLimit',
    'smsTimeoutMs',
  ];
  for (const value of names.map((name) => p[name]))
    if (!Number.isSafeInteger(value) || value < 1 || value > 1000000)
      throw new Error('Invalid authentication policy');
  if (
    p.otpTtlSeconds > 600 ||
    p.otpAttempts > 10 ||
    p.sessionTtlSeconds > 86400 ||
    p.flowTtlSeconds < Math.max(p.sessionTtlSeconds, p.otpTtlSeconds) ||
    p.resendSeconds > p.rateWindowSeconds ||
    p.smsTimeoutMs > 5000
  )
    throw new Error('Invalid authentication policy');
}
