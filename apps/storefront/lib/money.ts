import type { Money } from '@/services/contracts/catalog';

export function formatMoney(money: Money) {
  const amount = Math.round(money.amountMinor / 100);
  const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const symbols: Record<Money['currency'], string> = { UAH: '₴' };
  return `${grouped} ${symbols[money.currency]}`;
}
