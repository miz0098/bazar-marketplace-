# Phase B3 — Actionable restoration and validation plan

2026-11-02. Planning only, based on `dd69a38`. This PR authorizes no implementation or Shopify change. See [audit](PHASE_B3_VISUAL_AUDIT.md) for evidence/C1–C10 and [gap matrix](PHASE_B3_DESIGN_GAP_MATRIX.md) for per-component acceptance.

## Execution order and gates

| Step | Concrete future work | Dependencies / exit criteria |
|---|---|---|
| 1. Establish real baseline | Obtain authenticated read-only preview of `vbgvzy-ay.myshopify.com`, unpublished theme `192306544952`; record actual uploaded revision, URLs, saved settings, active templates/groups and asset responses. Capture current home/catalog/PDP/cart empty+populated/drawer/footer before changing anything | Password gate currently blocks this. Confirm correct theme, not published `192303661368`. A source/settings mismatch is a separate cause to resolve before CSS work; theme title alone cannot prove revision |
| 2. Resolve decisions and content | Record C1–C4/C7–C9 choices, carry forward C5/C6/C10 constraints; prepare exact module order, token roles, role typography, container specification and mobile state sketches drawn from approved references | User explicitly approves unresolved choices. Inventory real existing media/menus/collections/products without creating them. Sign off omissions where data/services are absent |
| 3. Repair shared foundation and shell | Scoped heading/empty-title typography first; approved palette/container/spacing; remove customer technical statuses; align header/nav/search/logo/icons/footer | Use original source/exports, no theme-wide uncontrolled heading reset. Preserve Horizon custom-element refs, cart events and search routes. Customer unavailable behavior must be agreed; do not falsely enable account/favorites |
| 4. Populate existing homepage sections | On a separately authorized development copy, assign genuine image/menu/collections through editor; verify mobile art/crops and actual links | Approved standalone assets and real existing resources required. Configuration is distinct from new code. Do not re-enable generic old hero/product-list as a surrogate |
| 5. Complete approved homepage | Carousel, benefits, three promos, hot offers, optional separate new-products rail per C1, brand rail, actual newsletter | Add reviewable OS2 modules in approved order; reuse canonical product cards. Real policy/campaign/subscription contracts only. Blank source should produce agreed empty behavior and editor notices, not invented filler |
| 6. Restore catalog and card presentation | Set approved grid/sidebar geometry; align facets/toolbar/controls; tune canonical card in catalog/search/rail contexts and genuine states | Real taxonomy/facets/images/options and C4 needed. Keep one card renderer; native product forms, eligible exact variants, GET filters/pagination remain authoritative |
| 7. Restore PDP presentation | Tune gallery/title/price/options/overview/tabs/recommendation rail; populate supported specifications/policies; scope zoom/reviews/Q&A only to agreed spec/service | Confirm product data and app contracts first. Do not add fake stars/swatches/warranty or separate buy-now without explicit decision. Preserve native picker/form pending and stale-response guards |
| 8. Restore cart/drawer presentation | Empty-title fix is already prioritized in step 3; finish row/summary/discount hierarchy, real recommendation/benefit content and approved empty art; visually adapt native drawer | Preserve server-confirmed updates/line keys, uncertainty lock, full-cart checkout and current CTA. Selection/clear/promo are separate behavior decisions requiring real contracts, not decorative controls |
| 9. Finish responsive/state review | Review all breakpoints/real iPhone Safari, empty/missing-data/error/loading/focus states; resolve footer/mobile shell and density issues | Full-page mobile compositions are incomplete in source references. Record user-approved interpretations rather than claiming they already exist |
| 10. Acceptance and remaining modules | Complete visual sign-off plus targeted functional regression, then separately scope full search/help/info/auth/account/order/global-state restoration | All matrix rows marked implemented/approved deviation/blocked with evidence. Checkout/payments remain excluded. No publish/merge implied by passing acceptance |

Sequence permits shared typography and shell fixes to improve every page before individual tuning. Do not start restoring private account/checkout systems merely because their boards are in the 33-reference inventory. They remain visible gaps with separate prerequisites.

## Configure the existing homepage without fictional content

These are instructions for a future authorized configuration pass; **none were executed in B3**.

1. In the unpublished theme editor choose Home page and the existing “BAZAR — головний банер” instance. Select an already-existing, merchant-approved standalone banner in `image`, optional approved `mobile_image`, meaningful `image_alt`, verified `link`, and the existing category navigation in `menu`. Header `bazar_catalog_menu` and collection `bazar_category_menu` are separate selectors: explicitly align them to the approved taxonomy; setting one does not populate the others.
2. Select the existing “BAZAR — категорії” instance. Set `collections` to up to eight real approved collections in the agreed order; confirm `heading`. Inspect each `featured_image`, title and URL. Do not create screenshot products/collections or overwrite catalog images just to match a board. If the featured image is unsuitable, request approved editorial category assets and plan a section-specific image override rather than modifying collection data in this audit.
3. An empty hero image hides both hero and its menu in customer mode; an empty collection list hides categories. The editor shows explanatory notes. If no genuine assets/collections are available, record the blocker and keep the truthful absence until the user approves an alternative. A single configured image cannot make this hero a carousel.
4. Do not select the whole approved PNG board as a hero/banner or extract its product pictures into catalog records. The boards include annotations and illustrative prices/claims and are reference evidence, not production media. Request original standalone exports, or verify existing merchant files genuinely correspond. Any future upload of supplied artwork is a separately authorized asset action; B3 performs none.
5. Native Horizon homepage sections remain disabled and intact. Adding approved rails/benefits/promos/brands/newsletter requires code and configuration in a later phase. Existing empty settings do not indicate a broken section reference, and `settings_data.json` must not be invented to fill the gap.

Footer follow-up: select the three menu blocks, four social accounts, two genuine app URLs and three legal pages. Approve whether unavailable app/contact areas are omitted or presented another way; never use generic platform homepages as BAZAR links. Localization must use actual enabled languages/Markets. Account-ready stays false until its real flow is verified; no checkbox can establish OIDC integration.

## Asset and data intake checklist

| Required input | Owner/source | How used / blocker |
|---|---|---|
| Desktop/mobile hero master and each approved alternate slide, alt text, destinations | Merchant/designer originals or verified existing Shopify Files | Homepage cannot be populated from a design-board thumbnail; carousel crop/count depends on these |
| Three promo banners, real offer copy/URLs, campaign expiry and timezone if a timer is wanted | Merchant campaign record | No placeholder discounts or perpetual countdowns |
| Category art, eight actual collection choices/order, shared category menu | Merchant catalog + designer exports | Current `featured_image` may not match editorial art; no invented taxonomy |
| Genuine hot/new product selections, availability, price/compare-at, variants/swatches | Existing Shopify catalog | Required for rails/cards/PDP and real edge-state screenshots; no screenshot prices copied |
| Approved brand logos and genuine destinations | Merchant/designer | Brand rail unavailable without authorized artwork/mapping |
| Outlined original logo, consistent icon exports, official social/app badges | Designer/brand source | Removes live-text weight/fallback dependence and approximated marks |
| Empty-state illustration exports and missing dedicated modal spec | Designer, C7/C8 decision | `Modals.PNG` is duplicate Icons; full-page/cart art remains absent |
| Verified benefits/delivery/returns/payment/support/warranty copy, actual legal/contact destinations | Merchant policy owner | Never transcribe screenshot claims as operational facts |
| PDP descriptions/supported typed specifications and additional info; actual reviews/Q&A/favorites contract | Merchant/app owner | Conditional panels/ratings cannot be restored with fake data |
| Consent/newsletter destination and success/error requirements | Merchant | Genuine subscription handling and approved visual states |
| Real preview access, representative routes, deployed source/settings snapshot | Merchant/development workflow | Live theme/revision and computed CSS/CDN font validation currently blocked |

No external artwork, mock merchandise, fabricated reviews or new design interpretation is a substitute for these inputs. The existing SVG assets are comparison candidates, not certified original exports.

## Validation strategy and visual acceptance

### Real Shopify evidence

Access the unpublished preview directly with `preview_theme_id=192306544952` and a valid merchant/preview session; retain theme-ID evidence through navigation. Confirm the preview actually renders the intended uploaded revision and current section assignments. Do not fall back to the published theme and label it development validation. Do not use `theme dev`, upload, theme save or pull-derived overwrites as an access probe. If access remains gated, report **blocked**, with no visual acceptance.

For future implementation, any code upload or editor save must be separately authorized; this plan is not permission to change either existing theme. Prefer a separately approved disposable development copy when functional state setup or configuration would otherwise disturb the named development theme. Never touch published Horizon.

Capture current baseline and restored result for home, representative collection, product, populated/empty cart, drawer open and footer. Record date, theme ID/revision, browser/OS/device, route/query, viewport in CSS pixels, DPR, locale/currency, font loading, active menu/facet/variant and cart state. Preserve originals and screenshots without re-encoding approved PNGs. Do not commit customer identifiers or session-bearing preview tokens.

### Desktop, responsive and iPhone Safari captures

- Desktop: Chromium at 1440×1000 and 1536×1024, plus the exact agreed composition viewport once board storefront regions are measured. Capture full page and crops of header, hero, grid/card, PDP, cart summary/empty state and footer. Do not scale the entire 1536px board (which includes documentation columns) to the viewport.
- Responsive: 320, 390, 767, 768, 1023, 1024, 1279, 1280, 1439 and 1440 CSS-pixel widths. Use 900px height for desktop/tablet boundary captures and a documented mobile height, plus full-page images. Include 1280 because Navigation conflicts with Responsive Rules there. Capture approved reference-grid/density only after C4 resolves it.
- Real iPhone Safari: at least a 390px-class iPhone portrait and landscape, documenting actual device/model, iOS/Safari, viewport and safe areas; include a smaller supported device if available. Capture empty cart first, populated cart, gallery/options, open navigation/filter/drawer, search focus/keyboard and footer. Check browser text scaling, font rendering, scrolling and fixed elements. Playwright WebKit/mobile emulation is supplementary and must not be labeled real iPhone Safari.
- At each size inspect long Ukrainian titles, actual sale/multi-variant/unavailable/missing-image items and absent optional content. If real examples do not exist, mark the merchant-data case unavailable; synthetic fixtures can verify contracts separately but cannot become storefront content or real-data acceptance evidence.

### Comparisons and pass criteria

1. Choose the page region and supporting tokens/components by inventory ID; record C1–C10 resolutions and any approved deviation. Register browser scale/DPR/crop, align common container edges, and produce side-by-side images plus transparent overlays/difference crops. Freeze animations/carousel only for reproducible captures and wait for actual fonts/images. Do not distort approved references or erase legitimate differences to improve a score.
2. Measure font family/weight/size/line-height/letter-spacing, colors, container/gutters, grid column count/gaps, card/image/button dimensions, border/radius, icon stroke and vertical spacing in computed styles and screenshots. Check clipping/overflow, alignment and real wrapping. Screenshots alone cannot prove which font loaded; inspect successful font responses and `document.fonts`/computed styles.
3. Normalize only documented rendering noise such as antialiasing. Propose review tolerances before implementation: exact content/order/column count and font/token roles, geometry within 2 CSS px at matched reference scale, with browser antialiasing reviewed manually. These are proposed acceptance tolerances requiring agreement, not an existing pixel-perfect specification. Record unavoidable content-induced height differences separately; do not replace real content with reference samples.
4. User/designer explicitly reviews each page and the mobile interpretations. Every material mismatch must be corrected or recorded as an approved deviation; missing real evidence stays blocked. No high percentage pixel-match, lint success, axe result or test pass substitutes for visual sign-off.

### Functional regression beside visual review

For later code changes, run Theme Check and the dedicated top-level Liquid tag guard (B2.2 compiler regression), syntax/schema/reference checks and the relevant existing B2.1/B2.2/B2.4/B2.5 local suites. Preserve historical fixtures/evidence rather than overwriting them and calling them merchant captures. See each `analysis/shopify-*/README.md` for reproducible setup; temporary dependencies are not assumed present in a fresh environment. Document actual results and warnings anew.

Exercise genuine development-store search/query, menu routes, filters/sort/pagination, exact variant/image/price selection, eligible quick-add, native cart icon/drawer hydration, quantity/removal/discount totals, unavailable cases, and no-JS fallbacks in a separately authorized test session. Verify keyboard focus/Tab/Escape, error announcements, reduced motion and touch targets. Confirm delayed server responses do not announce success early; network uncertainty cannot silently retry POSTs or enable stale checkout. Multi-tab/app races require an actual integration check.

B3 performs no cart mutation or checkout operation. Future cart-state setup and transition checks need a permitted development test session; no merchant products/collections should be created for tests. Never submit payment or place an order as visual validation. Checkout/payment configuration and engine changes remain out of scope; any transition verification must stop before irreversible action under its own authorized scope.

## Decisions required before affected work

Resolve C1 composition/new-products, C2 role palette, C3 role/mobile typography, C4 containers/grid/laptop boundaries, C7 illustration priority/exports, C8 missing modal detail and C9 cross-device shell/unavailable actions/footer. These are explicit approvals, not silent defaults. Carry forward documented OIDC/verified-email direction (C5), three-stage checkout intent with platform limitations (C6), and real account/seller-order mapping (C10); their remaining flow changes require separate review.

Preview authentication and original assets/data are execution blockers, not design decisions to guess. No currently available authenticated evidence establishes saved theme settings, uploaded revision, real Inter delivery or real iPhone appearance. The documentation-only PR stops here; no implementation, upload, theme publication, merchant-data change, checkout/payment modification or PR merge is part of B3.
