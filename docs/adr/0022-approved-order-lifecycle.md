# ADR0022 — Approved nine-state seller lifecycle

Status: APPROVED vocabulary and implemented isolated workflows; final validation evidence in [F23](../F23_ORDER_LIFECYCLE.md). Authority: explicit F23 product instruction. Supersedes old transport/completed order branches, not immutable historical data or legal/provider gates.

## State and transaction boundaries

| Operational transition | Authority / evidence |
| --- | --- |
| new→confirmed | Existing authoritative isolated payment finalization |
| new/confirmed→cancelled | Verified buyer owner, current version, idempotency |
| confirmed→preparing | Active owning seller membership |
| preparing→shipped→delivered | Verified isolated transport evidence; transport itself stays shipment history |
| preparing/shipped→cancelled | Buyer request + owning seller resolution under explicit isolated policy |
| preparing→system-cancelled | Explicit isolated calendar/staff policy, escalation and48h silence; no sibling cancellation |
| delivered→returning | Buyer-owned item quantities within frozen purchased capacity |
| returning→delivered/returning | Partial receipt with units retained / other requests pending |
| returning→returned | All purchased units of that seller received in isolated return process |

Delivered ends successful delivery; no automatic completion step. Refund and payment states never follow merely from an operational label. Parent projection is common state only when homogeneous, otherwise null + seller states; no new priority state is invented. Filtering matches any owned component. Future admin/staff consumers must use this same nine-state contract, not reintroduce removed states.

Migration0019 adds operational sidecars, immutable histories/receipts/quantities/proof bindings, request ownership, refund capacity and lookup/deadline indexes. It preserves migrations0001–0018 and source financial rows, snapshots and audit. Backfill is a documented projection of F22 creation state. The legacy root checkout status is retained/deprecated for compatibility; business status is explicitly separate. Existing F14 signature contracts are reused without counterfeit legacy orders or payment proof.

Lock order: reviewed quote→parent→seller operational row→payment capacity as needed. Canonical actor/action/key digests prevent duplicate effects. Receipt lookup precedes version recheck on replay. Customer/seller ownership is checked each call; private internal worker/verified-event entry points have no public status override route. Request/return and proof records cannot be deleted/rewritten; terminal refunds cannot downgrade or repeat notifications.

Preparing timestamp is server-recorded. Production calendar/DST/cutoff, staff grants and legal effects are not selected. Explicit synthetic UTC-calendar tests exercise5 calendar dates, one assigned support case,48 elapsed response hours and isolated system cancellation/refund intent. Response is not shipment proof; late verified evidence does not silently undo cancellation. Production jobs, carrier/refund providers, free orders, ambiguous promotion funding/minimum, non-integral partial-unit attribution and statutory/fee/retention/settlement decisions remain gated. No real refund, payout, TTN, SMS/push or deployment.
