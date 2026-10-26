# ADR 0010 — Phase F9 current cart and isolated checkout integration

Status: implemented for isolated integration testing; production activation blocked.

## Approved cart policy

One active server cart per verified user, created explicitly when needed. Guest carts remain local and are never automatically merged, copied or selected. Server prices and stock prevail. Existing historical carts are preserved as `unselected`; no arbitrary legacy selection is inferred. Migration 0010 adds the partial unique active-user index, immutable mutation receipts and immutable checkout completion links; migrations 0001–0009 are unchanged.

GET/HEAD `/api/v1/cart` reads only (404 until created). POST with `{}` ensures an empty active cart, using an actor-scoped transaction lock and unique index. POST `/cart/lines` adds; PATCH/DELETE `/cart/lines/{variantId}` sets/removes. Mutations require expectedVersion and idempotencyKey. Same owner/key/input replays the original snapshot exactly once; changed input conflicts. Historical receipts explicitly say `freshness: historical-replay`, and never stand in for a current inventory check. Fresh GET and checkout start use current PostgreSQL price/stock. No client owner, cart ID, price or guest state is accepted. Cart locks, ordered variant locks and transaction receipts prevent duplicate mutations, stale-version writes and partial failures.

HTTP actor identity comes only from the F4 server session. Exact Origin, Fetch Metadata and CSRF protect mutations; HttpOnly/Secure/SameSite session cookies remain unchanged. Current-cart and complete integration factories require NODE_ENV=test; createApiServer rejects test dependencies under ordinary configuration. Main does not select these factories, test SMS or a fake live identity. The current-cart policy blocker is resolved, but production SMS/TLS/BFF/security rollout is not bypassed.

## Linked three-step confirmation

`createCheckoutIntegrationServices` explicitly wires existing catalog, authentication, cart, promotion, shipping, payment and checkout modules. `/api/v1/checkouts/{id}/confirmation` adds a required paymentAttemptId to F6 confirmation input. In one transaction it rechecks owned active cart/version, checkout fingerprint and current inventory/prices; F7 fresh carrier estimate; and F8 succeeded isolated payment proof for the same user, checkout, cart/version and merchant/account, with the current synthetic financial binding. It atomically records the pending integration order/history and immutable link. SQL ownership/FK/correlation guards supplement service validation. The proof ID participates in the idempotency digest. Replay cannot change proof or turn an older unlinked F6 record into an integrated confirmation. Link-insertion failures roll back all order writes while preserving the already observed test payment.

The legacy F6 `/orders` technical recording seam remains separate. Neither endpoint places legal production orders. Integrated responses explicitly carry `confirmationScope: integration-test-only` and `orderPaid: false`. Stored orders stay pending, payment not initiated, inventory not reserved, payable/delivery cost null. Synthetic payment success is protocol evidence only; it does not settle an order. No real SMS, money, TTN, stock reservation, redemption or provider legacy write occurs.

The opt-in Next.js integration controller bundles typed clients, holds CSRF only in a closure and starts checkout from a freshly read current server cart. Transport/schema errors never fall back to fabricated success or guest data. It is not selected by existing demo providers. No UI/design change is made.

## Test scope and unresolved decisions

Real local PostgreSQL plus actual HTTP and typed Next.js clients cover catalog, isolated OTP/session, current cart, shipping selection/quote for Nova Poshta/Meest/Ukrposhta, promotion preview, pending and succeeded signed synthetic payment, linked confirmation and order history. BAZAR pickup remains unavailable. Negative cases cover CSRF/foreign ownership, forged inputs, stale price/tariff/financial basis, wrong merchant/proof, concurrency, idempotent replay, rollback and F8 schema upgrade.

A valid promo preview is tested, followed by a rejected payment with that promo active. The client explicitly removes the promo before completing a separate no-promo synthetic path. This does **not** claim a successful discounted order. Redemption/usage settlement, stacking, allocation, rounding and refunds still require decisions. Likewise authoritative payable totals, fees/tax, stock reservation, real order transitions/cancellation, post-order active-cart lifecycle/repeat purchases, production sessions/SMS and carrier/payment contracts are not approved here. Do not clear/archive/replace carts or enable real operations based on the synthetic scenario. See [readiness matrix](../F9_DEMO_READINESS.md).
