# ADR 0005 — Discounts, promo codes and pricing foundation

Status: PostgreSQL integration foundation; ordinary HTTP/runtime and checkout activation remain unavailable. No production campaign, order, payment or real redemption lifecycle is enabled.

## Audit and scope

F3 stores UAH integer minor-unit variant prices and positive quantities, and recalculates cart totals from PostgreSQL under owner/version/variant locks. It has no seller identity, tax, financial discount allocation or current-cart creation/selection policy. F4 can prove an actor only in isolated SMS-test composition; live SMS/BFF activation is still blocked. The existing checkout step 2 accepts a code through a demo CheckoutService.validatePromo(code, subtotal), with a fixture-only floor(10%) rule. That client subtotal/floor is not an approved backend pricing rule and is not reused here. Approved source evidence remains snippets/cart-summary.liquid and the step-2 target in APPROVED_SCREENS_AUDIT.md; no UI/Shopify source changes are made.

Use the existing pg/native HTTP architecture, parameterized SQL and additive migration 0005. Main does not construct PromotionService. Construction and usage claims require NODE_ENV=test; HTTP injection also requires a test server. The one evaluation route returns 503 in ordinary runtime and cannot be enabled by a new environment switch. Real auth, current-cart policy and business approval remain activation gates. Test success carries mode:integration-test, scope:single-product-merchandise and checkoutAvailable:false.

## Campaign data and exact arithmetic

Promotions have an exact opaque code, percentage basis points OR fixed UAH minor units, explicit minimum merchandise subtotal, finite starts/ends, enabled state, explicit total/per-user limits and version. There are no seeded campaigns or monetary/rate defaults; enabled defaults false. Products use an explicit allowlist. There is no all-products inference, seller mapping, automatic promotion selector or production campaign-write endpoint.

Codes are bounded to 64 Unicode code points and matched exactly without trimming, case folding or Unicode normalization. Controls/surrounding whitespace are rejected. Test validity intervals are start-inclusive/end-exclusive; production campaign publication/normalization/time-boundary policy still needs owner confirmation. Minimum is explicitly the sum of current variant prices × quantities, not an invented payable order amount including delivery/tax. Definition of an order minimum in live checkout remains a business decision.

Percentage calculation is BigInt(subtotal) × basisPoints / 10000 only when divisible exactly. Fractional minor units yield PROMOTION_POLICY_REQUIRED; no floor, ceil, banker rounding or unit allocation is selected. Fixed discounts must be positive and no greater than the merchandise subtotal; a larger fixed value is policy-blocked instead of capped, credited or made negative. Zero-effect cases are not reported as applied discounts. Safe-integer bounds are checked before converting BigInt to number. A representable 100% discount can yield zero merchandise total, but does not authorize a free order or payment.

Only ONE product/variant cart line is evaluated (quantity may exceed one). Multiple lines are policy-blocked even when they might share a product/seller, since seller identity and allocation are absent. A single code input provides no stacking/compatibility API. Aggregate evaluation makes no claim about per-unit/net line prices or how refunds would split a discount. Existing catalog prices are read as base data; no sale/compare-at/automatic discount is inferred.

## Evaluation and freshness

POST /api/v1/pricing/promotions/evaluate takes only cartId, expectedCartVersion and code. The actor comes from the F4 verified session, with exact-Origin and flow-bound CSRF checks. Reuse the bounded JSON reader; reject unknown fields including client prices/subtotals/discounts, user IDs and code arrays. No credentialed CORS is enabled and codes never enter URLs/logs. No session data grants access to another owner's cart; foreign and missing carts both return 404.

Evaluation locks the owned cart, campaign, variant and eligible-product row; checks current prices/stock, version, time window, minimum, applicability and available total/per-user capacity. It uses fresh DB time after locks. An empty allowlist means not applicable. Unknown/disabled/future/expired/ineligible/below-minimum/exhausted campaigns share PROMOTION_REJECTED; unsupported policy and stale pricing have separate stable codes. Evaluations consume no usage, reserve no stock/capacity, alter no cart and create no order/payment.

The response gives subtotal, discount and merchandiseTotal only, plus evaluatedAt, campaign deadline and a pricing fingerprint. The fingerprint binds cart/variant/version/quantity/stock/current price and campaign terms; it is a freshness comparison, not an authorization token or a price/capacity reservation. There is no invented quote TTL. Every usage test re-reads/revalidates current data; a stale fingerprint fails PRICING_CHANGED. Shipping, tax treatment, fees and a payable grand total are not computed or implied, and the quote cannot complete checkout.

## Isolated usage ledger — not real redemption

promotion_usage_claims records only mode:integration-test events with owned-cart references, cart version, actor-scoped idempotency key/request digest, fingerprint and exact arithmetic snapshots. There is no HTTP claim endpoint and no production claim API. These events exercise durable usage caps, not a decision that clicking Apply should consume a real promotion. The service's claimForTest is explicitly guarded even after construction.

Cart and campaign locks serialize claims. Repeating the same actor/key/payload returns the same historical test-event ID without consuming another use; mismatched input fails CONFLICT. A cart/version can have only one test usage event, preventing replay through new keys/codes in the same test snapshot. This is a technical test guard, not an approved live per-cart redemption policy. Replaying an old key returns historical recorded-for-test status only, never a fresh quote or authorization after prices/expiry change. New keys always revalidate all conditions.

A PostgreSQL insert trigger also locks the campaign and checks its active interval and total/per-user claim counts, preventing concurrent SQL limit bypass. UNIQUE/FK/money/total constraints reject duplicate, foreign-owner and inconsistent records. Claims are immutable; no delete/refund/restore/release policy is invented. Direct table writes remain privileged operations, not an authorization API or a substitute for the service's price/applicability validation. Real redemptions must use a separately approved order-bound lifecycle/ledger; integration claims must never silently become production redemption history.

Lock order: request advisory lock (claim only) → owned cart → campaign → variants in UUID order → eligible product. No existing F3 cart mutation is rewritten. Future campaign/eligibility writers must follow the reviewed locking protocol. Production role/grant design is deferred with activation; catalog-only credentials cannot access new tables. No role password or real campaign is committed.

## Checkout step 2 contract

PromotionPricingInput/Quote and PromotionPricingService are separate from the demo CheckoutService. The opt-in same-origin client takes a CSRF callback, sends browser-managed cookies and only cart/version/code, validates integer totals/freshness fields/owned-cart correlation/test mode and has bounded time/bytes with no caching, redirect, retries or demo fallback. It is not selected by any screen/provider. Actual typed client → HTTP → PostgreSQL evaluation is tested under an isolated session.

A future reviewed step-2 controller must obtain the server-owned current-cart reference, display policy/rejected/stale errors accessibly, re-evaluate after cart changes and keep this merchandise calculation separate from payment/order confirmation. Existing payment/promo/summary UI, demo promo behavior and persistence remain unchanged. No fake payment, order or successful real redemption is added.

## Questions for business/security approval before activation

1. Compatibility: can automatic/product/order/code promotions combine; priority, exclusivity, replacement/removal and maximum discount rules? No multi-discount scenario is active.
2. Seller and line allocation: who funds each discount, eligible sellers/variants, multi-seller carts, settlement and allocation of a fixed or percentage amount between products/units? No multi-line financial scenario is active.
3. Rounding: precision, rounding mode, aggregate vs line vs unit calculation, allocation of remainders, displayed and accounting totals? Fractional results remain blocked.
4. Redemption lifecycle: reserve vs consume at Apply/order/payment, expiry/release/cancellation, per-user/cart/order limits, retry keys and reusability? Only isolated claims are implemented; no real consumption moment is selected.
5. Refunds: full/partial eligibility, discount allocation, shipping adjustments, refunded amounts and restoration of promotion capacity? No refund or claim deletion path exists.
6. Campaign ownership/publication: code case/format/normalization, time boundaries, source of base/sale prices, exact minimum-order basis, access/abuse controls and admin/versioning/retention policies? Test fixtures are not approved production campaigns.
7. Live checkout/auth: current-cart selection/creation/guest policy, approved SMS/keys/BFF/TLS and shipping/tax/payment/order contracts remain the earlier stage blockers.

See SHOPIFY_RESTORATION.md: this increment is not BAZAR Demo 100% or production commerce readiness.
