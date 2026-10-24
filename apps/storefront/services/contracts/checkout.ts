import type { Money } from '@/services/contracts/catalog';

export type DeliveryMethod = 'nova-poshta' | 'meest';
export type PaymentMethod = 'card-online' | 'on-receipt';

export interface CheckoutContact {
  readonly fullName: string;
  readonly phone: string;
}

export interface CheckoutDelivery {
  readonly method: DeliveryMethod;
  readonly city: string;
  readonly branch: string;
}

export interface CheckoutDraft {
  readonly contact: CheckoutContact;
  readonly delivery: CheckoutDelivery;
  readonly paymentMethod: PaymentMethod;
  readonly promoCode: string;
}

export interface PromoResult {
  readonly code: string;
  readonly discount: Money;
  readonly message: string;
}

export interface CheckoutService {
  validatePromo(code: string, subtotal: Money): Promise<PromoResult>;
}
