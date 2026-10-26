import type { PaymentInstrument } from '../contracts/payments.js';
export interface PaymentObservation {
  eventId: string;
  operationId: string;
  operationRef: string;
  accountRef: string;
  amountMinor: number;
  currency: 'UAH';
  status: 'pending' | 'succeeded' | 'declined' | 'cancelled';
}
export interface PaymentAdapter {
  scope: 'isolated-test';
  name: string;
  accountRef: string;
  methods: readonly PaymentInstrument[];
  /** Stable operationId MUST be the remote idempotency/reference key; one submission per durable operation. */
  submit(
    input: {
      operationId: string;
      method: PaymentInstrument;
      amountMinor: number;
      currency: 'UAH';
    },
    signal: AbortSignal,
  ): Promise<{ operationRef: string }>;
  inspect(
    operationId: string,
    signal: AbortSignal,
  ): Promise<PaymentObservation>;
  requestCancel(operationId: string, signal: AbortSignal): Promise<void>;
  /** Verify raw bytes before parsing, using provider-specific signature/account/timestamp policy. */
  verifyWebhook(
    raw: Uint8Array,
    signature: string,
    signal: AbortSignal,
  ): Promise<PaymentObservation>;
}
