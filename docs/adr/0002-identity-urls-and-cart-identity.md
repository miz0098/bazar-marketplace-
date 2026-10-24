# ADR-0002 — URLs, phone identity, sessions and cart identity

- **Status:** Proposed; security/product decisions outstanding (not approved)
- **Task:** CONTRACT-001
- **Date:** 2026-10-24
- **Evidence:** `ARCHITECTURE.md`, `docs/APPROVED_SCREENS_AUDIT.md`, `docs/DEFINITION_OF_DONE.md`

## Public URL policy

Preserve user-facing routes already exercised by the Next.js demo (`/catalog`, `/search`, `/products/{handle}`, `/cart`, `/checkout`, `/account/login`, `/account/register`). Shopify previously used `/collections/{handle}`, customer routes, and the proposed `/profile`. Do not ship redirects, canonical changes or changed indexing until SEO/product owners approve a route map with query strings, locale, redirects, historic links and canonical owners.

**Decision required:** whether `/catalog` and `/collections/{handle}` coexist; which locale strategy is canonical; exact `/profile` landing target.

## Identity/session proposal

- **Only approved user sign-in:** Ukrainian mobile phone and one-time SMS code. No password/email fallback or fake successful login.
- Frontend requests a short-lived server-generated challenge; server verifies expiry, per-challenge attempts, phone/IP abuse budgets, resend throttling and single-use consumption atomically. Idempotent resend policy and anti-enumeration response are required.
- A proposed same-origin backend-for-frontend (BFF) owns the browser session. Use `Secure` in production, `HttpOnly`, correctly scoped `SameSite` cookies; protect all cookie-authenticated state changes against CSRF, including logout.
- The browser never receives backend service credentials. Avoid exposing full numbers, OTP, challenge secrets, address payloads or session tokens to logs and analytics. Account-bound data require authorization at API and row/object ownership checks.
- **Unresolved:** SMS provider, sender ID, DPA/privacy and consent text, challenge TTL/attempt limits, retention, session TTL/rotation, per-device revocation, cookie and BFF origin/domain, CSRF strategy, recovery, API-to-BFF trust protocol.

The versioned API schema models the client-facing *provisional BFF contract*, not evidence of a deployed service. `api.bazar.ua` remains a target, not a confirmed reachable URL.

## Cart identity and reconciliation

- **Demo today:** browser-local `bazar-demo-cart-v1` with deterministic fixtures; not an inventory reservation.
- **Proposal:** opaque guest cart identifier held in a protected same-origin cookie, transitioning to account ownership on sign-in with a server-controlled merge transaction. Server assigns prices/taxes/discounts/stock and an optimistic version; client cannot assert final totals or seller ownership.
- **Unresolved:** guest expiry, guest-to-user merge conflict policy, cross-device synchronization, reserved-stock TTL and price-change acceptance. No silently destructive merge.

## Alternatives

Direct cross-subdomain API cookies are feasible only with separately reviewed CORS, CSRF, cookie scope and browser policies. A same-origin BFF reduces token exposure but increases operational complexity. Neither is approved for production yet. Guest cart may use a signed cookie or server-side session; browser-readable ID must never function as authorization.

## Approval owners / test triggers

- **Security/privacy:** session threat model, cookie scope, SMS abuse limits, retention, CSRF and logout.
- **Product/SEO:** URL mapping, account/profile route, guest cart merge UX.
- **Backend:** atomic OTP consumption, cart ownership and concurrency.
- **Release evidence:** session fixation/CSRF tests, cross-account denial, replay tests and URL redirect parity.

Do not turn the Phase D demo code `123456` into a production OTP.
