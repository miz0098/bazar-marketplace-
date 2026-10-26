# ADR 0003 — Phase F3 catalog and cart boundaries

Status: implemented for PostgreSQL integration; cart HTTP blocked on AUTH-001. This is not production or BAZAR Demo 100% readiness.

## Public catalog

Activate read-only GET/HEAD `/api/v1/products`, `/api/v1/products/{handle}`, `/api/v1/categories`; retain native HTTP for these three bounded read handlers. No general middleware framework, JSON mutation parser or authentication framework is added. Revisit the ADR 0001 framework decision before authenticated HTTP mutations rather than growing a general-purpose router here.

The existing ProductDto, CategoryDto and Page envelopes remain compatible. Detail adds actual variants, SKU, stock and variant prices. Products without variants are excluded because the agreed ProductDto requires a price; no price is fabricated. Product price is the minimum variant price (including sold-out variants), with independent any-variant availability. This is a technical v1 read representation, not a discounted offer or an inventory reservation. Review merchandising/variant-selection policy before a storefront switch. No media, vendor, rating, sale, promotion or facet values are invented from fixtures.

Query parameters are strictly allowlisted and single-valued: `query` (trimmed, max 200), `categoryId` (UUID, includes descendants), `minPrice` / `maxPrice` (integer minor units), `available` (true/false), `sort` (newest, price-asc, price-desc, name), `limit` (1–100; default 20), `cursor`. Minimum/maximum filters apply to the product's minimum variant price. Ties use UUID, name ordering uses deterministic C collation. Invalid, duplicate, reversed and unsafe integer parameters fail with 400. A missing product returns 404; query results and category children may be empty.

Search uses an indexed `simple` PostgreSQL tsvector over title + description and `plainto_tsquery`: literal Ukrainian tokens, all-token matching, case insensitive, no stemming, fuzzy matching, autocomplete or substring claims. SQL is parameterized; only fixed sort expressions are interpolated. Recursive category filtering uses UNION to terminate even if legacy hierarchy data contains cycles; this is not a category-write validation policy. Categories return at most 1000 entries, or 503 rather than silent truncation; `parentId=root` returns roots, UUID returns direct children, omission returns all.

Cursors are opaque base64url offsets bound to the normalized query, sort and limit by a fingerprint. They are validated, bounded to 1,000,000 and are not authorization tokens. Pagination is deterministic for unchanged data, but is not snapshot pagination across requests: concurrent catalog updates may shift pages. At the bound, callers must refine filters; the server does not claim there are no more results. A future high-volume feed may need a reviewed keyset/snapshot contract. All reads are no-store until freshness/invalidation policy is approved.

## Cart persistence, deliberately not public

F2 has owned carts only and no verified principal resolver/session issuance. Every `/api/v1/cart` and descendant request fails closed with **401 AUTH_REQUIRED**, before inspecting caller IDs/body or querying the database. Browser demo auth, cookies, bearer values and X-User-Id cannot grant access. No GET/POST/PATCH/DELETE cart success handler is registered. The internal repository is not an authentication mechanism and is never constructed by an HTTP cart handler.

The internal PostgreSQL repository accepts a trusted actor supplied by a future session layer and scopes every cart read/lock to `(cart_id,user_id)`. Missing and foreign carts both return 404. It does not create carts, select an arbitrary cart for a user, accept client prices, mint identities, or merge guests. User/cart provisioning and selection require the identity/guest decisions below.

Reads use repeatable-read transactions and current variant prices. Mutations lock the owned cart, compare its durable expectedVersion, lock all involved variants in UUID order against price/stock writers, then add/increment, set or remove a variant line. Quantities use the existing positive PostgreSQL integer range; stock is authoritative. Validate full remaining cart stock on add/set; remove remains possible when other lines are sold out. Recompute line totals/subtotal with BigInt, reject values beyond the agreed safe integer money range, increment version and commit atomically. A conflict rolls back both lines and version. Cart contents reserve no stock and are not a checkout/order promise.

Optimistic version checks protect repeated/concurrent requests: exactly one mutation can consume a given version. A duplicate receives 409 and must refresh; no automatic retry, replayed-success response or fabricated idempotency success exists. Durable actor+operation idempotency keys/results for checkout/payment remain a separate requirement. Cart get preserves the original CartDto (which has no stock/reconciliation annotation); do not wire it to live UX until the reconciliation UI contract is reviewed.

## Output and storefront boundary

Explicit row-to-DTO runtime validation checks UUIDs, string bounds, UAH, safe integer money, stock, availability, versions and totals. Invalid data/DB errors become sanitized failures, without SQL or connection values in public responses or logs. The shared success/error envelope is preserved. Read-only CORS remains unchanged. Foundation `businessModulesAvailable:false` remains the legacy full-business-suite readiness flag; it does not mean that the three documented public catalog routes are absent. `/ready` checks schema/connection, not every future business permission or provider.

The Next.js opt-in catalog transport validates envelopes and DTOs, bounds response bytes/time, omits cookies and credentials, rejects redirects, disables caching and does not retry/fall back. The server-only factory is not selected by the existing mock provider. A typed future AuthenticatedCartAdapter boundary has no active HTTP implementation. Existing CatalogService needs media/vendor/ratings/navigation data absent from PostgreSQL; no fake domain mapper is supplied. Existing UI, demo cart, auth D, profile E and communication remain untouched.

## Exact blockers / owner actions

- AUTH-001/security owner: approve and implement real server-side session issuance/verification/revocation, CSRF and rate-limit policy before cart HTTP access. A header/user ID or demo flag cannot substitute.
- Product/backend owner: decide guest identity/merge and current-cart creation/selection, stale price/stock UX and replay contract before connecting cart UI.
- Catalog owner: approve source/import, visibility/publication, pricing/inventory update authority, media/vendor/ratings/navigation mapping and merchandising price semantics before live storefront use. No importer or admin writes are included.
- Operations/security: approve production role provisioning, migration/release, backups and operational limits. Local test success is not a deployment authorization.

No promotions, checkout, payment, delivery, order placement/status transitions or refunds are implemented. See the mandatory [Shopify restoration gates](../SHOPIFY_RESTORATION.md).
