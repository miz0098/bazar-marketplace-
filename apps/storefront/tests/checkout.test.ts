import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutTotal, EMPTY_CHECKOUT_DRAFT, normalizeUkrainianPhone, parseCheckoutDraft, validateContactAndDelivery } from '../domain/checkout/checkout';

test('normalizes and validates Ukrainian checkout contact and delivery', () => {
  assert.equal(normalizeUkrainianPhone('067 123 45 67'), '+380671234567');
  const valid = { ...EMPTY_CHECKOUT_DRAFT, contact: { fullName: 'Анна Коваль', phone: '+380671234567' }, delivery: { method: 'meest' as const, city: 'Київ', branch: '12' } };
  assert.deepEqual(validateContactAndDelivery(valid), {});
  assert.deepEqual(Object.keys(validateContactAndDelivery(EMPTY_CHECKOUT_DRAFT)), ['fullName', 'phone', 'city', 'branch']);
});

test('restores only supported checkout choices from storage', () => {
  const parsed = parseCheckoutDraft(JSON.stringify({ contact: { fullName: 'Іван Петренко', phone: '+380501234567' }, delivery: { method: 'other', city: 'Львів', branch: '3' }, paymentMethod: 'unknown', promoCode: 'SAVE' }));
  assert.equal(parsed.delivery.method, 'nova-poshta');
  assert.equal(parsed.paymentMethod, 'card-online');
  assert.equal(parseCheckoutDraft(JSON.stringify({delivery:{method:'ukrposhta',city:'Київ',branch:'01001'}})).delivery.method,'ukrposhta');
  assert.deepEqual(parseCheckoutDraft('{bad'), EMPTY_CHECKOUT_DRAFT);
});

test('calculates demo checkout total without allowing a negative value', () => {
  const subtotal = { amountMinor: 10000, currency: 'UAH' as const };
  assert.equal(checkoutTotal(subtotal, { code: 'BAZAR10', discount: { amountMinor: 1000, currency: 'UAH' }, message: '' }).amountMinor, 9000);
  assert.equal(checkoutTotal(subtotal, { code: 'BAD', discount: { amountMinor: 12000, currency: 'UAH' }, message: '' }).amountMinor, 0);
});
