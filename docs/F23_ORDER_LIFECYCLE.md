# Phase F23 — Approved order lifecycle simplification

Base: merged PR34, `be61c3d227d929a275089f712a911298cac300c0`. Branch: `codex/phase-f23-order-lifecycle`. Decision APPROVED by explicit product instruction. Implemented and locally validated in the explicit isolated scope; not final marketplace/design or production acceptance.

## Operational model

Only nine order statuses: Нове, Підтверджено, Готується до відправлення, Відправлено, Доставлено, Скасовано, Скасовано системою, Повернення, Повернено. Main5 end at delivered. Removed transport/completion labels are not offered by customer or future operator contracts. Transport observations are separately verified and saved in shipment history. Financial checkout state, payment, shipment, return requests and refunds are separate axes.

Owned seller components progress independently. Heterogeneous parent returns null with each seller status; this is not a tenth state or implicit priority. All-returned requires every component returned. Partial received quantities do not mark a whole seller or parent returned while purchased units remain. Filtering matches any seller component before list limit100.

Existing F22 money/snapshots remain immutable. Migration0019 creates sidecars and documented backfill (confirmed financial component→confirmed operational, other intents→new) without modifying source financial rows/history. Legacy removed names have a read-only alias mapper; no raw audit rewrite or fabricated meaning for unknown legacy fulfillment values. No changes to migrations0001–0018.

## Workflow/security boundaries

Buyer direct cancellation is owner/version/idempotency guarded at new/confirmed; preparing/shipped creates a seller request. Seller membership is validated server-side; only explicit isolated policy permits synthetic request resolution/receipt. Delivered accepts owned bounded item quantities. Immutable requests/receipt/audit and transactional quantity/capacity guards prevent replay, cross-owner/seller access and over-return. Cancellation during unresolved payment preserves cart/proof and holds checkout for review, without cancelling siblings or inventing a partial charge/refund plan.

Refund preparation links real test payment proof directly to frozen commerce line net and requested quantities. No F14 counterfeit order/payment is inserted. Whole-line refund uses its exact discounted net; partial quantity requires integral unit allocation or remains policy-required. Reuse existing isolated refund signature interface; amount/currency/account/operation/event checks and durable capacity guard prevent double refund. Confirmed-for-test never means actual money returned. Rejected/unknown attempts do not silently release capacity or start another refund.

Preparing timestamps are server-recorded. Without an explicitly injected calendar/staff/clock policy, automated deadline execution is unavailable. Tests use a clearly synthetic UTC-calendar fixture:5 dates from transition, assigned support ticket/escalation once at deadline,48 elapsed hours from escalation, silence cancels only affected component and creates gated refund intent. Seller response leaves case open and is not shipping proof. Verified late shipment evidence is audited separately without silently undoing system cancellation. No production timezone/DST/dispatch cutoff, legal financial resolution, staff grant or provider contract is invented.

## Implementation evidence

- [State vocabulary/graph](../apps/api/src/commerce/order-status.ts), [operational service](../apps/api/src/commerce/order-flow.ts), [additive migration](../apps/api/migrations/0019_seller_order_lifecycle.sql).
- [Typed portable contract](../apps/storefront/services/contracts/order-flow.ts), [customer lifecycle panel](../apps/storefront/components/account/order-flow-panel.tsx), existing commerce client/account pages.
- Unit:60 API /93 storefront passed. Initial new lifecycle regression:131/131 real PostgreSQL/HTTP/security passed after correcting an expected migration-count assertion for additive0019; no checks weakened. Further coverage/browser validation pending.

No production activation, real refund/payment/SMS/push/TTN, payouts, seller/staff app implementation, redesign, merge or deployment. Full marketplace audit and Demo100% remain unapproved.

Checkpoint follow-up:133/133 PostgreSQL/HTTP/security now pass, including a real schema18→19 fixture that preserves source snapshot/status and imports only a documented projection. Full discounted-line net refunds work even when net/quantity is fractional; only unresolved partial-unit attribution is gated. No production database or production history was accessed; deployment requires a separate source-data inventory/import review.

API and client response contracts now explicitly expose canonical operational projections and seller-owned requests; legacy checkout-commit status is deprecated for operational display. Canonical request hashing preserves key-order idempotency; pending browser requests retain their original command/key until acknowledgement. Provider event IDs remain exact opaque values, terminal refund confirmations do not duplicate notifications, and a matching succeeded payment observation is required. Requests, quantities, receipts, financial refund basis and event history are immutable at the database boundary.

Browser debugging found an actual navigation wait race and insufficient secondary-button contrast. The test now waits for the actual order screen before reload, and the UI reuses existing account form/button styles. No timeout/retry/security/accessibility assertion is weakened. Final browser and full regression counts remain pending.

[ADR0022](adr/0022-approved-order-lifecycle.md) records the exact state/authority graph, parent projection and financial/deadline boundaries. Customer order list/detail and checkout confirmation use the canonical operational projection; original payment/financial status remains separate.

Historical projection events are labelled as projections in the UI, not presented as newly observed delivery/payment transitions. Local preview fixture keys `expected`/`canceled` remain compatibility aliases for the approved new/cancelled labels; server and future operator contracts use the canonical nine-state enum. No production history inventory is claimed.

## Final local verification — 2026-10-27

| Suite | Passed |
| --- | ---: |
| API unit |60 |
| Storefront unit |93 |
| Compiled API smoke |3 |
| PostgreSQL / HTTP / security |133 |
| Shared ordinary-page HTTPS browser |36 |
| Existing isolated checkout/notifications |44 |
| Ordinary desktop/mobile Playwright |100 |
| Governance unit |5 |

**474 passed,0 final failures;8 unchanged viewport exclusions.** Eighteen new cases compared with merged F22.1:4 API state cases,1 portable guard case,9 PostgreSQL lifecycle/migration cases,4 viewport browser cases. Debug/reruns and inner matrix assertions are not added to totals. No tests, retries, budgets or security/a11y assertions weakened.

Desktop1440×900/mobile390×844 exercise main state progression, carrier transport remaining shipped, direct cancellation/request isolation, full/partial seller returns, parent not incorrectly returned, filters, refresh/history, axe, keyboard and no page overflow. All existing regression suites, lint, API/storefront/two isolated-entry typechecks, production builds, ledger/path checks, OpenAPI references and git diff --check passed. Dependency audits API/storefront/E2E each report0 vulnerabilities; no dependency or lockfile changes. Final-head GitHub CI is tracked on the PR.

Only migration0019 is added; migrations0001–0018/source Shopify unchanged. Its indexes cover due preparation jobs, seller event history, return scope and payment refund capacity. Historical source record inspection is limited to repository schema and real disposable PostgreSQL upgrade fixtures; production data inventory remains required before a separate approved rollout.

Review: [PR #35](https://github.com/miz0098/bazar-marketplace-/pull/35), targeting `vps-migration`. Final-head GitHub CI is tracked on PR checks; no merge/deployment.

Final UI follow-up: shipment observations and prepared/pending/unknown/test-confirmed/test-rejected refund states have separate Ukrainian read-only labels, exact amounts and an explicit no-real-funds-returned warning. The existing desktop/mobile return case now verifies prepared → authenticated isolated refund confirmation display; it does not add a real refund operation or increase the case count.
