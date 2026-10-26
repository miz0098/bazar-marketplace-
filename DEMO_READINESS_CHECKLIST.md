# Phase F10 — Demo Readiness Checklist

## Оновлення Phase F12

Wishlist B05 now requires successful add/remove to survive refresh and cross-page/tab synchronization, rather than the historical F11 reset. Test only product IDs in storage, corrupt/oversized/unknown data, unavailable products, explicit empty state, storage denial, ownership/CSRF/versions, private review policy/duplicates and all account/payment safety regressions. [F12 section acceptance](docs/F12_CUSTOMER_ACCOUNT_ACCEPTANCE.md) and [ADR 0011](docs/adr/0011-customer-account-foundation.md) distinguish local demo from isolated customer API and unapproved production auth/PII/review rules. Existing account layout/keyboard/empty/error/overflow criteria remain; no real account/server switch.


## Оновлення Phase F11

[Детальна acceptance evidence та persistence limits](docs/F11_STOREFRONT_ACCEPTANCE.md).

B01–B06/B25 доповнено [новими desktop/mobile сценаріями](tests/e2e/tests/storefront-completion.spec.ts): category redirect/query, brand/price/sort, empty/error/retry, keyboard suggestions, variants/sold-out/stock, wishlist shared state і refresh reset, cart persistence, footer routes/socials, unknown 404 та axe/overflow. [Шість нових unit-тестів](apps/storefront/tests/storefront-completion.test.ts) перевіряють variant identity/totals, forged/stale storage, wishlist concurrency/reset, price bounds і content allowlist/recent-view storage isolation.

Stock/ціни беруться з поточних **demo fixtures**, не production API. Обране не синхронізується з акаунтом і скидається після refresh; кошик залишається local. New info pages явно не оферта й не остаточні legal rules. Соціальні links — Shopify platform defaults, офіційні BAZAR-профілі ще не погоджені. B08/B19 та I09/I10 не закрито цією роботою. Product loading boundary не обгортає unknown routes, щоб notFound повертав HTTP 404; catalog/search loading і feature error boundaries збережено.

Точний SHA та підсумки F11 перевірок наведено в PR F11; таблиця нижче фіксує історичний прогін F10. Design/manual acceptance і Demo 100% залишаються відкритими.


Стан на `vps-migration` **89a0453**, 2026-10-26. Пов'язано з [44 областями audit](FUNCTIONAL_GAP_AUDIT.md) і [планом завершення](DEMO_COMPLETION_PLAN.md). **Фінальний gate Demo 100% відкритий.**

## Правила приймання

- Demo Ready, Design Approved та Production Ready підписуються окремо. Green tests не є design/product sign-off.
- Кожний позитивний сценарій має явно називати режим: локальний preview, isolated server test або майбутній approved sandbox. Не представляти preview як реальну авторизацію, оплату, повідомлення, доставку чи замовлення.
- Кожний критичний користувацький сценарій виконується на **desktop 1440×900** і **mobile 390×844**, зі свіжим storage, після refresh та back/forward, pointer і keyboard. Один viewport-specific skip не доводить mobile/desktop виконання іншого сценарію.
- Загальні критерії: українська, видимий focus, logical order, labels/error associations/live announcements, focus на першій помилці, Escape/return/trap де доречно, відсутність horizontal overflow. Axe serious/critical = 0 — необхідна, але недостатня умова; manual screen reader/zoom/reflow/reduced-motion/contrast і screenshot review окремі.
- Будь-який approved scope exception має owner, дату, причину та змінені acceptance criteria. Missing feature не стає ready від перейменування в «foundation» або відсутності тесту.

Позначки: **Авто** — наявний regression перевіряє лише зазначену поведінку; **Частково** — є demo/unit/integration evidence, але не весь acceptance; **Відкрито** — відсутня реалізація/перевірка; **Блокер** — потрібне рішення/зовнішня залежність. Результати прогонів F10 наведено наприкінці. У рядку «Авто» не мається на увазі готовність усієї області Fxx.

## Browser acceptance: наявний preview та прогалини

У всіх рядках необхідні обидва розміри вище. Коди Bxx — сценарії; Fxx/Gxx посилаються на audit.

| ID / область | Позитивний сценарій і основні переходи | Негативні/валідація/помилки | Наявний доказ і незакритий критерій |
| --- | --- | --- | --- |
| B01 Home/shared shell F01–F02 | `/` → hero/category/rail → catalog/product; menu opens/closes; skip link/keyboard | Empty/missing media/content, Escape/outside click; усі visible links і four socials мають destinations | Частково: [foundation.spec](tests/e2e/tests/foundation.spec.ts) перевіряє home axe/mobile menu/overflow/404. Немає повного content/link/visual acceptance; socials/drawer/preview відсутні. |
| B02 Catalog/categories F03–F06 | `/catalog` → category/subcategory → vendor/price → sort/page → product; URL refresh/back/forward відновлює state | Empty results, invalid/reversed price/query/page, unavailable API; `/collections` та невідомий handle за погодженою URL map | Частково: [catalog unit](apps/storefront/tests/catalog.test.ts), [API catalog tests](apps/api/tests/business.test.ts). Повного browser journey немає; URL/import/mapper рішення відкриті. |
| B03 Search F05 | Український query ≥2 символів → suggestions/result → product; clear/Escape | No result, whitespace, quick query changes, keyboard options, failure/timeout для live data | Частково: local suggestions/unit; full-corpus і browser listbox/navigation/error coverage відкриті. |
| B04 Product F07–F11 | Direct product URL → gallery/keyboard tabs → quantity → variant → cart; approved delivery copy | Missing product/media, unavailable variant, invalid qty; без seller block/360/delivery selector | Частково: product render/quantity logic існує; variant selection, Q&A-empty parity, safe buy-now/recommendations/recently-viewed та browser regression відкриті. |
| B05 Wishlist F12 | Catalog/product → add → shared count/preview → `/profile/wishlist` → search/sort/select/remove → cart | Empty, error/retry, delayed response, unavailable product/add failure, duplicate add | Авто для seeded wishlist list/remove/cart у [profile.spec](tests/e2e/tests/profile.spec.ts); add і sync API відсутні, весь сценарій не ready. |
| B06 Guest/local cart F13 | Quick add/detail → `/cart` → qty/remove → refresh → checkout; cart badge convergence | Qty 0/fraction/over-limit, sold-out, corrupt storage; не переносити local prices/identity на сервер | Частково: [cart unit](apps/storefront/tests/cart.test.ts), checkout E2E використовує fixture cart. Немає повного real browse→cart browser regression; local cart intentionally no-merge. |
| B07 Auth preview F15 | Header dialog / login/register → valid phone → OTP paste/keyboard → demo profile/consent → explicit non-auth completion | Invalid phone/code, expired OTP, resend/cooldown/rate/error/pending; no overwrite, Escape/backdrop/focus return | Авто [auth.spec](tests/e2e/tests/auth.spec.ts). Це preview, жодного server-login proof. |
| B08 Server session + cart F14/F16 | Approved isolated browser harness: OTP/session → create current cart once → add/set/remove → refresh/session revoke | Foreign IDs, missing/expired session, CSRF/Origin, replay/key conflict/version/price/stock; гості лишаються локально | Блокер browser BFF/server-mode G02/G03. [F9 PG/HTTP](apps/api/tests/integration/postgres.test.ts) — Node cookie-jar transport, не browser TLS/session E2E. |
| B09 Account shell F17 | `/profile` overview → кожна sidebar route; mobile drawer trap/return | Unknown route/ID, loading/retry/error, session-expired/unauthorized для майбутнього server-mode | Авто anonymous shell/nav/overflow/axe [profile.spec](tests/e2e/tests/profile.spec.ts); server authorization UI відкрита. |
| B10 Personal data F18 | Name edit → preview feedback; refresh повертає fixtures | Invalid/blank names, error focuses first field; full phone/secret не показується | Авто preview validation. Real update/phone reverify/email consent contract відсутні; не обіцяти persistence. |
| B11 Addresses F19 | Add/edit/default/remove preview; refresh reset | Blank/invalid fields, cancel, error/retry; default consistency | Авто preview [profile.spec](tests/e2e/tests/profile.spec.ts). Carrier/address server mapping/owned CRUD/PII acceptance відкриті. |
| B12 Messages F20 | Search→open dialog; chronological DOM/open-bottom; unread-dialog count/pin; text send; mobile back | Empty white card без actions, failed send зберігає draft, unknown conversation, pending/loading/retry | Авто [communication.spec](tests/e2e/tests/communication.spec.ts). Send ephemeral/«нікому не доставлено», не real transport. |
| B13 Attachments/replies F21 | Metadata-only attachment, keyboard submit; після refresh немає повідомлення | Invalid type/size/blank/too-long message; no upload/delivery claim | Авто metadata-only subset; reply/delete/context menu/upload authorization/scanning відкриті. |
| B14 Support F22 | List/status → detail → new demo ticket → reply; mobile layout | Empty/loading/error/retry, invalid subject/body, closed/missing ticket, failed send зберігає draft | Авто [communication.spec](tests/e2e/tests/communication.spec.ts). Operator transport/staff workflow відсутній. |
| B15 Reviews F09/F23 | Product fixture reviews; profile edit/delete demo review | Invalid rating/text, focus/error; purchase eligibility/moderation/rejected upload | Авто profile edit/delete; create/verified-purchase/moderation/upload відкриті. |
| B16 Checkout step 1 F26/F28–F31 | Cart→checkout→valid recipient/phone/city/branch; select NP/Meest/Ukrposhta; back/refresh зберігає choice | Required/phone validation/focus; empty cart; BAZAR pickup disabled; no invented tariff/branch availability | Авто [checkout.spec](tests/e2e/tests/checkout.spec.ts), all-three choice fixtures; free text не carrier lookup. |
| B17 Checkout step 2 F24–F25/F32–F34 | Payment selection, BAZAR10 preview→summary; back/forward | Empty/invalid code, pending/error, code edit resets discount; no PAN/CVV; unsupported wallets hidden | Авто demo step validation/persistence; server promo connection, multi-line discount and actual wallet capability/browser SDK tests відсутні. |
| B18 Checkout step 3 F26/F36 | Review contacts/carrier/items/payment; back→edit→review; explicit stop | No create/pay-success button; no stock reservation/cart clearing; refresh зберігає cart/draft | Авто demo-stop. Не приймати як створення замовлення. |
| B19 Integrated purchase/history F27/F36–F37 | Isolated browser server mode: catalog→cart→verified auth→carrier quote→promo→test payment→confirmation→owned history | Ownership/price/stock/tariff changes, expired quote, duplicate confirmation, failed persistence, unsigned/client-paid forgery | Відкрито як browser scenario. Server F9 no-promo synthetic path verified; selected-promo completion policy-blocked; browser history лишається fixtures. |
| B20 Order history F37 | Filter/list/detail/pagination, empty/retry, only sourced facts | Unknown/foreign order, altered source price не змінює snapshot; no fabricated seller/tracking/paid state | Авто fixture UI; owned immutable server history — окремі PG tests. UI/server mapping відкритий. |
| B21 Status/cancel/return/refund F38–F39 | Approved transition/timeline→cancel/return/refund request→truthful result | Forbidden transition, duplicate/out-of-order callback, partial amount/discount allocation, unknown provider outcome | Блокер G08/G09/G12; UI/API workflows немає. Payment attempt cancellation не доказ order cancellation. |
| B22 Wallets/saved methods F33–F35 | Safe empty saved-card screen; later supported device+provider probe and tokenized flow | Unsupported device/browser/provider, rejected probe, SDK failure, no sensitive storage | Авто safe empty + [capability unit](apps/storefront/tests/payment-business-client.test.ts). Немає activated wallet/saved-method demo; owner/provider review потрібний. |
| B23 Notifications F40 | Approved in-app/channel opt-in→event→notification→read | Consent/revoke, duplicate event, provider failure, no delivery claim | Відкрито: scope/outbox/UI/API відсутні. Message unread badge не заміна notifications. |
| B24 Seller/admin F41–F42 | Approved roles→own catalog/stock/orders/moderation; deny unauthorized role | Cross-tenant reads/writes, escalation, replay, audit secrets | Блокер G14. Немає app/RBAC/source contracts; audit не затверджує нові customer-facing screens. |
| B25 Help/legal/URL F03/F43 | Кожен footer/auth terms link веде на approved content; collections/search/product deep links/canonical | Missing/old/unknown handles, redirect-query preservation, 404 accessible | Частково: Ukrainian 404 test є; visible footer destinations без routes, content/redirect/SEO acceptance відкриті. |
| B26 Logout F16/F17 | Preview exit чітко не server logout; later server revoke + sensitive-state clear | Another user's sessions не відкликаються; expired/replayed cookie denied | Авто preview UI + isolated API logout/logout-all tests; real browser session invalidation ще не перевірено. |

## Серверна integration/security acceptance

Ці Ixx — **не** UI/demo acceptance й не production proof. Запускати тільки disposable PostgreSQL + explicit test adapters; production guards залишити закритими.

| ID | Позитивна перевірка | Негативна/конкурентна перевірка | Доказ / статус |
| --- | --- | --- | --- |
| I01 DB/schema | Empty DB, supported upgrades, repeat migrations | Modified/unknown migration, concurrent migrators, DDL rollback | Авто [PG suite](apps/api/tests/integration/postgres.test.ts); попередні 0001–0009 незмінні |
| I02 Catalog | DB products/categories/detail/query/page | SQL/query validation, missing variant/product, unsafe money/cursor | Авто API unit/PG/HTTP; не media/import readiness |
| I03 Identity | Crypto OTP + verified owner/session/logout | Replay/brute force/resend budgets/cookie/CSRF/Origin/PII logs, no production test-auth toggle | Авто auth/PG/compiled smoke; не реальний SMS чи browser TLS |
| I04 Current cart | Concurrent ensure = one active; server totals/stock; same-key mutation replay | Foreign IDs/client prices/guest merge, invalid qty, competing version/key, rollback/immutable historical receipt | Авто F9 PG; немає post-order clear/reuse policy |
| I05 Promotions | Exact fixed/percentage/minimum/eligibility/validity/limits | Invalid/expired/exhausted, fractional policy, repeated/concurrent test claims, no client subtotal | Авто F5 PG/unit; claim ≠ approved redemption |
| I06 Shipping | Three isolated carrier adapters, owned directory/selection/quote/current check | Unavailable point, unsupported locker, changed/expired tariff, duplicate key, concurrent selection, timeout/PII | Авто F7/F8/F9 PG/unit; not real carrier call |
| I07 Payment | Durable prepare→synthetic acknowledgement→verified outcome; approved test retry | Signature/account/amount/currency mismatch, replay, double submit, uncertainty/timeouts/early event/cancel/out-of-order | Авто F8/F9 PG/unit; no actual charge/orderPaid |
| I08 Linked confirmation | Active owned cart + fresh shipping + same-owner succeeded synthetic proof → one immutable pending record/history | Wrong owner/merchant/proof, missing shipping via old address seam, stale pricing/basis, duplicate/concurrent keys, link insertion rollback | Авто F9 PG/typed HTTP; `orderPaid:false`, payable null, stock unchanged |
| I09 Discounted full order | Approved promo usage + total + order/payment transaction | Oversubscription, retry/refund/cancel/restore concurrency, multi-line allocations | **Блокер**, реального lifecycle немає. Не зараховувати explicit promo removal у F9 як успіх цього сценарію |
| I10 Real lifecycle/providers | Approved order/reservation/event/refund rules, production grants, least privilege | Outage/reconciliation/restore/rollback, role abuse, malicious webhooks | **Блокер**: немає повного approved implementation/release evidence |

## Ручні/design/release gates

- [ ] Product затвердив повний demo scope, обов'язкові сценарії та scope exceptions для product extras/Q&A, channels, seller/admin; усі critical Gxx закриті або явно перенесені за погодженим acceptance.
- [ ] Design затвердив desktop/mobile screenshots проти Shopify preview/settings/media; окремо UI і failure/empty/loading/disabled states. Passing axe не є pixel review.
- [ ] B01–B26 перевірено на обох viewport з evidence; відсутні сценарії не замінені unit/PG доказами.
- [ ] Manual screen reader, 200% zoom/reflow, reduced motion, keyboard-only navigation та focus return; усі видимі links/terms/socials перевірені.
- [ ] Reviewed isolated browser server harness показує повний agreed demo без side effects, із reset/cleanup і чіткими labels; не вмикає test-auth у production.
- [ ] Фінансові/order/discount/refund/cart-lifecycle правила погоджено до активації відповідних сценаріїв.
- [ ] Жоден сценарій не показує fake SMS delivered, real message delivered, paid order, booked shipment чи successful refund.
- [ ] Окремий production gate: approved providers/credentials/legal/privacy, TLS/BFF/proxy/session, roles/grants/migrations/backup restore, monitoring/incident response/rollback та release approval. Це не умова проводити реальні операції під час demo; це заборона називати demo production-ready.

## Перевірки Phase F10

Перевірки виконуються повторно на незміненому application code бази 89a0453; F10 змінює документи та task ledger. Точний PR head/CI URL записуються у PR після push. Локальні transient logs не комітяться.

| Перевірка | Результат F10 |
| --- | --- |
| API ESLint / typecheck / build | Пройдено |
| API unit / compiled production smoke | 32 / 3 passed |
| Storefront ESLint / typecheck / production build | Пройдено |
| Storefront unit | 58 passed |
| Disposable PostgreSQL integration, API HTTP/security | 73 passed; контейнер і network видалено перед Playwright |
| Playwright desktop/mobile | 62 passed, 8 existing viewport-specific skips; обидва projects виконані |
| Dependency audit API / storefront / E2E | 0 vulnerabilities у кожному з трьох проєктів |
| Governance ledger/path, orchestration tests, diff check, documentation links | Пройдено: ledger/path scope, 5 orchestration tests, git diff --check; 99 local і 30 pinned Shopify source links перевірено |
| GitHub CI | Результат для фінального SHA і run URL наведено у [PR #21](https://github.com/miz0098/bazar-marketplace-/pull/21); локальні перевірки не підміняють CI |
| Shopify authenticated preview / visual approval / production tests | Не виконувалися; відповідні blockers відкриті |

Вісім існуючих Playwright skips, якщо повторяться, — viewport-specific умови suite, не нові F10 exceptions. Не перетворювати pass count у % Demo Ready.
