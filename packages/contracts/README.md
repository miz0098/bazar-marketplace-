# BAZAR first-party API contracts (provisional)

**Status: PROPOSAL ONLY — not implemented, deployed, or business/security approved.**

- Versioned interface: [v1/openapi.json](v1/openapi.json), OpenAPI 3.1.0.
- Consumers: BAZAR Next.js storefront, future backend and provider adapters, and contract tests.
- Design decisions: `docs/adr/0001-*`, `0002-*`, `0003-*`; blockers explicitly documented there.
- The described endpoints are a **proposed same-origin BFF surface** rooted at `/api/bazar`. Internal `api.bazar.ua` transport/authentication is deliberately **unspecified** until threat-model approval. The hostname is not asserted to be operational.
- JSON Schema components are versioned under `#/components/schemas`. **Changes in semantics** (including authorization, cursor, error, money, session and idempotency behavior) require review and version management. No versioned v1 contract is permission to invoke live SMS, payments or orders.

## Cross-cutting rules

1. Money is integer **minor units** in `UAH`; subtotal/grand totals are **server authoritative**. No floating-point totals or fabricated provider tariffs.
2. Times use RFC 3339 timestamps with offsets (canonical UTC `Z` on emission); never use timezone-free local date-times for event timestamps.
3. Paginated collections use an opaque cursor, `limit`, `nextCursor` and `hasMore`. Cursor must bind to caller/filter/sort context and expire safely.
4. Failures use `ErrorResponse` with stable error code and correlation ID; 429 may include `Retry-After`. Unexpected failures never disclose stack traces or personally identifying payloads.
5. Mutable idempotent operations require `Idempotency-Key`; keys are scoped to actor + operation + request fingerprint, retries reuse the original outcome, changed bodies under the same key return a conflict. Retention TTL and transaction semantics need backend/security approval.
6. Personalized data are `Cache-Control: private, no-store`; OTP and payment payloads are never logged. The client must not grant access from a resource ID or mock auth flag.
7. `SessionCookie` models a same-origin **BFF browser boundary**, not a directive to expose `api.bazar.ua` cookies cross-origin. State-changing requests require an approved CSRF defense. Session issuance, rotation and revocation stay server-controlled.
8. Provisional operations for OTP, messaging, order placement, carrier quotes and payment-related flows **must remain disabled** until respective provider, security, privacy and business approvals. UI is demo-only until connected/verified.

## Validation and extension

Run `node packages/contracts/verify.mjs` from the repository root. This dependency-free structural check resolves internal schema references, checks version/path/media-type/operation ID and verifies mandatory cross-cutting fields. It is not a substitute for OpenAPI schema validation, generated-client compilation, live contract tests or security reviews. Downstream `BE-001` must add runtime request/response validation and test failure paths against these schemas.

Existing `apps/storefront/services/contracts/*.ts` types are **demo-facing** and not automatically binary-compatible with the proposed HTTP DTOs. Add a reviewed mapper and adapter; do not directly retrofit fixture shapes.

### Explicit unresolved decisions

- Actual catalog/order/payment system of record; seller ownership and marketplace tax/fiscalization.
- Public URL/redirect/locale inventory; guest cart merge and expiry.
- Session scope, CSRF mechanism, SMS sender/provider, legal consents, rate/expiry limits.
- Real shipping quote and payment integration ownership; provider credentials.
- Supported Node/VPS release, caches and invalidation, observability, backups and incident ownership.
