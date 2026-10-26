# BAZAR API foundation

Phase F6 update: isolated PostgreSQL checkout/orders foundation uses verified test sessions, three draft stages, revalidated prices/stock and idempotent immutable pending records. Ordinary /api/v1/checkouts and /api/v1/orders routes return 503. No real payment, delivery, SMS or stock reservation is activated; [ADR 0006](../../docs/adr/0006-orders-checkout-foundation.md) defines contracts and blockers.

Phase F5 update: isolated PostgreSQL promotion evaluation is available only in test composition; ordinary POST /api/v1/pricing/promotions/evaluate returns 503. Exact integer percentage/fixed arithmetic, validity/minimum/product/usage checks and test-only durable claims are documented in [ADR 0005](../../docs/adr/0005-promotions-pricing-foundation.md). No HTTP redemption or checkout activation is added.

Phase F4 update: the OTP/session/current-user/logout handlers are integration-tested with PostgreSQL and a test-only SMS adapter. Ordinary startup registers no auth adapter and returns 503 for auth routes. AUTH_MODE values other than absent/disabled are rejected; test senders cannot be enabled through environment configuration. See [ADR 0004](../../docs/adr/0004-server-auth-foundation.md).

Phase F3 update: public PostgreSQL catalog GET/HEAD routes are available at /api/v1/products, /api/v1/products/{handle}, /api/v1/categories. Cart paths return 401 AUTH_REQUIRED, with no caller identity fallback. Internal transactional cart persistence is integration-tested but not exposed. See [ADR 0003](../../docs/adr/0003-catalog-cart-boundaries.md) and OpenAPI. The F1/F2 sections below describe the foundation history.

Historical F2 foundation: Node 24 + TypeScript, native `node:http` plus the `pg` driver. F2 adds PostgreSQL schema/migrations and readiness; phone authentication, catalog, orders, messages, payments and all other business HTTP operations remain unimplemented.

```sh
cd apps/api
npm ci
cp .env.example .env.local
npm run dev
# Production artifact locally:
npm run build
npm start
```

Defaults: `127.0.0.1:4000`; storefront remains independently available on port 3000 with its mocks. No production credentials are necessary. `.env.local` is optional and ignored. Process environment wins over the optional env file. `npm start` is a local artifact check, not deployment.

## Implemented HTTP surface

- GET/HEAD `/health`: process liveness and integer uptime. No dependency health claim.
- GET/HEAD `/ready`: process readiness, false during shutdown or a failing injected predicate; checks PostgreSQL connectivity and exact migration history/checksums; reports a PostgreSQL dependency and `businessModulesAvailable: false`. Missing configuration, stale/missing schema or unavailable DB returns 503. No business/provider readiness is claimed.
- GET/HEAD `/api/v1`: service/version discovery with business modules explicitly unavailable.
- OPTIONS on those routes: validated CORS preflight, 204 without a body.
- Cart paths: 401 AUTH_REQUIRED; catalog paths use the F3 OpenAPI contract. Other unmatched paths: 404. Unsupported methods: 405 with Allow; malformed URL/query/body: 400. Header overflow: 431. Unexpected application errors: sanitized 500. Readiness failure: 503. HEAD has no body, including errors.

Success/error envelopes, UUID request IDs and exact schemas: [OpenAPI](contracts/openapi.json). GETs do not accept query strings or bodies; no business input or JSON mutation parser exists. HTTP header/request/keep-alive limits bound idle clients. There are no production-looking business stubs.

## Configuration

| Variable | Default / validation |
| --- | --- |
| NODE_ENV | development; development/test/production only |
| HOST | 127.0.0.1; explicit IPv4/IPv6 address |
| PORT | 4000; 1–65535 (0 only in tests for ephemeral ports) |
| CORS_ORIGINS | exact localhost:3000 and 127.0.0.1:3000 origins in development; explicit in production, HTTPS only. Empty explicitly disables browser origins. Wildcards, `null`, paths and credentials are rejected. |
| LOG_LEVEL | info or error |
| SHUTDOWN_TIMEOUT_MS | 5000; 100–30000 |

Only configured origins receive Access-Control-Allow-Origin. No credentialed CORS, wildcard, forwarded identity, cookies or auth state is enabled. Preflight permits GET/HEAD with Content-Type only; X-Request-Id is exposed in responses. CORS is not authorization. Future cookie auth needs a separate BFF/session/CSRF design.

Logs contain generated request ID, normalized method, matched route label, status, duration and lifecycle event. Raw URL/query/body/header/env/error data are never accepted as log fields. Validation errors name the invalid variable without its value. Keep tokens, phone numbers, messages and addresses out of logs; do not add secret configuration to NEXT_PUBLIC variables.

SIGTERM/SIGINT stop accepting connections, close idle sockets and allow active HTTP requests to finish up to the configured grace period, then close remaining connections. Shutdown is idempotent. No forced process exit skips cleanup. Native parser errors also receive sanitized JSON.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:production
npm run test:integration
npm audit --audit-level=high
```

Tests bind to loopback ephemeral ports and cover config, CORS/preflight, validation, actual HTTP responses/errors, missing business routes, logs, readiness, bounded shutdown and the compiled Node process. Production smoke tests also call the actual API through the opt-in storefront client to verify protocol compatibility. CI runs these checks independently from the full storefront regression suite. No external SMS/payment/provider is used; the database integration suite uses an isolated local PostgreSQL container.

## Design and next modules

- [ADR 0001](../../docs/adr/0001-api-foundation.md)
- [Planned module contracts and authorization limits](../../docs/API_MODULES.md)
- [PostgreSQL architecture and migration policy](../../docs/POSTGRES_ARCHITECTURE.md)

Module types in `src/contracts/modules.ts` are provisional design contracts, not live adapters. Implement one reviewed domain at a time; activate request/response schemas, authorization, persistence and contract tests before switching the corresponding storefront service off mocks.

## Phase F2 database configuration

`DATABASE_URL` is optional for starting HTTP, but required for /ready to return 200. Supply it only through environment or ignored `.env.local`; never NEXT_PUBLIC variables. `DATABASE_SSL` is disable for local development or verify-full for remote/production (the latter verifies certificates). `DATABASE_TIMEOUT_MS` defaults to 1500, range 100–5000. Connection URLs require a user, password and database and reject query/fragment overrides. Configuration and pg errors never echo values.

`MIGRATION_DATABASE_URL` / optional `MIGRATION_DATABASE_SSL` are separate owner-only configuration for `npm run db:migrate`; the server never uses them. Do not reuse migration credentials for the runtime. Production migrations require a separately approved release workflow, and the local CLI refuses production execution. Provision runtime grants as described in [PostgreSQL architecture](../../docs/POSTGRES_ARCHITECTURE.md).

No DB configured still permits /health and /api/v1, but /ready returns 503. A healthy PostgreSQL/schema probe does not activate any of the thirteen planned business modules. API startup does not create tables, apply migrations or manufacture authentication/payment success.

The build artifact must be shipped with the reviewed `migrations/` directory, whose checksums the runtime reads. Migration tests and ordinary PR CI use an isolated pinned PostgreSQL image, generated throwaway passwords and loopback-only ports. All questions deferred from F1 are tracked in [ADR 0002](../../docs/adr/0002-postgresql-foundation.md).
