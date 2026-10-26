# Phase F9 — BAZAR Demo 100% readiness

F9 supplies an isolated server integration foundation. **BAZAR Demo 100% is not complete**, and no real-user or production switch is enabled.

| Scenario | Current evidence | Remaining work |
| --- | --- | --- |
| Existing Ukrainian storefront/demo checkout, profile, messages/support | Existing demo adapters and screens preserved; browser regression required on desktop/mobile | Reviewed opt-in server UI mapping and failure/loading UX before any server rollout |
| Catalog → authenticated current cart | PostgreSQL/HTTP typed-client integration; one active cart, no guest merge, current stock/prices and idempotency | Approved real SMS/session/BFF/TLS rollout; guest merge remains intentionally absent |
| Three-step checkout with Nova Poshta, Meest, Ukrposhta | Owned address fixture, isolated official-shaped directory/quote adapters, fresh tariff guards | Carrier credentials/contracts, parcel/sender/recipient mappings, tariff/TTL/privacy policy; no TTN |
| Promo preview | Exact supported F5 rules and invalid/expired/limit regression | Redemption at order/payment settlement, stacking, allocation, rounding and refund policy; active-promo completion is blocked |
| Card/payment → confirmation → history | Signed synthetic test payment linked atomically to a pending integration record; duplicate/forged/stale requests rejected | Approved provider, merchant, SDK/wallet capability proof, final payable total, real settlement/order-state policy |
| Retry and concurrency | Durable payment exclusion, immutable cart receipts/completion links, rollback and same-key replay | Reconciliation/operational policy for live uncertainty and subsequent purchases |
| Stock and post-order cart | Current stock checks; current cart retained, no reservation/clearing | Reservation/release, fulfillment/cancel transitions, cart lifecycle after order and repeat-purchase policy |
| Apple Pay / Google Pay | Existing F8 capability boundary; no invented OS-only availability | Approved provider and actual browser/device capability integration |
| Orders, returns and refunds | Pending technical history, immutable snapshots; no false paid status | Legal order placement, notifications, real delivery/tracking, returns/refunds and approved financial rules |
| ПВЗ BAZAR | Unavailable | Product decision before activation |

The positive F9 server scenario previews a promo, proves active-promo payment is blocked, then explicitly removes it before the no-promo synthetic payment/confirmation. No test claims delivery to a real recipient, a real paid order or successful discount redemption. External adapters are isolated; no personal production data is used.

Recommended next stage: approve financial/order lifecycle decisions, then implement atomic promotion redemption and inventory reservation with authoritative payable totals and focused integration tests. Provider onboarding and a reviewed storefront server-mode rollout remain separate gates; do not infer approval from passing CI.
