# Phase F23 — Approved order lifecycle simplification

Base: merged PR34, `be61c3d227d929a275089f712a911298cac300c0`. Branch: `codex/phase-f23-order-lifecycle`. Decision APPROVED by explicit product instruction. Work in progress; not final acceptance.

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
