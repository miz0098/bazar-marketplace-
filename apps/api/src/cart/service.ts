import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import {
  isServerCartView,
  type ServerCartView,
} from '../contracts/server-cart.js';
import {
  mutateCartInTransaction,
  readCartInTransaction,
} from '../business/cart.js';
import { integer, money, uuid } from '../business/validation.js';
import { fields } from '../checkout/input.js';
import { hash } from '../checkout/state.js';
export function createCurrentCartService(pool: pg.Pool) {
  if (process.env.NODE_ENV !== 'test')
    throw new Error(
      'Current cart requires an isolated verified-session composition',
    );
  async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const result = await fn(c);
      await c.query('COMMIT');
      return result;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
  async function active(c: pg.PoolClient, actor: string) {
    const row = (
      await c.query(
        "SELECT id FROM bazar.carts WHERE user_id=$1 AND lifecycle='active' FOR UPDATE",
        [actor],
      )
    ).rows[0];
    if (!row)
      throw new ApiError(
        404,
        'NOT_FOUND',
        'No active server cart. Create it explicitly.',
      );
    return uuid(row.id);
  }
  async function view(
    c: pg.PoolClient,
    actor: string,
    id: string,
  ): Promise<ServerCartView> {
    await c.query(
      'SELECT v.id FROM bazar.variants v JOIN bazar.cart_lines l ON l.variant_id=v.id WHERE l.cart_id=$1 ORDER BY v.id FOR SHARE OF v',
      [id],
    );
    const cart = await readCartInTransaction(c, id, actor, false);
    const rows = (
      await c.query(
        'SELECT v.id,v.stock,v.price_minor::text FROM bazar.cart_lines l JOIN bazar.variants v ON v.id=l.variant_id WHERE l.cart_id=$1 ORDER BY v.id',
        [id],
      )
    ).rows;
    const inventory = rows.map((r, i) => ({
      variantId: uuid(r.id),
      stock: integer(r.stock, 0, 2147483647),
      available: cart.lines[i].quantity <= r.stock,
      unitPrice: {
        amountMinor: money(r.price_minor),
        currency: 'UAH' as const,
      },
    }));
    const result: ServerCartView = {
      mode: 'integration-test',
      guestMerge: 'none',
      freshness: 'current',
      cart,
      inventory,
      canCheckout: cart.lines.length > 0 && inventory.every((r) => r.available),
    };
    if (!isServerCartView(result))
      throw new Error('Invalid server cart snapshot');
    return result;
  }
  return {
    async get(actor: string) {
      actor = uuid(actor);
      return tx(async (c) => view(c, actor, await active(c, actor)));
    },
    async ensure(actor: string, value: unknown) {
      actor = uuid(actor);
      fields(value, []);
      return tx(async (c) => {
        await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
          `current-cart:${actor}`,
        ]);
        let row = (
          await c.query(
            "SELECT id FROM bazar.carts WHERE user_id=$1 AND lifecycle='active' FOR UPDATE",
            [actor],
          )
        ).rows[0];
        if (!row)
          row = (
            await c.query(
              "INSERT INTO bazar.carts(user_id,lifecycle) VALUES ($1,'active') RETURNING id",
              [actor],
            )
          ).rows[0];
        return view(c, actor, uuid(row.id));
      });
    },
    async mutate(
      actor: string,
      operation: 'add' | 'set' | 'remove',
      value: unknown,
      variantFromPath?: string,
    ) {
      actor = uuid(actor);
      const r = fields(
        value,
        operation === 'add'
          ? ['variantId', 'quantity', 'expectedVersion', 'idempotencyKey']
          : operation === 'set'
            ? ['quantity', 'expectedVersion', 'idempotencyKey']
            : ['expectedVersion', 'idempotencyKey'],
      );
      const variantId = uuid(
          operation === 'add' ? r.variantId : variantFromPath,
        ),
        expectedVersion = integer(r.expectedVersion, 1),
        key = uuid(r.idempotencyKey),
        quantity =
          operation === 'remove'
            ? undefined
            : integer(r.quantity, 1, 2147483647);
      return tx(async (c) => {
        await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
          `cart-mutation:${actor}:${key}`,
        ]);
        const id = await active(c, actor),
          digest = hash([
            id,
            operation,
            variantId,
            quantity ?? null,
            expectedVersion,
          ]);
        const prior = (
          await c.query(
            'SELECT *,after_version::text FROM bazar.cart_mutation_receipts WHERE user_id=$1 AND request_key=$2',
            [actor, key],
          )
        ).rows[0];
        if (prior) {
          if (prior.cart_id !== id || !prior.request_digest.equals(digest))
            throw new ApiError(
              409,
              'CONFLICT',
              'Cart request key was used with different input.',
            );
          if (
            !isServerCartView(prior.snapshot) ||
            prior.snapshot.cart.id !== id ||
            prior.snapshot.cart.version !== money(prior.after_version)
          )
            throw new Error('Invalid stored cart receipt');
          return {
            view: {
              ...prior.snapshot,
              freshness: 'historical-replay' as const,
            },
            replayed: true,
          };
        }
        await mutateCartInTransaction(c, actor, id, {
          operation,
          variantId,
          quantity,
          expectedVersion,
        });
        const result = await view(c, actor, id);
        await c.query(
          'INSERT INTO bazar.cart_mutation_receipts(user_id,request_key,cart_id,request_digest,before_version,after_version,snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)',
          [
            actor,
            key,
            id,
            digest,
            expectedVersion,
            result.cart.version,
            JSON.stringify(result),
          ],
        );
        return { view: result, replayed: false };
      });
    },
  };
}
export type CurrentCartService = ReturnType<typeof createCurrentCartService>;
