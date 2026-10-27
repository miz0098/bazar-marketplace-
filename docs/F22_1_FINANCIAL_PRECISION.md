# F22.1 — Financial Precision & Rounding Completion

Base: merged PR33, `dcbd80cff0e4e6dd423bf0408cd44ed60a14bb2a`. Branch: `codex/phase-f22-1-financial-rounding`. Explicit product approval supersedes only the fractional percentage-total and seller commission rounding gate. Fractional percentage/commission blocker **RESOLVED** after implementation and successful full local validation; final-head CI is tracked on the PR.

## Algorithm and compatibility

[Finance](../apps/api/src/commerce/finance.ts) reuses the existing BigInt engine. `roundHalfUp(n,d)` accepts non-negative numerator and positive denominator in minor units, returns integer quotient plus one iff twice the exact remainder is at least denominator. No conversion to floating point. Examples:4994/10 minor→499;4995/10→500;49995/100→500 (4.994/4.995/4.9995 UAH). Exact halves round up.

Round authoritative eligible parent percentage once; cap to eligible merchandise; distribute the integer discount by unchanged largest remainder, descending exact remainder and immutable UUID tie-break. Fixed discounts keep that same allocation. Compute5% once from each seller's discounted merchandise subtotal, then HALF_UP. Do not sum rounded line commissions. Seller net=commission+seller amount; parent/line/seller discounts and net reconcile exactly; no negative or fractional stored money.

New financial snapshot version `commerce-v2-half-up`; policy `positive-minor-half-up-v1`; basis `seller-net-merchandise-after-promotions-excluding-shipping`. Root snapshot, lines, eligibility, quantities, exact prices, promotion terms and final amounts remain immutable. [Service](../apps/api/src/commerce/service.ts) cannot select exact-only for new quotes; historical v1 reviewed quotes retain their original calculation policy on revalidation. [Client](../apps/storefront/lib/commerce-client.ts) accepts original v1 and validates required v2 metadata. No mutation of historical snapshots or migrations0001–0018, and no new SQL migration needed for existing JSONB storage. Legacy F5/F16 foundation contracts retain their prior behavior; new ordinary server checkout uses commerce v2.

## Scope and remaining gates

No UI redesign, production activation, real charge/SMS, inventory, commission retention, payout or refund operation. Frozen line net/discount/quantity and original policy support future full/partial refunds; F23 must resolve per-unit penny attribution, cumulative entitlement and provider-confirmed finality. Free orders, ambiguous minimum basis/funding, return legal rules, shipping/fees/settlement and providers remain blocked. This is not Demo100% or Production Ready.

## Verification

Unit tests cover below/tie/above-half and approved examples, exact/fractional percentage, seller aggregation vs line rounding, tiny prices,100%/fixed cap, quantities, multiple sellers, stable allocation permutations and reconciliation. Real PostgreSQL tests cover category/product fractional discounts,1-kopiyka seller commission, immutable policy snapshots, idempotent payment and payment-gated clearing, plus unchanged historical v1 quote read/completion. Shared ordinary browser checkout covers the fractional product promotion on desktop1440×900/mobile390×844, confirmation, refresh and My Orders. Existing suites remain enabled. Results will be recorded after completed commands; reruns are not double-counted.

## Completed local validation — 2026-10-27

| Suite | Passed |
| --- | ---: |
| API unit |56 |
| Storefront unit |92 |
| Compiled production smoke |3 |
| PostgreSQL / HTTP / security |124 |
| Shared ordinary-page HTTPS browser |32 |
| Existing isolated checkout/notifications |44 |
| Ordinary desktop/mobile Playwright |100 |
| Governance unit |5 |

**456 passed,0 failed;8 unchanged viewport-specific exclusions.** Ten new test cases (4 API unit,1 storefront unit,3 PostgreSQL,2 viewport browser cases); matrix assertions are not counted separately and repeated/debug runs are excluded. Existing tests/retries/budgets/skips are not weakened. Desktop1440×900/mobile390×844, existing axe/keyboard/overflow coverage remain enabled.

API/storefront lint; API/storefront/two isolated-entry typechecks; API and all Next production builds; ledger/task scope; OpenAPI and evidence references; git diff --check pass. Three dependency audits (API/storefront/E2E) report0 vulnerabilities. No dependencies/lockfiles, UI or migrations0001–0018 changed. Tests do not establish live-provider, payout/refund, legal or full marketplace readiness. See [ADR0021](adr/0021-half-up-financial-precision.md).
