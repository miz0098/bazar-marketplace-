import { createHash } from 'node:crypto';
import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import type { CategoryDto, Page, ProductDto } from '../contracts/modules.js';
import { integer, invalid, money, text, uuid } from './validation.js';

export interface CatalogQuery {
  query: string;
  categoryId: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  available: boolean | null;
  sort: 'newest' | 'price-asc' | 'price-desc' | 'name';
  limit: number;
  offset: number;
}
const sorts = {
  newest: 'created_at DESC, id',
  'price-asc': 'price_minor ASC, id',
  'price-desc': 'price_minor DESC, id',
  name: 'title COLLATE "C", id',
} as const;
function fingerprint(q: CatalogQuery) {
  return createHash('sha256')
    .update(JSON.stringify({ ...q, offset: 0 }))
    .digest('hex')
    .slice(0, 16);
}
export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const keys = [
    'query',
    'categoryId',
    'minPrice',
    'maxPrice',
    'available',
    'sort',
    'limit',
    'cursor',
  ];
  for (const key of params.keys())
    if (!keys.includes(key) || params.getAll(key).length !== 1) invalid();
  const number = (
    key: string,
    min: number,
    max: number,
    fallback: number | null,
  ) => {
    const value = params.get(key);
    if (value === null) return fallback;
    if (!/^\d{1,16}$/.test(value)) invalid();
    return integer(Number(value), min, max);
  };
  const sort = params.get('sort') ?? 'newest';
  if (!Object.hasOwn(sorts, sort)) invalid();
  const query = params.get('query')?.trim() ?? '';
  if (query.length > 200) invalid();
  const available = params.get('available');
  if (available !== null && available !== 'true' && available !== 'false')
    invalid();
  const q: CatalogQuery = {
    query,
    categoryId: params.has('categoryId')
      ? uuid(params.get('categoryId'))
      : null,
    minPrice: number('minPrice', 0, Number.MAX_SAFE_INTEGER, null),
    maxPrice: number('maxPrice', 0, Number.MAX_SAFE_INTEGER, null),
    available: available === null ? null : available === 'true',
    sort: sort as CatalogQuery['sort'],
    limit: number('limit', 1, 100, 20)!,
    offset: 0,
  };
  if (q.minPrice !== null && q.maxPrice !== null && q.minPrice > q.maxPrice)
    invalid();
  const cursor = params.get('cursor');
  if (cursor !== null) {
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(cursor)) invalid();
    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString(),
      );
      if (
        !Array.isArray(decoded) ||
        decoded.length !== 2 ||
        decoded[1] !== fingerprint(q)
      )
        invalid();
      q.offset = integer(decoded[0], 1, 1000000);
    } catch {
      invalid();
    }
  }
  return q;
}
export interface VariantDto {
  id: string;
  sku: string;
  price: { amountMinor: number; currency: 'UAH' };
  stock: number;
  availability: 'available' | 'unavailable';
}
export interface ProductDetailDto extends ProductDto {
  variants: VariantDto[];
}
type Row = Record<string, unknown>;
function product(row: Row): ProductDto {
  if (typeof row.available !== 'boolean' || row.currency !== 'UAH')
    throw new Error('Invalid database product');
  return {
    id: uuid(row.id),
    categoryId: uuid(row.category_id),
    handle: text(row.handle, 200),
    title: text(row.title, 300),
    description:
      typeof row.description === 'string'
        ? row.description
        : text(row.description, 1),
    price: { amountMinor: money(row.price_minor), currency: 'UAH' },
    availability: row.available ? 'available' : 'unavailable',
  };
}
// A product price is the minimum variant price, including unavailable variants; availability is independent.
const projection = `SELECT p.*, v.price_minor::text, 'UAH'::text AS currency, v.available FROM bazar.products p JOIN LATERAL (SELECT min(price_minor) AS price_minor, bool_or(stock>0) AS available FROM bazar.variants WHERE product_id=p.id HAVING count(*)>0) v ON true`;
export function createCatalog(pool: pg.Pool) {
  return {
    async list(q: CatalogQuery): Promise<Page<ProductDto>> {
      const result = await pool.query(
        `WITH RECURSIVE subtree(id) AS (SELECT id FROM bazar.categories WHERE id=$1::uuid UNION SELECT c.id FROM bazar.categories c JOIN subtree s ON c.parent_id=s.id), candidates AS (${projection} WHERE ($1::uuid IS NULL OR p.category_id IN (SELECT id FROM subtree)) AND ($2::text='' OR to_tsvector('simple',p.title || ' ' || p.description) @@ plainto_tsquery('simple',$2))) SELECT * FROM candidates WHERE ($3::bigint IS NULL OR price_minor::bigint >= $3) AND ($4::bigint IS NULL OR price_minor::bigint <= $4) AND ($5::boolean IS NULL OR available=$5) ORDER BY ${sorts[q.sort].replaceAll('price_minor ', 'price_minor::bigint ')} LIMIT $6 OFFSET $7`,
        [
          q.categoryId,
          q.query,
          q.minPrice,
          q.maxPrice,
          q.available,
          q.limit + 1,
          q.offset,
        ],
      );
      const more = result.rows.length > q.limit;
      if (more && q.offset + q.limit > 1000000)
        throw new ApiError(
          400,
          'INVALID_REQUEST',
          'Pagination limit reached; refine the filters.',
        );
      return {
        items: result.rows.slice(0, q.limit).map(product),
        nextCursor: more
          ? Buffer.from(
              JSON.stringify([q.offset + q.limit, fingerprint(q)]),
            ).toString('base64url')
          : null,
      };
    },
    async get(handle: string): Promise<ProductDetailDto | null> {
      if (!handle.length || handle.length > 200 || handle.trim() !== handle)
        invalid();
      const client = await pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const result = await client.query(`${projection} WHERE p.handle=$1`, [
          handle,
        ]);
        if (!result.rows.length) {
          await client.query('COMMIT');
          return null;
        }
        const dto = product(result.rows[0]);
        const variants = await client.query(
          'SELECT id,sku,price_minor::text,currency,stock FROM bazar.variants WHERE product_id=$1 ORDER BY id',
          [dto.id],
        );
        const detail = {
          ...dto,
          variants: variants.rows.map((v): VariantDto => {
            if (v.currency !== 'UAH') throw new Error('Invalid currency');
            return {
              id: uuid(v.id),
              sku: text(v.sku, 100),
              price: { amountMinor: money(v.price_minor), currency: 'UAH' },
              stock: integer(v.stock, 0, 2147483647),
              availability: v.stock > 0 ? 'available' : 'unavailable',
            };
          }),
        };
        await client.query('COMMIT');
        return detail;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async categories(
      parentId?: string | null,
    ): Promise<readonly CategoryDto[]> {
      const result = await pool.query(
        'SELECT id,parent_id,handle,title FROM bazar.categories WHERE ($1::boolean OR parent_id IS NOT DISTINCT FROM $2::uuid) ORDER BY title COLLATE "C",id LIMIT 1001',
        [parentId === undefined, parentId ?? null],
      );
      if (result.rows.length > 1000)
        throw new ApiError(
          503,
          'SERVICE_UNAVAILABLE',
          'Category response exceeds the supported limit.',
        );
      return result.rows.map((r) => ({
        id: uuid(r.id),
        parentId: r.parent_id === null ? null : uuid(r.parent_id),
        handle: text(r.handle, 200),
        title: text(r.title, 200),
      }));
    },
  };
}
export type Catalog = ReturnType<typeof createCatalog>;
