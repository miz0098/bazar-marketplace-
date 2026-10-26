# F15 — isolated browser checkout acceptance

Base: merged PR #25 at f218989. [ADR0014](adr/0014-isolated-browser-checkout.md) defines the separate artifact, HTTPS/BFF trust, test helpers and remaining gates.

| Scenario | Evidence / scope |
| --- | --- |
| Browse → guest cart → auth | Real PostgreSQL product/detail and unavailable stock; guest IDs remain local; actual F4 OTP/session is required, no preview auth flag |
| Server cart | Explicit add after login; set/remove, server totals/stock, repeated mutation key and caller-price rejection |
| Delivery | NP/Meest/Ukrposhta normalized synthetic cities/branches/estimates; BAZAR pickup disabled; stale/expired tariff cannot complete |
| Payment | Card protocol pending/decline/retry/signed success; no real charge. Wallets unavailable without genuine SDK/provider capability; no UA shortcut |
| Confirmation → history | Same-origin secure session/CSRF, F9 signed proof/link, repeat/rapid submit/refresh yields one order; owned F14 history remains pending/not-paid |
| Security | HttpOnly/Secure/SameSite cookies not readable in JS; no token/contact/price authority in storage; revoked session, foreign order/OTP, forwarded header/controller/CSRF forgery denied |
| Responsive/accessibility | Desktop1440×900/mobile390×844, keyboard submission, error/empty/pending, axe and overflow; normal storefront regression remains separate |

Run in Linux after dependencies/Chromium are installed: npm --prefix apps/api run test:browser. The runner builds the separate UI and starts/cleans its own PostgreSQL, HTTPS gateway and API fixtures. It does not start a production provider or deploy anything. The ordinary storefront and production API never select the test entry point.

No-promo/card browser integration is the bounded acceptance target. Discounted completion, actual wallet SDK/device scenarios, real recipient shipping, repeated-purchase/cart reset and production providers/auth remain policy-blocked. Demo100% and Production Ready are not claimed. Final local/CI counts and SHA are recorded in the F15 PR.

## Verification

Local Linux verification: API and storefront ESLint/typecheck, isolated UI typecheck, ordinary API/storefront production builds and isolated Next build passed. API unit 41/41, storefront unit 75/75, compiled production smoke 3/3 and real PostgreSQL integration/HTTP/security 98/98 passed. Isolated browser suite: 20/20, no skips/retries, desktop 1440×900 and mobile 390×844. Three dependency audits report zero vulnerabilities. Governance ledger, five orchestration tests, scoped paths, documentation links and git diff --check passed. Existing migrations, public OpenAPI and Shopify source are unchanged.

No design approval or production readiness is inferred from these checks. Ordinary storefront Playwright regression: 90 passed, 8 existing viewport-specific skips (no new skips). GitHub CI evidence and final SHA are recorded in the F15 PR.
