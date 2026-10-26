# Phase F12 — customer account demo acceptance

Review: [PR #23](https://github.com/miz0098/bazar-marketplace-/pull/23).

Base: PR #22 merged at d89bd6e. Design/layout, header/footer/product structure, auth preview, demo checkout stop and Shopify source are preserved. [ADR 0011](adr/0011-customer-account-foundation.md) separates local persistence, isolated server evidence and production blockers.

| Section | Ready bounded demo / evidence | Server state and remaining gates |
| --- | --- | --- |
| Мої замовлення | Existing fixture list/filter/detail, empty/error, responsive navigation | F6/F9 owned pending integration history only; no real order transitions/paid/fulfillment facts or UI API switch |
| Обране | Add/remove from card/detail, shared header/account, local ID-only persistence/empty lists, malformed storage recovery, unavailable item removal and cross-tab sync | F12 PostgreSQL owner-scoped/idempotent wishlist and future typed client; production auth, UI mapping and real account sync remain blocked |
| Повідомлення | Existing search/dialog/pins/unread-dialog count, chronological/open-bottom history, ephemeral send, errors/empty/keyboard/mobile | No real recipient transport, staff/membership/upload/retention rollout |
| Мої відгуки | Existing preview edit/delete validation and empty/error states | F12 private list/create/edit/delete only through explicit isolated policy; owned line, immutable proof claim/duplicates/rollback tested. No real confirmed-purchase resolver or publication/moderation rules |
| Особисті дані | Existing fictional preview fields/validation/errors, no new local PII storage | F12 name-only versioned contract/service; richer email/phone/birthday preview fields are not silently persisted or sent. Real PII/security/consent/reverification rules blocked |
| Улюблені адреси | Existing preview CRUD/default/reset and validation; add Ukrposhta branch option using existing fieldset | F12 owned opaque-ref CRUD/default/CAS; no recipient PII, courier coercion, carrier guarantee or live mapper. Real encryption/retention/default UX policy blocked |
| Платіжні методи | Existing safe empty/error view, no card form, no PAN/CVV/token storage | No provider or fake card binding; tokenized vault approval required |
| BAZAR-підтримка | Existing ticket/status/detail/create/reply, empty/loading/error/retry, keyboard/mobile preview | No operator delivery/staff/attachment/retention production workflow |
| Вихід | Existing keyboard-accessible explicit anonymous preview exit; no browser auth token/session created | Real server logout/logout-all stays in F4 client/tests, not wired into demo; local product IDs contain no identity and are not a server session |

No Overview sidebar item is added. Existing approved /profile landing is unchanged. Demo wishlist persistence intentionally supersedes F11 reset semantics; all other account personal edits and communication remain preview-only. Saving product IDs must never serialize the full AccountService or its profile/address/message data.

Verification uses unit, HTTP/typed-client and disposable PostgreSQL tests plus existing and new Playwright desktop 1440×900/mobile 390×844, keyboard/axe/overflow regressions. The F12 PR records final counts, SHA and GitHub CI; integration test success is not production readiness. All external effects remain isolated; no real SMS/payment/TTN/order, card binding, deployment or merge.

Outstanding: approved visual/manual accessibility evidence, real catalog/customer mapping, SMS/BFF/session rollout, PII encryption/keys/consent/retention/deletion, real review eligibility/publication/edit/delete policy, staff/provider operations and the remaining F10 commerce/release gates. These bounded screens are candidates for demo acceptance, not a Demo 100% or production claim.

Local verification on F12: API/storefront lint, TypeScript and production builds passed; 34 API unit, 3 compiled production smoke, 81 PostgreSQL integration/typed HTTP/security tests, 67 storefront unit. Playwright: 82 passed, 8 existing viewport-specific skips across desktop/mobile. Three dependency audits: 0 vulnerabilities. Ledger/path scope, 5 orchestration tests, documentation-link validation and git diff --check passed. Final head SHA/CI run are recorded in the F12 PR; these checks do not activate production.
