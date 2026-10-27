# ADR 0017 — F19 approved business direction and proposed commerce contracts

Status: **approved business requirements recorded; technical implementation proposals pending review**. Documentation-only. Supersedes earlier unresolved target assumptions only where the user Phase F19 instruction is explicit; does not rewrite implemented ADR0001–0016 evidence, migrations or test results.

Authority and canonical rule/status/acceptance IDs: [Business Rules V1](../../BUSINESS_RULES_V1.md). [Domain contracts](../../COMMERCE_DOMAIN_CONTRACTS.md), [decision register](../../BUSINESS_DECISION_REGISTER.md), [implementation mapping](../../F20_F29_IMPLEMENTATION_CONTRACT.md).

## Recorded direction

- One server-validated BZ+11random-digit promo, cart/category/product scopes, percentage/fixed capped eligible merchandise, shipping excluded; immutable multi-line/unit/seller financial allocations. Financial rounding and allocation algorithm remain pending.
- Seller binary availability, saved authenticated items retained/reactivated, no quantitative warehouse stock/reservation/decrement. Availability-restored transition event fans out through F13 inbox with recipient dedup; real push remains gated.
- Multi-seller parent order/seller components/individual shipments, unique buyer order identifier (format unapproved), payment-gated purchased-cart completion and safe retries.
- Approved buyer cancellation cutoff/state actions,5calendar-day preparation deadline, staff escalation and48h response window, affected-component system cancellation after silence. Calendar convention/evidence races and legal financial consequences remain gates.
- Full/partial discounted-value returns/refunds with private evidence, legal rights and verified provider finality;5% commission per seller discounted merchandise excluding shipping. Commission retention is only a legal/finance-pending preference, never a deduction from statutory buyer refunds.
- Supported three carriers use selected pickup locations and operator-managed prices; exact operator-tariff message replaces BAZAR price quote requirements. Real directory/tracking/TTN still requires approved contracts.
- Scoped buyer/seller/optional employee/support/moderator/admin authorities, no cross-tenant or unauthorized sensitive powers, no admin «Клієнти». Approved customer fields, optional profile addresses, checkout-specific delivery data; privacy/recovery/retention remain gated.

## Consequences

Stock counters/quote-price dependencies/parent-only records in old isolated modules are migration conflicts, not authorization to rewrite them in F19. Later versioned DTOs and additive migrations must preserve old test namespace/history, update guarded target paths and add conformance tests. No assumption that stock locks, synthetic shipping totals, request-only cancellation or one cart payment intent already satisfies V1.

Rounding alternatives, promo consumption/funding, zero-payable semantics, mixed-cart completion, order number format, detailed RBAC, calendar zone/cutoff/late proof, legal return/retention and settlement/provider terms are explicitly unapproved. Implementers stop only affected scenarios until decisions are recorded; no silent default.

No commerce code, test changes, migrations, UI changes, provider calls, deployment, merge or readiness declaration in F19. F18 audit/backlog/roadmap/readiness evidence is preserved with a clearly dated target-policy overlay.
