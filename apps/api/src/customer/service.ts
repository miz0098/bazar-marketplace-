import {createCustomerAccount,type AccountPolicy} from './account.js';
import type pg from 'pg';
import { createHash } from 'node:crypto';
import { ApiError } from '../contracts/foundation.js';
import { uuid, money } from '../business/validation.js';
import { fields } from '../checkout/input.js';
import { profileInput, addressInput, reviewBody, version } from './input.js';
import { isCustomerView, type CustomerView } from '../contracts/customer.js';
export interface IsolatedReviewPolicy {
  scope: 'isolated-test';
  confirmPurchase(input: {
    userId: string;
    orderId: string;
    orderLineId: string;
    productId: string;
  }): { confirmed: boolean; proof: string };
  canChange(
    action: 'edit' | 'delete',
    reviewId: string,
    userId: string,
  ): boolean;
}
const missing = () =>
  new ApiError(404, 'NOT_FOUND', 'Customer resource not found.');
const conflict = () =>
  new ApiError(
    409,
    'CONFLICT',
    'Customer state changed or requires approved rules.',
  );
/** Test-process composition only; main never selects this service or a review policy. */
export function createCustomerService(
  pool: pg.Pool,
  policy?: IsolatedReviewPolicy,
  accountPolicy?: AccountPolicy,
) {
  if (
    process.env.NODE_ENV !== 'test' ||
    (policy && policy.scope !== 'isolated-test')
  )
    throw new Error('Customer foundation requires an isolated test process');
  async function tx<T>(actor: string, run: (c: pg.PoolClient) => Promise<T>) {
    actor = uuid(actor);
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      if (
        !(
          await c.query('SELECT id FROM bazar.users WHERE id=$1 FOR UPDATE', [
            actor,
          ])
        ).rowCount
      )
        throw missing();
      const result = await run(c);
      await c.query('COMMIT');
      return result;
    } catch (e) {
      await c.query('ROLLBACK');
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        ['23505', '23503'].includes(String(e.code))
      )
        throw conflict();
      throw e;
    } finally {
      c.release();
    }
  }
  async function read(
    c: pg.PoolClient,
    actor: string,
    resource: CustomerView['resource'],
  ): Promise<CustomerView> {
    let view: unknown;
    if (resource === 'profile') {
      const r = (
        await c.query(
          'SELECT id,first_name,last_name,profile_version::text FROM bazar.users WHERE id=$1',
          [actor],
        )
      ).rows[0];
      view = {
        mode: 'integration-test',
        resource,
        profile: {
          id: uuid(r.id),
          firstName: r.first_name,
          lastName: r.last_name,
          version: money(r.profile_version),
        },
      };
    } else if (resource === 'wishlist') {
      const rows = (
        await c.query(
          'SELECT p.id,p.handle,p.title,min(v.price_minor)::text AS price,coalesce(bool_or(v.stock>0),false) AS available FROM bazar.wishlist_items w JOIN bazar.products p ON p.id=w.product_id LEFT JOIN bazar.variants v ON v.product_id=p.id WHERE w.user_id=$1 GROUP BY p.id,w.created_at ORDER BY w.created_at DESC,p.id LIMIT 101',
          [actor],
        )
      ).rows;
      view = {
        mode: 'integration-test',
        resource,
        items: rows.map((r) => ({
          productId: uuid(r.id),
          handle: r.handle,
          title: r.title,
          available: r.available,
          price:
            r.price === null
              ? null
              : { amountMinor: money(r.price), currency: 'UAH' },
        })),
      };
    } else if (resource === 'addresses') {
      view = {
        mode: 'integration-test',
        resource,
        items: (
          await c.query(
            'SELECT *,version::text FROM bazar.addresses WHERE user_id=$1 ORDER BY created_at,id LIMIT 101',
            [actor],
          )
        ).rows.map((r) => ({
          id: uuid(r.id),
          carrier: r.carrier,
          cityRef: r.city_ref,
          locationRef: r.location_ref,
          isDefault: r.is_default,
          version: money(r.version),
        })),
      };
    } else
      view = {
        mode: 'integration-test',
        resource,
        publication: 'not-asserted',
        items: (
          await c.query(
            'SELECT id,product_id,order_line_id,rating,body FROM bazar.reviews WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 101',
            [actor],
          )
        ).rows.map((r) => ({
          id: uuid(r.id),
          productId: uuid(r.product_id),
          orderLineId: uuid(r.order_line_id),
          rating: r.rating,
          body: r.body,
        })),
      };
    if (
      view &&
      typeof view === 'object' &&
      'items' in view &&
      Array.isArray(view.items) &&
      view.items.length > 100
    )
      throw new ApiError(
        503,
        'SERVICE_UNAVAILABLE',
        'Refine customer listing before activation.',
      );
    if (!isCustomerView(view)) throw new Error('Invalid customer output');
    return view;
  }
  async function address(
    c: pg.PoolClient,
    actor: string,
    id: string,
    expected: number,
  ) {
    const r = (
      await c.query(
        'SELECT *,version::text FROM bazar.addresses WHERE id=$1 AND user_id=$2 FOR UPDATE',
        [id, actor],
      )
    ).rows[0];
    if (!r) throw missing();
    if (money(r.version) !== expected) throw conflict();
    return r;
  }
  async function defaults(
    c: pg.PoolClient,
    actor: string,
    exclude: string | null,
  ) {
    await c.query(
      'UPDATE bazar.addresses SET is_default=false,version=version+1 WHERE user_id=$1 AND is_default AND ($2::uuid IS NULL OR id<>$2)',
      [actor, exclude],
    );
  }
  return {
    account:createCustomerAccount(pool,accountPolicy),
    async get(actor: string, resource: CustomerView['resource']) {
      return tx(actor, (c) => read(c, uuid(actor), resource));
    },
    async updateProfile(actor: string, value: unknown) {
      const r = profileInput(value);
      actor = uuid(actor);
      return tx(actor, async (c) => {
        const changed = await c.query(
          'UPDATE bazar.users SET first_name=$2,last_name=$3,profile_version=profile_version+1 WHERE id=$1 AND profile_version=$4',
          [actor, r.firstName, r.lastName, r.expectedVersion],
        );
        if (!changed.rowCount) throw conflict();
        return read(c, actor, 'profile');
      });
    },
    async wishlist(
      actor: string,
      productId: string,
      add: boolean,
      value: unknown,
    ) {
      fields(value, []);
      actor = uuid(actor);
      productId = uuid(productId);
      return tx(actor, async (c) => {
        if (add) {
          if (
            !(
              await c.query(
                'SELECT id FROM bazar.products WHERE id=$1 FOR KEY SHARE',
                [productId],
              )
            ).rowCount
          )
            throw missing();
          await c.query(
            'INSERT INTO bazar.wishlist_items(user_id,product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [actor, productId],
          );
        } else
          await c.query(
            'DELETE FROM bazar.wishlist_items WHERE user_id=$1 AND product_id=$2',
            [actor, productId],
          );
        return read(c, actor, 'wishlist');
      });
    },
    async createAddress(actor: string, value: unknown) {
      const r = addressInput(value);
      actor = uuid(actor);
      return tx(actor, async (c) => {
        if (r.isDefault) await defaults(c, actor, null);
        await c.query(
          'INSERT INTO bazar.addresses(user_id,carrier,city_ref,location_ref,is_default) VALUES ($1,$2,$3,$4,$5)',
          [actor, r.carrier, r.cityRef, r.locationRef, r.isDefault],
        );
        return read(c, actor, 'addresses');
      });
    },
    async changeAddress(
      actor: string,
      id: string,
      value: unknown,
      action: 'edit' | 'delete' | 'default',
    ) {
      actor = uuid(actor);
      id = uuid(id);
      const raw = action === 'edit' ? null : fields(value, ['expectedVersion']),
        r = action === 'edit' ? addressInput(value, true) : null,
        expected = r?.expectedVersion ?? version(raw!);
      return tx(actor, async (c) => {
        await address(c, actor, id, expected);
        if (action === 'delete')
          await c.query(
            'DELETE FROM bazar.addresses WHERE id=$1 AND user_id=$2',
            [id, actor],
          );
        else if (action === 'default') {
          await defaults(c, actor, id);
          await c.query(
            'UPDATE bazar.addresses SET is_default=true,version=version+1 WHERE id=$1 AND user_id=$2',
            [id, actor],
          );
        } else {
          if (r!.isDefault) await defaults(c, actor, id);
          await c.query(
            'UPDATE bazar.addresses SET carrier=$3,city_ref=$4,location_ref=$5,is_default=$6,version=version+1 WHERE id=$1 AND user_id=$2',
            [id, actor, r!.carrier, r!.cityRef, r!.locationRef, r!.isDefault],
          );
        }
        return read(c, actor, 'addresses');
      });
    },
    async createReview(actor: string, value: unknown) {
      const raw = fields(value, ['orderLineId', 'rating', 'body']),
        id = uuid(raw.orderLineId),
        body = reviewBody(raw);
      actor = uuid(actor);
      return tx(actor, async (c) => {
        const line = (
          await c.query(
            'SELECT l.id,l.product_id,l.order_id,o.foundation_mode FROM bazar.order_lines l JOIN bazar.orders o ON o.id=l.order_id AND o.user_id=l.user_id WHERE l.id=$1 AND l.user_id=$2 FOR UPDATE OF l,o',
            [id, actor],
          )
        ).rows[0];
        if (!line) throw missing();
        if (!policy || line.foundation_mode !== null) throw conflict();
        const proof = policy.confirmPurchase({
          userId: actor,
          orderId: uuid(line.order_id),
          orderLineId: id,
          productId: uuid(line.product_id),
        });
        if (
          proof.confirmed !== true ||
          typeof proof.proof !== 'string' ||
          !/^[a-zA-Z0-9_-]{16,200}$/.test(proof.proof)
        )
          throw conflict();
        const review = (
          await c.query(
            'INSERT INTO bazar.reviews(user_id,product_id,order_line_id,rating,body) VALUES ($1,$2,$3,$4,$5) RETURNING id',
            [actor, line.product_id, id, body.rating, body.body],
          )
        ).rows[0];
        await c.query(
          "INSERT INTO bazar.review_foundation_claims(review_id,user_id,mode,proof_digest,order_line_id,product_id) VALUES ($1,$2,'integration-test',$3,$4,$5)",
          [
            review.id,
            actor,
            createHash('sha256').update(proof.proof).digest(),
            id,
            line.product_id,
          ],
        );
        return read(c, actor, 'reviews');
      });
    },
    async changeReview(
      actor: string,
      id: string,
      value: unknown,
      action: 'edit' | 'delete',
    ) {
      actor = uuid(actor);
      id = uuid(id);
      const raw = fields(value, action === 'edit' ? ['rating', 'body'] : []),
        body = action === 'edit' ? reviewBody(raw) : null;
      return tx(actor, async (c) => {
        if (
          !(
            await c.query(
              'SELECT id FROM bazar.reviews WHERE id=$1 AND user_id=$2 FOR UPDATE',
              [id, actor],
            )
          ).rowCount
        )
          throw missing();
        if (
          !(
            await c.query(
              'SELECT 1 FROM bazar.review_foundation_claims WHERE review_id=$1 AND user_id=$2',
              [id, actor],
            )
          ).rowCount ||
          !policy ||
          policy.canChange(action, id, actor) !== true
        )
          throw conflict();
        if (action === 'delete') {
          await c.query(
            'DELETE FROM bazar.reviews WHERE id=$1 AND user_id=$2',
            [id, actor],
          );
        } else
          await c.query(
            'UPDATE bazar.reviews SET rating=$3,body=$4 WHERE id=$1 AND user_id=$2',
            [id, actor, body!.rating, body!.body],
          );
        return read(c, actor, 'reviews');
      });
    },
  };
}
export type CustomerService = ReturnType<typeof createCustomerService>;
