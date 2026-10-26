# BAZAR Shopify-to-Next.js Migration Plan

Phase F3 implements catalog read APIs and internal PostgreSQL cart transactions, without enabling cart HTTP or changing storefront mocks. [ADR 0003](docs/adr/0003-catalog-cart-boundaries.md) records access blockers; [Shopify restoration](docs/SHOPIFY_RESTORATION.md) lists mandatory commerce work before BAZAR Demo 100%.

Phase F2 implements the PostgreSQL technical foundation: immutable migrations, integration tests and API readiness. Authentication, catalog/commerce endpoints and frontend HTTP switching remain later stages; no real data or provider operation is introduced.

## Audit basis

Historical Phase F1 implementation update (superseded by the F2 database foundation above): `apps/api` now supplies technical HTTP/configuration/logging/shutdown foundations without activating any business operation. [API modules](docs/API_MODULES.md) and [PostgreSQL architecture](docs/POSTGRES_ARCHITECTURE.md) distinguish provisional contracts/schema design from implementation. Database migrations and live domain adapters remain future stages; no storefront mock switch or Shopify-source migration is part of F1.

This plan was re-audited on 2026-10-23 using three explicit references:

- `vps-migration` at `722a58b` supplies `AGENTS.md` and the migration base.
- `bazar-latest-shopify` at `105d10f` is the latest storefront source and therefore the UI/UX migration reference.
- PR #2 (`codex/audit-shopify-migration`, head `09f25c2`) supplies the earlier audit being corrected.

`bazar-latest-shopify` branches from the Horizon import at `e05f33f`; it is not descended from `722a58b`. Its Shopify changes are audited but are not merged into this documentation branch. The audit covers checked-in source, not an authenticated store preview.

Relative to `vps-migration`, commit `105d10f` changes 75 paths with 18,491 insertions and 1,283 deletions. It adds 22 `assets/bazar-*` files, 15 `sections/bazar-*` files, 18 `snippets/bazar-*` files, five customer templates, a profile page template, account documentation, and catalog/profile routing documentation. It also replaces the active collection and product compositions with BAZAR sections. No Shopify source should be removed or relocated until the replacement has passed review and parity checks.

## Verified storefront inventory

Status means what is present in this repository, not what is enabled or configured in the live Shopify store.

| Capability | Status | Evidence and boundary |
| --- | --- | --- |
| Header and responsive navigation | Implemented | BAZAR-specific markup and behavior are in `sections/header.liquid`, `snippets/bazar-header-desktop.liquid`, `snippets/bazar-header-actions.liquid`, `snippets/bazar-catalog-menu.liquid`, `assets/bazar-header.js`, and `assets/bazar-header.css`. It includes Ukrainian search/actions, catalog overlay, profile/auth state, favorites modal, and Shopify cart integration. Horizon mobile/header code still coexists and must be visually verified. |
| Catalog / collection listing | Implemented on Shopify | `templates/collection.json` selects `sections/bazar-main-collection.liquid`, which renders Shopify collection products, native filters, sorting, pagination, categories, active filters, empty state, and `snippets/bazar-product-card.liquid`; styling is in `assets/bazar-catalog.css`. `docs/catalog-routing.md` confirms MVP URLs remain `/collections/{handle}` and `/catalog/*` is future-only. |
| Catalog index/menu | Implemented on Shopify | `templates/list-collections.json`, `sections/bazar-collections-index.liquid`, `assets/bazar-collections-index.js`, `snippets/bazar-catalog-menu.liquid`, and `assets/bazar-header.js` implement collection discovery and overlay behavior. Menu/category content still depends on Shopify configuration. |
| Product cards | Partial | `snippets/bazar-product-card.liquid` implements linked image/vendor/title/price cards and empty visual fallback. It does not implement quick-add, ratings, badges, compare-at pricing, or wishlist controls present elsewhere in Horizon/BAZAR account UI. |
| Product page | Implemented on Shopify | `templates/product.json`, `sections/bazar-main-product.liquid`, `snippets/bazar-product-gallery.liquid`, `assets/bazar-product.js`, and `assets/bazar-product.css` implement Ukrainian product details, variants, gallery, quantity, cart/buy-now, service copy, recommendations, and recently viewed. The visible wishlist control in `sections/bazar-main-product.liquid` is only a link to `/pages/wishlist`, not a `BazarWishlistStore` mutation. |
| Authentication modal | Partial / UI-only without adapter | `snippets/bazar-auth-modal.liquid`, `assets/bazar-auth.js`, `assets/bazar-auth.css`, phone/SMS snippets, auth sections, and `templates/customers/*.json` implement Ukrainian login/register/SMS/profile form UI, focus management, resend timing, and routes. Default SMS verification accepts any six digits, registration reports success, OAuth reports unavailable, and auth state is written to `localStorage`/`sessionStorage`; `window.BazarSmsAuth` is only an optional integration hook. This is not secure live authentication. |
| Profile/account shell | Partial | `templates/page.profile.json`, `templates/customers/account.json`, `sections/bazar-account-dashboard.liquid`, `snippets/bazar-account-sidebar.liquid`, `assets/bazar-account.js`, and `assets/bazar-account.css` implement a Ukrainian SPA-like dashboard with overview, personal data, addresses, payments, reviews, support, orders, wishlist, and messages. `snippets/bazar-account-provider-data.liquid` bootstraps Shopify customer/orders/addresses, but profile edits and most provider mutations are in-memory only. `/profile` also requires the Shopify page/redirect setup in `docs/profile-routing.md`. |
| Orders | Partial | `snippets/bazar-account-provider-data.liquid` serializes up to 20 real `customer.orders` with line items. `assets/bazar-account.js` renders lists, status tabs, pagination, details, timeline, delivery/payment/seller panels, and empty states. Detail fields such as tracking, delivery, payment, seller, and timeline have hard-coded fallbacks; demo order definitions remain in the file; no `api.bazar` order client exists. |
| Wishlist | Partial / local-only | `assets/bazar-wishlist-store.js` persists items in `localStorage`; `assets/bazar-account.js` renders search/sort/pagination, remove/bulk-remove, and add-to-Shopify-cart; `snippets/bazar-favorites-modal.liquid` plus `assets/bazar-favorites-modal.js` implement the header preview. Both `snippets/bazar-wishlist-data.liquid` and the account bootstrap provide an empty array, and no product/catalog control adds items to the store. There is no authenticated/server sync. |
| Marketplace messages | Partial / local-only | `assets/bazar-account.js` implements chat list/conversation UI, unread counts, pins, chronological messages, replies, deletion, attachments UI, composer, context menus, responsive states, and the empty state added at `105d10f`. `snippets/bazar-account-provider-data.liquid` supplies an empty `messages` array; reads/writes/pins/unread state use `localStorage`; attachments use browser-local handling; seller/support API TODOs remain. No message can reach another user. |
| Cart | Implemented | `templates/cart.json`, `sections/main-cart.liquid`, `snippets/cart-drawer.liquid`, cart blocks/snippets, and `assets/component-cart-items.js`, `assets/cart-discount.js`, and `assets/cart-note.js`. Uses Shopify cart routes for add/change/update and section re-rendering. |
| Checkout | Partial | `snippets/cart-summary.liquid` submits a `name="checkout"` control in the Shopify cart form; `blocks/accelerated-checkout.liquid` and Shopify-provided additional checkout buttons cover accelerated flows. Checkout itself is platform-hosted and has no local page or business logic. |

| Styling / Ukrainian presentation | Implemented, configuration not verified | `assets/bazar-global.css` defines BAZAR tokens and shared primitives. `snippets/stylesheets.liquid` globally loads BAZAR global, home, catalog, product, toast, and favorites styles in addition to Horizon `base.css`; feature-specific files include `assets/bazar-header.css`, `assets/bazar-auth.css`, `assets/bazar-account.css`, and `assets/bazar-footer.css`. Ukrainian copy is hard-coded throughout BAZAR Liquid/JavaScript, but there is still no `locales/uk.json`; merchant fonts/settings and live rendering remain unverified. |

Related BAZAR surfaces include the home composition (`templates/index.json`, `sections/bazar-home-hero.liquid`, `sections/bazar-category-blocks.liquid`, product rails and promo banners), collections index, footer, toast system, recommendations, and recently viewed products. The original Horizon sources remain alongside these overrides.

## Shopify dependencies to replace or deliberately retain

### Server rendering and content

- Liquid objects and tags: `product`, `collection`, `cart`, `customer`, `shop`, `settings`, `section`, `block`, `routes`, `request`, `localization`, `recommendations`, `{% form %}`, `{% paginate %}`, `{% content_for %}`, and section groups.
- Shopify filters: money/image/media filters, translations (`| t`), `structured_data`, `standard_event_data`, asset URLs, and storefront/editor attributes.
- JSON templates and section/block schema provide composition and merchant-editable settings. Next.js cannot consume these directly; approved settings must be exported and mapped to typed content/configuration.
- `config/settings_schema.json` defines theme options, but `config/settings_data.json` is intentionally ignored and absent. Therefore the actual merchant selections, menus, branding, and approved home-page composition are not captured here.

### Browser APIs and platform endpoints

- Cart endpoints are injected in `snippets/scripts.liquid` and called from `assets/product-form.js`, `assets/component-cart-items.js`, `assets/cart-discount.js`, `assets/cart-note.js`, and `assets/quick-order-list.js`.
- Predictive search, product recommendations, product-section hydration, variant selection, quick add, local pickup, facets, and pagination depend on Shopify HTML/Section Rendering endpoints (`assets/predictive-search.js`, `assets/product-recommendations.js`, `assets/section-renderer.js`, `assets/variant-picker.js`, `assets/quick-add.js`, `assets/local-pickup.js`, and `assets/facets.js`).
- The import map in `snippets/scripts.liquid` loads `@shopify/events` from Shopify's CDN. Theme JavaScript also depends on global `Theme.routes`, Shopify custom elements, standard actions/events, and theme-editor events.
- Horizon includes `<shopify-account>` and `<shopify-chat>`, but the active BAZAR header/profile paths add their own auth/account/message UI. Shopify customer Liquid still supplies authenticated customer/order/address data; accelerated checkout and payment terms remain Shopify-rendered elements.
- Checkout, customer identity, catalog administration, inventory truth, pricing, discounts, taxes, shipping, localization, and payments currently remain Shopify responsibilities.

### Reusable presentation assets

- Reuse visual tokens and behavior as reference, not by copying Liquid into React: `assets/base.css`, `snippets/theme-styles-variables.liquid`, `snippets/color-palette.liquid`, section-level styles, SVG icons, and responsive breakpoints.
- Preserve accessibility patterns such as skip links, focus management, live regions, reduced-motion handling, dialog semantics, image sizing, and minimum touch targets.
- Before reuse, resolve Liquid-generated CSS variables to a reviewed static/token representation and confirm asset licensing/provenance from the imported Horizon version.

## Blockers and required product decisions

1. **Approved UI is not reproducible from Git alone.** The BAZAR markup/styles are present at `105d10f`, but `config/settings_data.json` is absent and menus, catalog records, media, app embeds, metafields, customer state, and store settings live in Shopify. Obtain a current preview/export plus desktop/mobile screenshots for parity baselines.
2. **Ukrainian exists as hard-coded UI, not a locale system.** BAZAR files contain Ukrainian labels, but there is no `locales/uk.json`; English remains the theme default and `locales/ru.json` is Russian. Extract and approve Ukrainian copy, plural rules, currency/number/date formatting, and fallback behavior.
3. **`api.bazar.ua` is only a target name.** No schema, authentication mechanism, environments, error contract, pagination contract, or ownership/SLA is checked in. Mock contracts must be explicitly provisional until an API specification is approved.
4. **Commerce ownership is undecided.** Decide whether Shopify remains the system of record for catalog/cart/checkout during transition, whether `api.bazar.ua` fronts it, and where checkout redirects. Do not model payment, SMS, or production identity from assumptions.
5. **Account features are prototypes, not live capabilities.** Auth fallbacks accept UI-only flows; wishlist and messages are local; account updates are not persisted; order detail enrichment is placeholder data. Define backend contracts, authorization, consent, retention, and failure behavior before calling these features live.
6. **Runtime and deployment are unspecified.** Confirm supported Node version, package manager, VPS OS, reverse proxy, TLS, observability, secrets delivery, caching, image domains, and rollback process before deployment work.
7. **Existing documentation is stale.** `docs/horizon-base.md` says native Horizon files are not present, while commit `e05f33f` imported them. Treat the source tree as authoritative and update that document separately only after approval.
8. **The latest storefront fails Theme Check.** At `105d10f`, Theme Check reports eight errors: a missing image size in `snippets/bazar-product-gallery.liquid`; parser-blocking scripts in `sections/bazar-main-product.liquid` and `snippets/scripts.liquid`; and over-length schema names in three BAZAR sections. These are source blockers to a clean baseline and are not changed by this documentation-only task.

## Migration sequence

### Phase 0 — evidence and contracts

- Capture authenticated and anonymous Shopify preview baselines at agreed mobile, tablet, and desktop widths.
- Export or document approved theme settings, navigation, app dependencies, representative catalog states, redirects, SEO metadata, analytics, and localization.
- Obtain an OpenAPI/JSON Schema or jointly define provisional API contracts for catalog, product, identity, customer, orders, wishlist, messaging, and cart/checkout.
- Record the system of record and cache/privacy rules for every domain. Acceptance: product/design/backend owners approve baselines and contract ownership; unknowns remain visibly marked.

### Phase 1 — isolated application shell

- After plan approval, scaffold `apps/storefront` with Next.js App Router, strict TypeScript, a chosen lockfile, linting, unit tests, and browser tests. Do not alter Shopify folders.
- Implement global tokens, fonts, icons, layout, error/not-found/loading states, responsive header/footer, and Ukrainian-first localization from approved content.
- Add typed service interfaces and deterministic mock adapters. Every mock-powered screen must show development-only mock provenance and must not be described as live.
- Acceptance: documented local startup works from a clean clone; lint/type/unit/build checks pass; shell matches approved responsive screenshots; no production credentials are present.

### Phase 2 — browse journey

- Migrate in dependency order: product-card primitives; catalog grid; filter/sort/pagination URL state; search; product detail/media/variants; recommendations.
- Preserve stable URLs and SEO metadata. Prefer server-rendered reads, with client components only for interactive controls.
- Acceptance: representative product states (available, sold out, sale, multiple variants, missing media) and catalog states (empty, loading, error, multiple pages/filters) pass visual, keyboard, accessibility, and contract tests.

### Phase 3 — cart and checkout handoff

- Implement cart behind `CartService`; decide guest-cart identity, persistence, stock/price reconciliation, discount behavior, and idempotency with the backend owner.
- Keep checkout as an explicit service-generated handoff until a compliant checkout owner and contract are approved. Never mock a successful charge.
- Acceptance: add/update/remove, unavailable inventory, price change, empty cart, server failure, refresh persistence, and checkout redirect are tested against the agreed environment.

### Phase 4 — identity and customer capabilities

- Implement auth/session boundary first, then profile and orders, then wishlist, then messaging. Enforce authorization server-side and avoid exposing tokens to browser JavaScript where an HTTP-only session is possible.
- Include sign-in/out, expiry, refresh/recovery, empty/error states, notification/read state, and privacy controls in acceptance criteria.
- Acceptance: backend contract tests and role/access tests pass; logs redact personal data and credentials; mocks remain separable from live adapters.

### Phase 5 — integration, parity, and cutover readiness

- Run Shopify and Next.js in parallel. Compare routes, analytics, SEO, structured data, accessibility, responsive behavior, performance budgets, and error handling.
- Add observability, health/readiness checks, cache invalidation, backups, rollback rehearsal, and a documented release checklist.
- Acceptance: stakeholders sign off the parity matrix; automated checks pass in CI; rollback is rehearsed; Shopify source remains intact. Deployment, DNS changes, and merge require separate explicit approval.

## Verification strategy

- **Static:** formatting, lint, strict type checking, unused-boundary checks, build, and secret scanning.
- **Unit:** domain mappers, money/localization helpers, URL filter state, service adapters, and reducers/state machines.
- **Contract:** validate mock fixtures and live responses against the same schemas; test timeouts, invalid payloads, unauthorized responses, pagination, and idempotency.
- **Component:** keyboard interaction, focus return/trap, live announcements, variant selection, cart controls, and loading/empty/error states.
- **Browser:** browse → product → cart → checkout handoff; sign-in → profile/orders; wishlist; messaging; responsive navigation; search/filter deep links.
- **Visual/accessibility:** screenshot comparison at agreed breakpoints, axe checks, screen-reader smoke tests, reduced motion, zoom, contrast, and touch targets.
- **Operational:** production-like build/start, health checks, structured/redacted logs, cache behavior, graceful API outage, monitoring alerts, and rollback.

## Exact macOS setup for the current Shopify theme

These commands validate the existing theme; they do not scaffold Next.js or push/deploy anything.

```sh
xcode-select --install                 # skip if Command Line Tools are already installed
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
npm install --global @shopify/cli@latest
node --version                          # must satisfy package.json: >=20
shopify version
git clone https://github.com/miz0098/bazar-marketplace-.git
cd bazar-marketplace-
git switch vps-migration
npm run theme:check
shopify auth login
npm run theme:dev -- --store YOUR-STORE.myshopify.com
```

On Intel Macs, Homebrew may use `/usr/local/opt/node@20/bin` instead. `theme:dev`, `theme:pull`, and `theme:push` require authorized store access; never run `theme:push` as part of local audit verification. There are no npm dependencies or lockfile in the current theme, so `npm install` is not a prerequisite for the checked-in scripts.

After Phase 1 is approved and `apps/storefront` exists, its README must contain pinned package-manager commands for install, environment-file creation from a committed example, development, lint, typecheck, tests, and production build/start. Do not invent those commands before the scaffold and scripts exist.

## Audit checks actually performed

- Confirmed branch ancestry and commit history (`vps-migration` at `722a58b`, Horizon import at `e05f33f`).
- Enumerated files and counts in all requested theme directories plus `blocks/` and `locales/`.
- Read `AGENTS.md`, issue #1, `package.json`, `README.md`, `.theme-check.yml`, layout/templates, and representative header, catalog, product, cart, account, chat, scripts, settings, and localization sources.
- Compared the 75 changed paths and commit history from the common Horizon import through `105d10f`, and compared the result with PR #2.
- Read the BAZAR auth, account/provider, wishlist, messages, catalog, product, header, styling, route, template, and documentation files; searched for API calls, storage, mocks/placeholders, TODOs, and Ukrainian text.
- Ran `node --check` over every `assets/bazar-*.js` file at `105d10f`; all passed syntax validation.
- Ran `npm run theme:check` at `105d10f`; it failed with 331 offenses across 159 of 366 inspected files: 8 errors and 323 warnings. Exact error paths are reported in the PR/check summary.
- Validation results for the new documents and theme checks are recorded in the task/PR report rather than pre-claimed here.
