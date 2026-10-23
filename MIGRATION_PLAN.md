# BAZAR Shopify-to-Next.js Migration Plan

## Audit basis

This plan is based on a read-only audit of commit `722a58b` on `vps-migration` on 2026-10-23. It covers the checked-in Shopify Horizon source, not an authenticated store preview. `AGENTS.md` and GitHub issue #1 define the scope and guardrails.

The repository contains a complete Horizon theme import: 122 files in `assets/`, 95 in `blocks/`, 43 in `sections/`, 121 in `snippets/`, 14 in `templates/`, 52 in `locales/`, two in `config/`, and one in `docs/` (including tracked `.gitkeep` files). No Shopify source should be removed or relocated until the replacement has passed review and parity checks.

## Verified storefront inventory

Status means what is present in this repository, not what is enabled or configured in the live Shopify store.

| Capability | Status | Evidence and boundary |
| --- | --- | --- |
| Header and responsive navigation | Implemented | `sections/header.liquid`, `sections/header-group.json`, `snippets/header-row.liquid`, `snippets/header-drawer.liquid`, `snippets/header-actions.liquid`, `assets/header.js`, `assets/header-menu.js`, and `assets/header-drawer.js`. Includes menu/drawer, search, localization, account trigger, cart trigger, sticky/transparent modes, and responsive behavior. |
| Catalog / collection listing | Implemented | `templates/collection.json`, `sections/main-collection.liquid`, `blocks/filters.liquid`, `snippets/product-grid.liquid`, `snippets/sorting.liquid`, `assets/facets.js`, and `assets/results-list.js`. Includes pagination or infinite scroll, sorting, filters, and density controls. Data comes from Shopify Liquid objects and section rendering. |
| Product cards | Implemented | `blocks/_product-card.liquid`, `snippets/product-card.liquid`, `snippets/card-gallery.liquid`, `snippets/quick-add.liquid`, `assets/product-card.js`, and `assets/quick-add.js`. Includes media, price/badges through child blocks, quick add, and product navigation. |
| Product page | Implemented | `templates/product.json`, `sections/product-information.liquid`, `blocks/_product-details.liquid`, `blocks/_product-media-gallery.liquid`, variant/buy-button blocks, `assets/variant-picker.js`, `assets/media-gallery.js`, and `assets/product-form.js`. Includes variants, media, pricing, inventory, quantity, add-to-cart, sticky add-to-cart, and recommendations. |
| Authentication modal | Partial | `snippets/header-actions.liquid` renders Shopify's `<shopify-account>` custom element when customer accounts are enabled, and styles its dialog. The authentication UI, session flow, and API are Shopify-managed; no BAZAR-owned auth form or route exists in the repository. |
| Profile | Partial | The same `<shopify-account>` integration can expose Shopify account UI and the locale contains account/profile labels, but there is no profile template, application state, form, or API client in this repository. |
| Orders | Partial | Shopify account integration and `assets/icon-orders.svg` exist, but there is no order list/detail template, data model, or API client. Behavior depends on Shopify's account component and store configuration. |
| Wishlist | Absent | No wishlist template, Liquid implementation, JavaScript module, persistence model, or service call was found. |
| Marketplace messages | Absent | `snippets/chat-drawer.liquid` hosts Shopify Inbox's `<shopify-chat>` when that app registers it. That is a support-chat integration, not a verified buyer/seller messaging feature; no conversation/message model, route, or API client exists. |
| Cart | Implemented | `templates/cart.json`, `sections/main-cart.liquid`, `snippets/cart-drawer.liquid`, cart blocks/snippets, and `assets/component-cart-items.js`, `assets/cart-discount.js`, and `assets/cart-note.js`. Uses Shopify cart routes for add/change/update and section re-rendering. |
| Checkout | Partial | `snippets/cart-summary.liquid` submits a `name="checkout"` control in the Shopify cart form; `blocks/accelerated-checkout.liquid` and Shopify-provided additional checkout buttons cover accelerated flows. Checkout itself is platform-hosted and has no local page or business logic. |

Related implemented surfaces include search/predictive search (`templates/search.json`, `sections/search-results.liquid`, `sections/predictive-search.liquid`, `assets/predictive-search.js`), collection lists, blog/article pages, contact/page templates, gift cards, localization, product recommendations, local pickup, and theme-editor sections/blocks.

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
- Accounts use `<shopify-account>`; chat uses `<shopify-chat>`; accelerated checkout and payment terms use Shopify-rendered elements.
- Checkout, customer identity, catalog administration, inventory truth, pricing, discounts, taxes, shipping, localization, and payments currently remain Shopify responsibilities.

### Reusable presentation assets

- Reuse visual tokens and behavior as reference, not by copying Liquid into React: `assets/base.css`, `snippets/theme-styles-variables.liquid`, `snippets/color-palette.liquid`, section-level styles, SVG icons, and responsive breakpoints.
- Preserve accessibility patterns such as skip links, focus management, live regions, reduced-motion handling, dialog semantics, image sizing, and minimum touch targets.
- Before reuse, resolve Liquid-generated CSS variables to a reviewed static/token representation and confirm asset licensing/provenance from the imported Horizon version.

## Blockers and required product decisions

1. **Approved UI is not reproducible from this checkout.** `config/settings_data.json` is absent, and menus, catalog records, media, app embeds, metafields, and store settings live in Shopify. Obtain a current preview/export plus desktop/mobile screenshots for parity baselines.
2. **Ukrainian UI is not present.** There is no `locales/uk.json`; English is the default and `locales/ru.json` is Russian. Ukrainian copy, plural rules, currency/number formatting, and content ownership must be supplied and approved.
3. **`api.bazar.ua` is only a target name.** No schema, authentication mechanism, environments, error contract, pagination contract, or ownership/SLA is checked in. Mock contracts must be explicitly provisional until an API specification is approved.
4. **Commerce ownership is undecided.** Decide whether Shopify remains the system of record for catalog/cart/checkout during transition, whether `api.bazar.ua` fronts it, and where checkout redirects. Do not model payment, SMS, or production identity from assumptions.
5. **Account scope is delegated today.** Define required auth, profile, orders, wishlist, and buyer/seller messaging behavior, including consent, retention, authorization, and empty/error states.
6. **Runtime and deployment are unspecified.** Confirm supported Node version, package manager, VPS OS, reverse proxy, TLS, observability, secrets delivery, caching, image domains, and rollback process before deployment work.
7. **Existing documentation is stale.** `docs/horizon-base.md` says native Horizon files are not present, while commit `e05f33f` imported them. Treat the source tree as authoritative and update that document separately only after approval.

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
- Searched source for routes, forms, Shopify globals/custom elements, API calls, feature names, and Ukrainian text.
- Validation results for the new documents and theme checks are recorded in the task/PR report rather than pre-claimed here.
