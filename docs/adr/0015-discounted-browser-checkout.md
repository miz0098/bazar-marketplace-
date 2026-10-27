# ADR 0015 — Bounded discounted browser checkout

Status: isolated integration only. Base: merged PR #26, cee5292315b99b7dfacd3d24202c95033d9ed646. Production activation remains prohibited. [Acceptance](../F16_DISCOUNTED_CHECKOUT_ACCEPTANCE.md).

## Existing rules and boundaries

Reuse F5 evaluatePromotionInTransaction, exact BigInt arithmetic, explicit product allowlist, finite campaign intervals, minimum merchandise subtotal and durable total/per-user limits. Codes retain exact matching: no trimming, folding, normalization or code stacking. Fixed discounts and percentage amounts exactly representable in minor units work for one variant line with positive quantity. Multiple discounted lines (including variants of the same product), fractional minor units, oversized fixed discounts, automatic combinations, seller/unit allocation and refund/capacity restoration remain policy-blocked. Undiscounted multi-line orders keep their existing exact aggregate behavior. No marketing decision is inferred from test fixtures.

## Explicit test-only composition

Only the separate F15 gateway opts into discountedCheckoutForTest for both checkout and payment configuration. API main never constructs this graph; all existing production guards and ordinary preview behavior remain. Default F6/F9 composition still rejects discounted completion. A standalone promotion evaluation still reports checkoutAvailable:false: it does not authorize an order. canRecordIntegrationOrder remains the conservative non-discounted direct-record capability; discounted completion additionally requires the explicit composition and succeeded owned F8 proof through the integrated endpoint.

For this isolated fixture, a server-only plan explicitly defines synthetic test amount = exact merchandise total + unchanged synthetic carrier estimate. This is protocol evidence, not adoption of legal payable/tax/fee/settlement rules. Shipping is never discounted. The browser submits no amount or currency. The existing F8 amount/currency/account/reference signature checks and financial binding are reused at preparation and confirmation. Apple Pay/Google Pay remain unavailable; no SMS, charge, TTN or production order is created.

## Atomic completion and history

Lock order stays cart → selected campaign UPDATE → variants/eligibility → shipping/payment records. Taking the campaign UPDATE lock before the ordinary state evaluation avoids SHARE-to-UPDATE deadlocks between competing carts. Confirmation re-evaluates current terms, stock/price/version, time, applicability and usage caps; compares acknowledged fingerprint; checks the current tariff and signed payment binding; writes order, lines, request/completion links, F5 integration-test usage claim and financial evidence in one transaction. Failure rolls everything back. Apply/refresh/payment preparation never consume capacity. Exact confirmation replay is resolved before re-evaluation and returns historical evidence without using capacity twice, even after expiry or changed prices. Conflicting keys retain existing rejection behavior.

Additive migration0014 relaxes only the previous zero-discount snapshot constraint and adds bounds and an immutable order_test_financials sidecar. It links owner, order, succeeded payment, shipping quote and optional unique F5 claim. Deferred SQL checks enforce aggregate arithmetic, immutable merchandise snapshot consistency and same-owner matching proof. Existing thirteen migrations are unchanged. Financial scope is isolated-test-plan; legal payableTotal and delivery.cost stay null, pending order/payment-not-initiated/inventory-not-reserved remain unchanged. No line-level discounted prices or partial-refund allocation is fabricated.

Historical reads use saved order/line/financial snapshots, never current prices or promo evaluation. A pre-F16 zero-discount history reader can omit the new sidecar in upgrade fixtures; runtime readiness still requires the complete migration inventory. F14 refund financial policy remains blocked; this change does not authorize refunds or restore usage.

## Browser behavior

Step2 uses the existing promo field/apply/remove and approved three-step classes. Failed apply leaves the last valid server selection intact; errors are accessible. Successful application exposes the exact selected code and merchandise discount, with refresh restoration from server DTOs. Quantity/cart mutations discard old local checkout intent and require a new server draft/evaluation; price/stock/campaign/tariff changes fail closed. Prepared payment exposes the server synthetic total before the signed test result can be selected. Confirmation and My Orders display original subtotal, discount, shipping and total from server evidence; history is stable after catalog edits.

Remaining: multi-line/seller/variant/unit allocation, zero-merchandise/free-order policy, fractional rounding, stacking, legal payable/tax/fees, promo lifecycle/release/refunds, post-order repeat-purchase/cart policy, production auth/domain/BFF/privacy and approved carrier/payment/wallet providers. Full normal-storefront server mode and visual/manual acceptance remain separate. No Demo100% or production-readiness claim.
