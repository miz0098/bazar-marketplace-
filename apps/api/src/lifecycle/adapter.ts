import type {
  RequestKind,
  RequestState,
  RefundState,
} from "../contracts/lifecycle.js";
export interface IsolatedLifecyclePolicy {
  scope: "isolated-test";
  canRequest(input: {
    userId: string;
    orderId: string;
    kind: RequestKind;
  }): boolean;
  canReview(input: {
    userId: string;
    orderId: string;
    requestId: string;
    from: RequestState;
    to: RequestState;
  }): boolean;
  /** Explicit synthetic plan only; never infer discount, fees, shipping or legal allocation. */
  refundPlan(input: {
    userId: string;
    orderId: string;
    requestId: string;
    extent: "partial" | "full";
    paymentAmountMinor: number;
  }): { amountMinor: number; currency: "UAH"; revision: string } | null;
}
export type RefundObservation = {
  eventId: string;
  refundId: string;
  paymentOperationId: string;
  accountRef: string;
  amountMinor: number;
  currency: "UAH";
  state: Exclude<RefundState, "prepared">;
};
export interface IsolatedRefundAdapter {
  scope: "isolated-test";
  name: string;
  accountRef: string;
  /** Authentication over raw bytes before parsing; no provider signature scheme is selected in src. */
  verify(
    raw: Uint8Array,
    signature: string,
    signal: AbortSignal,
  ): Promise<RefundObservation>;
}
/** Future real refund requires approved authoritative amounts, provider idempotency and reconciliation. No implementation is selected. */
export interface FutureRefundProvider {
  request(
    input: {
      refundId: string;
      confirmedPaymentRef: string;
      amountMinor: number;
      currency: string;
    },
    signal: AbortSignal,
  ): Promise<{ outcome: "accepted" | "rejected" | "unknown" }>;
}
export type FutureOrderLifecycleEvent = {
  eventId: string;
  orderId: string;
  kind:
    | "order.status_changed"
    | "order.cancelled"
    | "return.requested"
    | "return.status_changed"
    | "refund.completed";
  source: "approved-authority-required";
};
