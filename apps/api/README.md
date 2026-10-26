# BAZAR API foundation

Node 24 + TypeScript, native `node:http`, no runtime dependencies. F1 is infrastructure only. No database, phone authentication, catalog, orders, messages, payments or other business operation is implemented.

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
- GET/HEAD `/ready`: process readiness, false during shutdown or a failing injected predicate; current `dependencies: []`, `businessModulesAvailable: false`. No PostgreSQL/provider is configured.
- GET/HEAD `/api/v1`: service/version discovery with business modules explicitly unavailable.
- OPTIONS on those routes: validated CORS preflight, 204 without a body.
- All other paths: 404. Unsupported methods: 405 with Allow; malformed URL/query/body: 400. Header overflow: 431. Unexpected application errors: sanitized 500. Readiness failure: 503. HEAD has no body, including errors.

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
npm audit --audit-level=high
```

Tests bind to loopback ephemeral ports and cover config, CORS/preflight, validation, actual HTTP responses/errors, missing business routes, logs, readiness, bounded shutdown and the compiled Node process. Production smoke tests also call the actual API through the opt-in storefront client to verify protocol compatibility. CI runs these checks independently from the full storefront regression suite. No external SMS/payment/database/provider is used.

## Design and next modules

- [ADR 0001](../../docs/adr/0001-api-foundation.md)
- [Planned module contracts and authorization limits](../../docs/API_MODULES.md)
- [PostgreSQL architecture and migration policy](../../docs/POSTGRES_ARCHITECTURE.md)

Module types in `src/contracts/modules.ts` are provisional design contracts, not live adapters. Implement one reviewed domain at a time; activate request/response schemas, authorization, persistence and contract tests before switching the corresponding storefront service off mocks.
