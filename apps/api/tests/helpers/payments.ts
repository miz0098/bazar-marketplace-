import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import type {
  PaymentAdapter,
  PaymentObservation,
} from '../../src/payments/adapter.js';
import type { PaymentInstrument } from '../../src/contracts/payments.js';
import { fields } from '../../src/checkout/input.js';
/** Synthetic protocol only. HMAC/test policy is not a selected provider's webhook specification. */
export function paymentFixture() {
  const key = randomBytes(32),
    accountRef = 'synthetic-merchant';
  const operations = new Map<
    string,
    {
      method: PaymentInstrument;
      amountMinor: number;
      currency: 'UAH';
      status: PaymentObservation['status'];
      ref: string;
    }
  >();
  const state = {
    submissions: 0,
    failSubmit: false,
    stallSubmit: false,
    failInspect: false,
    cancelConfirmed: true,
    amount: 25000,
    revision: 'test-plan-1',
  };
  function event(
    id: string,
    status?: PaymentObservation['status'],
  ): PaymentObservation {
    const row = operations.get(id);
    if (!row) throw new Error('Unknown synthetic operation');
    return {
      eventId: randomUUID(),
      operationId: id,
      operationRef: row.ref,
      accountRef,
      amountMinor: row.amountMinor,
      currency: 'UAH',
      status: status ?? row.status,
    };
  }
  function signed(value: unknown, time = Date.now()) {
    const raw = Buffer.from(JSON.stringify(value)),
      mac = createHmac('sha256', key)
        .update(String(time) + '.')
        .update(raw)
        .digest('hex');
    return { raw, signature: `${time}.${mac}` };
  }
  const adapter: PaymentAdapter = {
    scope: 'isolated-test',
    name: 'isolated-payment',
    accountRef,
    methods: ['card', 'apple-pay', 'google-pay'],
    async submit(input, signal) {
      state.submissions++;
      operations.set(input.operationId, {
        ...input,
        status: 'pending',
        ref: 'test-' + input.operationId,
      });
      if (state.failSubmit) throw new Error('private-merchant-secret');
      if (state.stallSubmit)
        await new Promise<void>((_, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          }),
        );
      return { operationRef: operations.get(input.operationId)!.ref };
    },
    async inspect(id) {
      if (state.failInspect) throw new Error('private-merchant-secret');
      return event(id);
    },
    async requestCancel(id) {
      if (state.cancelConfirmed && operations.get(id)!.status === 'pending') operations.get(id)!.status = 'cancelled';
    },
    async verifyWebhook(raw, signature) {
      const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(signature);
      if (!match || Math.abs(Date.now() - Number(match[1])) > 300000)
        throw new Error('Unverified test signature');
      const expected = createHmac('sha256', key)
        .update(match[1] + '.')
        .update(raw)
        .digest();
      if (!timingSafeEqual(expected, Buffer.from(match[2], 'hex')))
        throw new Error('Unverified test signature');
      const value = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(raw),
      );
      fields(value, [
        'eventId',
        'operationId',
        'operationRef',
        'accountRef',
        'amountMinor',
        'currency',
        'status',
      ]);
      return value as PaymentObservation;
    },
  };
  const config = {
    timeoutMs: 100,
    async plan() {
      return {
        amountMinor: state.amount,
        currency: 'UAH' as const,
        revision: state.revision,
      };
    },
  };
  return { adapter, config, state, operations, event, signed };
}
