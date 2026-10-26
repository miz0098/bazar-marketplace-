import type { AccountDeliveryMethod, AccountOrderStatus } from '@/domain/account/account';

export const accountOrderStatusLabels: Readonly<Record<AccountOrderStatus, string>> = {
  expected: 'Очікується',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  canceled: 'Скасовано',
  returned: 'Повернено',
};

export const accountDeliveryLabels: Readonly<Record<AccountDeliveryMethod, string>> = {
  'nova-poshta': 'Нова пошта',
  meest: 'Meest',
  courier: 'Курʼєрська адреса',
};

export function formatAccountDate(value: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function readAccountScenario(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'empty' || candidate === 'error' ? candidate : 'ready';
}
