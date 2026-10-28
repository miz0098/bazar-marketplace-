# F25 — BAZAR Business seller dashboard and Codespaces preview

Base: merged PR #36, `8080264d651a30311572f562c8d890a71a8ae116`. Branch `codex/phase-f25-seller-dashboard`.

Product clarification: original seller mockups are unavailable. Implement the approved six-item navigation/settings structure using BAZAR tokens/Inter/responsive components. **Original design parity: NOT VERIFIED**; separate desktop/mobile review follows F25. Do not claim pixel/design acceptance.

Implementation plan: dedicated apps/seller-admin, shared central API/domain services/PostgreSQL; verified seller-owner capabilities, scoped views/mutations, immutable finance, F23 lifecycle and F24 communication reuse. Add migration0021 only. No staff/customer directory, inventory, production money/providers or unapproved campaign funding/settlement.

Preview architecture: independent host-only Secure/HttpOnly/SameSite cookies on Storefront3000 and Seller3001; same test API4000 and disposable PostgreSQL. Private gateways validate each exact external origin and sign internal transport context. Central API selects origin-bound F4 auth configuration/CSRF keys, so copied cookies/flows cannot cross realms. No wildcard CORS, cookie Domain or production auth relaxation. Demo OTP is test-account/flow-bound and separate from production. Exact setup/commands belong to CODESPACES_PREVIEW.md.

## Local validation (2026-10-28)

- API unit 64/64; production-runtime checks 3/3; Seller Admin client tests 4/4; Storefront unit tests 99/99.
- PostgreSQL migration/business/security suite: **156/156**; rerun passed after correcting the regression fixture to use the confirmed seller-order state and its current version. API HTTP browser and ordinary Storefront browser suites: 44/44 each.
- Dual-origin isolated Seller Admin/Storefront browser preview: 40/40 desktop/mobile assertions, including exact seller-price propagation, buyer order visibility, two-way message synchronization, OTP/session refresh/logout, route accessibility, and no horizontal overflow.
- Existing Playwright desktop/mobile regression: 100 passed, 8 conditionally skipped by the existing project matrix; seller preview additionally runs axe and overflow checks across all 12 seller destinations at 1440×900 and 390×844.
- Lint, TypeScript (including isolated preview server), production builds and four package dependency audits passed; governance 5/5 and `git diff --check` passed.

GitHub CI is running for [PR #37](https://github.com/miz0098/bazar-marketplace-/pull/37), head `ffb8493`. No Demo100%/Production Ready, merge or deployment.

## Implemented boundaries and scope

- apps/seller-admin: six main sections, six settings, contextual conversations/Q&A/notifications, static+380 OTP login, Inter and BAZAR tokens. Original pixel/layout parity remains NOT VERIFIED.
- Central seller HTTP: verified session and CSRF/Origin; seller membership is derived/rechecked server-side; owner-only capabilities, no staff grants/customer directory. Separate seller-only projections prevent parent-order cross-tenant leakage.
- Additive0021: profiles, encrypted synthetic bank records, command receipts/import previews, campaign drafts, document metadata, operational notes/responses, immutable audits and seller scopes on the F13 inbox. Existing0001–0020 preserved.
- Catalog updates reuse F20 authorization/versioning/audit/back-in-stock logic; additive category/archive/media support, normalized product/variants, exact prices and binary availability. Imports preview before insertion and reject existing/duplicate SKUs.
- F23 commands reused for order acknowledgement/preparation/cancellation/return/escalation and fixture-verified dispatch. No arbitrary lifecycle updates or implied refund completion.
- Authorized CSV/XLSX/PDF export: UTC date range, bounded1000 rows, no buyer contact fields, formula-safe strings, embedded redistributable DejaVu font for Ukrainian PDF. Dependencies must pass audit.
- Campaign creation is inactive/draft-only until funding/applicability approval; no unapproved seller discount funding. Finance reads frozen seller snapshots; payout balance is null and payouts unavailable.
- Filesystem-only OTP/provider test harness; signed, nonce/body/method/path/cookie/CSRF-bound gateway transport; exact two-origin auth realms; no production provider activation. See CODESPACES_PREVIEW.md.

Pending: GitHub CI and original design acceptance; production RBAC grants, SMS/payment/carrier/storage providers, settlement/funding/privacy/retention policy. This is not Demo100% or Production Ready.
