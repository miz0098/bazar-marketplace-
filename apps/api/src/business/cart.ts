import {catalogAvailability} from '../catalog/availability.js';
import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import type { CartDto } from '../contracts/modules.js';
import { integer, money, uuid } from './validation.js';
const conflict = (message: string): never => {
  throw new ApiError(409, 'CONFLICT', message);
};
export async function readCartInTransaction(
  c: pg.PoolClient,
  cartId: string,
  userId: string,
  checkStock: boolean,
): Promise<CartDto> {
  const cart = await c.query(
    'SELECT id,version::text FROM bazar.carts WHERE id=$1 AND user_id=$2',
    [cartId, userId],
  );
  if (!cart.rows.length)
    throw new ApiError(404, 'NOT_FOUND', 'Cart not found.');
  const rows = await c.query(
    'SELECT v.product_id,v.id,v.price_minor::text,v.currency,v.stock,l.quantity FROM bazar.cart_lines l JOIN bazar.variants v ON v.id=l.variant_id WHERE l.cart_id=$1 ORDER BY v.id',
    [cartId],
  );
  const binary=await catalogAvailability(c,rows.rows.map(r=>r.id),checkStock);
  let subtotal = 0n;
  const lines = rows.rows.map((r) => {
    const quantity = integer(r.quantity, 1, 2147483647);
    if (r.currency !== 'UAH') throw new Error('Invalid database currency');
    if (checkStock && (binary.has(r.id)?!binary.get(r.id):quantity > integer(r.stock, 0, 2147483647)))
      conflict('Inventory is insufficient.');
    const total = BigInt(money(r.price_minor)) * BigInt(quantity);
    if (total > BigInt(Number.MAX_SAFE_INTEGER))
      conflict('Cart amount exceeds the supported range.');
    subtotal += total;
    return {
      productId: uuid(r.product_id),
      variantId: uuid(r.id),
      quantity,
      lineTotal: { amountMinor: Number(total), currency: 'UAH' as const },
    };
  });
  if (subtotal > BigInt(Number.MAX_SAFE_INTEGER))
    conflict('Cart amount exceeds the supported range.');
  return {
    id: uuid(cart.rows[0].id),
    version: money(cart.rows[0].version),
    lines,
    subtotal: { amountMinor: Number(subtotal), currency: 'UAH' },
  };
}
export interface CartMutationInput {
  operation: 'add' | 'set' | 'remove';
  variantId: string;
  quantity?: number;
  expectedVersion: number;
}
/** Shared transaction seam: caller owns BEGIN/COMMIT and supplies a verified actor. */
export async function mutateCartInTransaction(
  c: pg.PoolClient,
  userId: string,
  cartId: string,
  input: CartMutationInput,
): Promise<CartDto> {
  uuid(userId);
  uuid(cartId);
  uuid(input.variantId);
  integer(input.expectedVersion, 1);
  if (!['add', 'set', 'remove'].includes(input.operation))
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid operation.');
  if (input.operation !== 'remove') integer(input.quantity, 1, 2147483647);
  const cart = await c.query(
    'SELECT version::text FROM bazar.carts WHERE id=$1 AND user_id=$2 FOR UPDATE',
    [cartId, userId],
  );
  if (!cart.rows.length)
    throw new ApiError(404, 'NOT_FOUND', 'Cart not found.');
  const version = money(cart.rows[0].version);
  if (version !== input.expectedVersion || version === Number.MAX_SAFE_INTEGER)
    conflict('Cart version has changed. Refresh before retrying.');
  await c.query(
    'SELECT id FROM bazar.variants WHERE id=$2 OR id IN (SELECT variant_id FROM bazar.cart_lines WHERE cart_id=$1) ORDER BY id FOR SHARE',
    [cartId, input.variantId],
  );
  if (input.operation === 'remove')
    await c.query(
      'DELETE FROM bazar.cart_lines WHERE cart_id=$1 AND variant_id=$2',
      [cartId, input.variantId],
    );
  else {
    const variant = await c.query(
      'SELECT stock FROM bazar.variants WHERE id=$1 FOR SHARE',
      [input.variantId],
    );
    if (!variant.rows.length)
      throw new ApiError(404, 'NOT_FOUND', 'Variant not found.');
    const binary=await catalogAvailability(c,[input.variantId],true);
    const old = await c.query(
      'SELECT quantity FROM bazar.cart_lines WHERE cart_id=$1 AND variant_id=$2',
      [cartId, input.variantId],
    );
    if (input.operation === 'set' && !old.rows.length)
      throw new ApiError(404, 'NOT_FOUND', 'Cart line not found.');
    const quantity =
      input.quantity! +
      (input.operation === 'add' ? (old.rows[0]?.quantity ?? 0) : 0);
    if (
      !Number.isSafeInteger(quantity) ||
      (binary.has(input.variantId)?!binary.get(input.variantId):quantity > variant.rows[0].stock) ||
      quantity > 2147483647
    )
      conflict('Inventory is insufficient.');
    await c.query(
      'INSERT INTO bazar.cart_lines(cart_id,variant_id,quantity) VALUES ($1,$2,$3) ON CONFLICT (cart_id,variant_id) DO UPDATE SET quantity=EXCLUDED.quantity',
      [cartId, input.variantId, quantity],
    );
  }
  await c.query(
    'UPDATE bazar.carts SET version=version+1 WHERE id=$1 AND user_id=$2',
    [cartId, userId],
  );
  const result = await readCartInTransaction(
    c,
    cartId,
    userId,
    input.operation !== 'remove',
  );
  return result;
}

/** Internal persistence only: actor must come from the verified server session, never HTTP caller input. */
export function createCartRepository(pool: pg.Pool) {
  return {
    async get(userId: string, cartId: string): Promise<CartDto> {
      uuid(userId);
      uuid(cartId);
      const c = await pool.connect();
      try {
        await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const cart = await readCartInTransaction(c, cartId, userId, false);
        await c.query('COMMIT');
        return cart;
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    },
    async mutate(
      userId: string,
      cartId: string,
      input: CartMutationInput,
    ): Promise<CartDto> {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const result = await mutateCartInTransaction(c, userId, cartId, input);
        await c.query('COMMIT');
        return result;
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    },
  };
}
