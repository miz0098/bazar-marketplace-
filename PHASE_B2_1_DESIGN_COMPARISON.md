# BAZAR.UA — Phase B2.1 design comparison

Date: 2026-11-02. All 33 original PNGs remain byte-for-byte unchanged. Complete original mapping/conflicts: [Phase A design map](https://github.com/miz0098/bazar-marketplace-/blob/2e901f8aaeb1166ff0827eb63a6363ed18c9c437/DESIGN_REFERENCE_MAP.md). B2.1 implements only the visual foundation slice, not all 33 boards.

**Evidence language:** “source/structure verified” means code and local rendered DOM were inspected. “Local browser verified” means the explicitly labeled LiquidJS/Chromium fixture, including native base/header CSS and native cart JS. Neither means Shopify merchant preview or pixel-perfect matching. Full design appearance, actual Inter delivery and real catalog/media remain untested against a merchant development theme.

## Coverage of implemented elements

| Approved PNG / supporting references | Implemented element | Verified evidence | Differences, missing content or assumptions |
|---|---|---|---|
| Homepage v1.2 and `UI Design Home Page v1.0..PNG`; header repeated on Catalog/Product/Cart/Authentication | Logo, catalog, search, favorites, profile, cart | Correct six elements in local DOM, source vector recovered, no comparison icon. | Native stock logo artwork uses SVG text; exact source-export parity unverified. Search category-selector semantics deferred; profile/favorites show integration status instead of pretending to work. |
| `Navigation.PNG`, `Shopify Components.PNG` and page headers | Responsive catalog and actions | Keyboard Enter/Tab/Escape, focus return, outside click, editor remount, no overflow 320/390/768/1024/1440 locally. | Mobile uses a disclosure and second-row search rather than asserting final drawer/bottom-tab design. Intermediate breakpoints and final drawer geometry remain C4/C9 decisions. No unapproved comparison/bottom-tab features added. |
| Design System overview, detailed Colors, Typography, Grid & Spacing, `Buttons.PNG`, `Inputs.PNG`, `Responsive Rules.PNG` | Scoped tokens, Inter picker, controls, spacing/radii/focus/reduced motion, responsive container presets | CSS/schema, local fallback-font display, focus and viewport checks verified. Existing native global styles/settings preserved. | C2 palette and C4 container unresolved: default inherits Horizon, so dark accent buttons in local screenshot are **not final approved blue**. No automatic claim that 1380 or 1320 is approved. Detailed-blue candidate's contrast-safe foreground needs design approval. C3 H1 scale not selected; no new visible H1 role invented. |
| Repeated homepage/page footer and `Shopify Components.PNG` footer | Four social marks, three editable menu columns, app badges, copyright/legal areas | Local DOM contains only configured URLs; nine missing settings become inert labels and named editor notices. No active YouTube/TikTok/payment row/slogan. | Exact social fills, official app-badge artwork, footer spacing/mobile collapse and optional locale placement await visual approval. No contact details invented. Empty menus show headings but no fake links. |
| Homepage v1.2/v1.0 and portrait homepage wireframe | Sidebar/hero followed by category discovery | OS2 sections, image/mobile/alt/link controls, collection-list objects; local configured fixture renders real template paths with labeled test media. | No actual banner/category exports or merchant assignments available. Customer output hides missing hero/collections. Fixture media is a clearly labeled test shape, **not recovered design artwork**, and not in theme defaults. |
| `Cards.PNG`, homepage category tiles | Category-image/title/link layout | Local collection fixture and 2/4/8-column CSS; no product/pricing/review placeholder. | Product cards, category editorial image selection and mobile final layout are not claimed complete. Empty collection images become title-only real links. |
| `Icons.PNG` / mislabeled identical `Modals.PNG` | Catalog/heart/profile/cart and source-based social/app vectors | Inline vectors and aria-hidden decorative semantics; no icon runtime dependency. | Exact 1.5px vs source 1.8px stroke/export consistency not fully approved. No modal module imported, no auth dialog. |
| `Global UI Components v1.0 (FINAL).PNG`, Empty States, Loaders, Notifications | Focus/disabled controls and editor-only missing-content notices | No fake success states, merchant content or auth; local axe A/AA scans pass. | Full global modal/toast/skeleton/notification system is outside B2.1. Editor notes are setup guidance, not customer-facing redesign. |

## Unresolved conflicts and decisions

- **C1:** v1.0/v1.2/wireframe differ on merchandising order and rails. Only common hero/category structure is included; no promo/new-products/hot-offers/brand/newsletter order selected. Benefits are deferred because screenshot copy would assert delivery/free-shipping/support facts not established here.
- **C2/C4:** palette/container choices were requested early as optional clarifications. No response received by completion; editor defaults inherit Horizon. This deliberately leaves visible foundation differences unresolved rather than calling an arbitrary palette/width approved.
- **C3:** Inter is shared, but final heading-role scale differs across sheets. B2.1 uses scoped source-based body/control/section-heading styling and preserves native global type controls. No site-wide heading override is applied.
- **C5:** superseded for future authentication by the user's explicit OIDC + real-email verification decision. No password or OTP implementation appears in this slice.
- **C6:** checkout platform/three-stage differences remain future work; checkout untouched.
- **C7/C8:** no empty-state illustration choice or missing modal-sheet replacement attempted.
- **C9:** task settles header actions and footer platforms/exclusions. Exact footer contacts, localization placement, mobile navigation and container behavior still require a populated preview review.
- **C10:** account/order data, synchronization, seller relationships, payments and tracking untouched.

## Local previews

[Desktop local fixture](analysis/shopify-theme-b2-1/previews/local-desktop.png) and [mobile local fixture](analysis/shopify-theme-b2-1/previews/local-mobile.png) show the actual component templates with no configured merchant media/URLs and a conspicuous local-fixture notice. The fixture cart count is test data used to exercise native cart UI; it is not BAZAR merchant data. Native CSS and component scripts are included, but Shopify's complete Liquid object model, editor rendering and CDN fonts are not emulated. These screenshots are **review aids, not Shopify screenshots or visual-regression passes**.

No quantitative pixel-diff or full visual parity test was performed. The key remaining visual differences are unresolved accent/container settings, fallback-font rendering locally, missing actual homepage media/menu/link configuration, approximate source logo/app/social artwork, and mobile navigation/footer geometry. Supply approved assets and decisions, then compare an actual unpublished development theme at agreed desktop/mobile widths before accepting appearance.

## Deliberately uncovered reference surfaces

Catalog filtering, product detail/cards, cart page restyling, checkout, account screens, favorites functionality, authentication, search-results/autocomplete restyling, support/information-page bodies, reviews and notifications remain outside this slice. Existing Horizon search/cart behavior and templates are retained. The reference set remains the source of truth for future phases, not permission to introduce any of these implementations in B2.1.
