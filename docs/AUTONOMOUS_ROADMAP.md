# BAZAR autonomous roadmap

## Purpose and evidence

This roadmap turns the remaining standalone marketplace work into dependency-ordered, reviewable increments. It is governed by `AGENTS.md`, `MIGRATION_PLAN.md`, `ARCHITECTURE.md`, `docs/APPROVED_SCREENS_AUDIT.md`, and `docs/DEFINITION_OF_DONE.md`. The approved visual reference remains `bazar-latest-shopify` commit `105d10f`; it is a design and behavior reference, not a runtime dependency.

PR #6 is incorporated as work in review, not duplicated. It provides demo-ready catalog, Ukrainian search, product details, cart persistence, tests, and URL-state behavior. Its catalog records, prices, stock, reviews, and cart remain deterministic fixtures. It does not provide authoritative inventory, orders, checkout, authentication, payments, SMS, shipping, or backend persistence.

The machine-readable source of task status is `.github/autonomous/tasks.json`. This document explains the dependency graph and product outcomes; the ledger controls task selection.

## Readiness vocabulary

- **Demo-ready:** approved UI and deterministic local behavior can be reviewed. It cannot represent a real external side effect.
- **Integration-ready:** typed contracts, secure boundaries, persistence, failure behavior, and automated tests exist; production credentials or business approval may still be absent.
- **Production-ready:** live providers, security/privacy review, monitoring, backup/restore, rollback, operational ownership, and release evidence are complete.

No feature advances readiness merely because its happy-path UI exists.

## Dependency order

```text
OPS-001 orchestration + CI
├── PHB-001 Phase B (PR #6)
│   └── UI-001 shared fidelity
└── CONTRACT-001 contracts + ADRs
    └── BE-001 API foundation
        └── DB-001 PostgreSQL
            ├── CAT-001 catalog/search API ──> CART-001 ──> PROMO-001 ──> CHECKOUT-001
            │                                  │                              └── SHIP-001
            │                                  └── WISHLIST-001                    └── ORDER-001
            └── AUTH-001 ──> PROFILE-001 ──> addresses / support / customer features   ├── ORDERS-001
                                                                                         └── PAYMENT-001
ORDERS-001 + PROFILE-001 ──> REVIEW-001 and MESSAGE-001 ──> STAFF-001
AUTH-001 + ORDER-001 ──> OBS-001
OBS-001 + STAFF-001 + PAYMENT-001 ──> VPS-001 ──> RELEASE-001
```

Independent dependency-ready tasks may proceed while another branch is blocked by credentials or decisions. Tasks that share files stay sequential to keep PRs small and avoid conflicts.

## Backlog by release stream

### Stream 0 — reliable delivery system

1. `OPS-001`: CI, browser E2E, task ledger, safe Codex runner and operations guide.
2. `CONTRACT-001`: ADRs and provisional schemas for common errors, pagination, money, timestamps, idempotency, sessions, catalog, cart, checkout, customer, orders, wishlist and messaging.
3. `BE-001`: first-party API application, validated configuration, liveness/readiness, structured redacted logging and CI.
4. `DB-001`: PostgreSQL schema, forward migrations, constraints, indexes, disposable integration tests, backup/restore expectations.

### Stream 1 — approved storefront fidelity

1. `PHB-001`: PR #6 catalog/search/product/demo-cart increment. Merge only after CI and review.
2. `UI-001`: approved header behavior, four footer socials, shared loading/error/empty/toast primitives, accessibility coverage and visual-baseline hooks.
3. `CAT-001`: replace fixture-only reads with contract-validated HTTP adapters while retaining deterministic mock mode for development/tests. Server owns price, stock, facets and search results.
4. `CART-001`: server-backed guest/authenticated cart, merge rules, authoritative totals, stale inventory and price reconciliation.
5. `PROMO-001`: promotion evaluation, expiry/conflict behavior and authoritative discounts.

### Stream 2 — checkout and orders

1. `CHECKOUT-001`: exactly three approved screens: `Контактні дані + доставка`, `Оплата`, `Підтвердження`. Demo mode must stop before any real payment/order claim.
2. `SHIP-001`: provider-neutral Нова пошта/Meest location and quote boundary; BAZAR pickup remains disabled until approved.
3. `ORDER-001`: transactional, idempotent order placement after server-side revalidation. A timeout or unknown provider result is not success.
4. `PAYMENT-001`: tokenized provider only; signed webhooks, idempotency, declines, timeouts, retries and uncertain-state recovery. Raw card data never enters BAZAR storage.

### Stream 3 — identity and account

1. `AUTH-001`: phone OTP only, secure challenge lifecycle, rate limits, replay protection, secure HttpOnly session, CSRF protection and redacted logging. Demo OTP cannot start in production mode.
2. `PROFILE-001`: exact approved sidebar order, authorized shell, mobile drawer, personal data, phone re-verification and server logout. No `Огляд` item.
3. `ADDRESS-001`: owned addresses, default selection and validated delivery-provider fields.
4. `WISHLIST-001`: server persistence, guest merge decision, synchronized header/preview/profile/product states and truthful cart errors.
5. `ORDERS-001`: current-user order list/details with authoritative status, delivery, payment, tracking and timeline facts only.
6. `REVIEW-001`: verified-purchase eligibility, moderation states, edit/delete, upload boundary and product/profile consistency.
7. `SUPPORT-001`: authorized support tickets, status, validation, attachments and retention.

### Stream 4 — marketplace communication and system boundaries

1. `MESSAGE-001`: authorized conversation membership, oldest-to-newest messages, open-at-bottom, unread-chat counts, pins, replies, deletion rules, attachment upload, retry/failure and responsive list/conversation behavior.
2. `STAFF-001`: explicit seller/staff roles, adapter contracts, authenticated events/webhooks, audit trail and outage behavior. This does not add an unapproved product-page seller block.

### Stream 5 — production and VPS readiness

1. `OBS-001`: threat model, security headers, rate limits, secret validation, metrics, traces, redacted logs, alerts and incident runbooks.
2. `VPS-001`: immutable build, least-privilege services, reverse proxy/TLS plan, secrets injection, health checks, PostgreSQL backups, restore rehearsal and rollback.
3. `RELEASE-001`: approved screenshot comparisons, desktop/mobile accessibility, critical journeys, dependency failures, load/performance budgets, SEO/redirects, analytics consent, backup/restore and rollback evidence.

Production deployment, DNS changes, merging into `main`, irreversible data migration and enabling real payment/SMS remain human-approved actions outside the autonomous loop.

## External blockers that do not stop independent work

- Approved desktop/mobile screenshots, Shopify preview, merchant settings, menus and representative media/catalog export.
- Ownership and production source of truth for catalog, inventory, pricing, promotions and orders.
- `/catalog` versus `/collections/{handle}` redirects and `/profile` landing decision.
- SMS provider, sender approval, consent/privacy rules and rate-limit policy.
- Нова пошта/Meest credentials and commercial/service decisions.
- Payment provider, merchant account, PCI scope, fiscalization, refunds and legal terms.
- Seller/staff systems, role owners, messaging moderation and retention.
- VPS OS/host, DNS/TLS ownership, monitoring destinations, backup destination and incident owners.

When blocked, the autonomous loop records the exact missing decision or secret in a GitHub issue and selects another dependency-ready task. It never invents a value.

## Release milestones

| Milestone | Minimum contents | Truthful label |
| --- | --- | --- |
| M1 storefront demo | PR #6, shared fidelity, checkout UI with stopped side effects | Demo-ready |
| M2 first-party integration | API, PostgreSQL, catalog/cart, identity/profile and contract suites | Integration-ready |
| M3 commerce integration | delivery, order transaction and tokenized payment in approved non-production environment | Integration-ready |
| M4 marketplace integration | orders, wishlist, reviews, support, messages and staff boundaries | Integration-ready |
| M5 release candidate | security, observability, VPS, backup/restore, parity and resilience evidence | Production-ready candidate; still requires human release approval |
