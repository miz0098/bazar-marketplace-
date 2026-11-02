# BAZAR.UA — Phase B2.2 validation

Date: 2026-11-02. Scope: source checks and **isolated local fixtures only**. No authenticated Shopify development store, merchant/theme-editor or real commerce integration was accessed. Plus activation remains unverified. [Evidence](analysis/shopify-catalog-b2-2/evidence.json), [B2.2 browser results](analysis/shopify-catalog-b2-2/browser-results.json), [rerun B2.1 regression](analysis/shopify-catalog-b2-2/b2-1-regression-results.json), [reproduction instructions](analysis/shopify-catalog-b2-2/README.md).

## Commands executed and results

| Check | Actual result / limit |
|---|---|
| Read `AGENTS.md`, design README, audit/recovery and B2.1 documents; GitHub GET PRs 41/42/43 | All open/unmerged, exact source tips verified. B2.2 branched from `75db8b8`; no merge/rebase of another branch. |
| `git archive 75db8b8 assets blocks config layout locales sections snippets templates` into `/tmp/bazar-b2-1-theme`; `shopify theme check --path /tmp/bazar-b2-1-theme --output json` | **Exit 0: valid true, 0 errors, 307 warnings**, independently rerun B2.1 baseline. |
| `/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json` on final source | **Exit 0: valid true, 0 errors, 312 warnings**. Actual Liquid/JSON lint, not Shopify rendering/editor acceptance. |
| `python3 analysis/shopify-catalog-b2-2/validate.py` | **9 groups passed**: ancestry/scope, B2.1 foundation/Horizon preservation, schemas/unique IDs/native settings, 14 template/group JSON structures, card/dependency/auth boundaries, bounded paginate/facet/sort contracts/CSS isolation, 33 PNG bytes/hashes, JS syntax, working/staged whitespace. |
| `node --check assets/bazar-catalog.js`; same syntax check for new preview/browser modules | **Passed** (also run by structural validator). No new runtime package dependency. |
| `node analysis/shopify-catalog-b2-2/browser-check.mjs` | **17 groups passed**, no runtime exceptions. Actual headless Chromium rendering/events against locally served LiquidJS templates and synthetic contract responses. |
| `node analysis/shopify-theme-b2-1/browser-check.mjs` | **12 existing local regression groups passed**. Captured separate results; its generated artifacts were restored byte-for-byte to the B2.1 Git versions to keep the stacked diff scoped. |
| axe WCAG 2 A/AA, B2.2 desktop 1440 and mobile 390 | **Zero violations in both local fixture scans**. Native CSS/card/cart-icon code included. Not real-device/screen-reader/full-store certification. |
| Original PNG Git-byte/SHA-256 comparison | **33/33 unchanged** against `75db8b8`; B2.1 already preserves the design-reference base. No originals renamed or re-encoded. |
| `git diff --check` and `git diff --cached --check` | **Passed**, including new staged files. No lint suppression/configuration changes. |

Tools: Node **v24.19.0**, Python 3, Shopify CLI **5.0.0**, LiquidJS **10.24.0**, existing Playwright **1.64.1**, axe-core **4.14.0**, system Chromium **154.0.8037.57**. CLI/LiquidJS live outside the repository under `/tmp/bazar-theme-tools`; no project manifest/lockfile change. Theme Check's separate engine version reports `unknown`; none is invented. The public native standard-events module cached for B2.1 is reused and hashed in evidence. No merchant credentials, interactive login or remote cart calls are used.

Official public Shopify storefront-filtering, Liquid variant/paginate and Ajax cart documentation was retrieved read-only (HTTP 200). It confirms native facet parameter conventions/configuration limits, variant quantity-rule data, supported paginated arrays and bundled cart sections (up to five, `sections_url`). This is documentation evidence, **not BAZAR store compatibility certification**.

### Warning comparison

| Theme Check category | B2.1 rerun | B2.2 final |
|---|---:|---:|
| `ValidScopedCSSClass` | 173 | 173 |
| `OrphanedSnippet` | 128 | 133 |
| `UnusedDocParam` | 5 | 5 |
| `ExcessiveSettingsCount` | 1 | 1 |
| **Errors / warnings** | **0 / 307** | **0 / 312** |

The five added warnings are the five new helpers: card content, category tree, collection heading, collection body and pagination. Direct references and actual local rendering resolve them; the warnings remain reported. No warning was suppressed. The native collection's pre-existing annotation for Shopify's `standard_event_data` filter was moved with its existing collection view-event wrapper to wrap both modes; this does not add a suppression rule. Existing header setting-count/scoped-CSS warnings are not rewritten away.

## B2.2 local browser groups actually executed

1. Canonical card image/title/currency rendering; unique HTML IDs; pending favorite remains inert; separate touch-sized filter rows; no nested forms/reviews.
2. Exact eligible variant ID; multi-variant, selling-plan, minimum-quantity/volume cases navigate to PDP; out-of-stock has no add form; varying-price minimum.
3. Same-single-variant compare-at and calculated percentage; no unsupported multi-variant discount.
4. Real configured menu hierarchy/current marker/breadcrumb ancestors (fixture objects, not merchant configuration).
5. One filter/sort GET form, selected/disabled states, special-character encoding, decimal input values, sort-options list, resetting page.
6. Selected-removal links and server-supplied paginated URLs retaining facet/sort state; active page/ellipsis.
7. No configured facets/empty catalog: no fabricated controls/products, honest empty state.
8. Local Ajax exact variant/quantity, pending lock, confirmed response and **actual native Horizon cart-icon event update**.
9. Simulated 422 rejection safely shows server text, permits retry, does not claim success.
10. Simulated failed POST connection locks unknown outcome, exposes cart link and never automatically retries.
11. Simulated successful POST followed by failed cart refresh similarly avoids false success/duplicate POST.
12. JavaScript-disabled fixture retains standard product POST and facet GET forms, accessible expanded content. No live Shopify fallback submission tested.
13. Mobile disclosure Enter/Tab/Escape/focus and editor section-load initialization.
14. No horizontal overflow at 320/390/768/1024/1440 in both grid modes.
15. Actual collection-index section and shared search-card mode, plus empty index.
16. Desktop/mobile axe scans.
17. Labeled local screenshots saved; no browser runtime exceptions across the suite.

Native Horizon `product-card.js`, its dependency modules and `cart-icon.js` are executed locally, together with the actual BAZAR templates/controller and native base/header CSS. Shopify-only tags/filters are adapted in the harness: paginate objects/products are supplied fixtures and OS2 static-block calls are mapped to the canonical renderer. Consequently these tests **do not prove Shopify pagination slicing, static-block/editor context or live filter evaluation**. The full search-results/predictive service and native cart drawer section-morphing are not emulated. No fake production catalog or prices are added; synthetic data is confined to labeled test files/screenshots.

### Failures found and corrected

Early development runs failed on local harness handling of Shopify form/content tags, a form-ID assertion affected by HTML named-input property shadowing, and axe's browser-context setup. The form-ID finding also led to using `getAttribute('id')` for the real controller's event source. Local visual/accessibility review caught the header catalog class collision, native checkbox-label specificity overriding vertical rows, and the pre-existing mobile catalog summary's missing accessible name. These were corrected, then the complete final 17-group suite passed. Early failures are not represented as passed Shopify integrations; no final local assertion remains failing.

## Blocked / not executed

- Real Shopify Liquid rendering, OS2 static-block context, theme-editor settings/save/add/reorder and development-theme preview: **no authenticated merchant development-store access**. No theme dev/upload/push/publish/deploy was attempted.
- Live collection filters/counts/removal/sort/page URLs, true page-size boundaries, Markets/currencies/locale behavior and actual catalog volume. Public documentation describes platform limits; real filter definitions/data and catalog size are unknown.
- Actual Shopify add/cart mutation, variant inventory races, quantity rules in merchant/B2B context, app-required line properties/bundles, selling plans, discount interactions, cart drawer bundled-section morphing, cross-tab/concurrent cart state and non-JS server redirects/errors. Local request handlers and simulated failures are not live tests.
- Full search page/query/predictive behavior and native translation coverage. Native source was preserved; only shared card mode is locally rendered. No separate search backend built.
- Original product media, real CDN Inter, complete mobile artwork, palette/type/container decisions or quantitative visual-regression comparison. Local screenshots are explicitly synthetic/fallback-font review aids.
- Safari/iOS/Android/touch/screen-reader testing. Chromium viewport emulation and axe do not establish those results.
- Authentication/OIDC/SMS/accounts, checkout, payment/wallet/order/refund/carriers/sync: outside B2.2; **zero such operations performed**. Independent application/database suites were not run because those applications remain untouched.

No production or merchant configuration, subscription, DNS or database change. No live order/payment/SMS, PR merge, theme publication or PDP restoration. Source review is ready with these explicit limits; stop after the stacked B2.2 PR.

## PR #44 upload-error correction — fresh validation

Source before correction: `7df5cf9`. Branch: `codex/shopify-catalog-restoration-b2-2`. The owner-reported Shopify compiler rejection exposed a gap: Theme Check returned zero errors and local fixtures strip `{% javascript %}`, so neither had caught its invalid nesting. No claim of previous server-side acceptance is made.

| Newly executed check | Result |
|---|---|
| New `check_section_tags.py` on the original working file before correction | **Expected failure reproduced:** only `sections/main-collection.liquid`, `javascript` at line 24 inside `if`. |
| Same checker after moving the unchanged JavaScript block to top level | **273 Liquid files passed**; section-level `javascript`/`stylesheet`/`schema` directives no longer nested in Liquid control blocks. Targeted source check, not a substitute for Shopify's compiler. |
| `python3 analysis/shopify-catalog-b2-2/validate.py` | **10 groups passed**: previous nine plus the nesting regression. Confirms exact original JavaScript body and remaining nonblank section lines preserved, JavaScript syntax, collection template byte preservation, all schema/asset/template checks and 33/33 PNG integrity against the approved base. |
| Shopify CLI 5.0.0 `theme check --path . --output json` | **Exit 0, valid true, 0 errors / 312 warnings**. Unchanged categories: 173 scoped-CSS, 133 orphaned-snippet, five unused-doc, one settings-count. No suppression added. |
| `node analysis/shopify-theme-b2-1/browser-check.mjs` | **12 groups passed**, exit 0; fresh local fixture regression. |
| `node analysis/shopify-catalog-b2-2/browser-check.mjs` | **17 groups passed**, exit 0; fresh local catalog/cart contract regression, including desktop/mobile axe scans and no runtime exceptions. |
| `git diff --check`, staged whitespace, protected runtime/image scope | Passed. Only the section's JavaScript placement changes storefront source; template, settings, other runtime files and all originals remain unchanged. |

New machine results: [upload-fix-validation.json](analysis/shopify-catalog-b2-2/upload-fix-validation.json). Legacy browser scripts' generated artifacts were restored after capturing fresh results, preserving their historical evidence. Tooling is unchanged from the versions above. No Shopify authentication, API request, remote theme inspection, upload or live integration test was performed; the existing theme ID and compiler errors came from the owner. Actual remote acceptance cannot be re-tested under this task's no-upload restriction. The template reference is valid locally; its reported missing-section error was consequential to rejection of the section, not a separate missing repository file.
