/** Only an isolated test implementation is currently approved. Never interpreted as real SMS delivery. */
export interface SmsAdapter {
  readonly kind: 'isolated-test' | 'provider';
  send(input: {
    phone: string;
    code: string;
    challengeId: string;
    signal: AbortSignal;
  }): Promise<{ status: 'test-only' | 'accepted' }>;
}
