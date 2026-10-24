# ADR-0001 — Systems of record and checkout ownership

- **Status:** Proposed; business decisions outstanding (not approved)
- **Task:** CONTRACT-001
- **Date:** 2026-10-24
- **Evidence:** `MIGRATION_PLAN.md`, `ARCHITECTURE.md`, `docs/AUTONOMOUS_ROADMAP.md`; Shopify reference `bazar-latest-shopify@105d10f`

## Context

The existing Shopify Horizon theme supplies products, prices, inventory, customer/order data, cart endpoints and hosted checkout. The Next.js storefront currently uses deterministic fixtures and an in-browser demo cart and checkout. Neither `api.bazar.ua` nor PostgreSQL is a verified running backend. The migration cannot silently turn fixture prices, stock, delivery, payment or order confirmation into authoritative facts.

## Provisional direction (NOT an ownership decision)

- Add a typed, versioned first-party API boundary with explicit provenance and failure states. Server-owned prices, availability, tax, shipping, promotions, and order status must come from an approved system of record.
- Use PostgreSQL for BAZAR-owned state only after a data ownership matrix and migration policy are approved. Never assume that replicating Shopify catalog data makes BAZAR authoritative for stock, tax or merchant fulfillment.
- Keep storefront checkout at exactly three approved stages (contact + delivery, payment, confirmation), with server-side revalidation before any real order acceptance. The current demo must stop before making an order/payment claim.
- Payment data are provider-tokenized; raw card numbers and CVV must never pass through BAZAR. Until owner/provider/fiscalization decisions are approved, disable live payment/order creation.
- Preserve the approved carriers (Нова пошта, Meest); keep BAZAR pickup disabled. No fabricated tariff is included in a total; show `вартість за тарифами перевізника` until an authoritative quote is available.

## Alternatives / tradeoffs

1. **Shopify remains commerce source during transition:** less initial integration work, but Shopify account/cart/checkout dependency persists, and API synchronization has consistency risks.
2. **BAZAR assumes commerce ownership:** more control for marketplace sellers, but demands inventory reservations, taxes, fulfillment, returns, settlement, event handling and compliance.
3. **Hybrid split:** potentially practical but only with field-by-field owners, versioning and conflict reconciliation.

No option is selected by this ADR. An approved decision must identify which system owns **each** of product, offer/price, stock, cart, promotion, tax, shipping quote, order, payment, refund and seller fulfillment.

## Approval owners and blockers

- **Product/commerce owner:** system-of-record matrix, order lifecycle, guest checkout, promotions and fulfillment assumptions.
- **Engineering/backend owner:** data freshness, reconciliation, transaction and idempotency ownership.
- **Legal/finance owner:** merchant of record, receipts/fiscalization, taxes, payments/refunds and retention.
- **Carriers and payment providers:** approved contracts, credentials and environments.

## Acceptance/revisit trigger

Supersede this proposal with a signed ownership matrix and an end-to-end contract test against an approved non-production system. A demo UI or a compiled API schema is not that evidence.
