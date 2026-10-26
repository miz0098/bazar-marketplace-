# ADR 0001 — Phase F1 API foundation

Status: implemented for the foundation; business contracts remain provisional.

## Evidence and decision

At `6112f74` the repository contains independent npm projects for Next.js 16 / React 19 and Playwright, uses Node 24 in CI and has no API, database driver, ORM or shared workspace package. Storefront contracts deliberately expose demo-only identity, account and communication behaviors. Reusing their mock implementations as authoritative backend services would misrepresent authentication and commerce.

Use Node 24, TypeScript and native `node:http` in isolated `apps/api`. There are zero runtime dependencies, independent lockfiles and no root-workspace migration. With only liveness, readiness and discovery routes, a framework and middleware stack add little value. Fastify is a reasonable alternative to revisit before substantial business routing/schema validation is added; do not grow a bespoke general-purpose HTTP framework.

Actual routes: GET/HEAD `/health`, `/ready`, `/api/v1`, with validated OPTIONS preflight. Only `/api/v1` is a versioned discovery response. Unknown business paths return 404. Foundation GETs reject query parameters and bodies; there is no JSON mutation endpoint or authentication fallback.

Use an allow-listed environment configuration and an allow-listed structured logger. Neither request URLs, queries, bodies, headers, environment values, error messages nor stack traces are logged. CORS permits exact configured origins, GET/HEAD and Content-Type only, with no credentials. A generated UUID correlates response/error/log records; incoming request IDs are not trusted.

## Boundaries and deferred decisions

- `/ready` currently checks process availability and shutdown state only. Its dependency list is explicitly empty and `businessModulesAvailable` is false. There is no database or provider readiness claim. The injected readiness predicate is tested for future required dependencies; adding PostgreSQL must replace the empty dependency description with real bounded probes before claiming database readiness.
- Keep every storefront domain provider on mocks. The new server-only factory can probe foundation health/discovery but is not selected or invoked by existing pages.
- Business routes, DTOs and PostgreSQL entities are proposals, not enabled operations. API ownership, catalog source of truth, guest cart identity/merge, inventory reservation, checkout ownership, payments, SMS delivery, privacy/consent and retention need explicit product/backend review before implementation.
- Prefer a Next.js BFF with HttpOnly sessions. CORS is not authorization; credentialed cross-origin sessions are not enabled by F1. Select CSRF/session/rate-limit policy before implementing auth. Do not export browser-readable tokens.
- No DB client, connection pool, ORM, actual migrations, data import or paid provider is introduced. PostgreSQL 17 is the proposed local baseline; pin a reviewed patch/digest before operational use.
- No deployment, DNS change, autonomous paid action or merge is part of F1.

Acceptance evidence is the API integration suite, compiled-process smoke tests, storefront regression tests and ordinary pull-request CI. Review this decision when activating the first business module.
