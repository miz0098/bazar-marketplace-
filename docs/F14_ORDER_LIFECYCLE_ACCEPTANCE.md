# F14 — My Orders demo acceptance

Base: merged PR #24 at1cf6e2a. [ADR0013](adr/0013-order-lifecycle-requests-refunds.md) documents status separation, request-only behavior, conservative capacity and production blockers.

| Scenario | Demo acceptance | Isolated API/PostgreSQL evidence |
| --- | --- | --- |
| Orders list/detail | Existing fixture filters/pagination/detail/routes preserved | Owned F6 snapshot reads/list cursors, no legacy data relabel or UI API switch |
| Status/history | Five independent labels; fictional snapshot and request history, no fabricated payment/tracking timeline | Immutable initial-order and request/refund audit; F6 stays pending/not-initiated/not-requested |
| Cancellation | Explicit policy-required/unavailable explanation; no actual cancellation | Owner/idempotent request with explicit isolated policy, guarded versioned technical review; no order cancellation or inventory release |
| Item return | Select quantities/reason, validation/errors/rapid submit, preview request/status/history; navigation keeps RAM, refresh resets | Owned lines, cumulative/concurrent quantity caps, immutable claims, transactional rollback, no entitlement/approval/logistics |
| Refund information | Not initiated; no amount/form, paid or successful-refund claim | Internal synthetic plans, linked authenticated test operation, full/partial capacity, dedup/authenticated observations/unknown/audit; fundsReturned:false |
| Notifications | No new UI/channel or fake payment/refund message | Test return-request metadata inbox events only; real order/cancel/refund emitters remain blocked |

Desktop1440×900/mobile390×844, keyboard/focus, errors/empty/loading, axe and no horizontal overflow are required along with the full auth/profile/wishlist/communication/cart/checkout regression. Isolated tests are not real provider, legal or production acceptance. No order/stock/promotion/payment/shipment/SMS/refund is activated.

Final test counts, commit and GitHub CI are recorded in the F14 PR after verification. My Orders is a bounded demo candidate; production and Demo100% remain unclaimed. See ADR0013 for financial/legal/logistics/security decisions before real cancellation/return/refund.

Local verification: API lint/typecheck/build, 40 unit and 3 compiled production smoke passed; PostgreSQL integration/HTTP/security 98 passed, including F13 upgrade, immutable audit, quantity/concurrent replay, full/partial capacity, signed-event forgery, unknown timeout and rollback. Storefront lint/typecheck/production build and 74 unit passed. Full Playwright desktop/mobile: 90 passed, 8 existing viewport-specific skips; keyboard/axe/overflow included. Three dependency audits: 0 vulnerabilities. Ledger/path checks, 5 orchestration tests, 195 local documentation links and git diff --check passed. Prior migrations remain unchanged; previous API objects are preserved except the explicit two-kind notification enum extension. Final SHA/CI results are in the F14 PR; no real operation or release is authorized by tests.
