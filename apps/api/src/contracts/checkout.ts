import type { Money } from './modules.js';
export type CheckoutStage = 'contact-delivery' | 'payment' | 'confirmation';
export type PaymentSelection = 'card-online' | 'on-receipt';
export interface DeliveryReference {
  addressId: string;
  carrier: 'nova-poshta' | 'meest' | 'ukrposhta';
  cityRef: string;
  locationRef: string;
  cost: null;
  status: 'not-requested';
}
export interface CheckoutPricing {
  subtotal: Money;
  discount: Money;
  merchandiseTotal: Money;
  fingerprint: string;
  acknowledged: boolean;
}
export interface CheckoutSessionDto {
  id: string;
  mode: 'integration-test';
  version: number;
  cartId: string;
  cartVersion: number;
  stage: CheckoutStage;
  delivery: DeliveryReference | null;
  paymentSelection: PaymentSelection | null;
  pricing: CheckoutPricing | null;
  orderId: string | null;
  canRecordIntegrationOrder: boolean;
  canPlaceRealOrder: false;
  blockers: readonly string[];
}
export interface IntegrationOrderLine {
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}
export interface IntegrationOrderDto {
  id: string;
  mode: 'integration-test';
  status: 'pending';
  recordState: 'recorded-for-test';
  createdAt: string;
  cartId: string;
  cartVersion: number;
  lines: readonly IntegrationOrderLine[];
  subtotal: Money;
  discount: Money;
  merchandiseTotal: Money;
  payableTotal: null;
  delivery: DeliveryReference;
  paymentSelection: PaymentSelection;
  paymentStatus: 'not-initiated';
  inventoryStatus: 'not-reserved';
}
export interface StartCheckoutInput {
  cartId: string;
  expectedCartVersion: number;
  idempotencyKey: string;
}
export interface DeliveryStepInput {
  expectedVersion: number;
  addressId: string;
}
export interface PaymentStepInput {
  expectedVersion: number;
  paymentSelection: PaymentSelection;
  promoCode: string | null;
}
export interface RecordOrderInput {
  expectedVersion: number;
  expectedFingerprint: string;
  idempotencyKey: string;
}
export interface RecordedOrderResult {
  order: IntegrationOrderDto;
  replayed: boolean;
}

export interface IntegratedConfirmationInput extends RecordOrderInput {paymentAttemptId:string}
export interface IntegratedConfirmationResult extends RecordedOrderResult {paymentAttemptId:string;confirmationScope:'integration-test-only';orderPaid:false}
