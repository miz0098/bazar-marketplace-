# Full Marketplace Functional Readiness Audit — Phase F18

## F20 implementation update — 2026-10-27

[Catalog acceptance / compatibility / limits](docs/F20_CATALOG_ACCEPTANCE.md) and [ADR0018](docs/adr/0018-catalog-binary-availability.md) describe implemented catalogVersion2, additive migration0016, stable seller/product/variant IDs, binary availability, guarded test seller mutations, immutable audit, restored-event fanout through F13, exact money display, media support, query/paging and ten legacy route repairs. Actual test results belong to the PR report, not historical counts below. Older audit evidence remains unchanged. Catalog-v2 preview is explicit public read-only/non-production; default mock remains and server cart/account integration is F21. Differing-variant aggregate pricing, approved real assets/import/source/legal content and production roles/providers/channels remain gated. **No Demo100% / Full Audit Ready claim.**

## F19 target-policy update — 2026-10-27

[Business Rules V1](BUSINESS_RULES_V1.md), [domain contracts](COMMERCE_DOMAIN_CONTRACTS.md), [decision register](BUSINESS_DECISION_REGISTER.md) and [F20–F29 implementation mapping](F20_F29_IMPLEMENTATION_CONTRACT.md) are the current target-policy authority. F18/F1–F17 implementation observations, counts and historical checks below are retained unchanged; this documentation does not add functional coverage or make them V1-compliant. **НЕ ГОТОВИЙ; no Demo100% / Full Audit Ready claim.** Quantitative inventory/reservations are intentionally out of scope; binary seller availability and persistent disabled saved items are required. Carrier shipping prices are operator-managed, not BAZAR-calculated; use «Вартість доставки згідно з тарифами поштового оператора». Financial rounding/allocations, legal/settlement/privacy and provider gates remain explicit. Technical representations remain proposals.

**Вердикт: НЕ ГОТОВИЙ до спільного повного функціонального аудиту. Demo 100% не оголошено.** Це technical/documentation-first зріз, не фінальне приймання дизайну й не production penetration/операційна сертифікація.

Дата:2026-10-27 UTC. База: `vps-migration` at `a2daa5c5a8d36cd81fbfc76f9bada59a83d9fe6c`, перевірено merged PR #28. Робоча гілка: `codex/phase-f18-functional-readiness-audit`. F18 не змінює код, тести, дизайн, міграції чи runtime configuration.

## Метод і межі доказів

Зіставлено фактичні Next routes/components/providers, API entrypoint/services/OpenAPI, SQL migrations, test factories/runners, browser tests та docs F1–F17/ADR0001–0016. Історичні твердження F10–F17 нижчих документів не приймалися за поточний стан без коду. Запущено наявні checks і окремий GET-only crawl без зміни тестів чи створення реальних операцій. Жодні production домени/акаунти не активувалися й не тестувалися із секретами.

Є **24 Next page patterns**, **60 OpenAPI path templates**, **15 SQL migrations**, лише **apps/api** та **apps/storefront**. Це інвентаризація, не знаменник готовності. `main.ts` конфігурує тільки DB readiness/public catalog; приватні auth/cart/account/commerce/communication factories залишаються test-only. Наявність OpenAPI path, таблиці або клієнта не означає production API чи підключений UI.

Режими: **L** — звичайний mock storefront (частина стану in-memory/local/sessionStorage); **I** — окремий F15–F17 HTTPS browser-integration app із реальною тестовою PostgreSQL/сесією, ізольованими adapters; **S** — серверні unit/HTTP/PG capabilities без повного browser UI; **НП** — не підтверджено; **N** — не знайдено у дослідженому source; **H** — Shopify-hosted/platform handoff поза реалізацією theme; **T** — Liquid/template/platform objects; **P** — prototype/mock. D/M —1440×900 і390×844, Chromium desktop та mobile emulation, не фізичні пристрої/Safari.

Production-колонка «НЕ ДОВЕДЕНО» означає відсутність сукупного production evidence, навіть якщо конкретна технічна функція працює. Жодна область не оголошена повністю Production Ready. «Завершено L/I» обмежено прямо названим сценарієм, а не всією предметною областю.

## Shopify reference і provenance

`bazar-latest-shopify` — віддалена **гілка**, не папка у migration workspace. Origin tip повторно перевірено: `105d10fb6b8e65c5f163016aa8c69072e85faa0e`. Досліджено окремий read-only Git archive у /tmp; його не перемикали/зливали/копіювали в робочу гілку. Між поточним root theme і цим reference вже є **71 відмінний файл** у assets/sections/snippets/templates/layout (до F18); це не зміни цього аудиту й не доказ втрати від F18. Для parity використано pinned reference, а не припущення про тотожність root theme.

Shopify theme доводить rendering/handoff/local prototypes, але не налаштовані SMS, carriers, wallets, сторонні apps, Shopify Admin ролі або actual refund workflows. «Не знайдено у theme» не означає «неможливо на Shopify». Нова BAZAR триетапна/marketplace архітектура позначена окремо; відсутні можливості не вигадуються.

## Матриця можливостей

Коди U/A/D/T/S у клітинках — посилання на конкретні файли у evidence index наприкінці. Bxx — [backlog](FUNCTIONAL_COMPLETION_BACKLOG.md). У кожної області scope окрема: позитивний S тест не підвищує автоматично I/L/production.

### 01. Головна / merchandising

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-001|Головна|Вхід у buyer journey|SSR сторінка з fixture-контентом; не CMS|T [S01]|[U01] [U26]|—|—|[T01]|L D/M|L завершено у межах fixtures|НЕ ДОВЕДЕНО|B01 B03|
|MC-002|Hero / банери|Переходи та керування слайдами|Hero і промо ведуть на demo catalog; кампанії статичні|T [S01]|[U01]|—|—|[T01]; link probe|L D/M shell; не кожний банер E2E|L частково|НЕ ДОВЕДЕНО|B03|
|MC-003|Категорійні плитки|Відкрити потрібну категорію|Посилання на query category із fixtures|T [S01]|[U01] [U04]|[A03] окремо|[D0001]|[T02]|L D/M|L працює|НЕ ДОВЕДЕНО|B03|
|MC-004|Добірки / новинки|Відображати керовані товари|Recommended/popular/newProducts — фіксовані масиви, не персоналізація|T [S01]|[U01] [U38]|— CMS|— CMS|[T01]; link probe|L D/M shell|L працює, джерело mock|НЕ ДОВЕДЕНО|B03|
|MC-005|Медіа головної / карток|Контент із погодженого джерела|CSS visuals/placeholders; немає повного media mapper/import|T [S01] [S05]|[U07] [U38]|[A03] без media DTO|[D0001] без media|[T02] не visual parity|L D/M layout; pixel НП|L частково|НЕ ДОВЕДЕНО|B03 B28|

### 02. Навігація / контент / legacy URLs

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-006|Header / пошук / counters|Навігація, wishlist/cart/profile|Локальні лічильники та preview auth; I header callback читає server cart|T [S02]|[U02] [U10] [U16] [U25]|[A04] [A05] лише I|[D0010]|[T01] [T03] [T05] [T09]|L/I D/M|L та I у власних межах|НЕ ДОВЕДЕНО|B02 B04|
|MC-007|Меню каталогу / mobile|Відкриття, Escape, фокус, категорії|Працює з fixture categories; інтегрованої повної ієрархії немає|T [S02] [S04]|[U02] [U04]|[A03] окремо|[D0001]|[T01] [T02]|L D/M|L працює|НЕ ДОВЕДЕНО|B03 B28|
|MC-008|Footer / social|Внутрішні переходи та 4 погоджені мережі|Facebook/Instagram/Threads/Telegram; platform-default URLs не офіційні BAZAR акаунти|T [S03]|[U03]|—|—|[T02]; link probe|L D/M|L працює, ownership НП|НЕ ДОВЕДЕНО|B03 B28|
|MC-009|Інформаційні сторінки|Доступний осмислений контент|about/contacts/careers/help — demo; warranty/order-tracking/partners/blog та legal content не завершені|T [S03], settings|[U29]|— CMS|— CMS|[T02]; link probe|L D/M layout|L частково|НЕ ДОВЕДЕНО|B27|
|MC-010|404 / unknown URL|Коректний HTTP 404 і навігація|L Next notFound; I catch-all може повернути catalog для unknown UI path, не router parity proof|T Shopify routes|[U28] [U30]|[A02] unknown API|—|[T01] [T02] [T12]|L D/M; API S|L працює в тестованій scope|НЕ ДОВЕДЕНО|B28|
|MC-011|Legacy collections|Зберегти відомі переходи|collections/all та fixture category handles redirect у catalog; невідомі handles 404|T [S04]|[U30]|—|—|[T02]; legacy probe|L D/M E2E; probe D|L частково|НЕ ДОВЕДЕНО|B05|
|MC-012|Інші старі Shopify URLs|Повна погоджена карта міграції|Немає загального redirect inventory для pages/account/policies; див. HTTP probe нижче|T [S12]|[U28] [U30]|—|—|legacy probe, не повний SEO аудит|HTTP D; M НП для кожного|Частково / відсутнє|НЕ ДОВЕДЕНО|B05|
|MC-013|Усі внутрішні links|Відсутність dead ends|Додатковий GET-only crawl reachable fixture routes; форми/динамічні стани — окремі E2E|T [S02] [S03]|[U02] [U03] [U29]|—|—|[T02] + link probe|crawl D; regression D/M|Обмежена перевірена scope|НЕ ДОВЕДЕНО|B05 B28|

### 03. Каталог / категорії

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-014|Категорії / підкатегорії|Фільтрація дерева|L плоскі category+subcategory; S recursive parentId/root reads з PostgreSQL|T [S04]|[U04] [U31]|[A03]|[D0001] [D0003]|[T02] [T11]|L D/M; S без full browser tree|L та S, mapper частковий|НЕ ДОВЕДЕНО|B03|
|MC-015|Список товарів PostgreSQL|Читати актуальні товари|Public catalog factory вибрана main за готової DB; звичайний Next її не використовує|T Liquid collection|[U26] [U25]|[A01] [A03]|[D0001] [D0003]|[T09] [T11]|I D/M лише мала seed scope|I обмежено / S public reads|НЕ ДОВЕДЕНО|B02 B03|
|MC-016|Наявність у каталозі|Ціна й stock не суперечать variant selection|API min price серед усіх variants та any-stock availability; merchandising policy не погоджена|T [S04] [S05]|[U07] [U08]|[A03]|[D0001]|[T11]|L D/M; I fixture|Частково|НЕ ДОВЕДЕНО|B03 B07|
|MC-017|Повні facets / metadata|Brand/vendor/media/rating/attributes|L fixtures; API не вигадує відсутні поля, повний mapper/schema/import відсутній|T [S04] [S05]|[U38] [U07]|[A03]|[D0001] базові поля|[T02] [T11] не повна parity|L D/M; I НП для full DTO|Частково / немає|НЕ ДОВЕДЕНО|B03|
|MC-018|Редагування дерева / publication|Кероване валідне джерело каталогу|Немає category/product write API/UI та перевірки циклів редактора|H поза theme source|—|[A28] read-only inventory|[D0001] schema, не workflow|Немає write E2E|НП|Немає|Відсутнє|B21 B22|

### 04. Пошук / фільтри / пагінація

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-019|Пошук товарів|Релевантні результати та empty/error|L substring title/vendor/subcategory; API literal all-token simple tsvector, не той самий engine|H [S11]|[U05] [U31]|[A03]|[D0003]|[T02] [T11]|L D/M; I basic browse|L/S частково узгоджені|НЕ ДОВЕДЕНО|B03 B06|
|MC-020|Підказки|Keyboard suggestions і safe navigation|L від 2 символів, fixture suggestions; серверного autocomplete немає|H [S11]|[U06] [U31]|— autocomplete|—|[T02]|L D/M|L працює / API відсутнє|НЕ ДОВЕДЕНО|B06|
|MC-021|Фільтри|Category/subcategory/vendor/price|L URL controls та валідація bounds; API subtree/min/max — окремий контракт|T [S04]|[U04] [U31]|[A03]|[D0003]|[T02] [T11]|L D/M|L працює; mapper НП|НЕ ДОВЕДЕНО|B03 B06|
|MC-022|Сортування|Стабільний порядок|L featured/price/name; API fixed allowlist і tie-breakers; не є write pricing|T [S04]|[U04] [U31]|[A03]|[D0003]|[T02] [T11]|L D/M; S|L/S працює у своїй scope|НЕ ДОВЕДЕНО|B06|
|MC-023|Catalog pagination / URL|Shareable q/filters/sort/page|L page size8 і page links; API query-bound opaque offset cursor з межею, не snapshot|T [S04]|[U04] [U31]|[A03]|[D0003]|[T02] [T11]|L D/M; S cursor|Частково, різні контракти|НЕ ДОВЕДЕНО|B06|
|MC-024|Search pagination|Повний набір результатів|Search route бере limit12 без page/cursor UI; великі результати не пройшли E2E|H [S11]|[U05]|[A03] окремо|[D0003]|Немає >12 search E2E|НП для великих вибірок|Неповно|НЕ ДОВЕДЕНО|B06|

### 05. Картка товару

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-025|Деталі / переходи / unknown|Відкрити канонічний товар|L fixtures і 404; I лише synthetic product/detail|T [S05]|[U08]|[A03]|[D0001]|[T02] [T09]|L/I D/M, різні datasets|L працює / I обмежено|НЕ ДОВЕДЕНО|B02 B03|
|MC-026|Варіанти / URL variant|Вибір SKU, ціна, медіа, stock|L selector + variant query; API variants/SKU; I UI переважно перший variant|T [S05]|[U08] [U25]|[A03]|[D0001]|[T02] [T11]|L D/M; I multi-variant НП|Частково|НЕ ДОВЕДЕНО|B03 B07|
|MC-027|Базова / sale ціна|Точна ціна вибраного variant|L compareAt fixture, generic formatter округлює до гривні; I formatter точний|T [S05]|[U08] [U27] [U25]|[A03] [A08]|[D0001]|[T02] [T09]; cents у L НП|L/I D/M layout|Частково, P0 money display|НЕ ДОВЕДЕНО|B08|
|MC-028|Sold-out / quantity|Не додавати недоступний SKU|L disabled/stock limits; I перевірка server quantity/stock|T [S05]|[U08] [U10]|[A04]|[D0001]|[T02] [T09] [T11]|L/I D/M|Працює у bounded demo|НЕ ДОВЕДЕНО|B07 B11|
|MC-029|Галерея|Варіанти, keyboard, alt/media|L CSS gallery/selected media index; реальний asset pipeline не перенесений|T [S05]|[U08] [U38]|— media|— media|[T02]; pixel/real media НП|L D/M functional|Частково|НЕ ДОВЕДЕНО|B03 B28|
|MC-030|Характеристики / description|Правильний товарний контент|L fixture tabs/specifications; API description без повного attributes mapper|T [S05]|[U08]|[A03]|[D0001]|[T02]|L D/M|Частково|НЕ ДОВЕДЕНО|B03|
|MC-031|Публічні відгуки / ratings|Достовірний рейтинг і відгуки|L fixture display; F12 own review proof не є public moderation/publishing|P/T [S05] [S09]|[U08] [U17]|[A17] policy-gated|[D0011]|[T04] [T11], не public review E2E|L D/M; S лише private|Частково|НЕ ДОВЕДЕНО|B14|
|MC-032|Питання / відповіді товару|Читання та погоджене надсилання|L лише empty text, надсилання недоступне; service/schema workflow немає|P [S05]|[U08]|—|—|[T02] tab only|L D/M display|Немає workflow|НЕ ДОВЕДЕНО|B15|
|MC-033|Рекомендації|Перехід до релевантних товарів|L same-category deterministic добірка, не персоналізація|P/T [S05]|[U09]|— engine|—|[T02]|L D/M|L працює, engine немає|НЕ ДОВЕДЕНО|B03 B27|
|MC-034|Нещодавно переглянуті|Bounded canonical IDs і очистка|L sessionStorage per tab; не account history|P [S05]|[U09]|—|—|[T02]|L D/M|L працює у визначених межах|НЕ ДОВЕДЕНО|B27|
|MC-035|Quick add|Безпечно додати з картки|L додає default variant; відсутній повний API variant chooser/card mapper|Не доведено у BAZAR card [S05]|[U07] [U10]|[A04] окремо|[D0010]|[T02]|L D/M|L працює / I full catalog НП|НЕ ДОВЕДЕНО|B03 B07|
|MC-036|Купити зараз|Додати SKU та перейти в checkout без bypass|L cart.add → /checkout; завершується preview review, не покупкою|T [S05]|[U08] [U23]|— regular UI|— regular UI|[T02] [T07]|L D/M|L safe preview лише|НЕ ДОВЕДЕНО|B02 B09|

### 06. Обране

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-037|Add/remove/sync|Єдиний стан card/detail/header/account|L canonical product IDs, синхронізація providers/tabs|P [S10], не повна card integration|[U16] [U36] [U07]|[A17] окремо|[D0001] [D0011]|[T05]|L D/M|L завершено у fixture scope|НЕ ДОВЕДЕНО|B12|
|MC-038|Persistence / corruption|Refresh та safe reset bad data|L versioned ID-only localStorage; unavailable known items можна видалити|P [S10]|[U36]|— local|— local|[T05]|L D/M|L працює|НЕ ДОВЕДЕНО|B12|
|MC-039|Server wishlist owner|Власний список та недоступні товари|F12 test GET/add/remove з owner checks; ordinary UI не підключена|N власний backend|[U16]|[A17]|[D0011]|[T11]; немає I wishlist E2E|S, browser НП|S лише / L окремо|НЕ ДОВЕДЕНО|B12|
|MC-040|Account/guest wishlist policy|Узгоджена синхронізація користувачів|Server і browser IDs різні; merge/sync правила не визначені|P [S10]|[U36] [U26]|[A17]|[D0011]|[T05] local, [T11] owner|НП для cross-mode journey|Блокер|Заблоковано|B12 B04|

### 07. Кошик

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-041|Guest add / variants / multi-line|Окремі SKU і кількості|L local cart supports variant identity/multiple lines; ціни з fixtures|H [S06]|[U10] [U11]|— local|— local|[T02] [T14]|L D/M|L працює|НЕ ДОВЕДЕНО|B07|
|MC-042|Guest refresh / malformed data|Зберегти лише дозволений локальний стан|L localStorage, canonical fixture reconciliation; не server cart|H [S06]|[U10]|—|—|[T02] [T14]|L D/M|L працює|НЕ ДОВЕДЕНО|B07 B27|
|MC-043|Quantity / remove / errors|Позитивні quantities, stocks, empty|L limits/removal; I server versions/idempotency|H [S06]|[U11] [U25]|[A04]|[D0010]|[T02] [T09] [T11]|L/I D/M|Працює в bounded scope|НЕ ДОВЕДЕНО|B07|
|MC-044|Актуальні ціни / залишки|Повторна перевірка на сервері|I current DB wins, stale fingerprints fail; L тільки поточні fixtures|H [S06]|[U10] [U25]|[A04] [A10]|[D0001] [D0010]|[T09] [T11]|I D/M; L stale remote НП|I працює, production НП|НЕ ДОВЕДЕНО|B07 B11|
|MC-045|Авторизований current cart|Один active/user, ensure за потреби|F9 owner cart, durable mutation receipts; звичайний UI mock|N BAZAR backend|[U25]|[A04]|[D0010]|[T09] [T11]|I D/M|I працює|НЕ ДОВЕДЕНО|B02 B04|
|MC-046|Guest → server|Без автоматичного merge|Погоджено: local guest лишається local, explicit server add|N правило BAZAR|[U10] [U25]|[A04]|[D0010]|[T09] [T11]|I D/M|Навмисно без merge, не gap|НЕ ДОВЕДЕНО|B07|
|MC-047|Multi-item checkout handoff|2+ products/variants до order/payment/history|F6 S multi-line snapshot існує; I fixture/cart UI і E2E переважно один available variant|H [S06]|[U25]|[A09] [A10]|[D0006] [D0014]|[T11] F6 multi-line; I positive НП|L multi-line; I multi-line НП|НЕ завершено end-to-end|НЕ ДОВЕДЕНО|B09 B10 B11|
|MC-048|Після успішного order|Узгоджений active cart та повторна покупка|Cart не очищується/не замінюється; inventory не резервується; repeat-purchase policy blocked|H hosted state|[U25]|[A04] [A09]|[D0010]|[T09] replay, не second purchase|I second purchase НП|Блокер|Заблоковано|B11|

### 08. Авторизація / приватні межі

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-049|Phone/OTP preview UI|Валідація, errors, resend, consent|L masked preview challenge; не створює підтверджену сесію|P [S07]|[U12]|— preview|— preview|[T03]|L D/M|L preview працює|НЕ ДОВЕДЕНО|B04 B27|
|MC-050|Server OTP / abuse|Protected OTP, budgets, one-time verify|F4 crypto/HMAC/expiry/attempt/resend budgets у test composition|Не доведено як live SMS [S07]|[U25]|[A05]|[D0004]|[T09] [T11]|I D/M; S exhaustive|I/S працює|НЕ ДОВЕДЕНО|B04 B26|
|MC-051|Сесія / refresh / logout|HttpOnly Secure SameSite, revoke|I реальна test server session і owner restore; main auth503|H/P [S07] [S09]|[U25]|[A05] [A06]|[D0004]|[T09] [T10] [T11]|I D/M|I працює, production blocked|НЕ ДОВЕДЕНО|B04 B26|
|MC-052|CSRF / Origin / BFF|Захищені cookie mutations та reads|I exact Origin/Fetch Metadata/Host, CSRF, TLS SPKI; це loopback, не доменний rollout|N власний BFF|[U25]|[A06] [A25]|[D0004]|[T09] [T10] [T11] [T12]|I D/M; S HTTP|I працює, prod boundary НП|НЕ ДОВЕДЕНО|B26|
|MC-053|Приватні Next routes|Справжній owner, не local demo flag|L /profile показує fixtures анонімно; I API owner enforced; regular SSR gate відсутній|H/P [S09] [S12]|[U13] [U26] [U25]|[A06] [A17]|[D0004]|[T03] [T04] [T11]|L/I D/M; production НП|Частково, не live auth|НЕ ДОВЕДЕНО|B04 B13|
|MC-054|Реальний SMS / recovery|Approved provider, keys, phone changes/recovery|Адаптер test-only; AUTH_MODE не активує production auth; recovery/phone reverify не готові|P hooks [S07]|[U12]|[A05] [A23]|[D0004] hashes only|[T11] [T12]; немає live E2E|НП live|Блокер|Заблоковано|B26 B27|

### 09. Кабінет / дані / адреси / reviews / methods

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-055|Погоджена навігація|8 розділів плюс вихід, без Огляду в меню|AccountShell відповідає; /profile технічно OverviewScreen landing, не новий пункт меню|P [S08] [S12]|[U13] [U37]|— regular UI|— regular UI|[T04] [T05]|L D/M|L працює|НЕ ДОВЕДЕНО|B13 B28|
|MC-056|Особисті дані|Валідація і збереження дозволених полів|L edits in-memory; S name-only versioned profile; phone/email changes недоступні|H/P [S09]|[U18] [U32]|[A17]|[D0011]|[T04] [T11]|L D/M; S owner|L/S окремо, не інтегровано|НЕ ДОВЕДЕНО|B13 B27|
|MC-057|Улюблені адреси|CRUD, default, owner/versions|L memory form; S opaque carrier/city/point refs, I створює synthetic address; не реальний recipient|H/P [S09]|[U19] [U25]|[A17]|[D0011]|[T04] [T11] [T09]|L/I D/M частково; S CRUD|Частково|НЕ ДОВЕДЕНО|B13 B27|
|MC-058|Мої відгуки|Verified purchase, uniqueness, allowed changes|L edit/remove fixtures; S proof+policy guards, F9 test order не verified purchase|P [S08] [S09]|[U17]|[A17]|[D0011]|[T04] [T11]|L D/M; S guards|S policy gated, browser create НП|НЕ ДОВЕДЕНО|B14|
|MC-059|Платіжні методи|Безпечний стан, без PAN/CVV|Погоджений empty/deferred екран; немає реальної tokenized card binding|P empty [S09]|[U20]|— provider vault|— card vault|[T05]|L D/M|Навмисно safe empty; binding немає|НЕ ДОВЕДЕНО|B18|
|MC-060|Вихід|Чітко відокремити preview і revoke|L notice/reset preview; I справжнє server revoke, widget unmount|H/P [S08]|[U13] [U25] [U24]|[A05]|[D0004]|[T04] [T09] [T10]|L/I D/M|Працює у своїх режимах|НЕ ДОВЕДЕНО|B04|
|MC-061|PII / local draft|Не приймати реальні дані без правил|L checkout sessionStorage містить введені fullName/phone та draft; I resume ID-only, DB names synthetic/plaintext|P unsafe prototype [S07] [S08]|[U23] [U35] [U25]|[A31] [A17]|[D0001]|[T07] [T09]; privacy audit не замінено|L/I D/M functional; legal НП|Production blocker|Заблоковано|B27|

### 10. Checkout / pricing / промокоди

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-062|Step1 локальний|Контакти+доставка, form validation|L поля і session draft; міста/відділення free text, не live directory|N BAZAR 3-step; H [S06]|[U23] [U35]|— regular UI|— local|[T07]|L D/M|L preview працює|НЕ ДОВЕДЕНО|B09 B13|
|MC-063|Step1 інтегрований|Server identity/address/directory|I readonly synthetic contacts, F12 opaque own refs і тестові carrier directories|N BAZAR|[U25]|[A13] [A17]|[D0007] [D0011]|[T09]|I D/M|I обмежений|НЕ ДОВЕДЕНО|B09 B13 B27|
|MC-064|Step2 local promo / total|Погоджена логіка без fake financial success|L BAZAR10 trim/uppercase/floor10%; не F5 rule, не legal payable; display rounds UAH|H [S06]|[U23] [U34] [U27]|— local|— local|[T07]|L D/M|Preview, не є pricing parity|НЕ ДОВЕДЕНО|B08 B10|
|MC-065|Step3 ordinary|Review з чесним stop|L не створює order/payment; це збережена межа preview|H hosted [S06], N 3-step|[U23]|— regular UI|— regular UI|[T07]|L D/M|Працює як stop, не purchase|НЕ ДОВЕДЕНО|B02 B09|
|MC-066|Наскрізний single-line|Catalog→session→cart→shipping→payment→order/history|I реальні test HTTP/PG, card signed proof, owner checks; не normal storefront|N власна BAZAR система|[U25]|[A09] [A11] [A13]|[D0010] [D0014]|[T09]|I D/M|I bounded success|НЕ ДОВЕДЕНО|B02 B09 B11|
|MC-067|Fixed / exact percentage|Server eligibility/minimum/time/caps/replay|F5/F16 один variant line, exact minor units; apply не витрачає cap, confirm атомарний|H [S06]|[U25]|[A07] [A08]|[D0005] [D0014]|[T09] [T11]|I D/M; S negatives|I працює для одного рядка|НЕ ДОВЕДЕНО|B10|
|MC-068|Multi-line discount / allocation|2+ variants/products без маніпуляцій|F5 policy rejects multi-line; немає seller/unit allocation/stacking rules|H поза theme logic [S06]|[U25]|[A07] [A08]|[D0005] не allocation ledger|[T11] rejection, positive НП|Positive I НП|Заблоковано|Заблоковано|B10|
|MC-069|Fractional / zero / financial policy|Approved округлення та free-order semantics|Fractional percentage і zero-merchandise checkout blocked; final payable/tax/fees не визначено|H [S06]|[U27] [U25]|[A08] [A12]|[D0014] test plan only|[T11]; negative I fraction|L/I частково; positive НП|Заблоковано|Заблоковано|B08 B10|
|MC-070|Snapshot / replay / refresh|Історія не змінює суми; один test order|I immutable order/testFinancials, одна usage claim, stale inputs відхиляються|H [S06] [S09]|[U25]|[A09] [A10]|[D0006] [D0014]|[T09] [T11]|I D/M|I працює; legal totals null|НЕ ДОВЕДЕНО|B10 B11|

### 11. Доставка

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-071|Нова пошта|Cities/branches/quote selection|L вибір/free text; I synthetic adapter; official wire/schema seam, не live account|Не доведено carrier setup [S06]|[U23] [U25]|[A13] [A14]|[D0007]|[T07] [T09] [T11]|L/I D/M|I synthetic працює|НЕ ДОВЕДЕНО|B17|
|MC-072|Meest|Cities/branches/quote selection|Нормалізований test adapter + official contract codec, no live token/transport|Не доведено carrier setup|[U23] [U25]|[A13] [A15]|[D0007]|[T07] [T09] [T11]|L/I D/M|I synthetic працює|НЕ ДОВЕДЕНО|B17|
|MC-073|Укрпошта|Settlement/office/estimate|Official directory contract + test estimate; немає затвердженого live tariff/account|Не доведено carrier setup|[U23] [U25]|[A13] [A16]|[D0008]|[T07] [T09] [T11]|L/I D/M|I synthetic працює|НЕ ДОВЕДЕНО|B17|
|MC-074|Тарифи / expiry / concurrency|Не довіряти client cost, recheck before confirm|I DB quote binding/expiry/idempotency; суми синтетичні та shipping не discounted|H hosted calculator не досліджений|[U25]|[A13]|[D0007]|[T09] [T11]|I D/M|I працює|НЕ ДОВЕДЕНО|B17 B10|
|MC-075|ПВЗ BAZAR|Залишити недоступним|Disabled за погодженою вимогою; не missing implementation для поточної scope|N нова вимога|[U23] [U25]|[A13] carriers contract|—|[T07] [T09]|L/I D/M|Навмисно disabled|НЕ ДОВЕДЕНО|Не рахувати як gap без нової вимоги|
|MC-076|ТТН / tracking / real fulfillment|Авторитетні shipment events|Контракти майбутнього tracking; немає реального booking/webhook/transport|H поза theme evidence|— workflow|[A14] types only|[D0001] shipments не workflow|Немає live E2E|НП|Немає / blocked|НЕ ДОВЕДЕНО|B17 B24 B26|

### 12. Платежі / wallets

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-077|Тестова карткова оплата|Owned attempt → signed proof|I provider-neutral test adapter, binding amount/currency/account; немає PAN/CVV input|H accelerated [S06]|[U25]|[A11] [A12]|[D0009]|[T09] [T11] [T15]|I D/M|I protocol працює|НЕ ДОВЕДЕНО|B18|
|MC-078|Apple Pay / Google Pay|Лише справжні browser+provider capabilities|L preview capability logic, I disabled без SDK/merchant proof; device name не доказ|H additional checkout [S06]|[U23] [U25]|[A11] methods seam|[D0009]|[T07] [T09]; real device positive НП|D/M emulation, не hardware|Підготовлено, не підключено|НЕ ДОВЕДЕНО|B18|
|MC-079|Webhook / double spend|Authenticity, dedup, safe transitions|S signed isolated HMAC, account/amount mismatch/replay denied; це не signature реального provider|H поза source|— real provider UI|[A11]|[D0009]|[T11] [T15]|S + I signed synthetic|S/I protocol працює|НЕ ДОВЕДЕНО|B18 B26|
|MC-080|Decline / timeout / retry|Unknown не дозволяє blind resend|Durable attempts/reconciliation/cancel test states; browser decline/retry є|H поза source|[U25]|[A11]|[D0009]|[T09] [T11]|I D/M decline; S timeout|Частково UI, S повніше|НЕ ДОВЕДЕНО|B18 B24|
|MC-081|Реальна оплата / capture / vault|Легальна узгоджена financial operation|Provider не вибраний; realPayment=false/orderPaid=false; methods не прив'язуються|H тільки handoff evidence|[U20] [U25]|[A01] не compose|[D0009] test-only|[T12] blocked; live НП|НП live|Заблоковано|Заблоковано|B18 B26|

### 13. Замовлення / cancellations / returns / refunds

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-082|Список / деталі / історія|Owner order snapshots|L fixtures; I owned test orders та initial immutable timeline|H/P [S09]|[U14] [U15] [U25]|[A09] [A18]|[D0006] [D0013]|[T04] [T08] [T09] [T11]|L/I D/M|I test history працює|НЕ ДОВЕДЕНО|B16|
|MC-083|Різні статуси|Order/payment/shipment/return/refund окремо|F14 розділяє осі; core order pending/payment not-initiated/inventory not-reserved|H/P [S08] [S09]|[U15] [U25]|[A18]|[D0013]|[T08] [T11]|L D/M; I initial history|Технічні осі є, transitions неповні|НЕ ДОВЕДЕНО|B11 B16|
|MC-084|Скасування|Eligibility, request, authority/audit|L availability blocked; S own idempotent request/review test sidecar; no real order cancel|P/hosted не proven|[U15]|[A18]|[D0013]|[T08] [T11]|L D/M; I actual cancel НП|Request foundation, не cancellation|НЕ ДОВЕДЕНО|B16|
|MC-085|Часткове повернення|Обрати lines/qty/reason|L ephemeral request; S cumulative quantities/owner/history; legal approval/logistics absent|P informational|[U15]|[A18]|[D0013]|[T08] [T11]|L D/M; I full return journey НП|Частково|НЕ ДОВЕДЕНО|B16 B10|
|MC-086|Повне повернення|Whole-order eligibility і approved policy|Quantity foundation не задає legal windows/exceptions/return destination/approval|Не доведено у source|[U15] partial preview|[A18] test guards|[D0013]|[T11] quantities, full business НП|НП end-to-end|Заблоковано|Заблоковано|B16 B24|
|MC-087|Refund-протокол / суми|Linked signed evidence, full/partial capacity|S F14 test-only paid-proof link, guards, audit, unknown outcomes; fundsReturned=false|H не proven backend|— browser refund UI|[A18]|[D0013]|[T11]; I refund НП|S лише|S protocol працює, financial workflow blocked|НЕ ДОВЕДЕНО|B10 B16 B18|
|MC-088|Lifecycle notifications|Не плутати request із виконаною операцією|F17 created event та verified-test refund; cancel/status fixtures не змінюють order|P [S08]|[U24] [U25]|[A20] [A18]|[D0015]|[T10] [T11]|I D/M demo; refund S|Частково, provenance явний|НЕ ДОВЕДЕНО|B16 B20|

### 14. Повідомлення / підтримка / вкладення

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-089|Chat UI / unread / pins / search|Telegram-style list/history/composer|L ephemeral E2/F13 state, chronological DOM та scroll; unread count = chats|P local [S08]|[U21] [U33]|[A19] окремо|[D0012]|[T06]|L D/M|L працює, refresh reset|НЕ ДОВЕДЕНО|B19|
|MC-090|Server messaging|Membership, sequence paging/read, dedup send|S owner/member protocol; I F17 лише read-only linked history, no full Telegram server UI|P own service відсутній|[U21] [U25]|[A19]|[D0012]|[T11] [T10] linked read|L D/M; I read-only|S повніше, full I UI немає|НЕ ДОВЕДЕНО|B19|
|MC-091|Support buyer UI|Create/list/open/reply/status/errors|L ephemeral ticket demo; S owner create/replies; I linked test history|P [S08] [S09]|[U22] [U33] [U25]|[A19]|[D0012]|[T06] [T10] [T11]|L D/M; I read-only|Частково|НЕ ДОВЕДЕНО|B19 B23|
|MC-092|Staff reply / assignment / SLA|Реальна авторизована CRM дія|F17 support.replied — explicit simulation; employee authority/CRM not implemented|P/поза Shopify theme|[U25] simulation|[A27] design-only|[D0012] owner messages|[T10] fixture, не CRM E2E|НП actual staff|Немає workflow|НЕ ДОВЕДЕНО|B23|
|MC-093|Вкладення|Type/size/access/quarantine/storage|L metadata-only attachments; server policy interface, немає upload/download|P frontend metadata|[U21]|[A27] design-only|— object storage|[T06] negative demo, upload НП|L D/M display|Навмисно unavailable, не transfer|НЕ ДОВЕДЕНО|B19 B27|
|MC-094|Conversation roles / retention|Approved sender/customer/seller/staff access|Explicit test memberships; немає production participant creation/retention/realtime policy|P [S08]|[U21]|[A19] [A27]|[D0001] [D0012]|[T11] owner tests, no role matrix|S only|Блокер|Заблоковано|B19 B23 B27|

### 15. Сповіщення / канали

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-095|Customer center|List/date/unread/one/all/paging/error|F17 existing session/orders disclosure, без нового menu; no normal storefront mapping|P empty provider [S08]|[U24] [U25]|[A19]|[D0012] [D0015]|[T10]|I D/M|I працює, L немає|НЕ ДОВЕДЕНО|B02 B20|
|MC-096|Події / provenance|True event source, stable IDs|Atomic test order created; message/support/status/cancel simulations; refund тільки verified F14 test transition|P [S08]|[U24] [U25]|[A20] [A26]|[D0015]|[T10] [T11]|I D/M; refund S|I/S test-only|НЕ ДОВЕДЕНО|B20 B16 B23|
|MC-097|Read state / future arrivals|Без дублювання та чужого доступу|Numeric cursor fix, immutable metadata, monotonic read_at, bounded bulk-read; chat marks окремо|P markAllRead [S08]|[U24]|[A19]|[D0015]|[T10] [T11]|I D/M|I працює|НЕ ДОВЕДЕНО|B20 B27|
|MC-098|Email / SMS / web push / Flutter FCM|Consent і реальна доставка|Лише interfaces/opaque future targets, не канали/SDK/credentials|Не доведено source|— channel UI|[A27]|— subscriptions/outbox|Немає delivery E2E|НП|Відсутнє / blocked|НЕ ДОВЕДЕНО|B20 B26 B27|
|MC-099|Outbox / retry / unsubscribe|Durable delivery semantics/retention|Немає dispatcher/outbox job/channel status чи delivery reconciliation|Не доведено source|—|[A27] design-only|— outbox workflow|Немає|НП|Немає|Відсутнє|B20 B25|

### 16. Seller / admin.bazar.ua

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-100|Seller portal / tenancy|Власні catalog/stock/orders|У apps лише api/storefront; seller UI, seller entity/tenant authority відсутні|H поза theme, не verified|— app|[A28] [A29] planned|[D0001] без seller model|Немає seller E2E|НП|Немає|Відсутнє|B21 B22|
|MC-101|Admin catalog/categories/media|CRUD/import/publication/moderation|Public reads/schema не замінюють admin write workflow чи media pipeline|H поза theme|— app|[A28] no admin writes|[D0001] schema only|Немає admin E2E|НП|Немає|Відсутнє|B21 B22|
|MC-102|Admin prices/stocks/promos|Approved edits, ownership/audit|SQL/test seeds існують; campaign publication/write API і stock ledger немає|H поза theme|— app|[A07] evaluate only|[D0005] schema/claims only|[T11] constraints, no operator flow|НП|Немає|Відсутнє|B21 B10 B11|
|MC-103|Admin orders/finance/returns|Authoritative operational transitions|No operator dashboard, settlement/payout/tax/refund administration|H поза theme|— app|[A18] test sidecars only|[D0013] не ledger seller funds|S protocol, admin НП|НП|Немає|Відсутнє|B21 B16 B24|
|MC-104|RBAC / moderation / audit|Deny cross-tenant and unauthorized roles|Customer ownership tests є; staff/admin/seller grants і role workflow немає|H поза theme|— app|[A29] type plans only|— role/membership administration|Немає RBAC E2E|НП|Немає|Відсутнє|B21 B27|

### 17. staff.bazar.ua / CRM

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-105|Staff queue / assignment|Операційна обробка звернень|Немає staff app/queue/team assignment/SLA; buyer tickets не CRM|N у theme repo|— app|[A27] contract only|[D0012] не assignment model|Немає staff E2E|НП|Немає|Відсутнє|B23|
|MC-106|Staff chats / identities|Approved employees/sellers, access/revocation|Test conversation membership не employee authorization чи moderation tools|N у theme repo|— app|[A19] [A27]|[D0012] raw members only|S ownership, не staff policy|НП|Немає|Відсутнє|B23 B27|
|MC-107|Fulfillment / refund operations|Approve/deny/ship/reconcile з аудитом|Немає operator commands/UI для реального order lifecycle; тестовий controller не CRM|H поза theme|— app|[A18] isolated protocol|[D0013] sidecar only|[T11] протоколи, role flow НП|НП|Немає|Відсутнє|B23 B24 B16|

### 18. Безпека / PostgreSQL / операційна готовність

|ID|Функція|Очікувана поведінка|Фактична реалізація|Shopify evidence|Frontend|API|PostgreSQL|Browser E2E / tests|Desktop/mobile|Demo-статус|Production-статус|Блокери|
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MC-108|API foundation / config / health|Validated startup, errors, /health /ready, shutdown|Node/TS native HTTP реалізовано; main binds catalog/DB only, private modules disabled|N standalone|—|[A01] [A02] [A23]|[D0001] + full inventory|[T11] [T12]|S HTTP; не доменний rollout|Technical foundation|НЕ ДОВЕДЕНО|B26|
|MC-109|Міграції / integrity / grants|Checksums, upgrade/rerun, FK/index/money bounds|15 additive migrations, transactions/advisory locks, restricted runtime readiness checks|N standalone|—|[A21] [A22] [A30]|[D0001] [D0015]|[T11] [T12]|S tests|Technical foundation, release НП|НЕ ДОВЕДЕНО|B25|
|MC-110|Isolation / CSRF / injection|Owner, typed inputs, parameterized SQL|Existing guards tested; no general XSS/injection penetration certification|N standalone|[U25]|[A06] [A03] [A19]|[D0004]|[T09] [T10] [T11]|I D/M + S negatives|Bounded verified, prod review blocked|НЕ ДОВЕДЕНО|B26 B27|
|MC-111|Financial integrity|Server amounts, replay/concurrency, separate status axes|Exact technical totals/snapshots/caps; no authoritative payable/tax/settlement policy or reservations|H external commerce|[U25]|[A07] [A09] [A11] [A18]|[D0014] [D0013]|[T09] [T11]|I single-line; multi financial НП|Partial protocol|НЕ ДОВЕДЕНО|B10 B11 B16|
|MC-112|PII / encryption / deletion|Consent, keys, minimization/retention|HMAC phone/OTP/session; synthetic names/plaintext users; local contact draft; lifecycle cleanup not operational|P prototype [S07] [S08]|[U23] [U35]|[A05] [A17] [A27]|[D0001] [D0004]|[T11] no real PII/retention proof|НП legal/production|Заблоковано|Заблоковано|B27|
|MC-113|Logging / monitoring|No secrets, usable incident signals|Structured allowlist logger/redaction tests; немає SLO dashboards/alerts/responders/load evidence|N standalone|—|[A24]|— observability|[T11] [T12]; load/incident НП|S tests|Partial|НЕ ДОВЕДЕНО|B25 B26|
|MC-114|Backup / restore / RPO/RTO|Encrypted recoverable backup і rehearsal|Є лише вимоги в docs; Docker schema creation/drop не backup restore|N standalone|—|[A22] не restore|[O01] [O02] [O04]|Немає restore rehearsal|НП|Відсутнє operational evidence|НЕ ДОВЕДЕНО|B25|
|MC-115|Production topology / secrets|HTTPS domains, proxy trust, least privilege, release|Loopback BFF є; api/admin/staff DNS/TLS, runtime roles, deployment/rollback не перевірялися|H Shopify external|[U26]|[A23] [A25] [A30]|[O01]|[T12] guards, не live topology|НП production|Заблоковано|Заблоковано|B25 B26|
|MC-116|Dependencies / CI / builds|Repeatable checks, no suppressed failures|Pinned CI jobs, unit/PG/browser suites, audit; tests do not prove external providers or design|N standalone|[U26]|[A28]|[O03]|[T01] [T09] [T10] [T11] [T12]|Chromium D/M лише|Technical evidence only|НЕ ДОВЕДЕНО|B28|
|MC-117|SEO / performance / full acceptance|Redirect/metadata/media budgets та independent review|Basic metadata/404 є; немає full sitemap/SEO/perf budgets, Safari/device and screen-reader acceptance|T Shopify platform|[U28] [U30]|— tooling|—|[T01] [T02] bounded; broader НП|Chromium emulation, не весь fleet|Неповно|НЕ ДОВЕДЕНО|B05 B28|

**Підсумок інвентарю: 18 функціональних областей, 117 capability rows.** Не обчислюється відсоток готовності: сценарії нерівноважні, scope й фінансові правила не погоджені; test pass ratio не є readiness %.

## Критичні висновки, які не можна приховати за зеленими тестами

1. **Немає одного завершеного storefront→server buyer journey.** Звичайний selector приймає лише mock, навіть у production build; I є окремим guarded Next app. Не перемикати реальних користувачів або називати I proof завершеною інтеграцією звичайного сайту.
2. **Багатотоварний checkout НЕ доведений end-to-end.** F6 тестує multi-line merchandise snapshots без повного signed browser flow; F5 блокує multi-line discounts; I seeded UI/E2E переважно один доступний variant. Потрібні2+ products та2 variants одного product, з/без promo, різний stock/ціни, repeat purchase й історія.
3. **Загальна фінансова модель не завершена.** I synthetic total — test convention, payableTotal/delivery.cost залишаються null, order pending і не paid. Округлення/remainders, seller/unit split, taxes/fees/shipping allocation, zero/free orders, consume/reserve/release/refund правила не погоджені. Generic L formatter округлює копійки до гривні; L BAZAR10 floor-rule не є F5 маркетинговим правилом.
4. **Після order немає погодженого cart/inventory lifecycle.** Один active cart/user і no guest merge вже погоджені й не відкриваються повторно. Але reservation/decrement/release, закриття/заміна cart, друге замовлення та unknown-payment recovery не завершені.
5. **Кабінет розділений між memory demo і S contracts.** Wishlist IDs persist локально; profile/address/review/chat/support changes переважно ephemeral. I пов'язує test orders/notification history, а не всі account screens із PostgreSQL.
6. **Скасування/повернення/refund — різні протоколи, не виконані операції.** Немає approved legal windows/exceptions/eligibility/staff authority/reverse logistics/funding. Signed test refund evidence не повертає кошти; request closure не cancels order.
7. **admin.bazar.ua і staff.bazar.ua: реалізації застосунків у цьому repo немає.** Customer owner checks не є seller/admin/staff RBAC. Buyer-only scope може запропонувати defer цих інструментів, але лише з явним погодженням; повним marketplace це не стане.
8. **Операційна й privacy готовність відсутня.** Немає backup/restore rehearsal, визначених RPO/RTO, production keys/proxy/grants/monitoring/release evidence. L checkout зберігає введені контакти в sessionStorage; заборонено трактувати це як безпечне зберігання реальних PII.
9. **Технічна reference parity ≠ дизайн прийнято.** CSS placeholders, неповні media/metadata, partial legacy redirects, прості search/facets та неповні gallery datasets потребують завершення функціональних контрактів; pixel/manual design review відбудеться окремо.

## Окрема оцінка admin.bazar.ua / staff.bazar.ua

| Система | Фактичний код | Чого немає | Buyer-only demo defer | Full marketplace |
| --- | --- | --- | --- | --- |
| admin.bazar.ua / seller operations | Жодного apps/admin або seller app; public catalog та SQL — не editor | Seller tenancy/RBAC, CRUD/import/media/publication/moderation, price/stock/promo campaigns, order/finance operations та audit UI | Можна **запропонувати** versioned synthetic data/import замість UI; лише після scope sign-off, без реальних продавців/операцій | Обов'язкові authority/model/negative cross-tenant tests і робочі operator journeys |
| staff.bazar.ua / CRM | Жодного apps/staff; FutureCrmBoundary design-only, owner support tables | Queue/assignment/roles/SLA, genuine replies, customer-visible attribution, fulfillment/cancel/return/refund decisions | Лише явно позначена simulation з задокументованими виключеннями; не робоча підтримка | Потрібні staff grants, ownership/delegation, approved transitions та event provenance |

DNS/HTTP стан цих доменів не перевірявся; висновок стосується коду/тестів цього repo, не сторонніх систем.

## Поточні безпекові докази та межі

Підтверджені bounded guards: parameterized SQL/allowlisted sort, exact runtime inputs/outputs, owner/member predicates, F4 HMAC OTP/token digests, HttpOnly Secure SameSite cookies, Origin/CSRF/Fetch Metadata в I BFF, immutable financial/audit records, signed isolated provider binding, replay/versions/concurrency та safe error/log fields. React текст не рендериться через dangerouslySetInnerHTML/eval у перевірених app/components/services. Це source review + наявні тести, **не сертифікація відсутності XSS/SQLi чи production threat model**.

Не перевірено/не готово: real provider signature specs/accounts/finality; deployed TLS/proxy/client-IP/rate topology; real PII encryption/keys/consent/delete/retention; backup recovery; actual role/tenant model; DDoS/penetration/load/perf/SLO/incident response. Тестовий DB owner/CREATEDB у disposable runners не runtime production role. Зелений fresh-schema test не restore rehearsal.

## Вимірюваний вихід із поточного стану

Див. [повний backlog](FUNCTIONAL_COMPLETION_BACKLOG.md), [F19+ roadmap](REMAINING_DEVELOPMENT_ROADMAP.md) та [entry criteria](FULL_AUDIT_ENTRY_CRITERIA.md). Зараз не пройдено навіть buyer-only integrated profile без нових scope-рішень: multi-item/financial/cart lifecycle/ordinary UI mapping/contact privacy і account/lifecycle gaps відкриті. Погоджений disabled ПВЗ BAZAR не вважається missing feature; немає права тихо викреслити інші required сценарії для отримання100%.

## Фактична перевірка links / routes

GET-only додатковий crawl на built звичайному storefront:17 стартових маршрутів,80 відвіданих URL,77 унікальних внутрішніх href, черга завершилася без cap;71 відповідь200 і6 redirect307;0 failing internal GET/відсутніх локальних hash targets. Всі сторінки crawl завантажилися без HTTP/error. Це reachable **fixture graph**, не всі можливі CMS/SKU/legacy/query/form стани й не аудит зовнішніх social ownership. Forms/mutations перевіряються окремими E2E. External hrefs: platform Facebook/Instagram/Threads/Telegram, не затверджені BAZAR акаунти.

| Probe | Факт |
| --- | --- |
| /collections/all |307 → /catalog |
| /collections/electronics |307 → /catalog?category=electronics |
| /collections/not-a-category та /definitely-unknown-f18 |404, expected unknown negative |
| /pages/profile (pinned profile-routing), /account |404; legacy migration handling needs explicit decision |
| /pages/delivery |404; representative Shopify-shaped URL, не доказ deployed old content |
| /pages/delivery-payment (pinned footer) |404; немає redirect |
| /pages/returns (pinned footer) |404; немає redirect |
| /pages/warranty (pinned footer) |404; немає redirect |
| /pages/order-tracking (pinned footer) |404; немає redirect |
| /pages/about (pinned footer) |404; немає redirect |
| /pages/partners (pinned footer) |404; немає redirect |
| /blogs/news (pinned footer) |404; немає redirect |
| /pages/public-offer (pinned footer) |404; немає redirect |
| /policies/privacy-policy (pinned footer) |404; немає redirect |
| /policies/terms-of-service (pinned footer) |404; немає redirect |

Pinned footer links самі по собі не доводять, що відповідні Shopify pages були реально налаштовані. Деякий новий контент має інші адреси (наприклад /help/returns, /about), інший ще відсутній. B05 вимагає versioned resolution кожного old URL та actual old-store URL export перед migration release; F18 не вигадує redirect defaults.

### Route/runtime inventory

- Звичайний Next:24 page patterns (app/page.tsx + catalog/search/collections/products/cart/checkout/account/login/register, profile і його existing destinations/detail patterns, [info], help/[slug]). /[info] allowlist —about/contacts/careers; help має обмежений fixture content. /profile — OverviewScreen landing implementation, але Overview у sidebar не додавався.
- L profile не private live data: це anonymous fixtures. SQL ownership працює в S/I; це не означає regular SSR authorization. Ordinary service-provider приймає тільки mock.
- I — окремий guarded catch-all Next root, synthetic dataset й explicit test methods; наразі не повний route/catalog/account mapper. Unknown I UI fallback не є normal404 proof. Real OTP/session CSRF cookie authority тут server, не Phase D local preview.
- API має60 OpenAPI path templates; у main сконфігуровано public catalog за готової DB, /health, /ready і discovery. Більшість private business paths503 без test injection. /ready означає доступність/schema/credentials PostgreSQL, не готовність всіх бізнес-модулів.
- Repo має лише apps/api та apps/storefront, жодних apps/admin/apps/staff/seller portal. Немає доказу стану зовнішніх доменів чи сторонніх Shopify applications.

## Перезапущені перевірки F18

| Перевірка / команда | Локальний фактичний результат | Практична межа |
| --- | --- | --- |
| apps/api npm run lint, typecheck, build |PASS |Без нового коду/відключених rules |
| apps/storefront npm run lint, typecheck, typecheck:browser, build |PASS |Normal production build дозволяє mock; build ≠ production business readiness |
| apps/api npm test |43/43 |Unit protocol/config contracts |
| apps/storefront npm test |78/78 |Demo/domain/client tests |
| apps/api npm run test:production |3/3 |Compiled main guards; не deployed smoke |
| apps/api npm run test:integration |108/108 |Реальна disposable PostgreSQL17,15 міграцій, HTTP/security/financial/concurrency/upgrade cases; не backup restore |
| apps/api npm run test:browser |44/44,0 skips,0 retries |I desktop1440×900/mobile390×844, guarded HTTPS/F4–F17 test modules, signed test card; не реальні providers/devices |
| tests/e2e npm test |90 passed,8 existing skips,0 retries/flaky |L Chromium desktop/mobile;8 viewport exclusions описані нижче |
| npm audit --audit-level=high у API/storefront/e2e |0 vulnerabilities у кожному |Snapshot package advisories, не penetration/privacy review |
| node --test scripts/autonomy/*.test.mjs |5/5 |Orchestration/governance, не function completeness |
| Ledger/scoped paths/docs links/git diff --check |PASS перед commit |F18 docs/ledger only; final SHA/remote CI — у PR |
| Додатковий read-only route/link probe |80 URL/77 href,0 internal errors; legacy findings вище |Script тимчасовий /tmp, не змінює тестів/сайт; не final manual checklist |

8 skips у звичайному suite — наявні project-specific exclusions: foundation desktop-shell на mobile; foundation mobile-navigation на desktop; auth desktop axe на mobile; auth mobile modal на desktop; profile desktop landing/navigation два cases на mobile; profile desktop preview logout на mobile; profile mobile drawer на desktop. Тести не редагувалися для green CI. Isolated browser retries=0; ordinary suite configured CI retries1, локальний F18 результат не використав retries. Final remote counts/conclusion треба перевірити на exact F18 head, не успадкувати з PR #28.

### Прогалини покриття, які залишаються відкритими

Немає позитивного I multi-product/multi-variant checkout/promo/free-order/second-purchase workflow; no ordinary UI↔API whole account scenario; немає реальних wallet SDK/hardware/Safari/Android/browser fleet доказів, live SMS/carrier/payment/channel/provider конформності; no seller/admin/staff operational/tenant tests; no genuine CRM/attachment/private storage/outbox delivery flow; no public review/Q&A moderation path; no actual backup restore/load/penetration/incident rehearsal; немає full screen-reader/manual functional/visual acceptance. API success counts не закривають ці gaps. Усі поточні безпечні test-only/no-side-effect boundaries збережено.

## Evidence index

### Поточні реалізації та тести

- [U01] — [apps/storefront/app/page.tsx](apps/storefront/app/page.tsx).
- [U02] — [apps/storefront/components/layout/site-header.tsx](apps/storefront/components/layout/site-header.tsx).
- [U03] — [apps/storefront/components/layout/site-footer.tsx](apps/storefront/components/layout/site-footer.tsx).
- [U04] — [apps/storefront/app/catalog/page.tsx](apps/storefront/app/catalog/page.tsx).
- [U05] — [apps/storefront/app/search/page.tsx](apps/storefront/app/search/page.tsx).
- [U06] — [apps/storefront/components/search/search-box.tsx](apps/storefront/components/search/search-box.tsx).
- [U07] — [apps/storefront/components/product/product-card.tsx](apps/storefront/components/product/product-card.tsx).
- [U08] — [apps/storefront/components/product/product-detail.tsx](apps/storefront/components/product/product-detail.tsx).
- [U09] — [apps/storefront/components/product/related-products.tsx](apps/storefront/components/product/related-products.tsx).
- [U10] — [apps/storefront/components/cart/cart-provider.tsx](apps/storefront/components/cart/cart-provider.tsx).
- [U11] — [apps/storefront/components/cart/cart-page.tsx](apps/storefront/components/cart/cart-page.tsx).
- [U12] — [apps/storefront/components/auth/auth-flow.tsx](apps/storefront/components/auth/auth-flow.tsx).
- [U13] — [apps/storefront/components/account/account-shell.tsx](apps/storefront/components/account/account-shell.tsx).
- [U14] — [apps/storefront/components/account/orders-screen.tsx](apps/storefront/components/account/orders-screen.tsx).
- [U15] — [apps/storefront/components/account/order-detail-screen.tsx](apps/storefront/components/account/order-detail-screen.tsx).
- [U16] — [apps/storefront/components/account/wishlist-screen.tsx](apps/storefront/components/account/wishlist-screen.tsx).
- [U17] — [apps/storefront/components/account/reviews-screen.tsx](apps/storefront/components/account/reviews-screen.tsx).
- [U18] — [apps/storefront/components/account/personal-data-screen.tsx](apps/storefront/components/account/personal-data-screen.tsx).
- [U19] — [apps/storefront/components/account/addresses-screen.tsx](apps/storefront/components/account/addresses-screen.tsx).
- [U20] — [apps/storefront/components/account/payment-methods-screen.tsx](apps/storefront/components/account/payment-methods-screen.tsx).
- [U21] — [apps/storefront/components/communication/messages-screen.tsx](apps/storefront/components/communication/messages-screen.tsx).
- [U22] — [apps/storefront/components/communication/support-screen.tsx](apps/storefront/components/communication/support-screen.tsx).
- [U23] — [apps/storefront/components/checkout/checkout-page.tsx](apps/storefront/components/checkout/checkout-page.tsx).
- [U24] — [apps/storefront/components/notifications/notification-center.tsx](apps/storefront/components/notifications/notification-center.tsx).
- [U25] — [apps/storefront/browser-integration/screen.tsx](apps/storefront/browser-integration/screen.tsx).
- [U26] — [apps/storefront/services/service-provider.server.ts](apps/storefront/services/service-provider.server.ts).
- [U27] — [apps/storefront/lib/money.ts](apps/storefront/lib/money.ts).
- [U28] — [apps/storefront/app/not-found.tsx](apps/storefront/app/not-found.tsx).
- [U29] — [apps/storefront/services/mock/info-service.ts](apps/storefront/services/mock/info-service.ts).
- [U30] — [apps/storefront/app/collections/[handle]/page.tsx](apps/storefront/app/collections/[handle]/page.tsx).
- [U31] — [apps/storefront/domain/catalog/query.ts](apps/storefront/domain/catalog/query.ts).
- [U32] — [apps/storefront/services/mock/account-service.ts](apps/storefront/services/mock/account-service.ts).
- [U33] — [apps/storefront/services/mock/communication-service.ts](apps/storefront/services/mock/communication-service.ts).
- [U34] — [apps/storefront/services/mock/checkout-service.ts](apps/storefront/services/mock/checkout-service.ts).
- [U35] — [apps/storefront/domain/checkout/checkout.ts](apps/storefront/domain/checkout/checkout.ts).
- [U36] — [apps/storefront/services/mock/persistent-wishlist.ts](apps/storefront/services/mock/persistent-wishlist.ts).
- [U37] — [apps/storefront/app/profile/page.tsx](apps/storefront/app/profile/page.tsx).
- [U38] — [apps/storefront/fixtures/catalog.ts](apps/storefront/fixtures/catalog.ts).
- [A01] — [apps/api/src/main.ts](apps/api/src/main.ts).
- [A02] — [apps/api/src/server.ts](apps/api/src/server.ts).
- [A03] — [apps/api/src/business/catalog.ts](apps/api/src/business/catalog.ts).
- [A04] — [apps/api/src/cart/service.ts](apps/api/src/cart/service.ts).
- [A05] — [apps/api/src/auth/service.ts](apps/api/src/auth/service.ts).
- [A06] — [apps/api/src/auth/http.ts](apps/api/src/auth/http.ts).
- [A07] — [apps/api/src/promotions/service.ts](apps/api/src/promotions/service.ts).
- [A08] — [apps/api/src/promotions/pricing.ts](apps/api/src/promotions/pricing.ts).
- [A09] — [apps/api/src/checkout/service.ts](apps/api/src/checkout/service.ts).
- [A10] — [apps/api/src/checkout/state.ts](apps/api/src/checkout/state.ts).
- [A11] — [apps/api/src/payments/service.ts](apps/api/src/payments/service.ts).
- [A12] — [apps/api/src/payments/test-pricing.ts](apps/api/src/payments/test-pricing.ts).
- [A13] — [apps/api/src/shipping/service.ts](apps/api/src/shipping/service.ts).
- [A14] — [apps/api/src/shipping/adapter.ts](apps/api/src/shipping/adapter.ts).
- [A15] — [apps/api/src/shipping/meest-contract.ts](apps/api/src/shipping/meest-contract.ts).
- [A16] — [apps/api/src/shipping/ukrposhta.ts](apps/api/src/shipping/ukrposhta.ts).
- [A17] — [apps/api/src/customer/service.ts](apps/api/src/customer/service.ts).
- [A18] — [apps/api/src/lifecycle/service.ts](apps/api/src/lifecycle/service.ts).
- [A19] — [apps/api/src/communication/service.ts](apps/api/src/communication/service.ts).
- [A20] — [apps/api/src/communication/notifications.ts](apps/api/src/communication/notifications.ts).
- [A21] — [apps/api/src/database/connection.ts](apps/api/src/database/connection.ts).
- [A22] — [apps/api/src/database/migrations.ts](apps/api/src/database/migrations.ts).
- [A23] — [apps/api/src/config.ts](apps/api/src/config.ts).
- [A24] — [apps/api/src/logger.ts](apps/api/src/logger.ts).
- [A25] — [apps/api/tests/browser/gateway.ts](apps/api/tests/browser/gateway.ts).
- [A26] — [apps/api/tests/browser/server.ts](apps/api/tests/browser/server.ts).
- [A27] — [apps/api/src/contracts/communication-future.ts](apps/api/src/contracts/communication-future.ts).
- [A28] — [apps/api/contracts/openapi.json](apps/api/contracts/openapi.json).
- [A29] — [apps/api/src/contracts/modules.ts](apps/api/src/contracts/modules.ts).
- [A30] — [apps/api/src/database/config.ts](apps/api/src/database/config.ts).
- [A31] — [apps/storefront/browser-integration/resume.ts](apps/storefront/browser-integration/resume.ts).
- [T01] — [tests/e2e/tests/foundation.spec.ts](tests/e2e/tests/foundation.spec.ts).
- [T02] — [tests/e2e/tests/storefront-completion.spec.ts](tests/e2e/tests/storefront-completion.spec.ts).
- [T03] — [tests/e2e/tests/auth.spec.ts](tests/e2e/tests/auth.spec.ts).
- [T04] — [tests/e2e/tests/profile.spec.ts](tests/e2e/tests/profile.spec.ts).
- [T05] — [tests/e2e/tests/customer-account.spec.ts](tests/e2e/tests/customer-account.spec.ts).
- [T06] — [tests/e2e/tests/communication.spec.ts](tests/e2e/tests/communication.spec.ts).
- [T07] — [tests/e2e/tests/checkout.spec.ts](tests/e2e/tests/checkout.spec.ts).
- [T08] — [tests/e2e/tests/order-lifecycle.spec.ts](tests/e2e/tests/order-lifecycle.spec.ts).
- [T09] — [tests/e2e/browser-tests/checkout.spec.ts](tests/e2e/browser-tests/checkout.spec.ts).
- [T10] — [tests/e2e/browser-tests/notifications.spec.ts](tests/e2e/browser-tests/notifications.spec.ts).
- [T11] — [apps/api/tests/integration/postgres.test.ts](apps/api/tests/integration/postgres.test.ts).
- [T12] — [apps/api/tests/production.test.mjs](apps/api/tests/production.test.mjs).
- [T13] — [apps/storefront/tests/catalog.test.ts](apps/storefront/tests/catalog.test.ts).
- [T14] — [apps/storefront/tests/cart.test.ts](apps/storefront/tests/cart.test.ts).
- [T15] — [apps/api/tests/payments.test.ts](apps/api/tests/payments.test.ts).
- [T16] — [apps/api/tests/notification-center.test.ts](apps/api/tests/notification-center.test.ts).
- [O01] — [infra/postgres/compose.yaml](infra/postgres/compose.yaml).
- [O02] — [infra/postgres/compose.test.yaml](infra/postgres/compose.test.yaml).
- [O03] — [.github/workflows/ci.yml](.github/workflows/ci.yml).
- [O04] — [docs/POSTGRES_ARCHITECTURE.md](docs/POSTGRES_ARCHITECTURE.md).
- [D0001] — [apps/api/migrations/0001_core.sql](apps/api/migrations/0001_core.sql).
- [D0002] — [apps/api/migrations/0002_version_indexes.sql](apps/api/migrations/0002_version_indexes.sql).
- [D0003] — [apps/api/migrations/0003_catalog_search.sql](apps/api/migrations/0003_catalog_search.sql).
- [D0004] — [apps/api/migrations/0004_server_auth.sql](apps/api/migrations/0004_server_auth.sql).
- [D0005] — [apps/api/migrations/0005_promotions.sql](apps/api/migrations/0005_promotions.sql).
- [D0006] — [apps/api/migrations/0006_checkout_orders.sql](apps/api/migrations/0006_checkout_orders.sql).
- [D0007] — [apps/api/migrations/0007_shipping.sql](apps/api/migrations/0007_shipping.sql).
- [D0008] — [apps/api/migrations/0008_ukrposhta.sql](apps/api/migrations/0008_ukrposhta.sql).
- [D0009] — [apps/api/migrations/0009_payment_security.sql](apps/api/migrations/0009_payment_security.sql).
- [D0010] — [apps/api/migrations/0010_current_cart_checkout.sql](apps/api/migrations/0010_current_cart_checkout.sql).
- [D0011] — [apps/api/migrations/0011_customer_account.sql](apps/api/migrations/0011_customer_account.sql).
- [D0012] — [apps/api/migrations/0012_communication_foundation.sql](apps/api/migrations/0012_communication_foundation.sql).
- [D0013] — [apps/api/migrations/0013_order_lifecycle.sql](apps/api/migrations/0013_order_lifecycle.sql).
- [D0014] — [apps/api/migrations/0014_discounted_test_checkout.sql](apps/api/migrations/0014_discounted_test_checkout.sql).
- [D0015] — [apps/api/migrations/0015_notification_center.sql](apps/api/migrations/0015_notification_center.sql).

### Pinned Shopify reference

- [S01] — [templates/index.json](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/templates/index.json).
- [S02] — [sections/header.liquid](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/sections/header.liquid).
- [S03] — [sections/bazar-footer.liquid](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/sections/bazar-footer.liquid).
- [S04] — [sections/bazar-main-collection.liquid](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/sections/bazar-main-collection.liquid).
- [S05] — [sections/bazar-main-product.liquid](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/sections/bazar-main-product.liquid).
- [S06] — [snippets/cart-summary.liquid](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/snippets/cart-summary.liquid).
- [S07] — [assets/bazar-auth.js](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/assets/bazar-auth.js).
- [S08] — [assets/bazar-account.js](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/assets/bazar-account.js).
- [S09] — [snippets/bazar-account-provider-data.liquid](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/snippets/bazar-account-provider-data.liquid).
- [S10] — [assets/bazar-wishlist-store.js](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/assets/bazar-wishlist-store.js).
- [S11] — [assets/predictive-search.js](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/assets/predictive-search.js).
- [S12] — [docs/profile-routing.md](https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/docs/profile-routing.md).

[U01]: apps/storefront/app/page.tsx
[U02]: apps/storefront/components/layout/site-header.tsx
[U03]: apps/storefront/components/layout/site-footer.tsx
[U04]: apps/storefront/app/catalog/page.tsx
[U05]: apps/storefront/app/search/page.tsx
[U06]: apps/storefront/components/search/search-box.tsx
[U07]: apps/storefront/components/product/product-card.tsx
[U08]: apps/storefront/components/product/product-detail.tsx
[U09]: apps/storefront/components/product/related-products.tsx
[U10]: apps/storefront/components/cart/cart-provider.tsx
[U11]: apps/storefront/components/cart/cart-page.tsx
[U12]: apps/storefront/components/auth/auth-flow.tsx
[U13]: apps/storefront/components/account/account-shell.tsx
[U14]: apps/storefront/components/account/orders-screen.tsx
[U15]: apps/storefront/components/account/order-detail-screen.tsx
[U16]: apps/storefront/components/account/wishlist-screen.tsx
[U17]: apps/storefront/components/account/reviews-screen.tsx
[U18]: apps/storefront/components/account/personal-data-screen.tsx
[U19]: apps/storefront/components/account/addresses-screen.tsx
[U20]: apps/storefront/components/account/payment-methods-screen.tsx
[U21]: apps/storefront/components/communication/messages-screen.tsx
[U22]: apps/storefront/components/communication/support-screen.tsx
[U23]: apps/storefront/components/checkout/checkout-page.tsx
[U24]: apps/storefront/components/notifications/notification-center.tsx
[U25]: apps/storefront/browser-integration/screen.tsx
[U26]: apps/storefront/services/service-provider.server.ts
[U27]: apps/storefront/lib/money.ts
[U28]: apps/storefront/app/not-found.tsx
[U29]: apps/storefront/services/mock/info-service.ts
[U30]: apps/storefront/app/collections/[handle]/page.tsx
[U31]: apps/storefront/domain/catalog/query.ts
[U32]: apps/storefront/services/mock/account-service.ts
[U33]: apps/storefront/services/mock/communication-service.ts
[U34]: apps/storefront/services/mock/checkout-service.ts
[U35]: apps/storefront/domain/checkout/checkout.ts
[U36]: apps/storefront/services/mock/persistent-wishlist.ts
[U37]: apps/storefront/app/profile/page.tsx
[U38]: apps/storefront/fixtures/catalog.ts
[A01]: apps/api/src/main.ts
[A02]: apps/api/src/server.ts
[A03]: apps/api/src/business/catalog.ts
[A04]: apps/api/src/cart/service.ts
[A05]: apps/api/src/auth/service.ts
[A06]: apps/api/src/auth/http.ts
[A07]: apps/api/src/promotions/service.ts
[A08]: apps/api/src/promotions/pricing.ts
[A09]: apps/api/src/checkout/service.ts
[A10]: apps/api/src/checkout/state.ts
[A11]: apps/api/src/payments/service.ts
[A12]: apps/api/src/payments/test-pricing.ts
[A13]: apps/api/src/shipping/service.ts
[A14]: apps/api/src/shipping/adapter.ts
[A15]: apps/api/src/shipping/meest-contract.ts
[A16]: apps/api/src/shipping/ukrposhta.ts
[A17]: apps/api/src/customer/service.ts
[A18]: apps/api/src/lifecycle/service.ts
[A19]: apps/api/src/communication/service.ts
[A20]: apps/api/src/communication/notifications.ts
[A21]: apps/api/src/database/connection.ts
[A22]: apps/api/src/database/migrations.ts
[A23]: apps/api/src/config.ts
[A24]: apps/api/src/logger.ts
[A25]: apps/api/tests/browser/gateway.ts
[A26]: apps/api/tests/browser/server.ts
[A27]: apps/api/src/contracts/communication-future.ts
[A28]: apps/api/contracts/openapi.json
[A29]: apps/api/src/contracts/modules.ts
[A30]: apps/api/src/database/config.ts
[A31]: apps/storefront/browser-integration/resume.ts
[T01]: tests/e2e/tests/foundation.spec.ts
[T02]: tests/e2e/tests/storefront-completion.spec.ts
[T03]: tests/e2e/tests/auth.spec.ts
[T04]: tests/e2e/tests/profile.spec.ts
[T05]: tests/e2e/tests/customer-account.spec.ts
[T06]: tests/e2e/tests/communication.spec.ts
[T07]: tests/e2e/tests/checkout.spec.ts
[T08]: tests/e2e/tests/order-lifecycle.spec.ts
[T09]: tests/e2e/browser-tests/checkout.spec.ts
[T10]: tests/e2e/browser-tests/notifications.spec.ts
[T11]: apps/api/tests/integration/postgres.test.ts
[T12]: apps/api/tests/production.test.mjs
[T13]: apps/storefront/tests/catalog.test.ts
[T14]: apps/storefront/tests/cart.test.ts
[T15]: apps/api/tests/payments.test.ts
[T16]: apps/api/tests/notification-center.test.ts
[O01]: infra/postgres/compose.yaml
[O02]: infra/postgres/compose.test.yaml
[O03]: .github/workflows/ci.yml
[O04]: docs/POSTGRES_ARCHITECTURE.md
[D0001]: apps/api/migrations/0001_core.sql
[D0002]: apps/api/migrations/0002_version_indexes.sql
[D0003]: apps/api/migrations/0003_catalog_search.sql
[D0004]: apps/api/migrations/0004_server_auth.sql
[D0005]: apps/api/migrations/0005_promotions.sql
[D0006]: apps/api/migrations/0006_checkout_orders.sql
[D0007]: apps/api/migrations/0007_shipping.sql
[D0008]: apps/api/migrations/0008_ukrposhta.sql
[D0009]: apps/api/migrations/0009_payment_security.sql
[D0010]: apps/api/migrations/0010_current_cart_checkout.sql
[D0011]: apps/api/migrations/0011_customer_account.sql
[D0012]: apps/api/migrations/0012_communication_foundation.sql
[D0013]: apps/api/migrations/0013_order_lifecycle.sql
[D0014]: apps/api/migrations/0014_discounted_test_checkout.sql
[D0015]: apps/api/migrations/0015_notification_center.sql
[S01]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/templates/index.json
[S02]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/sections/header.liquid
[S03]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/sections/bazar-footer.liquid
[S04]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/sections/bazar-main-collection.liquid
[S05]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/sections/bazar-main-product.liquid
[S06]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/snippets/cart-summary.liquid
[S07]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/assets/bazar-auth.js
[S08]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/assets/bazar-account.js
[S09]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/snippets/bazar-account-provider-data.liquid
[S10]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/assets/bazar-wishlist-store.js
[S11]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/assets/predictive-search.js
[S12]: https://github.com/miz0098/bazar-marketplace-/blob/105d10fb6b8e65c5f163016aa8c69072e85faa0e/docs/profile-routing.md

## F21 current implementation overlay (historical evidence retained)

[Ordinary storefront offer/session/cart/wishlist implementation, modes and verification](docs/F21_STOREFRONT_ACCEPTANCE.md). One distinct seller offer now maps to one exact-price card, resolving the former aggregate-card merchandising blocker without choosing an aggregate parent price. PostgreSQL persistence is available through shared ordinary components in the isolated HTTPS entry; default local demo and production activation remain distinct. F22 checkout/multi-seller financial snapshots, fuller profile/communication integration, seller/staff apps, licensed datasets/media, privacy/legal/finance decisions and live providers remain open. No quantitative inventory or automatic guest merge. No Demo100% / Full Audit Ready claim; BAZAR remains **НЕ ГОТОВИЙ** for full audit. New tests only establish their documented bounded workflows, not all entry criteria.

## F25 seller workspace update (historical audit preserved)

The dedicated `apps/seller-admin` seller owner application, central API projections and additive migration0021 are recorded in [docs/F25_SELLER_DASHBOARD.md](docs/F25_SELLER_DASHBOARD.md). Local F25 evidence: PostgreSQL/business/security 156/156, dual-origin Codespaces browser 40/40, existing desktop/mobile Playwright 100 passed and 8 existing conditional skips; GitHub CI is pending PR creation. The shared Codespaces test environment documents concurrent Storefront3000 and Seller Admin3001 against one isolated API/PostgreSQL. This is not a production readiness assertion. Original seller design parity is **NOT VERIFIED**. Seller delegated employees/staff grants, promotion funding/activation, settlement/payouts, live providers, private documents, legal/privacy retention and production onboarding remain gaps.
