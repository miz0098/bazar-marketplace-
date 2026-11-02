# B3.1 — Approved reference comparison

The user's B3.1 choices supersede B2 provisional palette/type/geometry defaults. All original references remain immutable. Exact filesystem names, including unusual Unicode, are recorded in [source evidence](analysis/shopify-visual-b3-1/source-evidence.json); no file was normalized or renamed.

## Source correspondence

| Reference | Restored shared element | Observed local result / remaining difference |
|---|---|---|
| `BAZAR Design System v1.0.PNG` | Shared blue/navy/neutral roles and Inter hierarchy | Explicit scoped foundation now drives BAZAR; no inherited dark primary. Generic overview orange purchase convention is superseded by approved blue page actions. |
| Colors v1.0 board | Neutral/status/background/border roles | Distinct semantic roles are retained. Its #1E88E5 primary is superseded by the repeated page compositions' vivid blue; not mixed into hover/active. Accessible strong text colors supplement light semantic fills. |
| FINAL Grid & Spacing board | Desktop inner content width1380, minimum side inset30, spacing/radius/elevation scale | Measured local content at viewport1440 is1380. This explicitly selects FINAL grid over Responsive Rules' competing1320 desktop cap. Footer adds a page-reference frame with its own inset, rather than pretending its inner frame is also a full1380. |
| FINAL Typography board | Inter, explicit Display/H1–H6/body/caption/button/navigation/price roles | Bundle actually loads in Chromium, including weight checks and Ukrainian sample. Scoped direct family/style/case defeats a simulated native96px/monospace/uppercase H2. Page context sizes override generic large-heading roles deliberately. |
| `Buttons.PNG`, `Inputs.PNG` | Blue primary, blue-outline secondary, state/focus roles, 44px actions and search input | Primary normal/hover/active palette is internally consistent and replaces inherited dark; exact gradient/state raster matching is not claimed. Native quantity/input behavior remains unchanged. |
| `Icons.PNG` | Consistent outline action sizing and existing native/search/cart icons | Header28px outer action SVGs, 24px base icons, 44px hit areas. Existing vectors retain their actual shapes; no random replacement icon library. Exact source SVG masters/stroke geometry remain unavailable. |
| `Navigation.PNG`, `Responsive Rules.PNG` | Logo/catalog/search/action hierarchy, responsive disclosure and 768/1024/1440 ranges | Keep existing accessible disclosure and second-row search on constrained widths. No comparison, bottom-tab system, fake account drawer or extra navigation features added. This is responsive adaptation, not a claim a complete final mobile composition exists. |
| Home v1.2, catalog v1.2, PDP v1.2, FINAL cart | Common header ordering, blue action role, Inter, framed footer and five functional regions | Local header/footer now follow repeated anatomy without technical status labels. Page header's category-select segment/predictive UI and exact logo export remain gaps; do not add decorative nonfunctional filters. |
| `Cart Page Desktop v1.1 (FINAL).PNG` plus empty-state references | Cart title/summary/item/price fonts; restrained empty-heading hierarchy | Empty title **20/28 mobile**, **24/32 tablet/desktop**; no overflow at320/390. Genuine cart controls/totals are preserved. Missing empty illustration is not invented. |

## Actual local comparison evidence

Inspected [desktop shell](analysis/shopify-visual-b3-1/previews/local-desktop.png), [mobile shell](analysis/shopify-visual-b3-1/previews/local-mobile.png) and [320px empty cart](analysis/shopify-visual-b3-1/previews/local-empty-320.png). Screenshots visibly disclose synthetic media/menu/destination data. Header is smaller and no longer has a third technical status line; blue primary buttons and explicit Inter empty title are visible. Footer has the bordered page frame and responsive column hierarchy. Configured test links are analysis fixtures, not BAZAR destinations.

Measured all six requested widths:320,390,768,1024,1280,1440. No document horizontal overflow; header search at least160px; action bounds at least44×44px; container widths match the selected rules. Empty-heading font family/size/line-height/case are recorded for every width in [browser evidence](analysis/shopify-visual-b3-1/browser-results.json).

Read-only raster sampling measured blue pixels in four approved primary-button regions; rectangles/filter/medians are recorded in [color observations](analysis/shopify-visual-b3-1/reference-color-observations.json). **#003EFF** is a shared normalization of those nearby raster-gradient colors, not a claim of exact master-design swatch recovery. Darker hover/active values are documented tonal derivations. Full-page image alignment, pixel-diff thresholds and actual merchant computed styles were not measured; no percentage visual score or pixel parity is claimed.

## Remaining gaps / selected interpretations

- Primary page composition and Inter are now selected; prior C2/C3 Horizon-default blockers are superseded for these shared roles. Desktop C4 uses FINAL1380 plus Responsive Rules lower breakpoints, with the conflict explicitly resolved here. No remaining legacy theme setting can silently revert these BAZAR roles.
- Existing live-text logo/SVG icons are comparison candidates, not approved original outlines. Existing app buttons have platform icon/text styling rather than official exact badge artwork. Original exports remain needed; no generic marketplace URL is a substitute.
- Footer menus/social/app/legal fields remain empty unless merchant-configured; missing destinations render inert. There is no invented company/contact/policy content. Native Markets controls remain conditional on real enabled languages/countries.
- Homepage approved composition is acknowledged, but missing slider/benefits/promos/product/brand/newsletter modules and genuine artwork/content are **not implemented in B3.1**. Catalog/PDP/cart density and drawer presentation still need their scoped passes; no business functionality is invented to fill screenshot regions.
- Missing full mobile page art, empty-state artwork and a real development-theme acceptance session remain blockers for exact visual sign-off. Existing mobile disclosure/search reflow is preserved as the bounded adaptation; no unapproved new navigation pattern.
