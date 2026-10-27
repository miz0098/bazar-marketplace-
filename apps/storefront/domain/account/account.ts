import type { Money, ProductSummary } from '@/services/contracts/catalog';

export type AccountScenario = 'ready' | 'empty' | 'error';
export type AccountGender = 'unspecified' | 'female' | 'male' | 'other';
export type AccountOrderStatus = 'expected' | 'confirmed' | 'preparing' | 'system-cancelled' | 'returning' | 'shipped' | 'delivered' | 'canceled' | 'returned';
export type AccountWishlistSort = 'newest' | 'price-asc' | 'price-desc' | 'name';
export type AccountDeliveryMethod = 'nova-poshta' | 'meest' | 'ukrposhta' | 'courier';

export const ACCOUNT_ORDER_STATUSES: readonly AccountOrderStatus[] = ['expected','confirmed','preparing','shipped','delivered','canceled','system-cancelled','returning','returned'];

export interface AccountProfile {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  /** Display-only value. The account preview never receives a complete phone number. */
  readonly maskedPhone: string;
  readonly birthday: string;
  readonly gender: AccountGender;
}

export interface AccountProfileDraft {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly birthday: string;
  readonly gender: AccountGender;
}

export type AccountProfileErrors = Partial<Record<keyof AccountProfileDraft, string>>;

export interface AccountOrderLine {
  readonly id: string;
  readonly product: ProductSummary;
  readonly quantity: number;
  readonly lineTotal: Money;
}

interface AccountOrderBase {
  readonly id: string;
  readonly number: string;
  readonly placedAt: string;
  readonly status: AccountOrderStatus;
  readonly itemCount: number;
  readonly total: Money;
}

export interface AccountOrderSummary extends AccountOrderBase {
  readonly leadProduct: ProductSummary;
}

export interface AccountOrderDetail extends AccountOrderBase {
  readonly items: readonly AccountOrderLine[];
}

export interface AccountOrderQuery {
  readonly status?: AccountOrderStatus | 'all';
  readonly page?: number;
  readonly pageSize?: number;
}

export interface AccountOrderPage {
  readonly items: readonly AccountOrderSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly hasMore: boolean;
  readonly counts: Readonly<Record<AccountOrderStatus | 'all', number>>;
}

export interface AccountWishlistItem {
  readonly id: string;
  readonly product: ProductSummary;
  readonly addedAt: string;
}

export interface AccountWishlistQuery {
  readonly search?: string;
  readonly sort?: AccountWishlistSort;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface AccountWishlistPage {
  readonly items: readonly AccountWishlistItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly hasMore: boolean;
}

export interface AccountReview {
  readonly id: string;
  readonly product: ProductSummary;
  readonly rating: number;
  readonly text: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccountReviewDraft {
  readonly rating: number;
  readonly text: string;
}

export type AccountReviewErrors = Partial<Record<keyof AccountReviewDraft, string>>;

export interface AccountAddress {
  readonly id: string;
  readonly label: string;
  readonly recipientName: string;
  readonly deliveryMethod: AccountDeliveryMethod;
  readonly city: string;
  readonly location: string;
  readonly isDefault: boolean;
}

export interface AccountAddressDraft {
  readonly label: string;
  readonly recipientName: string;
  readonly deliveryMethod: AccountDeliveryMethod;
  readonly city: string;
  readonly location: string;
  readonly makeDefault?: boolean;
}

export type AccountAddressErrors = Partial<Record<keyof AccountAddressDraft, string>>;

/** Tokenized display metadata only; full card numbers and CVV are intentionally absent. */
export interface AccountPaymentMethod {
  readonly id: string;
  readonly brand: string;
  readonly last4: string;
  readonly isDefault: boolean;
}

export interface AccountFixtureSet {
  readonly profile: AccountProfile;
  readonly orders: readonly AccountOrderDetail[];
  readonly wishlist: readonly AccountWishlistItem[];
  readonly reviews: readonly AccountReview[];
  readonly addresses: readonly AccountAddress[];
  readonly paymentMethods: readonly AccountPaymentMethod[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIRTHDAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeAccountText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateAccountProfile(draft: AccountProfileDraft): AccountProfileErrors {
  const errors: AccountProfileErrors = {};
  const firstName = normalizeAccountText(draft.firstName);
  const lastName = normalizeAccountText(draft.lastName);
  const email = draft.email.trim();
  const birthday = draft.birthday.trim();

  if (!firstName) errors.firstName = 'Вкажіть імʼя.';
  else if (firstName.length > 80) errors.firstName = 'Імʼя має містити не більше 80 символів.';

  if (!lastName) errors.lastName = 'Вкажіть прізвище.';
  else if (lastName.length > 80) errors.lastName = 'Прізвище має містити не більше 80 символів.';

  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) {
    errors.email = 'Введіть коректну електронну пошту.';
  }

  if (birthday && !BIRTHDAY_PATTERN.test(birthday)) {
    errors.birthday = 'Вкажіть дату у форматі РРРР-ММ-ДД.';
  }

  if (!['unspecified', 'female', 'male', 'other'].includes(draft.gender)) {
    errors.gender = 'Оберіть доступне значення.';
  }

  return errors;
}

export function validateAccountReview(draft: AccountReviewDraft): AccountReviewErrors {
  const errors: AccountReviewErrors = {};
  const text = normalizeAccountText(draft.text);

  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5) {
    errors.rating = 'Оберіть оцінку від 1 до 5.';
  }

  if (text.length < 10) errors.text = 'Відгук має містити щонайменше 10 символів.';
  else if (text.length > 1000) errors.text = 'Відгук має містити не більше 1000 символів.';

  return errors;
}

export function validateAccountAddress(draft: AccountAddressDraft): AccountAddressErrors {
  const errors: AccountAddressErrors = {};
  const label = normalizeAccountText(draft.label);
  const recipientName = normalizeAccountText(draft.recipientName);
  const city = normalizeAccountText(draft.city);
  const location = normalizeAccountText(draft.location);

  if (label.length < 2) errors.label = 'Додайте коротку назву адреси.';
  else if (label.length > 60) errors.label = 'Назва адреси має містити не більше 60 символів.';

  if (recipientName.length < 2) errors.recipientName = 'Вкажіть імʼя отримувача.';
  else if (recipientName.length > 120) errors.recipientName = 'Імʼя отримувача має містити не більше 120 символів.';

  if (!['nova-poshta', 'meest', 'ukrposhta', 'courier'].includes(draft.deliveryMethod)) {
    errors.deliveryMethod = 'Оберіть доступний спосіб доставки.';
  }

  if (city.length < 2) errors.city = 'Вкажіть населений пункт.';
  else if (city.length > 100) errors.city = 'Назва населеного пункту надто довга.';

  if (location.length < 2) errors.location = 'Вкажіть відділення або адресу.';
  else if (location.length > 200) errors.location = 'Адреса має містити не більше 200 символів.';

  return errors;
}

export function hasAccountValidationErrors(errors: Readonly<Record<string, string | undefined>>): boolean {
  return Object.values(errors).some(Boolean);
}
