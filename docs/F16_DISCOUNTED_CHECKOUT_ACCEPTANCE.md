# F16 — Discounted browser checkout acceptance

Base: PR #26 merged at cee5292. [ADR0015](adr/0015-discounted-browser-checkout.md) defines limits and transaction/security guarantees.

| Area | Actual scope |
| --- | --- |
| Browser demo | Separate F15 HTTPS application, actual F4 sessions/Origin/CSRF, PostgreSQL catalog/cart, three test carriers, F5 promo → signed card proof → atomic F9 confirmation → owned F14 history |
| Fixed / percentage | One variant line, positive quantity; exact fixed and exact basis-point arithmetic; no stacking or rounding |
| Errors | Unknown, expired, future, exhausted, minimum, ineligible, fractional-policy failure; prior valid selection remains; removal is explicit |
| Freshness | Cart mutation requires new draft; price/stock/campaign/tariff revalidated, refresh reads owner-scoped server state |
| Usage | Applying/preparing/refreshing uses none; confirmed test record uses exactly one, replay uses none; competing customers serialize; persistence failure rolls back |
| Historical money | Immutable subtotal/discount/unchanged shipping/synthetic total and linked claim/payment/quote; current catalog changes do not rewrite history |
| Server-only capabilities | Existing F5 per-user/global guards; production module adapters not selected; standalone evaluation is not checkout permission |
| Not supported | Multiple discounted lines/variants, zero-merchandise/free-order policy, fractional rounding, discount stacking/funding/allocation, real payable/tax/fees/refunds, actual wallets/providers, repeat purchase and ordinary storefront server-mode rollout |

Run npm --prefix apps/api run test:browser for the isolated browser suite, npm --prefix apps/api run test:integration for real disposable PostgreSQL/HTTP/security. Neither runs real SMS, money, shipments or production orders. BAZAR pickup and real wallets remain disabled. Desktop1440×900/mobile390×844, keyboard/axe/overflow are acceptance checks; no broad design approval or Demo100% is claimed. Final test counts, CI and SHA are recorded in [PR #27](https://github.com/miz0098/bazar-marketplace-/pull/27).

## Local verification

API unit42/42; storefront unit76/76; compiled production smoke3/3; real PostgreSQL integration/HTTP/security103/103. Full isolated Playwright36/36 without skips/retries; targeted confirmation/history regression8/8 after the historical-summary refinement. Ordinary storefront Playwright90 passed and8 existing viewport-specific skips. ESLint, TypeScript (including isolated UI), API/Next production builds, governance/five orchestration tests, scoped paths, documentation links and git diff --check passed; all three dependency audits report zero vulnerabilities. Prior thirteen migrations and Shopify source are unchanged. Final remote SHA and CI are recorded in [PR #27](https://github.com/miz0098/bazar-marketplace-/pull/27).
