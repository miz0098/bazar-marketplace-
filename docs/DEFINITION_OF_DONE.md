# BAZAR definition of done

## Status rules

A task is **implemented** only when its code, tests, documentation and ledger update are contained in a focused PR. A ledger value of `done` on a task branch means ready for review; it becomes authoritative only when that PR merges into `vps-migration`. Open work uses `in_review`; external impediments use `blocked` with an exact owner/action. Demo, integration and production readiness are separate claims.

## Every pull request

- Is based on current `vps-migration`, uses a short-lived `codex/*` branch and addresses one ledger task.
- Reads repository instructions and cites the approved legacy files used as UI evidence.
- Changes only its ledger `allowed_paths`; it preserves Shopify source and never changes `main`.
- Contains no credentials, personal data, access tokens, production endpoints with secrets, or sensitive logs.
- Uses Ukrainian customer copy and the existing BAZAR visual tokens/patterns. It does not invent screens or claim pixel parity without screenshot comparison.
- Keeps domain models, service contracts, adapters, state and UI separated. Browser code contains no private server configuration.
- Covers happy, loading, empty, validation, unauthorized where applicable, error, retry and unavailable-dependency states.
- Passes formatting/diff checks, ledger validation, lint, strict typecheck, unit tests, relevant integration tests, production build and dependency audit.
- Adds or updates Playwright coverage for changed critical browser behavior at desktop and 390×844 mobile, including keyboard navigation and horizontal overflow.
- Updates `apps/storefront/MIGRATION_PROGRESS.md` and the ledger without overstating readiness.
- Has green required CI checks, required reviews, no unresolved high-severity security findings and a reviewable diff. Automatic merge is allowed only under the separate operations policy.

## Frontend screen or component

- Route, navigation, deep-link, back/forward and not-found behavior are defined.
- Layout matches available approved source/screenshots at the tested breakpoints; deviations are recorded.
- Semantic landmarks, headings, names, focus order, visible focus, Escape/close behavior, focus return, announcements, reduced motion, zoom/reflow and touch targets are verified as applicable.
- There is no horizontal overflow at 390×844. Loading does not cause destructive layout shifts.
- Server rendering is used for indexable reads; client state is limited to interactive islands.
- All rendered data comes through typed services. Mock mode is visibly identified and cannot be mistaken for a live side effect.
- Tests cover keyboard and pointer use, loading, empty, error and content extremes. Screenshot comparison is required before a pixel-parity claim.

## Catalog, search and product

- URLs encode query, category, subcategory, filters, sort and page/cursor state where appropriate.
- Search supports Ukrainian input, clear/no-result/error behavior and cancellation or stale-response protection for live requests.
- Price, availability, facets and product identity are authoritative in live mode and validated at the transport boundary.
- Product media have useful alternatives and keyboard-operable gallery controls.
- Approved exclusions remain absent: seller block, 360-degree view and delivery-option selector on the product page.
- Delivery cost copy is exactly `вартість за тарифами перевізника` until an approved authoritative quote is present.

## Cart, promotions and checkout

- Cart quantity is a bounded positive integer; totals use integer minor units and are recalculated by the server in integration/live modes.
- Add/update/remove/clear, refresh persistence, guest/auth merge, stale inventory, price changes and unavailable service behavior are tested.
- Promotion validity and discount amounts are server-authoritative and idempotent.
- Checkout has exactly the three approved steps and preserves validated state on back/forward navigation.
- Delivery, tax, discounts, inventory and totals are revalidated before order placement.
- No demo path can render a real-looking successful order or payment. An uncertain provider outcome is explicitly unresolved, not failed or successful.

## Identity and profile

- Authentication is phone OTP only unless the approved contract changes; there is no password/email login fallback.
- OTP challenges expire, cannot be replayed, enforce attempt/resend/rate limits and never appear in logs.
- Session cookies are Secure in production, HttpOnly and appropriately SameSite; authenticated mutations have CSRF protection.
- Authorization is enforced server-side for every profile resource. Object IDs alone never grant access.
- The profile sidebar has exactly the approved order and no `Огляд` entry.
- Phone changes require approved re-verification; logout invalidates the server session and clears sensitive client state.

## Orders, wishlist, reviews, addresses and support

- Orders and details expose only verified current-user facts; legacy fallback tracking/payment/seller/timeline text is not migrated as data.
- Wishlist persistence and guest merge have deterministic conflict behavior; all counts and views converge after mutation.
- Reviews enforce purchase eligibility and moderation state; uploads validate type, size, ownership and retention.
- Addresses support create/edit/delete/default with Ukrainian validation and approved delivery fields.
- Support tickets enforce ownership, validation, status transitions, safe attachments and retention.

## Payments

- Provider and merchant approval are recorded. Raw PAN/CVV never pass through BAZAR application code, storage, analytics or logs.
- Only provider tokens and approved display metadata are retained.
- Signed webhooks, timestamp/replay checks, idempotency and event ordering are tested.
- Decline, timeout, retry, duplicate callback and unknown outcome are handled without false success.
- PCI scope, refunds, disputes, fiscalization and privacy/legal review are complete before production readiness.

## Messages and seller/staff boundaries

- Conversation membership and every read/write/upload operation are authorized server-side.
- Ordering, unread-chat count, pins, replies, deletion policy, attachments, retries and responsive behavior match the approved audit.
- Message delivery state is explicit; local append is not represented as delivered.
- Retention, abuse reporting/moderation, attachment scanning and privacy access/deletion are approved.
- Seller/staff roles follow an explicit least-privilege matrix and authenticated, replay-safe integration contract.

## Backend service and database

- API inputs, outputs and errors are runtime-validated against versioned contracts.
- Expected failures map to stable error codes; unexpected failures return a correlation ID without internal details.
- PostgreSQL migrations are forward, reproducible and tested from an empty database and supported prior version.
- Foreign keys, uniqueness, ownership, money, state-transition and idempotency invariants are enforced in database/service layers.
- Transactions protect multi-write commerce operations. Concurrency and duplicate requests are tested.
- Liveness checks process health; readiness checks required dependencies. Logs, metrics and traces contain no secrets or personal payloads.

## CI and security

- Required checks run from `pull_request` so branch protection can evaluate them.
- Lockfiles are committed and clean installs are used. Production and E2E dependency audits have no unresolved high/critical vulnerability.
- Unit tests cover domain rules; integration tests use disposable dependencies; contract tests exercise adapters; E2E covers critical journeys and failures.
- Secrets are supplied only through protected GitHub environments/secrets. Forked or untrusted PR code never receives production secrets.
- Autonomous changes are path-scoped and never deploy, modify DNS or merge `main`.

## VPS and release

- Deployment artifact is immutable and reproducible from a reviewed commit.
- Services run least privilege with validated environment configuration, TLS/reverse proxy, resource limits and health checks.
- Database migrations have a reviewed rollout/rollback strategy. Automated backups have retention, encryption and a successful restore rehearsal.
- Dashboards and alerts cover availability, latency, error rate, sign-in, checkout/order failures, database saturation and backup failure with named responders.
- Critical desktop/mobile journeys, accessibility, approved visual comparisons, SEO/redirects, analytics consent and dependency-outage tests pass in a production-like environment.
- Rollback is rehearsed and documented. Shopify source remains preserved.
- A human explicitly approves production credentials, deployment, DNS changes and any merge into `main`.
