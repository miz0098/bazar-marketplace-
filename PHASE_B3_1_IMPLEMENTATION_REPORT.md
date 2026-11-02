# BAZAR.UA — B3.1 shared visual foundation

Base: `codex/shopify-visual-restoration-b3` at `bc33fb543fb817e64d8fdb0a78efa87b02859e63`. Task branch: `codex/shopify-visual-restoration-b3-1`; stacked PR targets the B3 branch. Read root/design-directory instructions, all three B3 documents and relevant B2.1/B2.2/B2.4/B2.5 implementation/validation findings. User's Shopify task and newly approved design decisions supersede the older VPS instructions and provisional design defaults. No existing PR was merged.

## Exact design decisions

| Role | Implemented value | Source / conflict decision |
|---|---|---|
| Primary / on-primary / focus | **#003EFF / #FFFFFF / #003EFF** | Repeated approved page compositions take precedence over overview #165DFF and Colors #1E88E5. Read-only button-region medians are approximately (2,67,252) home, (0,55,253) cart, (2,64,253) catalog, (1,62,252) PDP. Normalize that vivid blue to (0,62,255); this is a documented shared choice, not a claim every raster pixel has one value. |
| Hover / active | **#0035D9 / #002BB3** | 85% / 70% darkened tones of the same primary hue, rounded to integer channels; use Buttons' state hierarchy without mixing the conflicting steely-blue palette. No gradient recreation is claimed. |
| Heading/navy / body / muted | **#0F172A / #2B2F36 / #5C6168** | Page-composition dark heading treatment and detailed Colors neutral roles. |
| Surface / soft surface / page / border | **#FFFFFF / #F3F4F6 / #F8FAFC / #D1D5DB** | Detailed Colors neutral/background roles; page token is available without globally recoloring native Horizon/body. |
| Success / warning / error / info | **#22C55E / #F59E0B / #EF4444 / #3B82F6** | Detailed semantic swatches. These define roles, not invented operational statuses. Accessible success/error text: **#166534 / #B91C1C**; saturated status colors are not blindly used for small text on white. |
| Spacing | **4, 8, 12, 16, 24, 32, 40, 48, 56, 64, 72, 80px** | FINAL Grid & Spacing scale and vertical rhythm. Existing context-specific values remain scoped; no theme-wide spacing rewrite. |
| Radii | **4 / 8 / 12 / 16px** | FINAL grid; detailed controls use 8px, cards/context-specific page frames retain their appropriate role. |
| Shadows | **0 1px 2px rgba(16,24,40,.05)**; **0 4px 12px rgba(16,24,40,.08)**; **0 12px 24px rgba(16,24,40,.12)**; **0 24px 48px rgba(16,24,40,.16)** | FINAL grid's four elevations. Catalog disclosure uses the shared large shadow. |
| Desktop content container | **max 1380px, minimum side inset 30px, ≥1440px** | FINAL Grid & Spacing wins the 1380-vs-1320 desktop conflict. The 1380 is actual inner content width, not an outer box with padding subtracted again. At 1440 the content measures 1380. |
| Laptop / tablet / mobile | **1024–1439: max1140/inset24; 768–1023: max720/inset24; 320–767: fluid/inset16** | Responsive Rules ranges and lower-width geometry. Desktop does not silently switch to its contradictory 1320 cap. |

Private `--bazar-*` properties only; no native Horizon font/palette variables or global heading selectors are changed. Full exact token strings are in [source evidence](analysis/shopify-visual-b3-1/source-evidence.json).

### Typography

Self-hosted **Inter variable upright, weights 100–900**, downloaded from the official Inter project's font file, with its SIL OFL license bundled. CSS family alias `Bazar Inter` avoids dependence on a merchant-selected/system `Inter` installation. One 352,240-byte WOFF2 covers regular/medium/semibold/bold roles; `font-display: swap` preserves readable loading behavior. No Google Fonts request/runtime package was added. Source URLs and SHA-256 are recorded in evidence; the font binary is pinned by Git. Italic face is not added in this slice.

Detailed FINAL typography roles: Display **700 48/56**; H1 **700 40/48**; H2 **600 32/40**; H3 **600 24/32**; H4 **600 20/28**; H5 **500 18/24**; H6 **500 16/22**; body **400 14/20**; small **400 13/18**; caption **400 12/16**; buttons **600 14/20**; navigation **500 15/20**; price **700 24/28**. H1/H2 use −.01em tracking; other heading roles normal tracking and no uppercase transform. Semantic heading tags are preserved.

Page context mapping prevents oversized literal H1/H2 defaults: catalog/PDP desktop titles 32px, existing PDP mobile 24px, cart title 32px desktop/24px mobile, cart item title 16/24, summary title 16/22 bold, footer headings 14px. **Empty-cart title 24/32 desktop/tablet, 20/28 mobile**. Card prices 18/24 (existing mobile16), PDP prominent price 28/36 (mobile24), cart line price18/24 and total24/28. These are explicit page-density roles, not a mandate to make every heading 40px. Direct scoped heading family/style/case rules defeat native Anonymous Pro/fluid-H2 settings. Controls, labels, legends and live-text logo also use bundled Inter.

## Components restored

- Header logo/catalog/search/favorites/profile/cart alignment, 44px interaction targets, consistent action icons, blue buttons, framed search and responsive gaps. Existing catalog disclosure/Escape/outside-click behavior and real search/cart routes remain unchanged. No comparison control or new mobile navigation system.
- Removed visible “Очікує інтеграції” markup and technical customer tooltips. Favorites/profile remain inert `aria-disabled` labels when unavailable, with truthful ordinary unavailable tooltips. Integration/setup explanations remain editor-only. No auth/wishlist/session persistence enabled.
- Framed five-area footer from repeated page compositions, with responsive column reflow, Inter headings/body, social spacing, app-link presentation and legal row. Only existing configured destinations become links; blank ones remain inert and editor notices identify omissions. Exactly Facebook/Instagram/Threads/Telegram, App Store/Google Play and existing legal fields; no added slogans, forbidden platforms or payment icons.
- Empty-cart heading and related cart heading/price roles isolated from Horizon typography. Cart business logic and API contracts are byte-identical to B3 base.

## Modified theme files / provenance

All existing files derive from B3 base `bc33fb5`, building on B2 implementations rather than merging old feature branches.

| File | Exact purpose |
|---|---|
| `assets/bazar-global.css` | Approved scoped tokens, font face, explicit type/control/focus/button roles, responsive container rules and live-text logo font. |
| `assets/bazar-inter-variable.woff2` — new | Official `rsms/inter` font; licensed typography resource, not fabricated design artwork. |
| `assets/bazar-inter-license.txt` — new | Original SIL OFL distribution/license notice. |
| `snippets/bazar-foundation.liquid` | Keep existing CSS/JS loading; remove provisional font/palette/container overrides that could reintroduce Horizon defaults. |
| `config/settings_schema.json` | Retire three provisional BAZAR pickers, replace with editor explanation of approved fixed roles. **Every native settings group is unchanged.** Saved legacy keys are ignored; no merchant settings save or `settings_data.json` creation. |
| `snippets/bazar-header-actions.liquid` | Remove customer technical status spans; ordinary unavailable tooltips. All routes, conditions, refs, cart bindings preserved. |
| `snippets/bazar-header-desktop.liquid` | Editor-only paragraph updated to describe fixed approved foundation; all customer markup/behavior unchanged. |
| `assets/bazar-header.css` | Header geometry/icons/search/actions and existing-disclosure styling; remove obsolete pending-status styles. |
| `assets/bazar-footer.css` | Framed footer, columns, link and badge spacing, mobile touch targets. |
| `snippets/bazar-destination.liquid` | Blank destination tooltip now ordinary unavailable wording, not configuration diagnostics; no URL fallback introduced. |
| `assets/bazar-cart.css` | Scoped empty-title/cart typography, price and focus/error tokens; no runtime logic change. |
| `assets/bazar-catalog.css` | Remove native H2-size dependency; explicit price family/role and shared muted/error colors. No facets/grid/data/variant changes. |
| `assets/bazar-pdp.css` | Remove native H2-size dependency; explicit price/focus/muted/error roles. No picker/gallery/purchase logic changes. |

**13 theme files**, three reports and isolated local analysis/evidence. Every existing JS, section, block, template and layout file remains byte-identical. See [comparison](PHASE_B3_1_DESIGN_COMPARISON.md) and [validation](PHASE_B3_1_VALIDATION.md).

## Configuration and remaining scope

No Inter/palette/container merchant setup is required for BAZAR to use the approved code defaults. Existing native Horizon typography settings still govern unrelated native components. Merchant must separately provide real header/category menus, footer menu columns, four genuine social URLs, two app-specific URLs, legal URLs and actual enabled Markets/languages. No generic platform homepage is substituted. Account-ready remains false until a real integration exists.

Original outlined logo/icon/app-badge masters and empty artwork remain missing; existing vectors/text representations are retained, not certified exact exports. Homepage merchandising modules/content, full catalog/PDP/cart/drawer visual tuning, dedicated predictive-search UI/category selector and private services remain later scopes. No theme upload, publication, merchant setting change, checkout/auth/payment/delivery modification, production operation or merge occurred. Stop after the stacked PR; recommend separately approved visual acceptance and B3 homepage restoration next.
