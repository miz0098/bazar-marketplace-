# Phase F10 — Demo Completion Plan

## F20 implementation update — 2026-10-27

[Catalog acceptance / compatibility / limits](docs/F20_CATALOG_ACCEPTANCE.md) and [ADR0018](docs/adr/0018-catalog-binary-availability.md) describe implemented catalogVersion2, additive migration0016, stable seller/product/variant IDs, binary availability, guarded test seller mutations, immutable audit, restored-event fanout through F13, exact money display, media support, query/paging and ten legacy route repairs. Actual test results belong to the PR report, not historical counts below. Older audit evidence remains unchanged. Catalog-v2 preview is explicit public read-only/non-production; default mock remains and server cart/account integration is F21. Differing-variant aggregate pricing, approved real assets/import/source/legal content and production roles/providers/channels remain gated. **No Demo100% / Full Audit Ready claim.**

## F19 target-policy update — 2026-10-27

[Business Rules V1](BUSINESS_RULES_V1.md), [domain contracts](COMMERCE_DOMAIN_CONTRACTS.md), [decision register](BUSINESS_DECISION_REGISTER.md) and [F20–F29 implementation mapping](F20_F29_IMPLEMENTATION_CONTRACT.md) are the current target-policy authority. F18/F1–F17 implementation observations, counts and historical checks below are retained unchanged; this documentation does not add functional coverage or make them V1-compliant. **НЕ ГОТОВИЙ; no Demo100% / Full Audit Ready claim.** Quantitative inventory/reservations are intentionally out of scope; binary seller availability and persistent disabled saved items are required. Carrier shipping prices are operator-managed, not BAZAR-calculated; use «Вартість доставки згідно з тарифами поштового оператора». Financial rounding/allocations, legal/settlement/privacy and provider gates remain explicit. Technical representations remain proposals.

F18 technical audit: **НЕ ГОТОВИЙ** до повного функціонального аудиту. [18-area/117-row evidence matrix](FULL_MARKETPLACE_READINESS_AUDIT.md), [backlog B01–B28](FUNCTIONAL_COMPLETION_BACKLOG.md), [proposed F19–F29](REMAINING_DEVELOPMENT_ROADMAP.md), [measurable entry gates](FULL_AUDIT_ENTRY_CRITERIA.md). Збережені нижче F10–F17 результати історичні; поточний зріз розділяє L/I/S/production, не змінює дизайн/код і не оголошує Demo100%.

F17 reuses the F13 inbox for an isolated browser notification center in existing session/orders UI (no new menu): owner count/read/bulk-read/pagination, atomic test-order event, explicit status/cancel/message/support simulations and verified F14 test-refund hook. No real channels or production activation. [Acceptance](docs/F17_NOTIFICATION_CENTER_ACCEPTANCE.md), [ADR0016](docs/adr/0016-customer-notification-center.md).

F16 supersedes the F15 discounted-completion blocker for isolated single-line fixed/exact-percentage checkout only: F5 reuse, atomic test usage/order/payment/shipping snapshot, browser refresh/history and cap contention. Multiple discounted lines, fractional rounding/allocation/stacking and all production financial/provider/auth gates remain blocked. [Scope](docs/F16_DISCOUNTED_CHECKOUT_ACCEPTANCE.md), [ADR0015](docs/adr/0015-discounted-browser-checkout.md).

F15 partially advances D05 with an isolated HTTPS/BFF browser harness and actual F4–F14 APIs, no-promo/card linked confirmation/history across NP/Meest/Ukrposhta. It does not complete D05/I09: promo redemption/financial/order/inventory policy, full real-contact/catalog mapping, actual wallet SDKs and repeat purchase still require D01/D03/D04 decisions. Production SMS/domain/BFF/provider rollout remains D08/D09. [Evidence](docs/F15_BROWSER_CHECKOUT_ACCEPTANCE.md).

F14 advances D04 technical request/audit/refund-capacity seams and bounded My Orders preview only. Next approve cancellation/return authority and legal windows/exclusions, reverse logistics, discount/shipping/fee/seller/rounding allocation, capacity release and real provider finality; then actual lifecycle and browser server mapping. Closing a request or confirming a synthetic protocol does not settle/cancel an order. [Scope](docs/F14_ORDER_LIFECYCLE_ACCEPTANCE.md).

F13 advances D06 with bounded communication preview completion and isolated owned chat/support/pagination/read/idempotency plus notification contracts/inbox. Next: approve staff/seller membership/CRM transitions and privacy/retention/abuse rules, channel consent/templates/outbox policy and notification design, then isolated browser mapping; authoritative order/refund emitters depend on D04. No new account section or production activation. [Acceptance](docs/F13_COMMUNICATION_ACCEPTANCE.md).

## Виконано у Phase F12

D03 partially advances: persistent local demo wishlist plus isolated owned wishlist/profile/address/review service contracts, additive schema versions/claims and opt-in client. This does not approve real PII storage, confirmed-purchase/publication/edit/delete rules or server UI activation. [Section readiness](docs/F12_CUSTOMER_ACCOUNT_ACCEPTANCE.md). Next: approve privacy/security/eligibility/default UX and real mapping decisions, then review browser server-mode alongside D04 financial/order/inventory policy; D05 full checkout and D06 communication/staff/provider gates remain open.


## Виконано у Phase F11 / оновлена черговість

Частково виконано D02: category index/known redirects і query preservation, footer/info/social destinations, demo product variants/Q&A-empty/related/recently-viewed/safe buy-now, shared ephemeral wishlist і local cart quantity/stock reconciliation. Додано browser/unit/accessibility coverage без server activation. Реальні media/settings, pixel review, overlays та approved public SEO map не закриті.

D01 business/scope/visual decisions залишаються потрібними; далі D03 mapping/customer APIs → D04 authoritative financial/order/inventory lifecycle → D05 isolated browser server-mode; D06 communication/staff/channels за approved scope → D07 final demo acceptance. D08/D09 real providers/release залишаються окремими. F11 не погоджує rounding/promo/order/refund/cart-after-order правила і не перетворює fixtures на production readiness.


План ґрунтується на [functional audit](FUNCTIONAL_GAP_AUDIT.md) бази **89a0453** після merge PR #20, [checklist](DEMO_READINESS_CHECKLIST.md), усіх ADR та [Shopify Restoration](docs/SHOPIFY_RESTORATION.md). Це пропозиція наступних етапів і acceptance, а не погодження нових фінансових правил чи production-інтеграцій. **BAZAR Demo 100% ще не досягнуто.**

## Межі мети

Завершений demo має показувати погоджені користувацькі можливості через UI, включно з loading/empty/error/validation/unavailable states, на desktop/mobile, без фальшивих реальних операцій. Наявність foundation, SQL-таблиць або Node integration-тесту не замінює UI acceptance. Реальні SMS, списання, ТТН, legal orders чи refunds не потрібні для безпечного ізольованого demo; вони потребують **окремого** production/sandbox provider approval. Demo може чесно зупинятися перед реальним side effect, якщо це явно погоджений фінальний сценарій; поточний stop на step 3 не доводить усі решту критеріїв.

Якщо product вимагає показати повне order lifecycle/discount/refund, потрібні погоджені правила та окремий ізольований демонстраційний workflow з видимим provenance. Не relabel F6/F9 pending integration record як paid/fulfilled order. Не вмикати test adapters у звичайному API через env toggle заради demo. Наявний preview і дизайн залишаються збереженими.

Пріоритети: **P0** — без цього не можна чесно зарахувати критичний agreed scenario; **P1** — функціональний/UI паритет; **P2** — окремий production release gate. Номери D01–D09 — ідентифікатори плану, не зарезервовані Phase F11+ і не обіцянка дедлайну.

## Рекомендований порядок

| Етап / пріоритет | Прогалини | Залежності | Конкретний результат | Критерії приймання / доказ |
| --- | --- | --- | --- | --- |
| D01 Scope, reference та бізнес-рішення — P0, почати першим | G01, G08–G14 | F10 audit; product/design/finance/security owners | Approved demo scenario register, visual/reference export, рішення про pricing/order/stock/cart lifecycle, privacy/roles/provider boundaries; unresolved items з owner/action | Для кожного B01–B26/I09–I10 є include/exclude/defer з аргументом і підписом; обов'язкові Restoration capabilities не викреслюються без явної зміни scope. Кожне financial питання нижче має approved ADR або залишається disabled. |
| D02 Visible UI/URL parity і browser browse — P1, паралельно з D01 | G04–G05 | Approved UX baseline/URL/content scope D01; не чекає live providers | Category index/redirect map; footer destinations/socials; product variants/media/extras; wishlist add/shared preview; source drawer/Q&A-empty/recently-viewed parity та reviewed safe buy-now transition | B01–B06/B25 проходять на desktop/mobile, deep links/query/back/refresh/invalid IDs/empty/sold-out; screenshots reviewed. Немає seller block/360/delivery selector на product. Source і дизайн не переписані. |
| D03 Domain mapping + customer/address/review services — P0/P1 | G04, G06 | Catalog/import/PII/eligibility policy D01; D02 DTO/UX mapping | Catalog Product/variant/media contract→UI mapper без invented data; owned profile/address/wishlist/review services, additive migrations лише за необхідності; safe opt-in client wiring | DB/API runtime validation, foreign-owner/CRUD/default/concurrent/review-eligibility tests; UI failure/loading/reset/persistence truth. Address creation через approved API, а не SQL fixture як у F9; guest cart no-merge і wishlist policy окремі. |
| D04 Financial + inventory + order lifecycle — P0 | G08–G09, G12 | Approved finance/legal/inventory decisions D01; existing F5–F9 seams | Authoritative merchandise/delivery/tax/fee/payable calculation; order-bound promo lifecycle; reservation/release; cart-after-order/repeat-purchase; approved order transitions/cancel/return/refund contracts | I09 multi-line/rounding/allocation/caps/concurrent/expired/retry/rollback tests, no client price/paid trust; no oversell/duplicate order; immutable snapshots/audit. Real provider side effects залишаються disabled. Не змінювати попередні migrations або test history semantics. |
| D05 Isolated browser server integration — P0 | G02, G03 (demo boundary), G10–G11 (test seams) | D01 mode/security approval; D03 address/catalog mapping; D04 для full promo/order сценарію | Reviewed browser/BFF test harness з secure session/cookie/Origin/CSRF, явними isolated SMS/carrier/payment adapters і disposable DB; API/main production guards не послаблені | B08/B16–B20/B26: UI catalog→cart→verified session→NP/Meest/Ukrposhta→promo→test payment→truthful confirmation/history; second purchase за approved policy; identity/stock/price/tariff/duplicate/forged event/timeout/unknown negatives. No local-to-server merge; BAZAR pickup disabled; no real SMS/charge/TTN/order. Якщо discounted completion blocked — цей gate не ready. |
| D06 Customer communication, support, notification та staff boundary — P1; security decisions P0 | G07, G13–G14 | D01 participants/role/channel/retention decisions; D03 owned identity/resources; D05 harness | Authorized messages/read/pins/attachments, support owner/staff transitions; reply/delete policy; notification/outbox та seller/admin integration або approved scope disposition | B12–B15/B23–B24 membership/tenant abuse, upload limits/scanning, read/unread dialogs, retry/duplicate/closed-ticket/retention; no fake delivery. Seller/admin implementation лише після role/source approval; generic userId/vendor string не auth. |
| D07 Demo acceptance package — P0, фінальний demo gate | G01–G07, G15 (demo evidence), решта agreed сценаріїв | D02–D06 відповідно до approved scope; усі blocking questions resolved/deferred explicitly | Reproducible demo seed/reset/start instructions, test traces, manual acceptance results, stakeholder sign-off, актуальна matrix | Усі included B/I критерії й screenshots/keyboard/screen-reader/zoom/overflow пройдені на обох viewport, visible links valid, data resets predictable, no personal production data. Acceptance не зводиться до pass count. Лише після цього можна сказати Demo 100% для конкретної approved scope/version. |
| D08 Real provider onboarding — окремий P2 gate | G03, G10–G11, G12 | D01/D04 contracts; approved accounts/keys/terms/security | Actual SMS adapter, carrier transports/schema mappings, selected payment provider/merchant/wallet SDK та sandbox verification | Офіційні контрактні fixtures + approved sandbox probes, account/environment binding, real signature/idempotency/finality/cancel/refund/reconciliation/limits. No credentials in Git; no real money/TTN without separate approval. Demo synthetic tests не закривають цей gate. |
| D09 Production readiness/release preparation — P2, останній | G15 та всі production blockers | D03–D08, legal/privacy/design/security review | Reviewed framework/BFF/TLS/proxy topology, production grants/secrets/key rotation/migrations/backup-restore/monitoring/rollback, SEO/redirect/content approval, fail-closed live/mock release selection | Production-like smoke/least privilege/outage/security/backup restore/rollback rehearsal, named responders і explicit human release approval. PR merge, main, deployment/DNS поза цим audit; ніяких платних autonomous Actions. |

Роботи D02 та policy D01 можна вести паралельно; D03 використовує вже погоджені контракти, не має чекати покупки provider service. D04 не починає невизначені фінансові сценарії до рішень D01. D05 не обходить production SMS restrictions — це окремий reviewed isolated harness. D06 не потребує запуску реальних push/SMS, доки channels не погоджені. D08/D09 не змішуються з claim про demo.

## Питання, які треба погодити до реалізації відповідних сценаріїв

| Рішення | Хто погоджує | Поточне безпечне обмеження |
| --- | --- | --- |
| Backend scope Q&A, safe buy-now handoff, recently-viewed consent/recommendation authority, drawer/favorites state, saved methods, notifications, seller/admin UI; URL/SEO/social/help/legal content | Product/design/content | Missing не hidden-ready; seller block/360/product delivery selector виключені, BAZAR pickup disabled |
| Discount stacking/priority, automatic vs code, multi-line/seller/unit allocation, rounding/remainders, minimum basis, publication/time boundaries | Product/finance/catalog | F5 one-code/one-line exact evaluation; fractional/multi-line policy-blocked |
| Promo reserve/consume/release timing, per-user/order caps, failed/unknown payment, cancellation/refund capacity restoration | Product/finance/commerce | No real redemption; F9 active-code completion disabled |
| Final payable, delivery/tax/insurance/COD/fees/currency, legal terms/numbering/fiscalization | Finance/legal/delivery/payment | Merchandise-only snapshots, payableTotal:null; synthetic test amount не invoice |
| Stock source/reserve/decrement/release/expiry/oversell, cart retained/closed/replaced, second purchase, cancellation/returns/transitions | Inventory/commerce/product | Current checks, no reservation/clear, one test payment intent/cart; no arbitrary reuse reset |
| Phone/recipient PII, encryption/key lookup/rotation, consent version, retention/delete, session TTL/rate/proxy/BFF | Security/privacy/legal | Only synthetic refs/HMACs, test policies; no recovered contact defaults or real SMS |
| NP exact official API schemas and account; Meest API generation/contract/token; Ukrposhta tokens/postcode/service mapping; parcel/sender/quote guarantee/TTL | Carrier owner/fulfillment | Explicit test plan/fixtures, no live tariffs/TTN; never infer lockers or free shipping |
| Gateway/merchant/PCI/hosted or tokenized flow, wallet capabilities, signature/account/env/finality/capture/cancel/refund/reconciliation | Payments/security/finance | No selected provider; test HMAC not production scheme; redirect/client message cannot prove paid |
| Staff/seller participants, source-of-truth and RBAC; review moderation, attachment scanning/retention; notification channels/consent/SLA | Marketplace/support/security/privacy | Core tables/prototypes не delegated authorization чи live delivery |
| Production topology, runtime grants/migrations, backup RPO/RTO/restore, observability/incident owners, rollout/rollback | Platform/security | Local Docker and green CI only; no production migration/deploy authorization |

Погоджено вже у F9 й **не відкривається повторно**: один active server cart/user, ensure as needed, guest cart локальний, automatic merge немає, server price/stock authoritative. Подальша зміна цих правил — окреме product рішення; current audit їх не змінює.

## Як закривати етапи без втрати функціоналу

1. Один scoped `codex/*` PR від актуальної `vps-migration`; root/main/Shopify source не переписувати. Дизайн зберігається; UI доповнюється лише за approved reference.
2. У PR назвати точні Fxx/Gxx/Bxx та mode; оновити ledger і matrix після доказів, не за кількістю коду.
3. Нові DB зміни — additive numbered migrations, upgrade/rerun/rollback/concurrency tests. Historical snapshots та попередні checksums залишити.
4. Запустити lint/types/unit/build/HTTP/PostgreSQL/security/Playwright/audit/governance, review diff та CI. Не вимикати checks для проходження.
5. Demo fixtures й adapters не мають потрапити у live composition; errors/unknown states видимі, no fabricated success. Ніяких paid service/Actions або real side effects без окремої авторизації.
6. Design/product/production sign-offs і test evidence записати окремо. Audit може закрити перевірку, але не самі gaps.

## Умова Demo 100% і вимірювання прогресу

Зараз обґрунтований загальний відсоток **невизначений**: 44 audit areas неоднакові за обсягом, часть scope/financial criteria не погоджена, немає visual/manual sign-off. Не обчислювати `% ready` за PR, routes, таблицями або test pass ratio.

Після D01 можна завести versioned register: кожний included acceptance-сценарій має ID, owner, agreed weight (або явно equal weight), required viewport/mode/negative states та evidence. `Виконана вага / уся включена вага × 100` є лише coverage цієї **погодженої** scope. Будь-який незакритий P0 gate блокує Demo 100% незалежно від арифметики; change scope вимагає review, а не тихої зміни знаменника. Production Ready обчислюється/підписується окремо.

До підтвердження всіх включених критеріїв коректний звіт: «працюють обмежені demo UI та isolated integration foundations; Demo 100% не завершено». Найближчий рекомендований етап — **D01 з паралельним D02**, потім D03 → D04 → D05, D06 за затвердженими межами, D07 acceptance; D08/D09 — окремо для реального rollout.
