# F13 — messages, support and notification acceptance

Base: merged PR #23 (c811c4d). [ADR 0012](adr/0012-messages-support-notifications.md) and [OpenAPI](../apps/api/contracts/openapi.json) define implementation versus blocked production work.

| Area | Demo acceptance scope | Server evidence / remaining gap |
| --- | --- | --- |
| Messages | Existing Telegram-style list/history/send, search/pin, read-chat count, chronology/open-bottom, keyboard, empty/loading/error. F13 fixes duplicate submit, selected read snapshot, stable ties and search-empty card. Ephemeral, not delivered. | Explicit-membership PostgreSQL reads/send/read/pin, idempotency, concurrent/rollback behavior and paged history; isolated test only. No member creation, seller/staff policy, live transport, edit/delete or privacy rollout. |
| Support | Create/list/open/reply/status and validation/error/closed cases remain approved preview; immediate repeat submit cannot duplicate. No operator delivery. | Owner-scoped PostgreSQL creation/replies, durable request deduplication, closed guard and history pagination. Future CRM contracts only; no staff roles, transitions, SLA or provider selected. |
| Notifications | No new visible section or delivery claim. Existing chat unread count remains separate. | Typed six-event model, isolated message-event inbox/read and future channel interfaces. No order/refund/staff event emitters, channel delivery, consent UI or live outbox; these are blocked, not demo-complete workflows. |
| Attachments | Existing metadata-only chooser; no bytes read/uploaded. | Architecture/contracts only. No upload/download URL, storage, MIME trust or scanning activation. |

Desktop 1440×900 and mobile 390×844 scenarios include search-empty white card without actions, pins/errors, unread conversations, chronological DOM/open-bottom/keyboard Home-End, rapid repeated submit, ticket validation/create/reply/closed/error, axe and horizontal overflow. Existing auth/profile/wishlist/cart/checkout regressions remain mandatory. No browser server-mode, real SMS/payment/TTN/operator or cross-device sync is claimed.

Verification counts and final SHA/CI are recorded in the F13 PR after execution. Demo100% and production readiness remain unclaimed; final visual/manual accessibility acceptance and the broader F10 blockers are still open.

Local verification: API lint/typecheck/build, 38 unit and 3 compiled production smoke passed; PostgreSQL integration/HTTP/security 87 passed (including F12 upgrade, idempotency/concurrency/rollback and Unicode rejection). Storefront lint/typecheck/production build and 70 unit passed. Full Playwright desktop/mobile: 86 passed, 8 existing viewport-specific skips; axe/keyboard/overflow coverage included. All three dependency audits report 0 vulnerabilities. Ledger/path checks, 5 orchestration tests, 182 local documentation links, unchanged prior migrations/contracts and git diff --check passed. Final commit and GitHub CI are recorded in the F13 PR; tests do not authorize real delivery or production activation.
