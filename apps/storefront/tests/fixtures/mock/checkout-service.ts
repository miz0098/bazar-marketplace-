import type { CheckoutService } from '@/services/contracts/checkout';

export const demoCheckoutService: CheckoutService = {
  async validatePromo(code, subtotal) {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const normalized = code.trim().toUpperCase();
    if (normalized !== 'BAZAR10') throw new Error('Промокод не знайдено. Для демо використайте BAZAR10.');
    return {
      code: normalized,
      discount: { ...subtotal, amountMinor: Math.floor(subtotal.amountMinor * 0.1) },
      message: 'Демо-знижку 10% застосовано.',
    };
  },
};
