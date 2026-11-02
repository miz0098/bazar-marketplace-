# BAZAR.UA — Phase B2.1 implementation report

Date: 2026-11-02. Base `design-reference-storefront@026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc`; task `codex/shopify-theme-restoration-b2-1`. **Bounded visual foundation only; unpublished and unmerged.**

Read `AGENTS.md`, the design directory instructions, Phase A documents at `2e901f8` and all six Phase B1 documents at `5a01190`. PRs [#41](https://github.com/miz0098/bazar-marketplace-/pull/41) and [#42](https://github.com/miz0098/bazar-marketplace-/pull/42) were open/unmerged when reviewed; their files were read from their source branches. Neither was merged. The user's explicit B2.1 scope supersedes the older VPS-migration mission/branch rule and any broader B2 proposal.

## Implemented slice

- Scoped BAZAR tokens, Inter font-picker/400–600–700 font delivery declarations, spacing/radii, shared accessible buttons/containers and responsive CSS. Existing Horizon body, typography controls and native button rules are preserved. New styles target BAZAR classes only.
- Responsive BAZAR header: recovered logo, configurable real catalog menu with three link levels, Shopify GET search, favorites/profile entries and native Horizon cart icon/events/drawer delegation. No comparison action, demo auth, fabricated session or account data. Profile defaults to visible “Очікує інтеграції”. An explicit editor checkbox can expose Shopify's supported `routes.account_url` **only after current account/OIDC configuration is verified**; it changes no account setting itself. Favorites similarly remains inactive until a genuine destination is configured.
- BAZAR footer: configurable Facebook/Instagram/Threads/Telegram, App Store/Google Play and three required legal destinations; three merchant-menu columns; optional native Shopify localization form. Missing destinations are non-interactive, with individually named editor warnings. No fabricated legal/social/contact URL, payment icon row, YouTube, TikTok or slogan was added to the active footer.
- OS2 homepage foundation: image-picker hero with optional real menu sidebar and mobile image; collection-list category tiles. Actual merchant assets/collections only. With missing assets/data these sections render editor instructions and remain absent from customer HTML. Conflicting merchandising rails, promos, brands, newsletter order and unverified benefit/delivery claims are deferred.
- The existing generic Horizon homepage/footer section data is retained and disabled rather than deleted; the unapproved English announcement is disabled. All native section files remain available. The header has a reversible BAZAR layout option, retaining original Horizon captures/settings/scripts and required component references.

**Important:** without configuring an approved hero/collections/menus/URLs, the default customer homepage body is intentionally empty rather than populated with invented artwork or catalog. Header/footer foundation still renders. This is a configurable foundation PR, not a populated storefront or complete design match.

## Explicit design decisions and unresolved defaults

The task settles the header actions (no comparison), footer platform list/exclusions, no fake auth and future OIDC verified-email enrollment. It does **not** settle Phase A palette/container/H1 conflicts. Two focused optional questions were raised; no answer had arrived when implementation was finalized. Accordingly `bazar_palette` and `bazar_container` default to **inherit Horizon**, visibly described in the editor as unresolved. Candidate reference presets remain opt-in; none is silently declared approved. Neutral tokens/spacing are source-based shared foundation; final type-scale roles and tablet/header geometry remain review items.

The detailed blue preset uses dark foreground on blue for contrast; its on-primary treatment must be reviewed with the conflicting reference palettes before use. It is not the selected default or a claim of final approved color parity. Fonts are loaded with Shopify's `font_picker`/`font_face`, but real CDN font delivery is not proven by the local fallback-font fixture.

## File-by-file provenance and dependencies

Recovery source **S**: `bazar-latest-shopify@105d10fb6b8e65c5f163016aa8c69072e85faa0e`. Native base **B**: `026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc`. Consult the [71-file B1 matrix](https://github.com/miz0098/bazar-marketplace-/blob/5a01190ff5c88b6df627923d851492226336462b/SHOPIFY_THEME_RECOVERY_MATRIX.md). “Adapted” means selective source-based reconstruction, not byte-identical import. No wholesale feature-branch merge occurred.

| Changed theme file | Original source | Modifications / dependencies |
|---|---|---|
| `assets/bazar-logo.svg` | S, same path | Exact recovered vector bytes; SVG text still depends on Inter/fallback and is not certified as the original design export. |
| `snippets/bazar-logo.liquid` | S, same path | Exact recovered root-route/accessible-logo markup. Depends on vector asset. |
| `assets/bazar-global.css` | S, same path, adapted | Removed original global body overrides; namespaced spacing/radii/type/button/container foundation, safe font fallback/focus/reduced-motion. Candidate accent/container settings live separately. |
| `assets/bazar-header.css` | S, same path, rebuilt selectively | Shared header geometry adapted to desktop/mobile; scoped disclosure/search/actions/count styles; no source desktop-only hiding. Native cart custom elements remain functional. |
| `assets/bazar-header.js` | S, same path, replacement controller | Replaced old extensive catalog/search controller with minimal disclosure keyboard/outside/focus handling and editor load/unload cleanup. No auth, browser storage, requests or search/cart interception. |
| `snippets/bazar-header-desktop.liquid` | S, same path, adapted | Now responsive; actual link-list menu, standard route-based search, escaped query, no unavailable category-search selector. Supplies native header references; depends on logo/catalog/action snippets. |
| `snippets/bazar-header-actions.liquid` | S, same path, adapted | Removed all `bazar-auth`, wishlist-modal/storage bootstrap and hardcoded `/profile` routing. Uses native `cart-icon`, `cart-bubble`, `header-actions.js`, `cart-icon.js` and drawer target. Disabled profile/favorites are explicit. |
| `sections/bazar-footer.liquid` | S, same path, adapted | Replaced hardcoded test contacts/social fallbacks with nine URL settings and real menu blocks. Added editor missing-destination notes and optional Shopify localization form. Depends on logo/icon/destination snippets. |
| `assets/bazar-footer.css` | S, same path, adapted | Scoped five-area desktop/two-column mobile structure, readable link groups, social/app/legal treatments. Footer geometry and exact badges remain visual-review items. |
| `sections/bazar-home-hero.liquid` | S, same path, structural recovery | Removed synthetic shapes, default marketing/benefit claims and autoplay. Merchant image/mobile image/alt/link/menu settings only; hides absent image. Depends on catalog-links and home CSS. |
| `sections/bazar-category-blocks.liquid` | S, same path, adapted | Real collection-list/image/title/URL tiles replace source initial-letter/menu placeholders; hide when empty. Escaped merchant text, responsive real-image tags. |
| `assets/bazar-home.css` | S `assets/bazar-home.css`, selected structure rebuilt | Only sidebar/hero/category discovery foundation. No product-card, promo or merchandising implementation. |
| `snippets/bazar-icon.liquid` | New; S footer social/app SVG paths + S header heart path | Consolidated the four approved socials/two app marks and outline header icons. No runtime library. |
| `snippets/bazar-catalog-links.liquid` | New; structural counterpart to S `bazar-catalog-menu.liquid` | Real merchant navigation with up to three levels instead of hardcoded taxonomy/collection inference. Reused in header/home. |
| `snippets/bazar-destination.liquid` | New | Single configured-link/inert-label renderer; no fallback URL. Used by footer. |
| `snippets/bazar-foundation.liquid` | New; replaces selected S global loader hunks | Loads four scoped CSS assets once, Shopify font variants, explicitly chosen presets and the one disclosure module. No extra JS/CSS dependencies or auth loaders. |
| `layout/theme.liquid` | B, same path | One render call after native palette/style declarations. Native cart drawer, search modal, content/editor integration retained. |
| `config/settings_schema.json` | B, same path | Appends one BAZAR group; original settings and Horizon 4.1.1 metadata unchanged. No `settings_data.json` exists in this base and none was created or imported. |
| `sections/header.liquid` | B, same path | Four BAZAR controls; branch inside original `header-component`; original fallback rows preserved, required refs provided by BAZAR branch. Home H1 retained outside branch. Native JS/CSS unchanged. |
| `sections/header-group.json` | B, same path | Selects BAZAR layout for source header and disables generic English announcement; original blocks/settings preserved. |
| `sections/footer-group.json` | B, same path | Adds BAZAR section/menu-column defaults; retains old native sections disabled. Previously existing generic social destinations remain only in those disabled original data, not active BAZAR output. |
| `templates/index.json` | B, same path | Adds BAZAR hero/categories first, retains original generic sections disabled. No merchant media handles/products/prices/discounts/reviews copied from S. |

No changes to native cart/search implementation, checkout, customer templates, locales, blocks, independent applications, infrastructure or workflows. This is **22 theme files**, plus three required reports and isolated validation artifacts. Source hashes and original-image hashes are recorded in [evidence.json](analysis/shopify-theme-b2-1/evidence.json).

## Editor setup and reversible review

On an authorized future unpublished development theme: choose the BAZAR header layout, select the actual catalog menu, configure genuine favorite/account destination only after integration, fill each footer URL/menu, and supply approved hero/mobile assets/real collections. Do not turn on the account-ready checkbox merely because Plus is selected. Choose palette/container only after explicit design approval. Original native layout is still selectable; old homepage/footer section settings remain in the JSON for review and recovery.

The local fixture tests empty and configured cases, editor messages, menu/keyboard behavior and load/unload events. It does not prove the real Shopify editor accepts/saves every control, section selection, localization, asset CDN behavior or full native section rendering.

## Validation and boundaries

See [validation results](PHASE_B2_1_VALIDATION.md) and [design comparison](PHASE_B2_1_DESIGN_COMPARISON.md). Shopify CLI was safely installed under `/tmp/bazar-theme-tools` only; no application dependencies changed. Theme Check returned valid/no errors with warnings recorded against baseline. Twelve local browser groups and eleven structural checks passed. Local findings led to fixes for catalog focus handling and 320px overflow.

Future auth decision recorded: first enrollment +380/SMS → real email → actual inbox verification → Shopify account provisioning/linking; returning phone/SMS, with security step-up where needed. This phase does not implement any of it. No insecure source auth code/flags were imported.

No production settings, merchant subscription, DNS, database, SMS, payments, orders, API/admin/CRM/Flutter code, theme upload/publication or deployment was touched. No branch/PR was merged. B2.1 ends at its review PR. B2.2 requires explicit approval; recommended next slice is design-decision closure and approved assets/content in an unpublished dev preview, followed by one catalog/product-card slice, not checkout/auth activation.
