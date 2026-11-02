# BAZAR.UA — B3.2 homepage implementation

Base `codex/shopify-visual-restoration-b3-1` at **a7233d990e93c1936a1af9f687eef527f82540ae**; task `codex/shopify-homepage-restoration-b3-2`, stacked PR targets B3.1. Remote base tip verified read-only. Read root/design instructions and B3 audit/gap/plan plus B3.1 implementation/comparison/validation. Explicit user Shopify scope supersedes AGENTS' older VPS mission/branch instruction. No branch merge, store operation or deployment.

## Architecture and approved composition

Existing homepage contained only a single-image hero/sidebar and genuine collection tiles. Extend those sections; do not add a second hero/category renderer. Active section order follows the **rendered storefront region** of `BAZAR Home Page Desktop ΓÇö v1.2.PNG`:

1. Hero carousel and actual configured category navigation.
2. Benefits with merchant-confirmed copy and optional original icons.
3. Merchant-selected collection categories.
4. Up to three genuine promotional banners.
5. Product rail using a selected Shopify collection **or** featured products.
6. Configured brand logos and actual destinations.
7. Shopify newsletter interface, gated by merchant readiness/consent.

Original native hero/product-list section instances remain disabled and byte-identical. No annotation column or additional “new products” rail is invented from the board's explanatory sidebar. The existing product-rail section can serve either collection merchandising or selected featured products, using one canonical card system; no duplicate commerce implementation.

## Implemented modules

**Hero:** up to five slide blocks, each with genuine desktop/mobile image selection, alt text, optional actual link and optional merchant-supplied heading/subtitle/button text. Blocks with no image are skipped. Existing single-image settings remain a backwards-compatible fallback when no valid slide block exists. Prioritize the first **valid** image, lazy-load subsequent ones. Native image widths/sizes and mobile picture source are used; image proportions follow actual assets instead of an arbitrary crop. Previous/next, real slide dots, status announcements, Arrow/Home/End, focus-visible styling and section/block editor selection are supported. No autoplay, tracking, fetch or fake banner. Without JS every genuine slide remains visible/readable and controls stay hidden. Optional hero menu uses the actual selected link list; mobile retains existing header catalog disclosure, not a new navigation system.

**Benefits:** up to five configured entries, no default policy/claim. Optional original icon images, real heading/text, compact framed strip. Editor option aligns this strip under the desktop hero media with a256px offset (240px menu+16px gap); leave off if the hero has no sidebar. Responsive grid uses full width below1024.

**Categories:** retain genuine `collection_list` architecture and existing limit8. Collection title/image/URL are authoritative; add framed tiles and accessible image descriptions. Eight desktop/four tablet/two mobile columns. No fake taxonomy or generated initial-letter art.

**Promotions:** three image-backed blocks with genuine links, alt text and optional actual heading/link label. No default discount percentage, timer or campaign promise. Empty images produce no customer cards. Missing alt text has a neutral accessible fallback; merchant still must supply meaningful descriptions.

**Products/featured products:** one new OS2 section iterates actual selected collection products, overridden by a nonempty merchant `product_list`. Bounded2–12 items (default10); never load an unlimited catalog. Reuse native static `_product-card` → canonical `product-card` → existing BAZAR card content, the existing `bazar-catalog.js` form and standard cart events. Price, genuine same-variant discount, availability, exact eligible variant ID and multi-variant product navigation remain authoritative. No reviews/ratings/merchandise generated. Context-only CSS makes homepage cards compact; no changes to collection/PDP rendering or cart requests. Native overflow track with2/3/4/5 visible columns, accessible previous/next controls, keyboard scrolling and reduced-motion behavior; controls only appear when needed. No-JS keeps finite cards, links, scrolling and supported product POST.

**Brands:** up to12 actual logo/name/destination entries; incomplete entries stay hidden. Eight/four/two-column reflow, no invented brand marks or inferred vendor URLs.

**Newsletter:** use native `{% form 'customer' %}`, `contact[email]`, `contact[tags]=newsletter`, required affirmative `contact[accepts_marketing]` checkbox and Shopify form errors/`posted_successfully?`. No Ajax subscription service, fake success, customer token or custom backend. Whole section is hidden by default (`show:false`); if shown but readiness or agreed consent copy is absent, render disabled controls and ordinary unavailable copy, **no submission form**. Merchant must verify actual Shopify email-marketing/double-opt-in/privacy behavior and add approved copy before enabling. Success wording only says the request was submitted and may require email confirmation. Client-required consent is not a substitute for merchant/legal verification of Shopify's server-side consent process. No subscription was submitted in this phase.

All absent content produces editor-only explanations, not technical customer notices. Newsletter’s deliberately shown-but-unready state is an ordinary disabled interface, not a diagnostic. Actual markup/settings are editable through OS2 schemas without code changes.

## Modified files and provenance

Existing sources are base `a7233d9`; approved references supply composition. No older feature branch was merged.

| Theme file | Provenance / change |
|---|---|
| `sections/bazar-home-hero.liquid` | Extend existing B2.1 hero; preserve legacy image/menu settings, add image-backed slide blocks and accessible controls. |
| `snippets/bazar-home-slide.liquid` — new | Extract shared genuine image/picture/optional copy rendering so legacy and block paths do not duplicate logic. |
| `sections/bazar-category-blocks.liquid` | Existing collection loop retained; image description and editor copy updated. |
| `sections/bazar-home-benefits.liquid` — new | Approved benefits-strip anatomy, merchant text/icon data only; optional desktop media alignment. |
| `sections/bazar-home-promotions.liquid` — new | Approved three-banner region; image/link/copy settings, no synthetic campaigns. |
| `sections/bazar-home-products.liquid` — new | Adapt native/B2.4 static-card list pattern to real selected collection/featured products; canonical cards and native cart controller unchanged. |
| `sections/bazar-home-brands.liquid` — new | Approved brand region, only complete merchant asset/name/URL records. |
| `sections/bazar-home-newsletter.liquid` — new | Native Horizon customer-form pattern, rebuilt with explicit readiness/consent gates, Ukrainian error/success handling. |
| `assets/bazar-home.css` | Extend existing scoped homepage styles for approved composition, compact card context, responsive reflow and controls. B3.1 root tokens/font asset remain unchanged. |
| `assets/bazar-home.js` — new | Presentation-only custom elements for carousel/rail; no commerce request, storage, newsletter interception or external dependency. Abort/ResizeObserver cleanup on disconnect. |
| `templates/index.json` | Wire five new modules in approved order; original instances/settings remain intact; static product-card configuration copied from existing BAZAR recommendations. |

**11 theme files**, four required reports and isolated local analysis. Every prior non-homepage theme source, runtime JS, token/font/header/footer, collection/PDP/cart, configuration/locales and independent service remains byte-identical. All33 original PNGs are unchanged.

## Limits / next gate

[Configuration instructions](PHASE_B3_2_SHOPIFY_CONFIGURATION.md), [reference comparison](PHASE_B3_2_DESIGN_COMPARISON.md) and [validation](PHASE_B3_2_VALIDATION.md) distinguish code readiness from actual merchant content and live acceptance. Standalone hero/mobile/promotion/category/brand/icon artwork and real menu/collection/product selections are still needed. No artwork was extracted from boards, generated or uploaded. Exact original icon/badge/empty exports and inherited shell gaps remain.

No remote Shopify compiler/editor/CDN/form/real-cart test is claimed. User-provided store/theme IDs are context only; no upload, overwrite, publication, setting/data change or real subscriber/order/payment operation occurred. Stop after the stacked PR. Recommended next phase: separately authorized homepage development-theme configuration and visual/real-data acceptance, then bounded corrections.
