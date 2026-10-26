/** Provider-neutral test protocol. Never a payment authorization or proof of a paid order. */
export type PaymentInstrument = 'card' | 'apple-pay' | 'google-pay';
export type PaymentState =
  | 'submitting'
  | 'pending'
  | 'unknown'
  | 'declined'
  | 'cancelled'
  | 'succeeded';
export interface PaymentAttempt {
  id: string;
  checkoutId: string;
  mode: 'integration-test';
  amountBasis: 'isolated-test-plan';
  method: PaymentInstrument;
  status: PaymentState;
  amount: { amountMinor: number; currency: 'UAH' };
  createdAt: string;
  version: number;
  canRetry: boolean;
  realPayment: false;
  orderPaid: false;
}
export interface CreatePaymentInput {
  checkoutId: string;
  expectedVersion: number;
  method: PaymentInstrument;
  idempotencyKey: string;
}
export interface RefundAdapter {
  /** Future only: no handler, production implementation, eligibility or amount rule is selected. */
  request(
    input: {
      ownedOperationRef: string;
      amountMinor: number;
      currency: string;
      idempotencyKey: string;
    },
    signal: AbortSignal,
  ): Promise<{ state: 'pending' | 'unknown'; operationRef: string }>;
}
