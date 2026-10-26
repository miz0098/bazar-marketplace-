/** Future checkout step 2 boundary. Distinct from client-subtotal-based demo validatePromo. */
export interface PromotionPricingInput {
  readonly cartId: string;
  readonly expectedCartVersion: number;
  readonly code: string;
}
export interface PromotionMoney {
  readonly amountMinor: number;
  readonly currency: 'UAH';
}
export interface PromotionQuote {
  readonly mode: 'integration-test';
  readonly scope: 'single-product-merchandise';
  readonly cartId: string;
  readonly cartVersion: number;
  readonly promotionId: string;
  readonly promotionVersion: number;
  readonly subtotal: PromotionMoney;
  readonly discount: PromotionMoney;
  readonly merchandiseTotal: PromotionMoney;
  readonly pricingFingerprint: string;
  readonly evaluatedAt: string;
  readonly promotionEndsAt: string;
  readonly checkoutAvailable: false;
}
export interface PromotionPricingService {
  evaluate(input: PromotionPricingInput): Promise<PromotionQuote>;
}
