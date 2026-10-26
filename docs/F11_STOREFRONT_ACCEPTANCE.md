# Phase F11 — bounded storefront demo acceptance

База: `114df1dca2dc2968fdec04c48f7803ff98919953` (merged PR #21). Reference: Shopify `105d10fb6b8e65c5f163016aa8c69072e85faa0e`, зокрема product variant/tabs/related markup, footer SVG/default social URLs і наявні BAZAR tokens. Немає автентифікованих merchant screenshots/settings/media; pixel-parity sign-off не заявлено.

## Доступно для демонстраційного приймання

| Екран | Обмежений сценарій | Evidence |
| --- | --- | --- |
| Header/home/footer | Categories/search, desktop/mobile cart/wishlist counts, Escape focus return, лише Facebook/Instagram/Threads/Telegram; footer internal destinations відкриваються | Existing foundation + F11 browser suite; SVG geometry і 38px social controls зі Shopify source |
| Collections/catalog/search | Category index, known handle/all redirect з query preservation, unknown→HTTP 404; brand/price/sort/empty/error/retry, keyboard suggestions | F11 browser suite, domain unit; `/catalog?preview=error` / `preview=empty` — лише явно підписані deterministic demo states |
| Product | Fixture variant price/SKU/gallery/stock/sold-out, variant URL; gallery, keyboard tabs включно Q&A-empty; safe buy-now→existing demo checkout | F11 browser suite; немає seller block, 360 або delivery selector; copy `вартість за тарифами перевізника` збережено |
| Related/recent | Static same-category demo selection; recent IDs лише у sessionStorage цієї вкладки | F11 browser scenario; категорія з одним товаром чесно не показує вигадану recommendation |
| Wishlist | Card/detail add/remove; один observable demo service для header і ready account list, duplicate add idempotent; E1 list/search/sort/bulk/remove/cart flows збережено | Unit + existing profile + F11 browser; initial E1 seed і refresh reset не змінено. Це product-level wishlist, не variant reservation |
| Local cart | Variant-key lines; add/update/remove/clear; fixture stock/qty guards без false success; server-rendered current **demo catalog** resolves stored references і замінює forged stored price/stock/title; duplicate/stale storage bounded | Unit + F11 browser; це не PostgreSQL price authority, не stock reservation і не server cart merge |
| Storage failure | Storage denial не ламає local mutations; видно повідомлення, що persistence недоступне | Unit malformed storage + F11 browser Storage-denial case |
| Info/404 | `/help/how-to-order`, `/help/delivery`, `/help/returns`, `/about`, `/contacts`, `/careers`; unknown content/category/product/variant→404 | F11 link/status regression; info copy явно demo, не оферта, legal policy, active vacancy чи реальний канал звернення |

Використано існуючі grid/layout/tokens/radii та source SVG. Мінімально затемнено audited blue controls/links і gold rating text для axe contrast; global brand tokens, структура checkout/profile та Shopify source не переписані. Немає нових залежностей чи backend/schema змін.

## Межі стану й persistence

- Wishlist — ephemeral root-level preview, спільний для Next.js client navigation (включно Next Form filters/search), reset при повному reload; не account/server persistence. Ізольовані E1 empty/error сценарії не змінюють ready-store.
- Cart — локальне browser persistence тільки відомих demo product/variant references і quantity; restore бере canonical current fixture money/availability/stock. Старі unknown/invalid записи відкидаються; quantity обмежується поточним demo stock. Ніяких auth/session токенів або автоматичного guest/server merge.
- На single product wishlist повертає canonical product/default variant; обраний variant передається тільки в cart. Demo stock (5 для available defaults, явні 2/0 для додаткових phone variants) і ціни — synthetic fixture evidence, не реальна наявність чи обіцянка продажу.
- Buy-now не створює order і не обходить quantity guards; він лише додає вибраний variant у local cart та відкриває збережений demo checkout, який завершується до side effect.
- Social destinations — platform home URLs з Shopify defaults. Офіційні merchant handles/contacts/legal copy не вигадані; неактивний `mailto:...example.invalid` замінено текстом.

## Незакрито

Real media/import/publication, full API-to-UI mapping і async search/facets; approved legacy SEO/redirect map; favorites modal/cart drawer; visual screenshot/manual screen-reader/zoom sign-off. Доменні API account/wishlist/address/review/messages/support, server browser sessions/checkout, активний promo→order lifecycle, financial/payable/reservation/repeat-purchase/returns/refunds правила, SMS/carrier/payment/wallet providers, seller/admin/notifications/privacy/operations залишаються F10 blockers. Ніякої production активації або Demo 100% claim.

## Перевірки

- API lint/typecheck/build, 32 unit, 3 compiled smoke; 73 disposable PostgreSQL/HTTP/security — passed. DB cleanup завершений до Playwright.
- Storefront lint/typecheck/build; 64 unit (6 нових) — passed.
- Dependency audit API/storefront/E2E: 0 vulnerabilities; governance ledger/path і 5 orchestration tests, `git diff --check`.
- Browser: 76 passed, 8 existing viewport-specific skips на desktop 1440×900 / mobile 390×844. Recent-view external store додатково перевірено адресно на обох viewport. GitHub CI для head SHA наведено у PR F11. Existing skips — viewport-specific, не нові exceptions. Tests/rules/retries не вимикалися.
