import type { CheckoutDraft, PromoResult } from '@/services/contracts/checkout';
import type { Money } from '@/services/contracts/catalog';

export const EMPTY_CHECKOUT_DRAFT: CheckoutDraft = {
  contact: { fullName: '', phone: '' },
  delivery: { method: 'nova-poshta', city: '', branch: '' },
  paymentMethod: 'card-online',
  promoCode: '',
};

export function normalizeUkrainianPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('380')) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith('0')) return `+38${digits.slice(0, 10)}`;
  return value.trim();
}

export function validateContactAndDelivery(draft: CheckoutDraft) {
  const errors: Record<string, string> = {};
  if (draft.contact.fullName.trim().split(/\s+/).length < 2) errors.fullName = 'Вкажіть ім’я та прізвище.';
  if (!/^\+380\d{9}$/.test(normalizeUkrainianPhone(draft.contact.phone))) errors.phone = 'Вкажіть номер у форматі +380XXXXXXXXX.';
  if (draft.delivery.city.trim().length < 2) errors.city = 'Вкажіть населений пункт.';
  if (draft.delivery.branch.trim().length < 1) errors.branch = 'Вкажіть номер або адресу відділення.';
  return errors;
}

export function parseCheckoutDraft(value: string | null): CheckoutDraft {
  if (!value) return EMPTY_CHECKOUT_DRAFT;
  try {
    const candidate = JSON.parse(value) as Partial<CheckoutDraft>;
    const deliveryMethod = candidate.delivery?.method === 'meest' ? 'meest' : 'nova-poshta';
    const paymentMethod = candidate.paymentMethod === 'on-receipt' ? 'on-receipt' : 'card-online';
    return {
      contact: {
        fullName: typeof candidate.contact?.fullName === 'string' ? candidate.contact.fullName : '',
        phone: typeof candidate.contact?.phone === 'string' ? candidate.contact.phone : '',
      },
      delivery: {
        method: deliveryMethod,
        city: typeof candidate.delivery?.city === 'string' ? candidate.delivery.city : '',
        branch: typeof candidate.delivery?.branch === 'string' ? candidate.delivery.branch : '',
      },
      paymentMethod,
      promoCode: typeof candidate.promoCode === 'string' ? candidate.promoCode : '',
    };
  } catch {
    return EMPTY_CHECKOUT_DRAFT;
  }
}

export function checkoutTotal(subtotal: Money, promo: PromoResult | null): Money {
  const discount = promo?.discount.amountMinor ?? 0;
  return { ...subtotal, amountMinor: Math.max(0, subtotal.amountMinor - discount) };
}
