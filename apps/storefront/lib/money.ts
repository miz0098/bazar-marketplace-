import type { Money } from '@/services/contracts/catalog';

export function formatMoney(money: Money) {
  if(money.currency!=='UAH'||!Number.isSafeInteger(money.amountMinor)||money.amountMinor<0)throw new Error('Invalid money');
  const amount = BigInt(money.amountMinor) / 100n;
  const fraction=BigInt(money.amountMinor)%100n;
  const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const symbols: Record<Money['currency'], string> = { UAH: '₴' };
  return `${grouped}${fraction?","+String(fraction).padStart(2,"0"):""} ${symbols[money.currency]}`;
}
