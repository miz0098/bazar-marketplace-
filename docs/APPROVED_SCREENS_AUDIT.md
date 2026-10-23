# BAZAR approved screens audit

## Scope and evidence

This is the Phase A inventory for the standalone BAZAR storefront. It distinguishes checked-in UI from product-approved target behavior and from planned backend work.

Evidence inspected on 2026-10-23:

- migration base: `vps-migration` at `2a2dc645f238b5f60e28ad7d02f63e89252aad7c`;
- legacy visual reference: `bazar-latest-shopify` at `105d10fb6b8e65c5f163016aa8c69072e85faa0e`;
- standalone foundation: PR #4, branch `codex/phase1-storefront`, at `2eed964cc845a5855e3741d1af92e0e3defd9754` (open and not part of `vps-migration` at audit time);
- required project documents: `AGENTS.md`, `MIGRATION_PLAN.md`, `ARCHITECTURE.md`, and PR #4's `apps/storefront/MIGRATION_PROGRESS.md`.

Status vocabulary:

- **Verified legacy** — executable UI exists at Shopify commit `105d10f`; this does not imply first-party persistence or a secure backend.
- **Pending PR #4** — implemented in the open Next.js foundation PR, but not present on `vps-migration`.
- **Approved target** — required by the current UX contract, even when the exact screen is not present in the legacy files.
- **Missing** — no standalone Next.js implementation exists.

No authenticated Shopify preview, `config/settings_data.json`, merchant menus, product/media export, or backend API contract was available. Visual approval beyond checked-in source still requires reference screenshots or preview access.

## Global approved UX contract

| Area | Verified evidence | Required standalone behavior | Current Next.js status |
| --- | --- | --- | --- |
| Language | Ukrainian copy is embedded in BAZAR Liquid and JavaScript; there is no `locales/uk.json`. | Customer-facing copy remains Ukrainian with locale-aware money, date, and plural formatting. | PR #4 uses Ukrainian and `uk-UA` currency formatting; no message catalog. |
| Visual system | `assets/bazar-global.css`, feature CSS, `assets/bazar-logo.svg`, and `snippets/bazar-logo.liquid`. | Preserve logo, desktop spacing, typography, color tokens, focus states, touch targets, and responsive behavior. | Pending PR #4 extracts the shell and core tokens; screenshot parity baseline is still missing. |
| Header | `sections/header.liquid`, `snippets/bazar-header-desktop.liquid`, `snippets/bazar-header-actions.liquid`, `snippets/bazar-catalog-menu.liquid`, `assets/bazar-header.{css,js}`. | Search, catalog navigation, profile, wishlist, cart, desktop/mobile behavior, keyboard operation, and scroll/focus management. | Pending PR #4 has responsive header, search navigation, and catalog menu. Auth, wishlist preview, cart state, focus return, outside-click/Escape behavior, and live counts are missing. |
| Footer | `sections/bazar-footer.liquid`, `assets/bazar-footer.css`. | Preserve only Facebook, Instagram, Threads, and Telegram social links. | Pending PR #4 has footer columns but omits the four approved social links and uses demonstration support details. |
| Feedback | `assets/bazar-toast.{css,js}` plus live regions in Horizon/BAZAR components. | Localized loading, success, error, empty, disabled, and retry states; do not claim a live mutation from demo behavior. | Not implemented globally. |
| Runtime boundary | Legacy UI consumes Liquid objects, Shopify routes, section endpoints, customer state, and checkout. | No Shopify runtime dependency. Components use typed services; mock/demo behavior is visibly labeled. | PR #4 has typed catalog/content contracts and mock-only server adapter selection. Other domains are missing. |

## Route and screen inventory

### Shopping and content routes

| Route or surface | Original source files | Verified legacy screen/states | Shopify dependency to replace | Standalone status and acceptance criteria |
| --- | --- | --- | --- | --- |
| `/` | `templates/index.json`; `sections/bazar-home-hero.liquid`; `sections/bazar-category-blocks.liquid`; `sections/bazar-product-rail.liquid`; `sections/bazar-promo-banners.liquid`; `assets/bazar-home.{css}`; `assets/bazar-home-hero.js` | Hero carousel, category blocks, product rails, promotional cards, responsive layouts. | Section schema/settings, collections, products, images, and asset URLs. | **Pending PR #4:** shell, responsive hero controls, categories, product rails, and promos use deterministic fixtures. Accept when approved media/settings are exported, keyboard/reduced-motion behavior is verified, and desktop/mobile visual baselines pass. |
| `/collections` | `templates/list-collections.json`; `sections/bazar-collections-index.liquid`; `assets/bazar-collections-index.{css,js}` | Collection discovery grid and navigation. | Shopify collection list, handles, images, and merchant configuration. | **Missing.** Accept with typed category data, loading/empty/error states, preserved URLs or approved redirects, keyboard access, and responsive parity. |
| `/collections/{handle}` | `templates/collection.json`; `sections/bazar-main-collection.liquid`; `snippets/bazar-catalog-filter.liquid`; `snippets/bazar-product-card.liquid`; `assets/bazar-catalog.css` | Product grid, collection heading, categories, native filters, price range, sorting, active-filter removal/reset, pagination, and empty result. | `collection.products`, `collection.filters`, sort options, pagination, money/image filters, and collection URLs. | PR #4's `/catalog` is an explicitly labeled mock grid only. **Filters, sort, pagination, collection routes, errors, and real data are missing.** Accept when URL state is shareable, all states are keyboard operable, and service responses are authoritative. |
| `/catalog` | Future route documented in `docs/catalog-routing.md`; the legacy source keeps `/collections/{handle}` for MVP. | No verified Shopify catalog route. | URL/redirect decision and catalog API. | **Pending PR #4 shell only.** Do not call it parity until URL strategy is approved. |
| `/search` | `templates/search.json`; Horizon search sections/snippets/assets, including predictive-search behavior loaded through theme scripts. | Search results and Shopify predictive-search UI; the checked-in BAZAR branch does not add a dedicated `bazar-*` search screen. | Shopify search/predictive HTML endpoints and search result objects. | PR #4 only echoes the query and links to catalog. **Suggestions, grouping, results, empty/error/loading, cancellation, and pagination are missing.** |
| `/products/{handle}` | `templates/product.json`; `sections/bazar-main-product.liquid`; `snippets/bazar-product-gallery.liquid`; `assets/bazar-product.{css,js}`; recommendation/recently-viewed sections | Gallery, thumbnails, variants, price/compare-at/discount, quantity, add to cart, buy now, wishlist link, tabs, description, specifications, reviews/questions empty states, recommendations, recently viewed. | Product/variant/media/metafield objects, cart routes, checkout URL, recommendations endpoint, money/image filters, and browser storage for recently viewed. | **Missing.** Approved target excludes a 360 view, seller block, and delivery-option selector. Use exact cost text `вартість за тарифами перевізника`. Accept with gallery/variant keyboard behavior, inventory/price reconciliation, specifications/reviews states, no excluded UI, and typed services. |
| Product cards/lists | `snippets/bazar-product-card.liquid`; home/catalog sections | Linked image/fallback, vendor, title, and price. Legacy BAZAR card has no quick-add control. | Product/variant/price/image data and cart endpoint. | PR #4 has a visual mock card but no product route or quick add. **Approved target requires quick add on lists.** Accept with disabled/loading/error/sold-out states and authoritative cart response. |
| `/cart` and cart drawer | `templates/cart.json`; `sections/main-cart.liquid`; `snippets/cart-products.liquid`; `snippets/cart-summary.liquid`; `snippets/cart-drawer.liquid`; `assets/component-cart-items.js`; `assets/cart-discount.js`; `assets/cart-note.js` | Lines, quantities, removal, subtotal/totals, empty cart, discount entry/removal, notes, checkout and accelerated checkout controls, drawer and announcements. | Shopify cart forms/routes, section re-rendering, discounts, totals, payment terms, and checkout. | **Missing.** Accept with `CartService`, reconciliation, empty/error/loading/stale inventory states, quantity/removal keyboard access, server totals, and no fabricated checkout success. |
| Checkout | `snippets/cart-summary.liquid`; `blocks/accelerated-checkout.liquid`; Shopify-hosted checkout | Legacy only hands off to Shopify checkout; no standalone three-step screen exists. | Checkout, pricing, inventory, promo, delivery, tax, payment, idempotency, and order placement. | **Approved target, missing:** exactly (1) `Контактні дані + доставка` with Нова пошта, Meest, and disabled BAZAR pickup; (2) `Оплата` with method, promo code, summary; (3) `Підтвердження`. Accept with per-step validation, back/forward preservation, server-authoritative revalidation, safe payment boundary, and no mock order/payment claims. |
| Generic content | `templates/page.json`; `templates/page.contact.json`; `templates/blog.json`; `templates/article.json`; `templates/gift_card.liquid`; `templates/password.json` | Inherited Horizon generic page, contact, blog/article, gift-card, and password screens; no BAZAR-specific approval evidence beyond shared theme styling. | Shopify pages/articles/forms/gift cards/password gate and localization. | **Unprioritized/missing.** Require product decision and approved references before migration; do not invent replacements. |
| 404 | `templates/404.json` | Inherited theme not-found composition. | Shopify template composition/localization. | **Pending PR #4:** Ukrainian not-found page. Accept after shared-layout, focus, and mobile checks. |

### Authentication routes and modal

| Route/state | Original source files | Verified behavior | Missing first-party logic | Standalone status and acceptance criteria |
| --- | --- | --- | --- | --- |
| Header auth modal | `snippets/bazar-auth-modal.liquid`; `snippets/bazar-phone-input.liquid`; `snippets/bazar-sms-code-input.liquid`; `assets/bazar-auth.{css,js}`; header snippets | Dialog/backdrop, focus trap/return, Escape close, phone entry, six-box OTP input/paste, resend timer, loading/errors, login/register transitions, profile fields and terms. | SMS provider, attempt/rate limits, challenge expiry, replay prevention, secure server session, authorization, error contract, and consent persistence. Legacy fallback accepts any six digits and stores auth flags in browser storage. | **Missing.** Phone SMS OTP only: no password or email login. Demo adapter must be visibly labeled and must never be deployable as production auth. Accept with server-issued challenge/session, invalid/expired/rate-limited states, secure cookies, keyboard/focus tests, and redacted logs. |
| `/account/login` | `templates/customers/login.json`; `sections/bazar-auth-login.liquid`; shared auth snippets/assets | Page surface of the phone/OTP UI. | Same identity dependencies as modal; Shopify customer session remains authoritative. | **Missing.** Route choice must be reconciled with `/profile` redirect plan. |
| `/account/register` | `templates/customers/register.json`; `sections/bazar-auth-register.liquid`; shared auth snippets/assets | Phone OTP plus registration profile/terms UI. | Secure verification, duplicate-account behavior, consent, customer creation, and session issuance. | **Missing.** No password/email authentication may be introduced. |
| `/account/activate_account` | `templates/customers/activate_account.json`; `sections/bazar-auth-activate-account.liquid` | BAZAR-styled access confirmation wrapper. | Product decision: SMS-only identity may make Shopify activation obsolete. | **Missing / decision required.** Do not recreate unless approved for the first-party identity model. |
| `/account/reset_password` | `templates/customers/reset_password.json`; `sections/bazar-auth-reset-password.liquid` | BAZAR-styled legacy recovery wrapper. | Password recovery conflicts with the approved SMS-only contract. | **Not approved for standalone.** Exclude unless the auth contract changes. |

### Profile and account routes

The account application is mounted by `templates/page.profile.json`, `templates/customers/account.json`, `sections/bazar-account-dashboard.liquid`, `snippets/bazar-account-sidebar.liquid`, `snippets/bazar-account-provider-data.liquid`, and `assets/bazar-account.{css,js}`. It intercepts `/profile/*` navigation in one client application.

The approved sidebar order is exactly: **Мої замовлення, Обране, Повідомлення, Мої відгуки, Особисті дані, Улюблені адреси, Платіжні методи, BAZAR-підтримка, Вихід**. `snippets/bazar-account-sidebar.liquid` matches this list. There must be no `Огляд` sidebar item. Although `assets/bazar-account.js` contains a fallback overview renderer for `/profile`, that renderer is not an approved navigation item.

| Route/screen | Original source and significant states | Data truth and missing backend | Standalone status and acceptance criteria |
| --- | --- | --- | --- |
| `/profile` account shell | Account files above; mobile sidebar drawer, page header, loading, retryable provider error, overview fallback | Shopify customer bootstrap; most updates are local/in-memory. Needs authenticated session, route authorization, customer service, and defined `/profile` landing redirect. | **Missing.** Accept when unauthorized users follow the approved auth flow, the sidebar contract is exact, `/profile` redirects or lands by explicit decision, and mobile drawer focus/overflow pass. |
| `/profile/orders` | `assets/bazar-account.js` order provider and `renderOrders*`; status tabs, rows/cards, pagination/show-more, empty states | Up to 20 real Shopify order summaries are serialized, but filters/pagination are client-side and many detail fields are fallback data. Needs authoritative order pagination/status. | **Missing.** Accept with current-user authorization, loading/empty/error states, stable pagination, localized money/dates, and no invented delivery/payment facts. |
| `/profile/orders/{id}` | `renderOrderDetails`, product lines, delivery, payment, timeline, seller panel in `assets/bazar-account.js` | Tracking, delivery, payment, timeline, seller, and protection labels can be hard-coded fallbacks. | **Missing.** Only verified backend fields may render. Seller-related UI must be included only if separately approved and supported; the product-page contract still excludes a seller block. |
| `/profile/wishlist` | Wishlist provider/renderers in `assets/bazar-account.js`; `assets/bazar-wishlist-store.js`; `snippets/bazar-wishlist-data.liquid`; favorites modal assets | Search, sort, selection/bulk removal, show-more, card removal, add to Shopify cart, and empty state exist. Storage is local-only; bootstrap is empty; no catalog/product add control exists. | **Missing.** Accept with authenticated `WishlistService`, guest-merge decision, quick cart errors, synchronized counts/modal, approved empty card dimensions, and no false persistence claims. |
| `/profile/messages` | Message providers/renderers in `assets/bazar-account.js`; account CSS/provider data | Chat list, pinning, one selected conversation, chronological history, date divider, replies, deletion, context menus, drag/drop and attachment UI, pending attachments, composer, no-chat and no-message states, responsive back navigation. Messages/pins/read state are local-only and bootstrap empty. | **Missing.** Preserve oldest-to-newest order, open at bottom, fixed header/input with internally scrolling history, unread-chat count (not message total), attachments, pinning, and the approved empty state matching wishlist card dimensions with no buttons or links. Accept with authorized transport/upload, retry/failure states, read synchronization, retention/privacy rules, keyboard/mobile tests, and no local-only claim of sending. |
| `/profile/reviews` | Review provider and `renderReviews`/`renderReview` in `assets/bazar-account.js` | Empty/list/edit/delete UI; photo upload is explicitly future placeholder; changes are local only. | **Missing.** Accept with purchase eligibility, moderation/status rules, upload contract, persistence, validation, and empty/error/loading states. |
| `/profile/personal-data` | Customer provider and `renderProfile` in `assets/bazar-account.js` | Editable name/phone/email UI; updates are in-memory. | **Missing.** Accept with server validation, re-verification rules for phone changes, optimistic-error rollback, authorization, and PII-safe logging. |
| `/profile/addresses` | Address provider and `renderAddresses` in `assets/bazar-account.js`; Shopify addresses in provider bootstrap | Address cards and empty state; no complete first-party mutation path. | **Missing.** Accept with create/edit/delete/default behavior, Нова пошта/Meest-compatible data decisions, validation, persistence, and authorization. |
| `/profile/payment-methods` | Payment provider and `renderPayments` in `assets/bazar-account.js` | Cards/empty-state prototype only; provider data defaults empty. | **Missing.** Never store card data in localStorage. Accept only with approved tokenized payment provider, safe display fields, removal/default actions, authorization, and PCI/privacy review. |
| `/profile/support` | Support provider and `renderSupport` in `assets/bazar-account.js` | Support cards/forms/prototype data and empty behavior; no service transport. | **Missing.** Accept with support contract, validation, attachments decision, delivery/status errors, authorization, and privacy/retention rules. |
| Logout | `snippets/bazar-account-sidebar.liquid`; logout handling in `assets/bazar-account.js` and auth storage | UI action clears prototype browser state/uses Shopify session behavior. | **Missing.** Accept with server session invalidation, CSRF protection, redirect, multi-tab behavior, and no residual sensitive state. |

## Modals, overlays, drawers, and significant UI states

| Surface/state | Exact source | Verified behavior | Standalone requirement/status |
| --- | --- | --- | --- |
| Desktop catalog overlay/menu | `snippets/bazar-catalog-menu.liquid`; `assets/bazar-header.{css,js}` | Open/close behavior, categories, overlay/responsive styling. | PR #4 has a basic responsive menu. Missing full focus/outside-click/Escape/scroll behavior and live category source. |
| Auth dialog | `snippets/bazar-auth-modal.liquid`; `assets/bazar-auth.{css,js}` | Backdrop, close, focus trap/return, phone/code/register states, errors/loading/resend. | Missing; must follow secure SMS-only boundary above. |
| Favorites preview dialog | `snippets/bazar-favorites-modal.liquid`; `assets/bazar-favorites-modal.{css,js}` | Empty/grid states, up to eight cards, remove, add to Shopify cart, footer link, trapped scroll/focus. | Missing; must use wishlist/cart contracts and truthful errors. |
| Cart drawer | `snippets/cart-drawer.liquid` and Horizon cart drawer assets/components | Empty/populated lines, totals, cart mutations, checkout handoff. | Missing; must share `CartService` with cart page. |
| Toast/status feedback | `assets/bazar-toast.{css,js}` | Success/error notices used by BAZAR mutations. | Missing; create accessible shared feedback without claiming demo mutations are live. |
| Product gallery/lightbox-like states | `snippets/bazar-product-gallery.liquid`; `assets/bazar-product.{css,js}` | Main media, thumbnails, controls and responsive presentation. | Missing. No 360-view UI. |
| Product tabs | `sections/bazar-main-product.liquid`; `assets/bazar-product.js` | Description, specifications, reviews, questions, delivery/payment panels and empty states. | Missing; preserve tab semantics/keyboard behavior and approved delivery wording. |
| Account mobile sidebar | `snippets/bazar-account-sidebar.liquid`; `assets/bazar-account.{css,js}` | Drawer-like responsive navigation with close control. | Missing; exact approved items, focus containment/return, Escape and no horizontal overflow required. |
| Order states | `assets/bazar-account.js` | Status tabs, no orders/no filtered results, list/show-more, detail/timeline, loading/error. | Missing; fallback facts must not migrate as real data. |
| Wishlist states | `assets/bazar-account.js`; favorites-modal files | Empty, populated, search/sort, selected/bulk remove, add-to-cart loading/error. | Missing; approved empty dimensions require visual baseline. |
| Messaging states | `assets/bazar-account.js`; `assets/bazar-account.css` | No chats, no selected chat, empty conversation, pinned/unread chats, context menus, replies, attachments, drag overlay, responsive conversation/list. | Missing; preserve the full approved behavior described above. |
| Generic loading/error/empty | Account helpers `emptyState`, `errorState`, `loadingState`; catalog/product empty markup | Localized empty/retry/loading patterns exist in individual features. | Shared standalone primitives are missing. |

## Dependencies and first-party service boundaries

| Domain | Former Shopify/browser dependency | Required typed boundary | Must remain server-authoritative |
| --- | --- | --- | --- |
| Content/navigation | Section schema/settings, menus, pages, asset URLs | `ContentService` and reviewed configuration export | Approved content/versioning and redirects |
| Catalog/search/product | Liquid product/collection/filter objects, predictive/recommendation HTML endpoints, metafields | `CatalogService`, `SearchService`, media/content mappers | Price, inventory, availability, filter facets |
| Cart/promo | Shopify cart routes/forms, discount component, section re-rendering | `CartService`, `PromoService` or cart-owned promo operations | Lines, totals, inventory, promo validity/discount amount |
| Checkout/delivery/payment | Shopify-hosted checkout, payment terms, shipping/tax calculation | `CheckoutService`, delivery quote/options contract, payment-provider boundary | Delivery availability/cost, tax, promo, inventory, payment, order placement, idempotency |
| Identity/session | Shopify customer session, optional `window.BazarSmsAuth`, browser auth flags | `IdentityService` through server route/BFF and secure cookie session | OTP challenge/verification, rate limits, expiry, authorization/session |
| Customer/orders | Liquid customer/orders/addresses bootstrap | `CustomerService`, `OrderService`, `AddressService` | Ownership, profile/address mutations, order/delivery/payment facts |
| Wishlist | `localStorage`, empty Liquid bootstrap, Shopify cart endpoint | `WishlistService` plus `CartService` | Authenticated persistence, merge/conflict result |
| Reviews | In-memory provider and future upload placeholder | `ReviewService`, approved upload contract | Purchase eligibility, moderation, persistence |
| Messages/support | `localStorage`, blob URLs, empty bootstrap, TODO `api.bazar` hooks | `MessagingService`, attachment upload service, `SupportService` | Conversation access, send/read/pin state, attachment authorization, retention |
| Payment methods | Empty/in-memory provider | Tokenized `PaymentMethodService` only after provider approval | Tokens and safe display metadata; never raw card data in browser storage |

PR #4 currently defines only `CatalogService` and `ContentService` in `apps/storefront/services/contracts/`, with deterministic mock adapters. All other boundaries above remain planned.

## Prioritized implementation checklist

This audit is the only implementation in this PR. Later phases should stay separate and depend on PR #4 being merged or explicitly rebased.

### Phase A — inventory and shared fidelity

- [x] Inventory checked-in Shopify routes, significant screens, dialogs/drawers, empty/loading/error states, and account subroutes.
- [x] Record exact source paths and distinguish verified legacy UI, pending PR #4, approved targets, and missing functionality.
- [x] Freeze the approved UX constraints in this audit: Ukrainian, four footer socials, product exclusions/wording, list quick-add, SMS-only auth, three checkout steps, exact profile navigation, and messaging behavior.
- [ ] Obtain approved desktop/mobile screenshots and merchant settings/navigation export.
- [ ] After PR #4 merges, add the four approved footer socials and complete header/menu focus, Escape, outside-click, scroll-lock, and live-count states in a dedicated shared-UI PR.
- [ ] Add shared loading/error/empty/toast primitives and visual/keyboard regression coverage after baseline approval.

### Phase B — browse journey and cart

- [ ] Catalog index/category routes with URL filters, sort, active filters, pagination, and empty/error/loading states.
- [ ] Search suggestions/results/empty/error behavior with cancellation.
- [ ] Product detail with gallery, variants, specifications, reviews/questions, approved exclusions, and delivery wording.
- [ ] Product-list quick add and shared cart page/drawer with authoritative totals.

### Phase C — promo and checkout UI

- [ ] Define promo, delivery, payment, inventory, totals, idempotency, and order-placement contracts.
- [ ] Implement the exact three-step flow as demo UI only until live services exist; never simulate a completed payment/order as live.

### Phase D — identity and profile shell

- [ ] Secure phone OTP/session boundary and exact profile navigation; no passwords/email login and no arbitrary-code production fallback.
- [ ] Profile authorization, mobile sidebar, personal-data route, and logout.

### Phase E — customer features

- [ ] Orders/details, wishlist, reviews, addresses, payment methods, and support with typed services and verified empty/error states.

### Phase F — messages

- [ ] Authorized messaging/attachment contracts, then the verified list/conversation UI and approved scrolling/unread/pinning/empty-state behavior.

### Phase G — integration and regression

- [ ] Contract tests, end-to-end journeys, accessibility/keyboard checks, visual baselines, observability/privacy, deployment/rollback planning, and explicit release approval.

## Acceptance and test status

| Check | Status on this Phase A branch |
| --- | --- |
| Required documents read before edits | Passed: all four requested documents were read from their authoritative branches. |
| Base/reference identity | Passed: `vps-migration` is `2a2dc64`; Shopify worktree is detached at `105d10f`; PR #4 head is recorded separately. |
| Exact-path verification | Passed for every BAZAR source path named above using the `105d10f` worktree. |
| Next.js implementation audit | Passed against the 27 files in open PR #4; it is not represented as merged. |
| Documentation whitespace/path validation | Run before commit; result reported in the PR. |
| Standalone lint/typecheck/build | Not applicable to this branch because `apps/storefront` is not present on `vps-migration`; PR #4 recorded those checks separately. |
| Desktop and 390×844 browser checks | Not runnable on this branch for the same reason. Required after PR #4 merges and for every UI implementation PR. |
| Authenticated Shopify visual parity | Blocked by missing preview credentials, settings export, and approved screenshots. No deployment or live credential access was attempted. |

## Known blockers and decisions required

1. Merge/rebase sequencing: PR #4 contains the standalone foundation but is not yet in `vps-migration`; UI implementation PRs should not duplicate it.
2. Obtain an approved Shopify preview/screenshots and `config/settings_data.json`/menu/content export for reproducible fidelity.
3. Approve first-party API schemas, ownership, environments, error/pagination/idempotency contracts, and session protocol for `api.bazar.ua`.
4. Approve stable public URLs and redirects, including `/catalog` versus `/collections/{handle}` and the `/profile` landing behavior.
5. Approve catalog/media fixtures and states for visual and browser regression tests.
6. Approve delivery, promo, checkout, payment-provider, SMS-provider, privacy/retention, attachment-upload, and support contracts before live integration.
7. Resolve the eight existing Theme Check errors documented in `MIGRATION_PLAN.md` only in a separate Shopify-source task; this audit does not modify legacy files.
