# Shopify functionality restoration — mandatory before BAZAR Demo 100%

F3 delivers PostgreSQL catalog reads and tested internal cart persistence. Existing Shopify theme/source remains preserved; neither catalog integration nor the demo checkout replaces Shopify commerce. “BAZAR Demo 100%” must not be claimed until all rows below have reviewed contracts, truthful UI states, failure tests and an approved end-to-end demonstration. Real provider activation additionally requires production approval; a demo may stop explicitly before a real side effect.

| Required capability | Next work / acceptance gate | Current boundary |
| --- | --- | --- |
| Discounts | Server promotion evaluation, eligibility, stacking/conflicts, expiry, currency/rounding, returned authoritative totals | No discount business engine; never infer sale prices |
| Promo codes | Apply/remove, invalid/exhausted/expired states, concurrency and limits; prevent client total overrides | UI/demo values cannot change server cart totals |
| Checkout | Approved three-screen flow, verified principal/cart ownership, current price/stock reconciliation, authoritative quote binding, retry/unknown-state recovery | Demo remains explicit; no live handoff or placement |
| Payment methods | Approved provider-neutral/tokenized contracts, merchant/legal/PCI decisions, signed replay-safe callbacks and idempotent outcome reconciliation | No raw card data, invented charge or “paid on redirect” |
| Delivery | Нова пошта/Meest authoritative locations, tariffs, expiring cart/address/version quotes, unavailable-provider states and tracking | No fabricated quote; retain “вартість за тарифами перевізника” |
| Order creation | Atomic owned order + immutable price/address snapshots, reservation/stock policy, durable idempotency, promotion/quote validation and rollback | No order placement endpoint |
| Order statuses | Reviewed transitions and fulfillment authority, webhook deduplication, actual payment/delivery facts and timeline consistency | No invented shipped/delivered facts |
| Refunds | Approved full/partial eligibility, amounts, promotion/shipping adjustments, provider reconciliation, idempotent retries, audit and unknown/failure states | No refund endpoint or simulated successful refund |

Dependency sequence: verified identity + reviewed guest/current-cart rules → enabled cart integration → promotions/promo codes → checkout + delivery quote → transactional order creation → approved payment integration → order/status reconciliation + refunds. Product/legal/provider owners must decide the unresolved rules; implementation must not silently select production defaults. Demo/integration/production readiness remain separate milestones.
