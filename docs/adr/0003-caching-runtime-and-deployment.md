# ADR-0003 — Caching, runtime and deployment boundaries

- **Status:** Proposed; infrastructure decisions outstanding (not approved)
- **Task:** CONTRACT-001
- **Date:** 2026-10-24
- **Evidence:** `AGENTS.md`, `MIGRATION_PLAN.md`, `ARCHITECTURE.md`, `docs/DEFINITION_OF_DONE.md`

## Boundary proposal

Browser → Next.js App Router storefront / same-origin BFF → versioned first-party API (target `api.bazar.ua`) → approved domain services and PostgreSQL (future). Separate `admin.bazar.ua` and `staff.bazar.ua` remain distinct role/authorization surfaces and are **not** implicitly permitted to reuse customer permissions. Target hostnames and environment names are planning labels, not live deployment assertions.

`apps/storefront` currently selects a mock-only service provider; do not silently turn HTTP mode on. Production must fail closed when required API config, secrets or upstream dependencies are missing. Secret-bearing calls stay server-side.

## Caching/freshness proposal

| Resource | Provisional rule | Owner/trigger for adjustment |
| --- | --- | --- |
| Public product/catalog descriptions & images | Can use bounded CDN/SSR cache after catalog owner defines publication/version events | Catalog owner: TTL, ETag, invalidation, image rights |
| Search facets and listings | Short-lived or no shared cache until inventory/facet freshness measured | Search owner: indexing lag and canonical result behavior |
| Price, stock, promotion, shipping and checkout quote | Authoritative validation at cart/checkout/order boundary; never trust cached browser totals | Commerce owner: staleness SLO, version and retry |
| Sessions, account, orders, wishlist, messages, cart | **No shared/public cache**; user partitioning, `Cache-Control: private, no-store` on personalized BFF responses | Security/privacy: cache isolation tests |
| OTP/challenges, payment/provider responses | `no-store`; no payloads in metrics/logs | Security/finance: retention controls |

Only add stale-while-revalidate where consistency policy explicitly permits it. Document invalidation mechanisms and version tokens before enabling caches on mutable commerce data.

## Runtime, observability and release proposal

- Pin and test an agreed Node LTS version for storefront/API on CI and VPS; review the announced GitHub Actions Node 20 → 24 transition separately from the application runtime.
- Reproducible lockfiles, immutable builds and least-privilege non-root services; reverse proxy/TLS and DNS changes are separate human approvals.
- PostgreSQL: migration rehearsal from empty and previous version, protected backups, restore evidence, roll-forward strategy and encryption/access roles before production.
- Liveness indicates process is alive; readiness reflects required dependencies. Redacted structured logs carry correlation IDs, not full phone numbers, OTPs, payment data, addresses or messages.
- Production-like staging with browser/accessibility/contract/integration/security tests; failure injection, health checks, rollback rehearsal and alerts before any cutover.
- Keep Shopify source intact until parity sign-off; do not deploy, merge to `main`, modify DNS, or enable live SMS/payment through this ADR.

## Alternatives/decisions awaiting owners

**Hosting:** single VPS + containers vs managed runtimes; resource limits, scaling, hardening and recovery obligations differ.

**API protocol:** REST/OpenAPI initially proposed for independent clients; future staff/seller event/webhook boundaries require ownership, signatures and replay policy.

**Observability:** vendor, alert destination and on-call owner unknown.

**Approval owners:** operations/security for network/TLS/secrets/backups; backend for contracts/health/cache; product/SEO for parity; business for domain ownership and production authorization.

## Revisit triggers

Benchmark results, approved catalog data SLA, production secrets/runtime decision, restore test, signed security threat model, and stakeholder sign-off. The provisional OpenAPI is a review artifact, not a deployment gate bypass.
