import type { CheckoutPricing } from '../contracts/checkout.js';
/** Explicit synthetic convention, not legal payable/tax/settlement policy. No allocation or rounding. */
export function discountedTestPlan(pricing: CheckoutPricing, shipping: number) {
  if (process.env.NODE_ENV !== 'test') throw new Error('Isolated pricing only');
  const amounts = [
    pricing.subtotal.amountMinor,
    pricing.discount.amountMinor,
    pricing.merchandiseTotal.amountMinor,
    shipping,
  ];
  for (const amount of amounts)
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw new Error('Invalid test amount');
  if (
    [pricing.subtotal, pricing.discount, pricing.merchandiseTotal].some(
      (amount) => amount.currency !== 'UAH',
    ) ||
    BigInt(pricing.subtotal.amountMinor) - BigInt(pricing.discount.amountMinor) !==
      BigInt(pricing.merchandiseTotal.amountMinor)
  )
    throw new Error('Invalid test basis');
  if (pricing.merchandiseTotal.amountMinor === 0)
    throw new Error('Zero-merchandise checkout requires policy');
  const total = BigInt(pricing.merchandiseTotal.amountMinor) + BigInt(shipping);
  if (total < 1n || total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Test amount policy required');
  return {
    amountMinor: Number(total),
    currency: 'UAH' as const,
    revision: 'f16-single-line-test-1',
  };
}
