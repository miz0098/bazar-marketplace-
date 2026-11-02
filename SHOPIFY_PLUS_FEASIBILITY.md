# BAZAR.UA — Shopify Plus feasibility and architecture (Phase B1)

Date: 2026-11-02. **Plus is the selected target plan; subscription and entitlements are unverified.** This phase is documentation and an offline contract proof, not full implementation or production readiness. Branch: `codex/shopify-plus-feasibility-b1`; base: `design-reference-storefront@026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc`.

## Inputs and authority

Read `AGENTS.md` and `design-reference/storefront/README.md` before work; no nested AGENTS files found. The older instructions describe migration to Next.js/vps-migration. This task's explicit Plus restoration direction/base/task branch supersede that old mission for B1. Nothing is merged.

PR #41 is **open and unmerged**. Its three documents were read directly from `codex/shopify-restoration-audit@2e901f8aaeb1166ff0827eb63a6363ed18c9c437`, rather than copied or assumed present on the base:

- [SHOPIFY_RESTORATION_AUDIT.md](https://github.com/miz0098/bazar-marketplace-/blob/2e901f8aaeb1166ff0827eb63a6363ed18c9c437/SHOPIFY_RESTORATION_AUDIT.md)
- [SHOPIFY_RESTORATION_PLAN.md](https://github.com/miz0098/bazar-marketplace-/blob/2e901f8aaeb1166ff0827eb63a6363ed18c9c437/SHOPIFY_RESTORATION_PLAN.md)
- [DESIGN_REFERENCE_MAP.md](https://github.com/miz0098/bazar-marketplace-/blob/2e901f8aaeb1166ff0827eb63a6363ed18c9c437/DESIGN_REFERENCE_MAP.md)

All 33 original PNG byte contents were compared with base and hashed again. Authentication/checkout originals were visually re-inspected for this study. Phase A already visually reviewed the entire set. C1–C10 conflicts remain recorded, not arbitrarily resolved. Reference precedence and no-redesign requirement are preserved.

## Decision summary

| Area | Feasibility conclusion | Actual BAZAR verification |
|---|---|---|
| Storefront OS2/Liquid | Good candidate for close design restoration using selective existing BAZAR sources. Native Horizon alone is insufficient. | Root Horizon 4.1.1 and 71 changed theme paths on pinned customized branch inspected; no theme recovered. |
| Phone/SMS + Shopify customer accounts | Recommended architecture A: external OIDC, no passwords, SMS-primary returning sign-in **with real verified-email enrollment** before Shopify linkage. Phone-only/no-email SSO unsupported by documented contract. | 26 offline contract tests; no IdP/store/SMS session or customer created. |
| Checkout | Plus supports UI extensions, branding and Functions, but does not supply arbitrary BAZAR step topology, header/footer or secure payment UI replacement. | Documentation matrix only. No merchant rendering or entitlement test. |
| Payments Ukraine | Four public Shopify connector candidates evidenced. No complete candidate is yet merchant-verified across UAH/cards/each wallet/refunds. | Public listings/PSP docs, not BAZAR Settings → Payments. No provider selected. |
| Delivery | Nova Poshta apps are fit-gap candidates; Meest API supports necessary operations at contract level. Custom app may be needed for unified pre-payment selectors. | Meest public Swagger fetched/parsed only; no carrier operations called. No app installed. |
| Independent ecosystem | Keep API/admin/CRM/Flutter independent; Firebase only FCM. | Architecture contract proposed below; production landscape still not inspected. |

Detailed conclusions: [authentication](AUTHENTICATION_ARCHITECTURE.md), [checkout matrix](CHECKOUT_FEASIBILITY_MATRIX.md), [payments/delivery](PAYMENT_DELIVERY_COMPATIBILITY.md), [file recovery](SHOPIFY_THEME_RECOVERY_MATRIX.md), [next phase](PHASE_B2_IMPLEMENTATION_PLAN.md).

## Target responsibilities

| Host/surface | Proposed role | Remains independent |
|---|---|---|
| `bazar.ua` | Shopify Plus Online Store 2.0/Liquid, native cart/checkout and configured payment gateway | Does not absorb seller or staff interfaces. |
| `api.bazar.ua` | BAZAR business domain, upstream offers/catalog, customer feature services, carrier/Shopify adapters, queues, reconciliation | No second payable checkout/order/charge engine for the Shopify channel. |
| `admin.bazar.ua` | Seller catalog/offer administration, availability, seller order views and permitted fulfillment requests | Preserve seller permission model and application. |
| `staff.bazar.ua` | Internal CRM, support and reviewed operational actions | No staff privileges exposed in theme/public APIs. |
| Flutter iOS/Android | Independent API client; approved public-client OIDC/Customer Account API integration for Shopify commerce if adopted | No secret embedded in app; not a Liquid UI port. |
| Firebase | FCM push transport only | No Auth, Firestore, backend migration or hosting responsibility. |

A Shopify app is an integration adapter, not a replacement API/admin/CRM. Store credentials, identity-provider secrets and carrier credentials stay server-side. A separate IdP can sit behind the independent authentication service without renaming/deploying any current hostname in B1. The account-domain/hosted experience is a separate routing decision; do not assume `/profile/...` registers Shopify routes.

## Commerce ownership contract (proposed authoritative decisions)

These assignments are the recommended B2 baseline, **not claims about current deployed authority**. Review business/finance policy before implementing adapters. One writer per field and one payment/order authority prevents dual systems.

| Domain | Authoritative writer | Shopify / BAZAR relationship and conflict rule |
|---|---|---|
| Products | BAZAR product/offer domain for source content, seller ownership and publish approval | Shopify is approved storefront projection. Mapping `(shop, BAZAR product ID) → Shopify product GID`; Shopify-only display fields explicitly designated. Shopify edits to BAZAR-owned fields cause a drift alert, not blind reverse overwrite. |
| Product variants | BAZAR variant/offer domain for canonical identity/options | Publish stable Shopify variant GIDs, price and availability projection. Never match solely on mutable title/SKU. Historical orders retain original line snapshots. |
| Inventory/availability | Seller's approved binary availability in API; Shopify enforces projected purchasability at checkout | Existing policy avoids quantitative stock/reservations. Choose a documented Shopify tracking/availability policy and test race/oversell/quantity limits. Do not invent numeric stock. Lag between API availability and Shopify checkout is a blocker until bounded/corrected. |
| Prices | API approved catalog base-price master; Shopify checkout is final transactional price authority | Publish exact UAH amounts into Shopify variant/market configuration. Checkout revalidates current price; BAZAR projection never overrides an already placed order snapshot. Currency/tax basis must be explicit. |
| Discounts | Shopify discount engine/approved Functions for transactional application | BAZAR may supply promotion rules via versioned configuration, but cannot independently redeem a second checkout promotion. Capped single-code and per-seller allocation/rounding require parity proof. |
| Cart | Shopify cart for this sales channel, including a Flutter Storefront API cart if adopted | API can validate/read permitted context, not maintain a competing payable cart. Any earlier VPS cart is separate migration data, not automatically copied or charged. |
| Checkout | Shopify only | No Liquid fake checkout, replacement external checkout, API pay button or synthetic “paid” handoff. |
| Payments | Shopify payment session + one installed approved PSP connector | PSP is financial execution source; Shopify financial state reconciles its outcomes. BAZAR keeps a read-only financial projection/ledger, never submits another charge for the same Shopify attempt. |
| Orders | Shopify merchant order | API creates one **non-payable** BAZAR aggregate projection keyed by shop/order GID. Customer display alias is a reference, not another merchant order. `orders/create` does not imply paid. |
| Refunds | Reviewed request in BAZAR/Shopify → one Shopify-supported refund command/connector operation | BAZAR owns eligibility/approval workflow; Shopify/PSP own financial result. No independent direct PSP refund in parallel. Returned parcel does not imply refunded money. |
| Fulfillment | One approved shipment app/worker per delivery group; Shopify fulfillment records expose merchant status | Seller/API/carrier provide execution facts, including actual waybill/status. Use fulfillment-order/location scopes and assigned ownership. No duplicate labels from overlapping apps. |
| Multi-seller relationships | API owns seller membership, allocation, permissions, commissions and operational child records | One Shopify order → many seller components/delivery groups/fulfillments as approved. Each component maps order line GID, variant/offer/seller, allocation and shipment. No automatic Shopify split payouts or extra charge per seller. |

Invariants: sum of allocated merchandise/discount/tax/shipping/refund amounts equals Shopify recorded totals in minor units; rounding remainder allocation deterministic and reviewed; allocations never infer settled seller payout. Shopify tax/discount/market behaviors, binary availability policy, 5% commission base and cancellation/return deadlines must be reconciled with existing V1 contracts. Unresolved discrepancies stop relevant B2 commerce work. Data volume, merchant-of-record and seller payout/legal model remain missing information; a provider's generic “split” feature does not establish Shopify marketplace settlement compatibility.

## Synchronization design

1. Maintain immutable mapping tables for shop, product/variant/offer/seller, subject/customer, order/order-line/seller component, fulfillment/waybill and refund/payment operation. Preserve origin, upstream version, payload hash and timestamps. Uniqueness keys include shop tenant.
2. API-approved catalog changes enter a transactional outbox. Worker projects only assigned fields through scoped, pinned Admin GraphQL requests, checks returned GIDs/errors and uses desired-state comparison before retrying non-idempotent creates. Use rate-limit/backoff handling; API-specific idempotency support must be verified per mutation, not assumed universal.
3. Subscribe only to necessary supported topics for catalog/inventory drift, order creation/update/payment/cancellation, refunds and fulfillment changes, plus app-uninstalled/privacy topics as applicable. Validate topic names/scopes against chosen API version. No subscriptions created in B1.
4. For HTTPS deliveries verify `X-Shopify-Hmac-SHA256` against **raw bytes** and trusted app secret with constant-time length-safe comparison **before parsing/business use**. Reject invalid signatures. Match tenant/shop to known installation; signature is not actor/resource permission. See [Shopify delivery verification](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries).
5. Durably record authenticated ingress before success acknowledgement. Dedupe deliveries and business effects: Shopify distinguishes delivery identifiers from event identifiers; include tenant + event ID/topic for event-level dedupe when provided, and operation-specific unique keys. Persist payload hash, receive time/API version and processing status without leaking customer/card secrets. Raw-body HMAC is not a timestamp-bound replay guarantee by itself.
6. Queue processing is at-least-once. A worker transaction updates projection and emits downstream outbox events; uniqueness prevents a duplicate event from creating a second seller component/FCM message/waybill. Retry transient errors with bounded exponential backoff/jitter; permanent errors and exhausted attempts go to a dead-letter queue with alerts/owned replay tooling. Do not acknowledge before durable storage or rely on unlimited Shopify retries.
7. Events can be out of order and payloads can be stale/partial. Refresh authoritative Shopify object state when necessary; use update/version guards and separate payment/fulfillment/return states. Never move paid → unpaid or delivered → unshipped solely because an older event arrives. Corrections/refunds are explicit state changes, not history erasure.
8. Periodic reconciliation paginates current Shopify objects/transactions/refunds/fulfillments and compares mappings, line amounts and terminal states with the API projection. Use overlap windows/checkpoints, targeted re-fetch and daily exception reports. Track sync lag, missing events, drift, duplicate suppression and financial mismatches; repair through the sole authoritative writer. Prove API throttling and partial batch failures.
9. Independent API/portal actors can request approved operations; the integration worker executes exactly one command with durable intent/outcome mapping. For a timeout/unknown financial result, query/reconcile before retry, never assume failure and submit a fresh charge/refund. No snapshot restore may discard real completed orders/payments during rollback.

Security: app OAuth/session installation validation, least scopes and protected-customer-data approval as applicable; token/secret rotation; owner-bound customer read/write; seller/staff separation; CSRF/CORS and signed proxy/token validation; FCM device consent/revocation. No merchant Admin token is shipped in theme/Flutter or accepted as end-user proof. These controls are proposed; no production DB schema or webhook service was changed.

## Local technical proof and tool availability

Node v24.19.0 is available. `command -v shopify` found no CLI; `npm run theme:check` exits 127 (`shopify: not found`). No Shopify/PSP/carrier/IdP tool or configured runtime credential was available for this session. Cloud runtime reported enforced unrestricted HTTP access and no configured secret/identity bindings. This describes session readiness, not the merchant's real subscriptions. No hidden credential files were inspected and no interactive login attempted.

The isolated [OIDC/configuration contract experiment](analysis/shopify-plus-b1/README.md) uses built-in Node crypto/test modules, no dependency installation, HTTP listener, real principal or external calls. Twenty-six tests passed. Configuration cases expose unverified Plus and missing email enrollment as blockers. A valid local signature/claim fixture never issues a session or verifies an actual mailbox. It is not an OIDC provider/client implementation or security certification. The published OIDC example address appears only as a protocol test fixture, never as customer provisioning or a substitute identity.

Minimal Checkout UI Extension scaffold/build/preview is **blocked/not performed**: no CLI, registered dev app or Plus-enabled store access. Creating unbuilt TOML/JS and calling it a successful extension proof would not resolve those dependencies. B2 should use current official tooling in an isolated app after access/authorization, build a harmless static block, then prove actual supported targets and branding without deploying to production. No extension deployment or settings mutation in B1.

## Validation record

| Check | Actual result |
|---|---|
| Read instructions and three Phase A files from pinned audit branch; confirm PR #41 status | Completed; PR open/unmerged; no merge. |
| Fetch remote refs; branch from requested base; source/changed-path inspection | Completed; 71 theme paths (61 added/10 modified), source pinned to `105d10f`. |
| `node --test analysis/shopify-plus-b1/oidc-contract.test.mjs` | **26 passed, 0 failed.** Offline only. |
| `node --check` on the two local `.mjs` proof files | Passed. |
| `python analysis/shopify-plus-b1/validate.py` | Passed: six deliverables/links, exact 71-file matrix/inventory reproduction, source blobs, 33 image hashes/base bytes, branch ancestry and additive allowed scope. |
| Meest public Swagger GET/JSON parse | HTTP 200; expected paths/methods documented, hash recorded. **Zero carrier operations.** |
| Public Shopify gateway country page GET | Redirected to generic directory; no merchant-country list certified. |
| `npm run theme:check` | **Blocked/failed to execute**, exit 127: CLI missing. No Theme Check pass. |
| Existing application lint/types/unit/build, browser E2E, PostgreSQL and dependency audit | **Not rerun for this additive documentation/offline-proof change.** Phase A results are historical only; no B1 application test pass is claimed. |
| `git diff --check`; staged/committed path review | Passed; additive six documents and isolated analysis/proof files only. |
| Merchant OIDC/enrollment/session/logout/refresh/Flutter/checkout tests | **Blocked/not executed**: no verified store, Plus, IdP/SMS/email sandbox or test client setup. |
| Wallet/card/provider refunds, live carrier selections/rates/tracking, Function/branding execution | **Blocked/not executed**: no merchant/provider access; no activation/transaction authorization. |

## Unresolved decisions and access gates

| Gate | Owner / exact evidence required | Effect |
|---|---|---|
| G1 Plus/store | Merchant: store identifier, actual plan/Plus entitlement, current account mode and scoped development/collaborator access. | Blocks all claims of installed Plus functionality. |
| G2 email enrollment | Product/security: approve real verified-email gate before Shopify-linked accounts, recovery and canonical subject policy, or explicitly choose B/C. | Blocks production auth design; A does not preserve optional email across this boundary. |
| G3 checkout/account deviation | Product/design: approve D1–D12 and chosen native layout/account route after real proof; resolve Phase A C1–C10. | Blocks parity promises and dependent theme wiring. |
| G4 payment | Merchant/finance: actual Ukraine provider list, legal/acquirer approval and sandbox contract for UAH/cards/each wallet/refunds, total fees, no COD/installments. | No provider selected until proof. |
| G5 delivery | Operations: Nova Poshta/Meest contracts/test access, origin/package/payer and pre-payment point/rate proof; single waybill owner. | Blocks carrier checkout implementation. |
| G6 commerce | Backend/product/finance: field ownership, binary availability, tax/discount/rounding and seller order/payout rules. | Prevents dual charge/order systems and silent policy changes. |
| G7 tooling and proof environment | Engineering/merchant: pinned CLI/app API, harmless dev extension, IdP + email/SMS sandbox/public-client configuration. | Enables blocked B2 experiments, not production deployment. |

There is no active-access evidence for the merchant subscription, configured integrations, customer data volume, actual live theme or existing deployed DNS. Do not equate the selected architecture with deployed state. B1 stops with a review PR; [B2 plan](PHASE_B2_IMPLEMENTATION_PLAN.md) is a recommendation awaiting explicit approval. No production database, application code, original image, workflow, DNS, merchant setting or theme was changed, uploaded, published or deployed.
