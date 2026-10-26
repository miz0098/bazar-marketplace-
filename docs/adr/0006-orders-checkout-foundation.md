# ADR 0006 — Orders and three-step checkout foundation

Status: implemented technical PostgreSQL integration; live order placement/provider activation remains blocked. Base is vps-migration f6b52db (merged F5). No separate detailed F6 specification was found in the repository; scope follows the current user request, ORDER-001, approved three-step screen contract and ADRs 0002–0005. This is F6 implementation, not a repeat of the F3 audit.

## Implemented composition

Keep the existing Node/TypeScript/pg service boundaries and bounded native HTTP shell for isolated composition. Main constructs no checkout/order service, ordinary routes return 503, and the factory/HTTP injection reject production use. No test/live toggle, deployment, real SMS/payment/carrier adapter or selector change is introduced. Revisit the framework/BFF/security decision with live activation rather than treating this test composition as a production middleware framework.

Reuse the existing PostgreSQL catalog/variant entities, F3 transactional cart reader, F4 verified-session/Origin/CSRF checks and F5 exact promotion evaluator. F3/F5 gain named internal transaction seams without changed behavior, allowing one checkout transaction rather than nested pools/transactions. There are no in-memory business arrays. Earlier migrations 0001–0005 are unchanged.

## Three server stages

1. contact-delivery: POST /api/v1/checkouts starts an owned-cart draft using cartId, expectedCartVersion and an actor-scoped creation key. No guest/current-cart selection or cart creation is inferred. PATCH /checkouts/{id}/contact-delivery selects an existing owned address reference (carrier/city/location). Actor identity is supplied by the verified test session. Recipient name/phone, contact encryption/retention, carrier validation and quotes remain unresolved; no plaintext contact payload is accepted or claimed complete for live delivery.
2. payment: PATCH /checkouts/{id}/payment stores only the approved card-online/on-receipt selection and an explicit nullable promoCode. This is a requested UI choice, not an available provider/payment credential or charge. Current prices/stock, owned address and F5 promotion applicability are re-evaluated in the transaction. Integer totals and a fingerprint are acknowledged for the confirmation step; no delivery cost, tax treatment, payable total or reservation is invented.
3. confirmation: GET /checkouts/{id} exposes the draft, current evaluation and acknowledgement state. A changed cart version requires a new draft; changed prices/stock/title/address/campaign facts invalidate the acknowledged fingerprint or reject evaluation. Revising delivery returns to payment and clears acknowledgement while retaining selected values; payment must be reviewed again. Checkout versions reject concurrent lost updates. Production confirmation is always unavailable.

POST /checkouts/{id}/orders records an **integration-test/pending/recorded-for-test** order only when the no-promo confirmation is current. This is not legal placement or a promise of fulfillment. canPlaceRealOrder is always false; canRecordIntegrationOrder is a separate explicitly named test capability. Delivery status is not-requested/cost null, payment status not-initiated, inventory not-reserved and payableTotal null. Cart contents/version and stock are not decremented/cleared, and no payment_attempt, shipment or SMS is created. No order number/fiscal receipt is invented.

F5 promo totals work in step 2, including its exact-arithmetic/policy guards, but order recording with any selected promotion is CHECKOUT_POLICY_REQUIRED. F5 test usage claims are not promoted into real order redemption. No campaign capacity is consumed by draft/preview/order requests. A user can explicitly remove a code and re-evaluate; real consume/reserve/release/rounding/allocation/refund policy still needs approval.

The HTTP paths are /api/v1/checkouts, /{id}, /{id}/contact-delivery, /{id}/payment, /{id}/orders and read-only /api/v1/orders, /orders/{id}. Authentication derives the owner, never a submitted userId. Unknown fields (prices, totals, card values, provider status, contacts), malformed UUIDs/versions, foreign carts/addresses/drafts/orders, query/body misuse and missing Origin/CSRF are rejected. No credentialed CORS or public order-status/refund/payment write route exists. Logs retain static labels and sanitized errors, not addresses, codes, cookies or request bodies.

## PostgreSQL transactions, replay and immutable facts

0006 adds owned checkout_sessions, order_checkout_snapshots and checkout_order_requests; orders gain a nullable foundation_mode so legacy rows remain untouched. Only newly created, completed integration-mode records are exposed by the new order reader. Legacy/demo rows are not relabelled or treated as verified orders.

Order recording locks actor/request key, owned cart, checkout and current variant/product/address data, rechecks draft version, stock, prices and acknowledged fingerprint, then atomically inserts the order, all lines, snapshots, request mapping and completed draft link. A failed insert/constraint rolls back everything, including the key and draft version, so a safe retry can succeed. A repeated identical actor/key returns the original immutable order; a changed payload conflicts. A different key cannot record a closed checkout, and UNIQUE(cart_id,cart_version) prevents parallel drafts from recording the same test cart snapshot twice. These are integration replay guards, not an approved production cart/order reuse policy.

Base unit price, title, quantity and line totals are stored in order_lines; the separate snapshot stores merchandise arithmetic, carrier/location references, payment selection and pricing fingerprint. Product, stock, source address or cart changes cannot rewrite historical output. Delivery/payable amounts must remain null and discount zero for recorded integration orders. Deferred triggers require nonempty consistent line aggregates and completed checkout/request links before commit. Updates/deletes and late appended lines are rejected for integration history. Integration orders must remain pending and cannot receive payment_attempts or shipments; DB triggers enforce that boundary even for accidental direct writes.

Lock order starts with the owned cart before the checkout row. When a code is selected, the existing F5 campaign → variants/eligible-product path is reused; address/product locks stabilize snapshots. Future campaign/inventory writers must follow the reviewed transaction protocol. No production role/password is provisioned. Production grants, limits and retention must be reviewed with activation; catalog-only credentials must not access checkout/order data.

Read endpoints return owned integration records only, with immutable snapshots and bounded list pagination (default 20, 1–100). Cursors bind offset to owner/limit, cap at 10000 and use created_at/id ordering. They are not authorization or cross-request snapshot promises. Unknown/foreign IDs both return 404. No financial, payment, fulfillment or refund transition is inferred from historical status.

## Storefront boundary and verification

A separate typed opt-in CheckoutBusinessClient validates integration scope, stage/capability flags, owner resource shapes, integer line/aggregate arithmetic, null payable/delivery amounts and explicit non-provider statuses. Cookies remain browser-managed; mutations use an explicit CSRF callback; body/time/response bounds, no caching, redirects, retries or preview fallback apply. Existing demo CheckoutService, screens/design, persistence, profile/orders UI, catalog, messages/support and Shopify source remain unchanged. Actual typed client → authenticated HTTP → PostgreSQL three-step/order/read/pagination/replay flows are tested. No new BFF/live switch is selected by the UI.

Tests cover empty/fresh/upgrade migrations, repeat/concurrency/rollback, owner isolation, stale prices/address/stock/version, concurrent edits/order drafts, immutable snapshots/aggregate constraints, forbidden provider writes, failed order insertion, promo preview/policy block, opaque pagination and ordinary-runtime 503 guards, plus all earlier regression suites. Local test transport verifies cookie/CSRF protocol over loopback; production browser TLS/provider readiness is not claimed.

## Blockers before live checkout/order placement

- Product/legal: binding order terms, numbering, fiscalization, currency/tax/payable-total policy, contact/recipient PII storage and legal consent/retention.
- Inventory owner: reserve/decrement/release timing, stock authority, oversell prevention across real orders, expiry/cancellation and cart clearing/reuse. Current records deliberately do not reserve stock.
- Promotion owner: order-bound redemption/reservation/release, code stacking, seller/line/unit allocation, rounding, refunds and capacity restoration (ADR 0005).
- Delivery/payment owners: approved carrier locations/quotes and tariffs, provider credentials/contracts, quote validity, payment handoff/webhooks, unknown/failure reconciliation, approved status transitions and refunds. Selections are not provider availability.
- Security/platform: approved real SMS/session/key/rate policies, BFF/TLS/CSRF/cookie forwarding, least-privilege release/migrations/backups/monitoring, request/line/retention limits and production framework review.
- Cart/UI owners: current/guest cart creation/selection/merge, stale-draft recovery and approved live transition from the preserved demo UI. No guest or auto-merge policy is chosen.

These questions do not block reviewing the isolated technical foundation. They block enabling real order confirmation, charges, delivery/SMS requests, inventory commitments or calling BAZAR Demo 100% complete.
