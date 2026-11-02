# BAZAR.UA — Shopify restoration plan

Date: 2026-11-02. **Proposal following Phase A; not implementation authorization.** Read the [audit](SHOPIFY_RESTORATION_AUDIT.md) and [33-file design map/conflict register](DESIGN_REFERENCE_MAP.md). Work remains based on `design-reference-storefront`; Phase A branch is `codex/shopify-restoration-audit`.

## Proposed target architecture

| Surface | Responsibility | Explicit boundary |
|---|---|---|
| `bazar.ua` | Shopify Online Store 2.0/Liquid storefront; Shopify cart/checkout and order/payment facts, subject to confirmed business ownership | Restore approved BAZAR appearance, not generic Horizon or a redesign. Theme cannot freely replace checkout/current-account rendering. |
| `api.bazar.ua` | Independent backend, product/seller adapters, customer features, carrier integration, event processing and Shopify synchronization | Server-only app credentials; verified principal and per-resource authorization. Do not duplicate Shopify checkout payment creation. |
| `admin.bazar.ua` | Independent seller administration | Preserve seller application/contracts; no move into Shopify Admin or theme. |
| `staff.bazar.ua` | Independent internal CRM | Preserve CRM and role separation; no storefront exposure of privileged APIs. |
| Flutter app | Independent mobile client consuming approved API/identity contracts | No UI or app migration into Shopify; only evaluate shared ID/auth compatibility where needed. |
| Firebase | FCM push notifications only | No Firebase Auth, Firestore, application backend or hosting dependency. |

Proposed commerce boundary: Shopify handles customer-facing cart, payable totals, payment gateway and canonical merchant order/payment/fulfillment/refund facts. The independent backend stores seller-domain projections, carrier events, support/wishlist/reviews and approved accounting/commission records. Final field ownership must be reviewed because existing V1 contracts model binary seller availability, per-seller components and financial rules that Shopify does not automatically implement.

| Data | Proposed authority | Integration contract to prove |
|---|---|---|
| Seller identity/permissions/offers | Independent API | Stable seller/offer ID ↔ Shopify product/variant mapping; prevent publishing another seller's offer. |
| Catalog storefront projection | Shopify, synchronized from reviewed upstream fields | Decide upstream owner for each field, variants/options/media/collections/metafields; no bidirectional last-write-wins ambiguity. |
| Availability | API seller decision projected to Shopify purchasability | Binary availability vs Shopify stock/oversell rules must be tested; do not invent quantity stock or unlimited purchase semantics. |
| Cart/discount/payable tax/shipping totals | Shopify checkout | Reconcile capped single-promo, integer rounding and seller allocations. API must not send a competing payable total. |
| Payment/refund facts | Shopify and configured PSP, reconciled by API | One durable operation mapping, verified callbacks, out-of-order handling; no synthetic payment-success authority. |
| Merchant order and seller components | Shopify order + independent domain projection | One Shopify order may project to multiple seller components; agree fulfillment splitting, cancellation deadlines, return/refund/commission allocation. Do not create new payable orders from webhook retries. |
| Customer identity | Supported Shopify account linkage to approved independent identity | Phone/SMS no-password requirement, verified-email constraint, unique subject/customer mapping and account recovery decision. |
| Favorites/reviews/messages/support | Independent API or selected app under a reviewed owner | Owner authorization, persistence, consent/retention, moderation, pagination and event contracts. |
| Carrier selection/waybills/tracking | Validated server/carrier state | Store stable IDs and snapshots in order metadata; tracking events must not imply paid or refunded. |

Use authenticated Admin GraphQL operations only on server, least scopes, explicit API version, cursor pagination/backoff, verified raw-body webhook signatures, durable inbox/outbox, deduplication, dead-letter handling and periodic reconciliation. For theme-to-API private features, use a supported app-proxy/session architecture with verified signatures and subject linkage; do not trust browser-submitted customer IDs, localStorage flags, order IDs or seller IDs. Account-extension calls require validated Shopify session tokens, not browser cookies assumed to cross account origins. Protect customer data access and obtain applicable Shopify approvals. These are requirements for later work, not existing configured integrations.

## Dependencies and gates

**A1–A5 in the audit are critical architecture gates.** Resolve the merchant plan/entitlements, identity including verified email, checkout/account rendering expectations, gateway/merchant eligibility and commerce ownership before promising end-to-end Shopify fidelity. Design decisions C1–C10 and carrier configuration are prerequisites for affected screens. Preserve every alternative reference while recording decisions in future reviewable documentation.

Recommended sequence:

`Phase A review → decisions and development setup → checkout/auth/payment/delivery feasibility proofs → theme recovery and visual baseline → storefront data/features → integration and reconciliation → validation/UAT → separately approved release`

Do not wait until theme completion to discover that mandatory SMS or pre-payment delivery cannot work on the selected plan. No implementation phase starts until explicit approval after Phase A.

## Implementation phases and acceptance

### Phase A — completed audit, stop for approval

Deliver audit, restoration plan, complete design map and read-only evidence inventory. Commit documentation/analysis only on `codex/shopify-restoration-audit`; prepare PR to `design-reference-storefront`. Do not merge, change functionality, deploy or publish. Historical task ledgers and workflows remain untouched.

### Phase B — decision records and isolated feasibility proofs

Prerequisites: explicit Phase B approval; merchant-owned development store/access and a clear distinction from production. Record plan/country/installed-app/theme/account/checkout settings, gateway and carrier candidates; export snapshots without secrets. Pin Shopify CLI/extension tooling in the approved development workflow. Do not pull over existing code; retrieve authorized theme snapshots into a separate analysis/recovery location and compare with pinned Git sources.

Prove four connected flows in development: supported checkout branding/step layout, phone/SMS identity linkage, card/Apple Pay/Google Pay via actual Shopify gateway, and Nova Poshta/Meest branch selection before payment. Document native vs redirected wallets and accelerated checkout bypass. Capture failed/pending/declined/cancelled outcomes. Obtain product approval of unavoidable visual differences before extending these flows.

For SMS, evaluate Plus + non-Firebase OIDC/SMS stack, including Shopify's mandatory verified-email claim. Optional-email registration is not satisfied by this architecture without a decision. A separate BAZAR login could support API features, but must disclose its separate Shopify identity/checkout behavior and is not accepted automatically as restoration. Do not synthesize emails or falsely verify them. Legacy password accounts are not the default solution.

Exit: reviewed architecture decisions, documented proof evidence and viable provider contracts. If a mandatory capability is unsupported, stop the dependent implementation and return the concrete constraint/options for approval.

### Phase C — controlled Shopify source recovery and design baseline

Use the required base plus **selective, reviewed recovery** from `bazar-latest-shopify@105d10f`, preserving Horizon. Do not merge wholesale, reset the base to that branch or copy Next.js JSX into Liquid. Record source paths/SHAs for each recovered customization and inspect native loader/template/settings changes. Recover shell, tokens, shared cards and page sections incrementally, with separate PRs after authorization.

Remove/rebuild unsafe mock-success auth semantics in any recovered production path; do not ship them behind a hidden-looking UI. Reconcile stale Horizon documentation in a later approved documentation change. Complete native Ukrainian translations. Preserve store settings/content by explicit comparison; never overwrite `settings_data.json` or live theme customizations blindly.

Set up OS2 home/collection/product/cart/search/page templates and section groups; keep editor settings meaningful. Recover actual matching logo/icons/illustrations/media where licensed; request missing exports. Use agreed Inter weights, measured spacing/radii, colors and state rules. Avoid transforming design presentation boards into storefront pages.

Exit: unpublished theme preview with agreed shell/shared components and known page routes, no counterfeit identity/payment states, Theme Check findings triaged and desktop/mobile component screenshots approved.

### Phase D — storefront pages and customer features

Implement home, header/navigation/footer, catalog/filter/sort/pagination, PDP/gallery/variants/reviews/Q&A hooks, cart/discounts, search and legal/help pages against real Shopify or explicitly unavailable API data. Complete empty/loading/error/disabled states. Preserve product IDs, price precision, locale/currency and accessibility; no fallback fake products or live-success copy.

Choose and implement a supported customer-account route model. Shopify native accounts with extensions can deliver many functions but not unrestricted approved sidebar styling. Full-page extension/custom account options require Phase B decisions. Theme `/pages/profile` and app-proxy routes have different constraints from existing `/profile/...`; review old links/deep loads/refresh/back/forward and account authorization. Do not assume `page.profile.json` registers nested routes.

Wishlist, messages, support, reviews, saved carrier addresses and seller-order timelines require reviewed server services and cross-customer access tests. Saved payments remain hosted by supported Shopify/provider facilities, never custom PAN/CVV storage. Add FCM only through independent backend device-token and consent flows if approved; it must not become authentication or primary data storage.

Exit: all in-scope design-map surfaces have a real data path or a clearly identified blocker; mobile and desktop screenshots approved; inaccessible/stale/failure states are truthful.

### Phase E — commerce/carriers and independent backend synchronization

Implement Shopify app/webhooks/ID mapping and approved order/payment/fulfillment/refund state contracts. Preserve API, admin and CRM as independent applications. Reconcile historical VPS orders separately if needed; do not import them as new payable Shopify orders.

For Nova Poshta/Meest, choose vetted app or backend adapters after sandbox evidence. Keep carrier credentials server-only; directory caches and location freshness, recipient details, seller origins/packages, order metadata, waybill idempotency and tracking reconciliation must be covered. Confirm shipping payer/tax/tariff behavior. In eligible API 2026-10 configurations, explicitly attach CarrierService to intended delivery profiles/zones. BAZAR pickup and COD stay disabled; existing Ukrposhta source remains preserved but is not enabled in restored storefront.

Reconcile Shopify discounts/taxes/money with backend seller allocations and commissions. Require exactly one charge/order authority and safe partial-failure recovery. Payment return URLs and frontend confirmation are never payment evidence. Verify accelerated checkout cannot omit required validated carrier selection; if unsupported, return a blocker rather than inventing a completion step.

Exit: end-to-end sandbox journeys through each approved provider/method, delivery and seller combination; duplicate/out-of-order webhook tests and reconciliation reports; no accidental privileged portal/backend changes.

### Phase F — pre-release verification and UAT

Run the testing matrix below against pinned commits and a development/unpublished theme. Resolve critical findings and record remaining platform deviations, legal/content decisions and measurable performance/accessibility budgets. Demonstrate representative multi-seller orders, carrier failures, OTP expiry, card/3DS/decline/pending, refresh/retry, cancellations/returns and actual approved account linkage.

Exit: reviewed acceptance evidence from design/product, merchant operations and engineering. Theme readiness, backend readiness and live provider readiness are separate statuses. Passing simulation tests does not combine them into production approval.

### Phase G — separately approved production cutover

This is a future deployment strategy only. No Phase A permission to change store settings, upload/publish themes, install apps, alter DNS, configure gateways or merge is implied.

## Shopify configuration checklist for later authorized work

| Configuration | Required decision/verification |
|---|---|
| Store and plan | Merchant entity/country/currency, exact plan, Plus and carrier-rate entitlements, development store; installed apps/scopes/protected customer data. |
| Theme | Approved Horizon source/version; unpublished review theme; theme editor settings, templates/menus/assets/fonts; release allowlist; Ukrainian locale and accessible defaults. |
| Catalog | Products/variants/collections/media/vendor/metafields/metaobjects, filter definitions, review app/data owner, binary availability mapping and ID reconciliation. |
| Markets/legal | Ukrainian UI, UAH and actual tax/market policy, contact/sender domains, final offer/privacy/returns/terms and notifications; no sample screenshot text as legal policy. |
| Accounts | Account mode/domain, approved SMS/OIDC setup and verified-email resolution, callbacks/logout/recovery, no-password flow and independent API subject mapping. |
| Checkout | Supported layout/branding/extensions, delivery/contact settings, checkout/cart validation approach and express-wallet behavior; document exact design deviations. |
| Payments | Supported Shopify PSP, merchant onboarding and test mode, card/Apple Pay/Google Pay availability/placement, 3DS, settlement/refunds. Disable COD and unapproved manual alternatives. |
| Shipping | Nova Poshta/Meest accounts/apps, origins/locations/packages, branch/locker coverage, zones/rates/profiles, shipping payer/tax policy; local BAZAR pickup off. |
| App/backend | API version/scopes, secure credential storage, webhook registrations, app-proxy/session validation, allowed origins, independent workers/reconciliation/observability. |
| URLs/SEO | Actual existing URL/canonical/sitemap/redirect inventory, collection/product handles, `/catalog`, `/profile`, help/info routes; test deep links and preserve SEO. No DNS changes before release approval. |

## Design implementation strategy

Treat page boards as compositions and component/token sheets as supporting specifications. Resolve contradictions explicitly via C1–C10; do not give arbitrary precedence to a FINAL label or latest-looking filename. The user already specifies three checkout stages, phone/SMS without passwords, no COD, Nova Poshta/Meest and disabled BAZAR pickup. Those are requirements; platform restrictions require a decision, not silent substitution.

Create a page/component-to-source matrix during implementation using DESIGN_REFERENCE_MAP as the baseline. Preserve layout, typography, hierarchy, whitespace, colors, icon stroke, cards, buttons, disabled/loading/error states and responsive navigation. Store final approved tokens once rather than retaining competing blue values from recovered code. Use approved screenshot regions at consistent viewport and content state; normalize only nondeterministic data, never mask layout differences. All originals remain byte-identical.

Mobile targets from Responsive Rules are candidate specifications until C4 is settled: test 320/390/767, 768/1023, 1024/1280/1439 and 1440/1536 widths with long Ukrainian content. Include touch/filter drawer/navigation behavior, keyboard focus and no horizontal overflow. Responsive reference exists, but complete mobile page artwork does not; review inferred layouts before acceptance. Flutter screen design is outside this task.

## Testing strategy

| Layer | Required later validation | Acceptance evidence |
|---|---|---|
| Repository/static | Documentation/link/hash checks; pinned Shopify Theme Check; Liquid/schema/templates/assets/snippets/editor section lifecycle and clean theme-package allowlist | Actual tool versions/commands/results and triaged warnings; no claims based only on static parser. |
| Regression | Existing storefront/API lint/types/unit/build; API production-boundary, PostgreSQL integration and browser suites where affected | Preserve existing tests while adapting meaningful contracts. Fix failures or identify exact blockers. |
| Shopify storefront | Development-store desktop/mobile home/catalog/PDP/cart/search/help/info and theme-editor add/remove/reorder/settings | Visual diffs against resolved references and functional Playwright journeys. Test AJAX section/cart updates and multi-locale routes. |
| Identity/account | Real SMS sandbox, OTP invalid/expired/throttled, duplicate phone/email, phone change/recovery, customer linking/login/logout, refresh/deep routes, cross-user access denial | Shopify and independent API identities reconcile; no fake fallback. Verified-email decision exercised. |
| Checkout/payment | Real supported gateway test mode; card/Apple/Google eligibility, 3DS, decline/pending/timeout/cancel/retry, back/refresh/duplicate clicks and webhook reorder | Exactly one financial outcome/order, server-confirmed totals; screenshots acknowledge platform limits. Native/redirected/express paths tested separately. |
| Carriers/orders | Nova Poshta/Meest directory failure/staleness, branch/locker/recipient validation, per-seller delivery, rates/taxes, waybill/tracking, cancellation/partial refund | Persisted stable selections and reconciled shipment/payment facts; no COD/BAZAR pickup/Ukrposhta inadvertently enabled. |
| Security | Resource ownership, signed proxies/webhooks/tokens, CSRF/CORS, scope restrictions, rate limits, no sensitive browser storage/logs | Negative tests deny cross-customer/seller/staff access; backend secrets and PAN/CVV absent from theme assets. |
| Performance/accessibility | Keyboard/focus/dialog trapping/restoration, screen readers/labels/errors, contrast after palette resolution, reduced motion, long text, image sizing, loading stability and Core Web Vitals | Representative real-device review plus automated checks; agree budgets before launch, do not invent measurements. |
| Operations | Retry/dead-letter/replay/reconciliation, monitoring/alerting, backups/restore and rollback rehearsal | Documented rehearsal with no duplicate orders/charges or lost provider events. |

Future CI must explicitly cover the restoration base/task branches and theme checks. Existing CI only auto-targets vps-migration. Keep any CI/workflow changes as a separately approved implementation PR. No successful live checkout/provider, E2E or PostgreSQL test is claimed by this plan; Phase A executed checks are in the audit.

## Deployment strategy (future, requires explicit release approval)

1. Record reviewed commits, theme ID/version, app/backend releases, checkout/account configurations and dependency/provider versions. Back up published theme/settings, URLs/catalog/customer mappings and backend database; verify restore, not just export creation.
2. Create an explicit **theme-only** release artifact from `assets/blocks/config/layout/locales/sections/snippets/templates`, excluding apps, design references, infra, docs, credentials and tooling. Current `.shopifyignore` is not proof of a safe release package.
3. Upload an unpublished theme only after authorization; test against intended catalog and app configuration. Install/configure approved apps/extensions/backend services separately with least scopes. Publishing a theme does not deploy API/workers or roll back checkout/account settings.
4. Complete UAT, approve known platform deviations, reconcile catalog/customer/order mappings, and rehearse rollback. Choose a merchant-approved cutover window and minimize data-write overlap; existing orders must continue processing.
5. Obtain explicit production release approval on the concrete reviewed artifacts/configurations. Publish only the approved theme and separately approved settings. If DNS change is necessary, approve that exact change; never touch API/admin/staff routing or mail records as a side effect.
6. Monitor real checkout failures, authentication, carrier selection, provider reconciliation, webhooks, fulfillment, financial mismatches, performance and independent portals. Assign release/rollback owners and incident response; do not perform live money tests without separate approval.

## Rollback strategy

Before cutover retain the previous published Shopify theme ID/settings and any actual prior VPS routing/service artifacts. The current live baseline is unknown, so verify which rollback restores service before choosing a procedure. Preserve backend schema compatibility, encrypted backups, webhook inbox/outbox and immutable order/payment mappings. Prefer additive migrations; no destructive rewrites are part of restoration.

Trigger rollback for unavailable mandatory payment/delivery/auth, wrong totals/duplicate orders, exposed customer data, or critical visual/navigation regressions, with concrete thresholds/owners agreed during release planning. Republish the prior theme if the fault is theme-local; restore independently versioned checkout/account/app configuration for those faults. Use approved feature controls to stop affected writes while continuing to ingest provider/webhook facts. If DNS was changed, restore only the documented approved routing, acknowledging propagation delays. Do not reset live databases to erase orders or retry charges blindly.

Reconcile in-flight carts/sessions/orders/payments/shipments across the cutover window before resuming. A theme rollback cannot reverse a charge, carrier waybill, customer-account migration or external event; those need reconciliation and approved operational compensation. Shopify currently documents a limited account-upgrade reversion window; verify it at release time rather than assuming indefinite reversibility. Prove both forward and rollback paths in development and capture the merchant decision before production.

## Phase A stop and approval requirements

Review the PR, A1–A10 decision table and C1–C10 design conflicts. Resolve the critical plan/identity/checkout/payment/commerce boundaries and explicitly authorize the next phase. No Shopify implementation, functionality change, production configuration, merge or deployment has been performed or is authorized by this document. Stop after preparing the Phase A PR.
