# F17 — Customer notification center acceptance

Base: merged PR #27,74062c6. [ADR0016](adr/0016-customer-notification-center.md) explains provenance, cursor/read concurrency, navigation and remaining boundaries.

| Capability | Actual readiness |
| --- | --- |
| UI | Existing isolated server-session screen and My Orders disclosure; newest-first, Kyiv date/time, read/unread count, one/all read, loading/error/retry, empty state, incremental pages; no new account menu/header/footer changes |
| Order created | Atomic with existing owned F15/F16 signed-test confirmation; stable source/order link; replay cannot duplicate |
| Status/cancel demo | Node-capability-controlled simulated events; order remains pending, not actually changed/cancelled |
| Messages/support | Owner/member-checked histories, normalized test metadata and explicit support simulation; no real staff/CRM/delivery claim |
| Refund | Server-only notification from verified F14 confirmed-for-test transition; no arbitrary emitter; fundsReturned remains false; browser refund flow unavailable |
| Persistence/security | F13 PostgreSQL inbox; exact owner/session/Origin/CSRF; monotonic read flags, deduplication, bounded safe cursors/internal UUID links; logout clears in-memory UI |
| Channels | Email, SMS, web push and Flutter FCM seams only; no real notifications, keys, subscription or dispatcher |

The normal storefront remains its existing preview; the new widget is not a production rollout. No unread notification implies an unread chat, and reading a notice does not acknowledge a conversation. Counts are current server snapshots on load/explicit refresh/mutation, not live push. Source metadata has no contact or message body; history retrieval independently authorizes membership/ownership.

Run npm --prefix apps/api run test:browser for the HTTPS browser suite and npm --prefix apps/api run test:integration for real disposable PostgreSQL/HTTP/security. Desktop1440×900/mobile390×844, keyboard/axe/overflow, pagination, owner isolation, replay, concurrent read and future-arrival guards are required evidence. Final counts, SHA and CI are recorded in [PR #28](https://github.com/miz0098/bazar-marketplace-/pull/28).

Remaining before broader acceptance: ordinary-storefront server-mode mapping and visual/manual approval, genuine order/refund/staff authority, production authentication/domain/BFF/privacy, consent/templates/retention and outbound channel/outbox providers. Phase F18 has the typed inbox/client/event foundation available; its scope is not defined by this PR. No Demo100% claim.

## Verification evidence

Local API unit43/43, storefront unit78/78, compiled production smoke3/3 and real PostgreSQL integration/HTTP/security108/108 passed. Existing isolated checkout36 cases passed; final F17 notification suite8/8 passed after the numeric cursor fix. Ordinary storefront regression exercised all98 cases:88 passed with8 existing viewport skips; the two wishlist selectors were corrected to ignore inactive SSR duplicates and both targeted viewport cases then passed. No wishlist business implementation changed. GitHub CI reruns all44 isolated and all98 ordinary browser cases; final results/SHA are recorded in [PR #28](https://github.com/miz0098/bazar-marketplace-/pull/28).

ESLint, TypeScript including isolated UI, API/Next production builds, five governance tests/ledger/scoped paths, local documentation links and git diff --check passed. Three dependency audits report zero vulnerabilities. All fourteen earlier migrations and Shopify source remain unchanged.
