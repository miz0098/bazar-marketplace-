import type { Money } from './modules.js';
export interface PromotionPricingInput {
  readonly cartId: string;
  readonly expectedCartVersion: number;
  readonly code: string;
}
export interface PromotionQuote {
  readonly mode: 'integration-test';
  readonly scope: 'single-product-merchandise';
  readonly cartId: string;
  readonly cartVersion: number;
  readonly promotionId: string;
  readonly promotionVersion: number;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly merchandiseTotal: Money;
  readonly pricingFingerprint: string;
  readonly evaluatedAt: string;
  readonly promotionEndsAt: string;
  readonly checkoutAvailable: false;
}
export interface PromotionPricingService {
  evaluate(input: PromotionPricingInput): Promise<PromotionQuote>;
}
export interface IntegrationClaimInput extends PromotionPricingInput {
  readonly idempotencyKey: string;
  readonly expectedFingerprint: string;
}
export interface IntegrationClaim {
  readonly id: string;
  readonly mode: 'integration-test';
  readonly status: 'recorded-for-test';
  readonly replayed: boolean;
}
