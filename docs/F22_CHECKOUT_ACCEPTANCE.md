# Phase F22 — Multi-Seller Checkout & Financial Calculations

Base: PR #32 merged at `da77a976139dd01ec547075e890ac80e31797101`. Branch: `codex/phase-f22-multi-seller-checkout`. No production deployment, provider activation, payout, inventory or Demo100% claim.

## Actual implementation

[ADR0020](adr/0020-multi-seller-checkout.md) defines boundaries. [Finance](../apps/api/src/commerce/finance.ts) uses BigInt, canonical exact inputs and largest remainder; [service](../apps/api/src/commerce/service.ts), [HTTP](../apps/api/src/commerce/http.ts), [model](../apps/api/src/commerce/model.ts), [migration0018](../apps/api/migrations/0018_commerce_checkout.sql) and [OpenAPI](../apps/api/contracts/openapi.json) define the new additive isolated protocol. Old migrations/endpoints and Shopify reference remain unchanged.

One parent per reviewed checkout; one seller order per participating seller; immutable lines and financial snapshots. UUID order identifiers preserve existing conventions and are not BZ promo codes. Server derives every price, eligibility, subtotal, discount,5% seller commission and payable merchandise total. Every seller delivery is independently selected and verified through existing adapter directories. Shipping is not calculated or charged by BAZAR: «Вартість доставки згідно з тарифами поштового оператора».

The [ordinary checkout](../apps/storefront/components/checkout/commerce-checkout.tsx) and [orders](../apps/storefront/components/account/commerce-orders.tsx) use typed [client/validators](../apps/storefront/lib/commerce-client.ts) in the existing isolated HTTPS entry. Default local demo stays unchanged. No local authentication substitution, guest merge, real SMS/payment/shipment or wallet-provider claim. Only synthetic contacts; browser session storage contains opaque references/keys, not contacts/totals or authorization. Refresh recovers through owner APIs, including a parent created before an uncertain HTTP response.

## Seven financial rules recorded

1. One promo per parent; eligible merchandise/cart/category/product scope, excluding shipping.
2. Fixed discount is capped to eligible merchandise and distributed proportionally.
3. Exact integer minor units / rational arithmetic, no authoritative binary floats.
4. Largest remainder, exact reconciliation and immutable-ID tie-break, independent of iteration order.
5. Percentage parent discount derives from exact eligible basis; fractional rounding mode requires PD-01.
6. 5% independently on each seller's discounted merchandise; no carrier/other fees or payouts.
7. Persist immutable line/seller/parent allocation, commission/proceeds, algorithm/rounding/version and payment evidence; never reprice historical orders.

Example implemented/tested: gross800000+200000 minor units, fixed100000 → discounts80000+20000; net720000+180000; commissions36000+9000; seller amounts684000+171000; customer net900000. All sums reconcile exactly.

## Important unresolved decisions (not silently selected)

- **PD-01:** largest remainder is approved; the half-up vs half-even policy for fractional aggregate percentage and seller commission remains pending. Active mode is exact-only; affected scenarios return policy-required. Alternatives are pure tested code, not enabled commerce. Clarification requested from product owner.
- **PD-04:** fully free parent orders require a non-payment finality protocol; no zero-value fake successful payment.
- **PD-02/03:** no automatic category-descendant expansion, variant override, discount funding or unapproved minimum-basis behavior. Where eligible vs complete-cart minimum predicates differ, scenario is blocked.
- Promo expiry/change after a verified payment is retained as verification-required rather than losing payment proof, clearing cart or inventing refund policy.
- F14 protocols remain intact; F23 needs explicit new-parent/seller/line proof linkage, quantity-level discount-penny attribution, return eligibility/legal deadlines, shipping/fee/refund rules and provider-verified refund finality. No commission retention or reduction of statutory buyer refund rights.
- Production SMS/BFF/domains/grants, real payment/carrier capabilities, compliant PII/retention/storage/consent, merchant-of-record/settlement/processing fees/payout timing remain blocked. Authenticated order listing currently bounds latest 100 entries; production pagination/load/recovery are not proven.

## Safety evidence and reproduction

Use repository Node 24 lockfiles. `npm --prefix apps/api run test:integration` creates disposable loopback PostgreSQL; `test:storefront` builds shared ordinary-page HTTPS integration with real test OTP/session, directories and signed payment observations; `test:browser` preserves previous checkout/notification regressions. Ordinary `tests/e2e` preserves local preview behavior. No test helper is selected by production API/main. Browser helpers require own session/CSRF/Origin and owned operation before signing synthetic observations.

New [unit finance tests](../apps/api/tests/commerce-finance.test.ts), [PG/HTTP/security tests](../apps/api/tests/integration/postgres.test.ts), [portable-client tests](../apps/storefront/tests/commerce-client.test.ts), [E2E](../tests/e2e/storefront-tests/commerce.spec.ts) cover proportional/percentage/scoped/capped finance, stable ties, concurrent/repeated calls, unavailable/changed prices, rollback, distinct ownership, verified/forged/unknown/declined results, generation-aware clearing, refresh/history and desktop/mobile. Tests do not prove live provider or legal readiness. Results are appended after completed commands; debug runs are not added to totals.

## Confirmed local validation, 2026-10-27

| Suite | Completed result |
| --- | --- |
| API unit |52 passed (6 new finance cases) |
| Storefront unit |91 passed (2 new portable-contract/client cases) |
| Compiled API smoke |3 passed |
| Real PostgreSQL / HTTP / security |121 passed (8 new F22 cases) |
| Shared ordinary-page HTTPS browser |30 passed:18 F22 +12 F21, desktop1440×900/mobile390×844 |
| Existing isolated checkout/notifications |44 passed |
| Governance unit |5 passed |

API/storefront lint, API/storefront/two isolated-entry typechecks and API/Next production builds passed. API/storefront/E2E dependency audits each reported 0 vulnerabilities. No dependencies or lockfiles changed. Existing migration checksums 0001–0017 were preserved. OpenAPI local references, new evidence-link targets, ledger and task-path scope validate. Ordinary browser regression and final GitHub checks are recorded below once completed.

Expanded safety cases confirm: two independent buyers cannot spend the last promo use concurrently; a forced clearing failure preserves verified payment proof, rolls back order/cart projections and retries finalization without a new submission; successful clearing advances cart version once; seller owner reads expose only their own component; invalid optional contacts and fractional provider amounts fail closed. No test budgets, retries or skips were weakened. A pre-existing ambiguous status selector was scoped to its actual deletion message after the full regression caught simultaneous loading/status announcements.

Final ordinary Playwright regression: **100 passed /8 unchanged viewport exclusions**, desktop1440×900 and mobile390×844. Final local total: **446 passing cases** (52+91+3+121+30+44+100+5), with debug/repeated executions excluded from the sum. All completed suites have0 failures. Automated axe, focus/keyboard and horizontal-overflow checks passed in their documented tested surfaces; no claim of manual screen-reader or live-provider acceptance. `git diff --check` and staged diff checks passed.
