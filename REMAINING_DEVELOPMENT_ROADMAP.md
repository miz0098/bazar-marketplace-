# Remaining Development Roadmap — proposed F19+

## F20 implementation update — 2026-10-27

[Catalog acceptance / compatibility / limits](docs/F20_CATALOG_ACCEPTANCE.md) and [ADR0018](docs/adr/0018-catalog-binary-availability.md) describe implemented catalogVersion2, additive migration0016, stable seller/product/variant IDs, binary availability, guarded test seller mutations, immutable audit, restored-event fanout through F13, exact money display, media support, query/paging and ten legacy route repairs. Actual test results belong to the PR report, not historical counts below. Older audit evidence remains unchanged. Catalog-v2 preview is explicit public read-only/non-production; default mock remains and server cart/account integration is F21. Differing-variant aggregate pricing, approved real assets/import/source/legal content and production roles/providers/channels remain gated. **No Demo100% / Full Audit Ready claim.**

## F19 target-policy update — 2026-10-27

[Business Rules V1](BUSINESS_RULES_V1.md), [domain contracts](COMMERCE_DOMAIN_CONTRACTS.md), [decision register](BUSINESS_DECISION_REGISTER.md) and [F20–F29 implementation mapping](F20_F29_IMPLEMENTATION_CONTRACT.md) are the current target-policy authority. F18/F1–F17 implementation observations, counts and historical checks below are retained unchanged; this documentation does not add functional coverage or make them V1-compliant. **НЕ ГОТОВИЙ; no Demo100% / Full Audit Ready claim.** Quantitative inventory/reservations are intentionally out of scope; binary seller availability and persistent disabled saved items are required. Carrier shipping prices are operator-managed, not BAZAR-calculated; use «Вартість доставки згідно з тарифами поштового оператора». Financial rounding/allocations, legal/settlement/privacy and provider gates remain explicit. Technical representations remain proposals.

### Current F19 plan and decision precedence

The detailed current phase/API/DB/UI/security/test exits are in [F20–F29 contract](F20_F29_IMPLEMENTATION_CONTRACT.md). F19 records user-approved policy, not completion of the below applications. DR01–DR12 below are historical; the [F19 decision register](BUSINESS_DECISION_REGISTER.md#decision-governance) maps what was resolved and what remains open. In particular DR04 stock reservation is rejected scope, not an unresolved implementation requirement; DR09 BAZAR tariffs/quoteTTL are removed from target checkout, not a provider dependency.

- F20: catalog/SKU/media/search/routing, exact presentation, seller ownership/binary availability and carrier-managed shipping contract plan. PD-02 variant semantics before affected implementation; do not choose financial rounding.
- F21: ordinary server-session buyer UI, persisted cart/wishlist, checkout contacts without required saved profile address; retain unavailable entries and local guest/no merge.
- F22: parent/seller multi-item checkout, single promo/cap/approved allocations,5% seller commission snapshot, server card test proof, safe purchased-cart clearing/second purchase; no inventory decrement or BAZAR shipping price.
- F23: approved cancellation actions, return/refund protocol and per-seller5calendar-day/48h deadline model under legal/calendar gates.
- F24: remaining account/comms and F13 in-app restored-availability event fanout; no real push claim.
- F25/F26: tenant-scoped seller/admin and assigned staff CRM workflows; no admin «Клієнти», no unapproved employee/sensitive finance grants.
- F27/F28/F29: approved external conformance, operational/privacy recovery and exact-candidate audit-entry recheck. No live activation/deployment implied.

#### Preserved F18 proposal below

**Це пропозиція послідовності, не погодження нових бізнес-правил і не автоматичний запуск фаз.** Поточний вердикт: **НЕ ГОТОВИЙ**. [Аудит](FULL_MARKETPLACE_READINESS_AUDIT.md), [backlog B01–B28](FUNCTIONAL_COMPLETION_BACKLOG.md), [entry criteria](FULL_AUDIT_ENTRY_CRITERIA.md).

## Два різні продукти приймання

- **Buyer-only integrated demo (B):** один buyer UI із server-session/test PostgreSQL, контрольованими fictional actors/data і guarded test providers. Жодних реальних SMS, списань, ТТН, справжніх order/refund claims. Можливе explicit defer seller/admin/staff UI та реальних channels/wallets, якщо scope register це погодить. Це не full marketplace і не Production Ready.
- **Full marketplace functional scope (M):** B плюс seller/admin/staff authority й operational end-to-end flows, persistence/audit/negative cross-role tests. Synthetic/sandbox provider mode можна погодити для функціонального аудиту, але не називати live operations.
- **Production (P):** окремі contract/key/privacy/domain/grants/recovery/reconciliation/release approvals. Реальна інтеграція не є обов'язковою для кожної B demo, але є обов'язковою для live capability. Платні сервіси не обираються й не активуються цією пропозицією.

Зараз scope B/M не підписана повністю. Не можна отримати готовність, мовчки виключивши багатотоварність, lifecycle, reviews чи інші погоджені вимоги. Disabled ПВЗ BAZAR і no automatic guest cart merge вже погоджені; це не нові decision blockers.

## Decision register — погодити до відповідного коду

| ID | Потрібне рішення / власник | Що заблоковано до рішення |
| --- | --- | --- |
| DR01 | Product/design/marketplace: versioned buyer-only vs full marketplace scope, reference screens/content/import dataset, required devices and permitted deferrals | Загальний readiness denominator, B01/B03/B21/B28; final design acceptance не робиться тут |
| DR02 | Finance/product: money display precision, financial rounding granularity/mode/remainders, line/unit/seller allocation, payable/tax/fee/currency semantics | B08/B10; generic L rounding не переноситься в фінансовий engine |
| DR03 | Marketing/finance: single/multiple promotion compatibility, funding, eligibility, minimum basis, publication/time/code normalization, reserve/consume/release/caps and failed/unknown payments | Multi-line discounts й реальний promo lifecycle; існуючі F5 exact test rules не змінювати без рішення |
| DR04 | Commerce/inventory: stock source, reserve/decrement/release/expiry/oversell, cart retained/closed/replaced, second purchase | B11; one active cart/user, local guest/no merge залишаються чинними |
| DR05 | Legal/commerce/finance: order numbering/terms, state authorities, cancel eligibility, return windows/exceptions/qty/reverse logistics, refund/shipping/fee allocation/finality/capacity restoration | B10/B16/B24; request closure ≠ cancellation, signed test refund ≠ returned money |
| DR06 | Catalog/product: source/import/SKU/media/license/attributes, min price vs available variant merchandising, search/facet/sort/pagination contract | B03/B06; не вигадувати vendor/rating/media DTO |
| DR07 | Privacy/security/legal: allowed contacts/profile/address fields, synthetic-only guards, browser persistence, encryption/key rotation/consent/retention/deletion/phone recovery | B04/B12/B13/B27; real PII не допускається за безпечність mock форми |
| DR08 | Marketplace/support/legal: tenant/employee/seller/customer permissions, ticket assignments/SLA, genuine message participants, Q&A/review proof/moderation/publication/edit rights | B14/B15/B19/B21/B23; customer owner checks не role model |
| DR09 | Fulfillment: approved NP/Meest/Ukrposhta accounts/contracts/API generation/service/parcel/sender/fees/currency/quote guarantee/tracking/TTN rules | B17/B24 live; test estimates не офіційний тариф |
| DR10 | Payments/security/finance: provider/merchant/hosted-tokenized flow, actual wallet SDK/capabilities/devices, signatures/account/env/3DS/capture/refund/reconciliation/unknown outcomes | B18/B24 live/positive wallets; не обирати provider самостійно |
| DR11 | Product/privacy/operations: in-app/email/SMS/web push/Flutter FCM scope, consent/opt-out/templates/payload/retention/outbox/delivery semantics | B20/B27; тип інтерфейсу не connected channel |
| DR12 | Platform/security: production domains/TLS/BFF/proxy/rate/client-IP/keys/grants, migration release/rollback, encrypted backups/RPO/RTO/restore/SLO/incident owners | B25/B26/P release; зелений local/CI не operational evidence |

## Послідовність реалізації

| Фаза (запропонована) | Обов'язкова scope / backlog | Залежності | Конкретний exit gate |
| --- | --- | --- | --- |
| **F19 — Scope & Commerce/Privacy Decisions** | B01, policy slices B08/B10/B11/B16/B21/B27, DR01–DR12 register | Product/finance/legal/security owners | Versioned included/deferred register, resolved relevant P0 decisions або явний stop; approved expected financial examples and test-data policy; ніякої implementation вигаданих правил |
| **F20 — Catalog, SKU/Media & Routing Completion** | B03/B05/B06/B08; buyer storefront | DR01/DR02/DR06 | API↔domain mapper, exact display, two products/two variants, proper media/content; full query/page/search behavior and known legacy redirects; no fabricated metadata |
| **F21 — Regular Storefront Server Sessions & Account/Cart Entry** | B02/B04/B07/B12/B13 contact slice/B27 | F19 policy, F20 IDs/mapper | Approved ordinary buyer test mode uses real guarded server session, current cart and address/contact references; refresh/logout/ownership/CSRF; preview remains separate; no live SMS switch |
| **F22 — Multi-item Pricing & Full Checkout** | B07/B09/B10/B11 plus B17/B18 test slices | F19 financial/inventory decisions, F20–F21 | Multi-product/variant browser order with/without fixed/percentage codes, server amounts, quotes, signed card proof, immutable history, repeat purchase and failure/concurrency; zero/fractional/stacking scenarios included or explicitly policy-blocked per signed scope |
| **F23 — Order Lifecycle & Return/Refund UI Integration** | B16, financial lifecycle/stock/cart effects B10/B11 | F22, DR05/DR08 | Persisted owner cancellation/return/full-partial/refund request/status/timeline scenarios across UI/API/PG; approved authority/eligibility/finality; no actual funds/fulfillment without P approvals |
| **F24 — Customer Account, Reviews/Q&A & Communications Completion** | B12/B13 remainder, B14/B15/B19/B20/B27 | F21 IDs/privacy, F23 verified test lifecycle/proof, DR08/DR11 | Full included account sections through server APIs, genuine approved test participants/events, in-app notices, refresh/error/owner cases. Attachments/channels only per approved included policy; no new Overview/menu design changes |
| **F25 — Seller/Admin Foundation & Operations** | B21/B22, admin part B24 | F19 tenancy/roles/finance, F20 catalog model, F22–F23 authority | Separate approved admin/seller application and write APIs, RBAC/tenant isolation, audit/versioned catalog/stock/pricing/promo/order operations. Can be deferred only for explicit B scope, not M |
| **F26 — Staff CRM & Operational Workflows** | B23/B24, genuine staff-message/support/notification emitters | F25 roles, F23 lifecycle, F24 communication contracts | Staff queues/assignment/grants/replies/status/audit; buyer sees authoritative events; cross-role deny/revocation/concurrent operations tested. No customer impersonation as operator |
| **F27 — Approved External Provider & Channel Integration** | B17/B18/B20/B26/B27 P slices | DR07/DR09–DR11, contract/keys/consent supplied; F22–F26 interfaces | Agreed provider sandbox conformance and real-device wallet capability proof, protected channels/templates/outbox/reconciliation, truthful status/failure. Real live activation remains separate release approval, no paid services auto-enabled |
| **F28 — Operations, Recovery & Release-Safety Foundation** | B25/B26/B27 operational slices | DR12, stable schema/policies | Least privilege, migration/rollback drill, encrypted backup + successful restore/RPO/RTO evidence, SLO/load/alerts/runbooks/secret review. No deploy in this roadmap document |
| **F29 — Functional Audit Entry Recheck** | B28 and every included B/M blocker | Relevant included phases completed, evidence on exact candidate SHA | [Entry criteria](FULL_AUDIT_ENTRY_CRITERIA.md) all applicable PASS with no unexplained gaps; independent reproducible UI walkthrough possible. Then request joint full audit, not automatic design approval/Demo100% |

## Що можна вести паралельно

Після DR01/06 F20 catalog і DR08 role design можна вести паралельно. F25/B-only admin deferral не повинна блокувати versioned synthetic catalog import для F20. F27 provider research/contracts можна почати паралельно як read-only preparation, без самовільного вибору/keys/live calls. F28 recovery requirements визначити рано, але final restore verification потребує актуального schema. Жодна паралельність не обходить фінансові/legal/privacy gates.

## Що потрібно саме до спільного повного аудиту

Для B candidate: F19–F24 included criteria та B28, із явно погодженими external/operator deferrals і без unresolved included P0. Для M candidate: додатково F25/F26 operational roles/workflows; test/sandbox provider scope погоджується окремо. P readiness додатково вимагає F27/F28 і окремої release review. Не вимагати real charges/SMS/TTN для безпечного B audit; не видавати test mode за production.

F18 лише створює технічну основу планування. Назви/номери F19+ рекомендовані, не підтверджують реалізацію чи бізнес-погодження. Відсоток готовності й Demo100% без повного signed denominator та всіх included acceptance evidence не публікуються.

## F21 current implementation overlay (historical evidence retained)

[Ordinary storefront offer/session/cart/wishlist implementation, modes and verification](docs/F21_STOREFRONT_ACCEPTANCE.md). One distinct seller offer now maps to one exact-price card, resolving the former aggregate-card merchandising blocker without choosing an aggregate parent price. PostgreSQL persistence is available through shared ordinary components in the isolated HTTPS entry; default local demo and production activation remain distinct. F22 checkout/multi-seller financial snapshots, fuller profile/communication integration, seller/staff apps, licensed datasets/media, privacy/legal/finance decisions and live providers remain open. No quantitative inventory or automatic guest merge. No Demo100% / Full Audit Ready claim; BAZAR remains **НЕ ГОТОВИЙ** for full audit. New tests only establish their documented bounded workflows, not all entry criteria.
