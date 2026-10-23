import type { Money, ProductSummary } from '@/services/contracts/catalog';

export interface CartLine {
  readonly product: ProductSummary;
  readonly quantity: number;
}

export interface Cart {
  readonly lines: readonly CartLine[];
  readonly itemCount: number;
  readonly subtotal: Money;
}

export type CartAction =
  | { type: 'add'; product: ProductSummary; quantity?: number }
  | { type: 'update'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }
  | { type: 'hydrate'; lines: readonly CartLine[] };

export interface CartService {
  getCart(): Cart;
  addLine(product: ProductSummary, quantity?: number): Cart;
  updateLine(productId: string, quantity: number): Cart;
  removeLine(productId: string): Cart;
  clear(): Cart;
}
