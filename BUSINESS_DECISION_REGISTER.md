# BAZAR Business Decision Register — F19

Version1.0 / 2026-10-27. Canonical approval source: [Business Rules V1](BUSINESS_RULES_V1.md). “Pending” is an implementation gate, not a request to invent a default. Roles below are required decision owners, not claims named people have approved. F19 documents every open question without pausing to seek intermediate approval. No live capability is enabled.

## Approved decisions — user Phase F19

| Decision | Approved content / rule IDs | Boundary |
| --- | --- | --- |
| AD-01 | Single promo; cart/category/product scope; fixed/percentage; capped eligible merchandise; exclude shipping; server validation; BR-P01–BR-P04 | Scope hierarchy, funding/limits lifecycle and financial rounding unresolved |
| AD-02 | Promo BZ +11 random server digits, unique and protected; immutable allocation; BR-P05–BR-P06 | Not order number; allocation algorithm pending |
| AD-03 | Binary seller availability, persistence/reactivation, no quantitative inventory; restored events/dedup/in-app; BR-A01–BR-A03 | Variant granularity and lawful recipient/retention/channel policy not inferred |
| AD-04 | Owned persisted cart/wishlist, multi-seller components, unique buyer ID, payment-gated purchased-cart clearing, safe retries; BR-C01–BR-C04 | Order display format, mixed-cart scope and remote transaction gaps pending |
| AD-05 | Direct cancellation New/Confirmed; request from Preparing through In transit; Delivered/Completed returns; BR-X01–BR-X02 | Seller refusal cannot remove statutory rights; side effects/legal gates remain |
| AD-06 |5 calendar days from exact Preparing transition; staff escalation;48h response; system-cancel affected component after silence; BR-D01–BR-D03 | Calendar convention, race classification and provider evidence pending |
| AD-07 | Full/partial item returns, evidence/communication/support/history, discounted-value refund and verified finality; BR-R01–BR-R03 | No invented legal window, exclusion, dispute SLA or shipping liability |
| AD-08 | Buyer/seller/optional employee/support/moderator/admin boundaries, tenant isolation/sensitive-deny/no «Клієнти»; BR-Z01–BR-Z02 | Detailed grants, staff assignment and employee scope require review |
| AD-09 | Explicit customer fields, optional saved addresses, checkout delivery details, privacy gates; BR-U01–BR-U03 | Retention, encryption/key design, consent/recovery details pending |
| AD-10 |3 carriers, operator tariff message, no BAZAR shipping calculation, pickup snapshot, unavailable-location agreement, individual tracking and verified uncollected-return response; BR-S01–BR-S03 | Real directory/dispatch/return evidence and financial resolution not test substitutes |
| AD-11 | Verified success/decline/unknown, no blind retry, idempotent payment/refund reconciliation; BR-Y01–BR-Y03 | Provider/merchant/capture/settlement not chosen |
| AD-12 |5% independently per seller on discounted merchandise excluding shipping, immutable totals; BR-F01–BR-F02 | Commission retention BR-F03 is **not approved**; rounding/other fees/payouts pending |
| AD-13 | Documentation-only F19 and preserved design/source/safety constraints; BR-G01 | Does not grant buyer-only scope deferrals or readiness |

## Proposed technical decisions — NOT approved business policy

| ID | Proposal / alternatives | Review / consequence |
| --- | --- | --- |
| TD-01 | Node crypto.randomInt(0,10) independently11 times (or unbiased CSPRNG rejection sampling), prefix BZ; DB UNIQUE, transactional bounded collision retry, no Math.random/time/sequential/user code | Security/backend; select bounded retry/rate parameters before implementation. Code space10^11 (~36.5bits) is not an auth secret; rate-limit redemption, redact codes from logs |
| TD-02 | Opaque internal UUIDs, parent→seller-order→shipment child model, composite owner/seller FKs, immutable snapshot and append-only adjustments | Backend/commerce; order display number remains PD-06, shipment grouping/cardinality PD-09; no public-format assumption |
| TD-03 | Transactional event/outbox/job records, unique aggregate revision/event+recipient keys, locked deadline/availability transitions and resumable workers | Backend/security; delivery at-least-once with dedup, not exactly-once promise across arbitrary providers |
| TD-04 | Versioned pricing plan fingerprint and immutable per-unit allocation vector; checked BigInt rational arithmetic and integer minor outputs; DB sums/FKs and refund capacity locks | Finance/backend approve PD-01 first; no float or implicit rounding; unsafe totals fail closed |
| TD-05 | Deny-by-default capability grants with actor, tenant, resource, assignment and grant-version scope; optional DB RLS defense after connection-pool review | Security/product review permission matrix below contracts; no role silently becomes financial superuser; seller employees disabled pending scope |
| TD-06 | Recoverable contact encrypted with approved key management plus separate keyed phone lookup; fields segregated from audit payloads; explicit key rotation and deletion tombstones | Privacy/security/legal; data field approval is not storage/key-lifetime approval; no migration storing real PII in F19 |
| TD-07 | UTC timestamptz events + IANA calendar-zone policy revision; deadline computed once from original transition,48h elapsed duration from persisted escalation | Product/legal review PD-08 calendar zone and boundary/DST alternatives; no hardcoded timezone or120h default |
| TD-08 | Versioned API DTOs/additive SQL migration with new-model discriminator; staged legacy stock/quote retirement, new payment-cycle identity and durable cart-completion receipt | Backend/security; no edit to migrations0001–0015 or old order history; F20 schema plan before private API activation |

## Pending business / finance decisions — unresolved activation gates

| ID | Decision required / options (not selected) | Owner | Blocks |
| --- | --- | --- | --- |
| PD-01 | Rounding mode (half-up vs half-even vs floor), percentage aggregate/line/unit granularity; remainder allocation; independent5% seller commission rounding; partial-unit refund penny attribution | Finance/product | Fractional/multi-line allocation and commission posting F22; no algorithm inferred from exact legacy tests. See worked alternatives in contracts |
| PD-02 | Category descendants vs exact category; product variants inherit eligibility or explicit override; seller funding and category/product campaign authority; variant-level availability resolved by AD-14; variant deletion/unpublication/tombstones | Commerce/catalog/finance | F20 availability/schema and F22 promo eligibility; no adding seller funding or merging categories silently |
| PD-03 | Promo reserve/consume/release timing across payment, per-user/total caps, minimum-order basis, exact interval/time/case normalization, seller-funded vs platform-funded discount and accounting, restored capacity on failure/cancel/refund | Marketing/finance | F22 production-equivalent redemption. Existing isolated apply-not-consume/confirmation-claim behavior not universal approval |
| PD-04 | Discount reaching100%/zero merchandise payable; how to confirm no-payment order without fake payment, commission/tax implications; legal merchandise payable vs taxes/fees/payment charge basis | Finance/legal/commerce | Free-order path and final charge amount beyond approved merchandise invariants |
| PD-05 | Checkout of subset when unavailable saved lines exist (block whole vs explicit eligible selection); concurrent cart edits at completion (version conflict/frozen selection/safe subtraction), preservation of unpurchased/new lines; retries after payment-success/persistence-failure | Commerce/backend | Safe purchased-cart clearing and repeat-purchase F21–F22; no deleting unavailable saved entries or blind compensation/charge |
| PD-06 | Buyer-facing unique order-number representation, issuance timing and uniqueness namespace; parent aggregate status display for mixed components | Product/legal | Human order-ID UI and parent aggregate labels, not internal UUID FK planning |
| PD-07 | Seller request-response authority, permitted preparation/shipment transitions, refusal/withdraw/reopen, direct cancellation payment-in-flight handling; approval boundaries with statutory rights | Commerce/legal/support | F23 seller workflow beyond approved buyer eligibility; no automatic refund/no-refund conclusion from seller refusal |
| PD-08 | Calendar-day zone/DST/nonexistent-time convention and exact boundary inclusion; eligible dispatch proof and cutoff (carrier occurredAt vs server verifiedAt); seller-response qualifying content/races, re-entry cycle and late evidence handling | Fulfillment/legal/support | F23 deadline automation.48h elapsed from escalation is specified; overnight rounding and deadline reset on retries are not allowed |
| PD-09 | Seller employee scope, delegated grants, assignment/fallback queue/staff coverage; per-seller shipment grouping/split quantities, seller operational settings and sensitive financial approval workflow | Marketplace/security/support | F25/F26 operator capabilities; default deny optional/unreviewed grants |
| PD-10 | Versioned buyer-only vs full-marketplace acceptance denominator, operator/channel/wallet/Q&A/review/attachment included/deferred cases and device/source baselines | Product/design | F29 readiness; no implicit deferral based on lack of code; no final design sign-off in F19 |

## Pending legal / privacy / finance decisions

| ID | Required decision | Owner / blocked execution |
| --- | --- | --- |
| PL-01 | Applicable Ukrainian consumer protection obligations and current legal text, return/cancellation deadlines and exclusions, proof/condition, return shipping liability/uncollected parcel, dispute/escalation periods and partial refund entitlement | Qualified Ukrainian legal + commerce. No invented statute citations/durations. Buyer rights are not gated by seller discretion. F23 real workflow and automated financial side effects blocked until reviewed |
| PL-02 | Controller/processor responsibilities, purpose/legal basis per field/channel, minimization, encryption/lookup/key rotation, consent version/preferences, child/guest data, lawful retention/deletion/anonymization/legal holds, notification recipient eligibility and account recovery/phone reassignment | Privacy/legal/security. No retention day count, default push consent or unsafe profile persistence; customer fields approved but live PII handling blocked |
| PL-03 | Commission retention on cancellation/returns/non-fulfillment (business preference only), seller agreements/tax invoices, payer of promo/processing fees, acquiring fees, settlement/payout timing, holds/chargebacks and reconciliation | Legal/finance. Never reduce statutory buyer refunds or irreversibly retain fee by preference; no settlement/payout engine activation |

## External dependencies — no provider selected or activated

| ID | Required verified contract/evidence | Blocks |
| --- | --- | --- |
| EX-01 | Approved payment provider/merchant, hosted/tokenized card flow, wallet SDK and device capabilities, signature/account/environment/capture/refund/chargeback/idempotency/reconciliation semantics | Real charges/refunds/wallets; test signatures are not production contracts |
| EX-02 | Official current NP/Meest/Ukrposhta directory/availability/dispatch/tracking/return schemas, accounts/keys/contracts and data disclosure terms | Live directory/TTN/tracking/interception; no BAZAR tariff calculator or invented quote TTL needed under BR-S01 |
| EX-03 | Approved SMS provider, phone/OTP/rate/key/recovery policies, HTTPS domains/BFF/proxy and production runtime grants | Production phone login; local demo flags never authorize server data |
| EX-04 | Approved in-app source/event rules and push/email/SMS/FCM channel providers, consent/templates/preferences/retention, credentials and delivery observability | Real outbound channels/back-in-stock push; F13 inbox reused, no second notification system |

## Decision governance

Pending→approved requires explicit recorded product/finance/legal/security authority, version/date, chosen alternative, rationale, expected examples, affected BR/phase/test IDs and supersession. A technical PR merging is not legal approval. Current instruction approves AD-01–AD-13 boundaries only, not TD/PD/PL/EX. No question is silently resolved by a fixture or generated ID example.

F18 DR01–DR12 remain historical: DR02 now has BR-F01 rate/basis but PD-01 rounding; DR03 has single code/eligibility/cap but PD-02/03 lifecycle; DR04 quantitative inventory is **rejected scope**, replaced by binary availability and cart completion; DR05 has cancellation/deadline capabilities but PL-01/PD-06–08; DR07 fields/address optionality approved, PL-02 open; DR08 role boundary approved, detailed grants open; DR09 shipping calculator/quotes **not required**, official locations/tracking open. DR01/06/10–12 retain relevant scope/provider/ops gaps.

## F20 decision delta — supersedes only availability ambiguity

**AD-14 (Approved, explicit user Phase F20):** each variant owns binary availability; selectable product aggregates any purchasable available variant, simple product own boolean; selected cart variant does not inherit sibling availability; product wishlist restores only at fully-unavailable→available; per-transition recipient dedup, IDs and audit. BR-A04/BR-A05 and ADR0018 implement this target in catalog V2. PD-02 no longer blocks availability granularity; it still gates promo category ancestry/variant eligibility/funding and deletion/unpublication. No rounding or merchandising min/first price rule is approved.

**TD-09 (implemented technical contract, not a business financial decision):** opt-in sidecars keep legacy IDs/history; public versioned `/api/v1/catalog/*`, no stock backfill, test-only session/membership guarded writes, price=null/selection-required for unequal variants. Explicit sorted page/limit queries are bounded and fail closed beyond documented scale. F13 inbox reused. Existing F3 endpoints remain legacy and must not be used as V2 availability truth. Source import/asset licensing/publication authority and least-privilege rollout stay pending; no new live seller grant/provider.
