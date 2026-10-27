# Phase F21 — offer catalog and server persistence evidence

Base: merged PR31 / `7fa668b0a897ebc9387fa8a6cd962de9dcad7547`. Task branch: `codex/phase-f21-storefront-integration`. This document separates implementation from verification and production availability. No Demo100% or Full Audit Ready claim.

## Implemented contracts

- [Migration0017](../apps/api/migrations/0017_seller_offers.sql): normalized offer view, per-variant attributes and owned exact-offer wishlist with composite integrity and indexes. Migrations0001–0016 unchanged; old product wishlist retained without speculative migration.
- [Offer API](../apps/api/src/catalog/offers.ts), [HTTP boundary](../apps/api/src/catalog/offer-http.ts), [OpenAPI](../apps/api/contracts/openapi.json): public offer list/detail, private owner state and idempotent wishlist PUT/DELETE. Stable identity is existing variant UUID. Enrolled listings require active seller, published product and purchasable variant; unavailable binary state remains visible.
- Search actual title/variant/attribute values, combined supported category subtree/brand/attribute/availability/minor-unit price filters, deterministic price/name/publication sorting and page-based offer counts. Bounded current implementation reads at most10000 rows then filters; larger catalogs fail closed, require indexed SQL pagination before production scale. Not a relevance engine.
- [Typed adapters](../apps/storefront/services/http/offer-catalog-service.ts) and [mapping](../apps/storefront/domain/catalog/offers.ts) preserve exact price, seller/product/SKU/variant and selected PDP query. Cards show actual seller name/variant text in existing layout, no «Від», averages or invented metadata. Default local fixture catalog also expands variants into cards. No new seller information block on PDP.
- [Customer store](../apps/storefront/services/server/customer-store.ts) and [provider](../apps/storefront/components/server/customer-provider.tsx) wire ordinary authentication/catalog/cart/header/profile-wishlist components to existing guarded APIs. Server state is authoritative for authenticated users; local guest storage is separate and contains no PII/session. No automatic guest merge. Refresh/focus provides cross-device synchronization, not push/realtime.
- F20 availability and audit/receipt semantics retained. Exact wishlist restoration joins existing F13 recipients, deduplicated by source event/user. Legacy F9 inventory stock field stays deprecated for compatibility; enrolled cart availability/canCheckout now use binary state and never a numeric stock count.

## Modes and boundaries

| Mode | Actual behavior |
| --- | --- |
| Default ordinary Next build | Existing explicitly local mock/demo services; variant card display updated. No server authentication implicitly activated. |
| `catalog-v2-preview` | Explicit read-only offer catalog, purchasing controls disabled; not production data import. |
| Isolated F21 ordinary-page entry | Shared actual customer screens, real test server OTP/session, PostgreSQL cart and exact-offer wishlist. Separate build/runtime flags and HTTPS loopback gateway; no production OTP helper. |
| Existing F15–F17 harness | Preserved separate checkout/notifications regression, not proof of ordinary checkout completion. |
| Production | No live SMS, payments, shipping, push or private test services. Required provider/security/privacy/grant approvals still absent. |

The new entry deliberately stops before checkout. Unconnected profile operations remain preview-only; real identity is not substituted by the local demo identity. Guest wishlist in this entry asks for login; it does not invent a merge. Historic product-level wishlist entries require explicit offer selection, not arbitrary migration. Genuine approved content/media/import datasets and rights remain absent.

## Reproduction / tests

Use Node24 and the repository lockfiles. `npm --prefix apps/api run test:integration` creates disposable loopback PostgreSQL, migrates and destroys it. `npm --prefix apps/api run test:storefront` builds the shared ordinary-page entry and creates isolated HTTPS/PG test infrastructure. `test:browser` retains prior checkout/notifications coverage. These runners must not run against real data or production processes.

New tests: [PG offers](../apps/api/tests/integration/postgres.test.ts), [typed offer/store unit](../apps/storefront/tests/offers.test.ts), [ordinary-page E2E](../tests/e2e/storefront-tests/offers.spec.ts). Fixture: three synthetic seller-owned listings with five offers, exact varying prices and one unavailable variant. No duplicated product per card, real marketplace listing or licensed-media claim.

Verification results are recorded below only after commands complete; initial failures and fixes are not passing coverage. Initial runs found search-control contrast below WCAG AA, test response-body synchronization and missing binary projection in the legacy cart view. Contrast was corrected within existing layout, tests wait for committed results, cart projection now respects F20 binary truth.

## Remaining gates / F22

Approved multi-seller parent/seller/shipment checkout, exact financial allocations/rounding, promo generation, shipping operator-managed pricing, payment-gated purchased-cart clearing/repeat purchase remain F22+, subject to decision register. Production SMS/BFF/domain/grants/providers, privacy/retention/consent, real source imports and media rights are not unlocked. No Demo100% / production / full audit readiness assertion.

Compatibility correction: enrolled cart inventory rows now explicitly discriminate `availabilityModel: binary` with `stock: null`, plus authoritative availability. Legacy rows retain the existing numeric protocol unchanged. Both portable validators enforce the discriminant rather than deriving binary availability from old stock. This is an additive DTO extension, not a quantitative stock emulation. The customer snapshot includes server-derived exact subtotal; the client validates reconciliation and displays it, never submits authoritative amounts.

Additional reliability checks: acknowledged cart mutations retain the same durable receipt key if subsequent snapshot refresh fails; retry cannot increment twice. Public catalog failures retain an explicit error/retry boundary and never replace rejected API data with mock products. Search landmarks now have distinct accessible names; full-page axe remains enabled. The isolated entry also reuses the existing account/content/loading/error routes, rather than adding a second account menu or leaving agreed navigation as404. Unconnected account features remain labelled preview.

## Completed local verification (2026-10-27 UTC)

| Check | Actual result |
| --- | --- |
| API unit |46 passed |
| Storefront unit, including failed-refresh receipt retry |88 passed |
| Compiled API production smoke |3 passed |
| Real disposable PostgreSQL / HTTP / security |113 passed |
| Shared ordinary storefront HTTPS E2E |12 passed: desktop1440×900/mobile390×844, independent sessions, guest no-merge, unavailable preservation/restoration, explicit API outage/retry, full-page axe/keyboard/overflow |
| Existing isolated checkout / notifications E2E |44 passed |
| Existing ordinary storefront Playwright |100 passed,8 unchanged viewport-specific exclusions |
| Governance unit |5 passed |

**411 passing cases** across these suites; repeated debug runs are not added to the total. The8 viewport exclusions are not positive coverage. API/storefront lint, API/storefront/two isolated-entry typechecks, compiled API/Next builds, ledger/path scope, local Markdown targets/OpenAPI references and `git diff --check` passed. Three dependency audits (API/storefront/E2E) reported0 vulnerabilities. Migrations0001–0016 and Shopify source remain unchanged. GitHub CI evidence is recorded on the PR's final head; local results are not a claim of live-provider, real-device, manual screen-reader or production readiness.

The new API response discriminator is consumed by the updated portable clients together with the opt-in isolated composition. Legacy rows retain their old numeric DTO; old clients must not be enabled for enrolled binary-offer rows without the updated validator. No production migration/activation is performed by this PR.
