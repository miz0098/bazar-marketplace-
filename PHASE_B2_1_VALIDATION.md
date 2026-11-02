# BAZAR.UA — Phase B2.1 validation

Date: 2026-11-02. All results below are actual executed checks unless marked blocked/not run. [Machine evidence](analysis/shopify-theme-b2-1/evidence.json), [browser group results](analysis/shopify-theme-b2-1/browser-results.json), [local proof README](analysis/shopify-theme-b2-1/README.md).

## Tooling

Node v24.19.0; Python 3; existing repository Playwright 1.64.1 / axe-core integration; system `/usr/bin/chromium`. Shopify CLI **5.0.0** and LiquidJS **10.24.0** installed safely into `/tmp/bazar-theme-tools`, not project dependencies. No package manifest/lockfile/application/environment production configuration was changed. CLI Theme Check runs locally without store login. `shopify theme check --version` reported `unknown`, so no separate checker-engine version is invented.

The native public `https://cdn.shopify.com/storefront/standard-events.js` module was fetched read-only into `/tmp` for the local native event test. Its hash is recorded in evidence. This is public tooling/runtime-source access, not merchant/store/carrier/payment access. No Shopify credentials or interactive login used. Plus remains selected but activation/entitlements unverified.

## Executed checks

| Check / command | Result | Meaning / limit |
|---|---|---|
| `/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path /tmp/bazar-base-theme --output json` against `git archive` of required base | **Exit 0, valid true; 0 errors, 300 warnings** | Baseline obtained before restoration; theme directories only, no merchant calls. |
| Same CLI command with `--path .` on final B2.1 source | **Exit 0, valid true; 0 errors, 307 warnings** | Actual Liquid/JSON lint result. Not a warning-free pass or a Shopify render/editor test. |
| `python analysis/shopify-theme-b2-1/validate.py` | **11 groups passed** | Horizon 4.1.1/settings preservation; all section schemas/unique settings; 14 template/group JSON files and section/order references; new snippet/assets; no imported fake auth; protected paths; original-section preservation; 33 original PNG bytes/hashes; branch ancestry; new JS syntax; diff whitespace. |
| `node --check assets/bazar-header.js` | **Passed** | Storefront disclosure module syntax. |
| `node --check analysis/shopify-theme-b2-1/preview.mjs` and `browser-check.mjs` | **Passed** | Isolated test tooling syntax. |
| `node analysis/shopify-theme-b2-1/browser-check.mjs` | **12 groups passed**, final run completed; no runtime page errors | Actual locally served LiquidJS template render and headless Chromium, not Shopify merchant rendering. |
| axe WCAG 2 A/AA scans on default and configured local component fixtures | **0 violations in each scan** | Includes native base/header CSS and BAZAR components. Not whole-theme/real-device/screen-reader certification or approval of unselected candidate palettes. |
| Original-image comparison via `git show BASE:path` + SHA-256 | **33/33 byte-identical** | No reference image decoded/re-encoded/renamed in the commit. |
| Direct review of source/changes, protected path diff and `git diff --check` | **Passed** | No independent app/checkout/production change; final staged scope reviewed separately. |

### Theme Check warnings

Baseline: 173 `ValidScopedCSSClass`, 121 `OrphanedSnippet`, five `UnusedDocParam`, one `ExcessiveSettingsCount`. Final: 173 scoped-CSS warnings, 128 orphaned-snippet warnings, five unused-doc warnings and one excessive-settings warning. Seven new BAZAR snippets are called orphaned even though the direct render-reference validator and local Liquid render resolve them. They remain reported; no lint rule was disabled to hide them. The native header was already over the checker's suggested 40 settings (42); four BAZAR controls increase it to 46. Actual editor behavior remains a store-access acceptance item.

No native baseline warning was “fixed” by rewriting unrelated theme code. The report preserves the distinction between passing the error threshold and warning-free validation.

### Local browser groups actually executed

1. Six required header elements, explicit pending profile/favorites, no fake auth or legacy profile href.
2. Nine missing footer destinations remain inert; editor identifies each setting.
3. Configured footer URLs and collection/media fixtures render only supplied destinations/data; account route option requires explicit configuration.
4. Ukrainian/special-character search query submits a real GET form to the configured Shopify search-route contract with prefix option.
5. Catalog Enter/Tab/Escape, focus restoration and outside click.
6. Actual native Horizon cart-icon/standard-event handling updates count/live region; page cart link uses route.
7. Actual native Horizon drawer component opens/closes through delegated event attributes, updates trigger `aria-expanded`, restores focus on Escape. Local test dialog shell is simplified; real cart contents/Shopify operations are not tested.
8. No horizontal overflow at 320/390/768/1024/1440, both empty and configured local states.
9. Editor section unload/load cleanup/remount of the disclosure controller.
10. axe A/AA scans for default and configured fixtures.
11. Local default desktop/mobile screenshots saved with fixture disclosure.
12. No browser runtime errors.

The test search route is a local request handler; it proves form/query/route wiring, **not live Shopify results**. Native cart scripts and standard-events are real source, but event data is a local contract fixture, **not an actual Shopify cart mutation**. Inter is requested through real Shopify font settings in the theme; the offline browser fixture uses system fallback, so no claim of actual Inter rendering is made.

### Failures found and corrected

Early browser runs identified a catalog focusout timing defect that closed the disclosure during keyboard movement, and a 320px intrinsic-width overflow. Both were corrected and the full final twelve-group run passed. Test-harness development also required correcting local LiquidJS global-object isolation and a non-unique editor-note locator; those were harness failures, not claimed Shopify service failures. No outstanding final local assertion or Theme Check error remains.

## Blocked / not executed

- **Merchant development-theme preview/editor save/reorder:** no authenticated Shopify development-store access supplied. No `theme dev`, push/pull, theme upload, publication, remote preview or app deployment attempted.
- **Exact visual comparison/pixel diff, CDN font delivery, original banner/social/app exports and real content:** unavailable; local screenshots are fixtures, not approved design matches. Palette/container conflicts remain pending.
- **Live search/predictive results, cart add/update/discount and real section-rendering API:** not tested against Shopify. Native implementations remain untouched; local event/DOM tests are limited evidence.
- **Shopify account/OIDC/Plus, SMS, payment/wallet/refund, delivery/tracking, customer sync:** outside B2.1 and unavailable; zero such operations performed. Account-ready setting defaults false.
- **Localization form submission against Shopify Markets:** native form structure retained, default off; no live submission. Existing native locale bodies were not translated or changed in this slice.
- **Full independent app lint/types/unit/build, PostgreSQL and existing E2E suites:** not run because those applications and dependencies are untouched; prior audit pass counts are not represented as B2.1 passes. Focused theme/component checks above were run instead.
- **Real iOS/Android/Safari/touch/screen reader testing:** not executed. Chromium viewport emulation is not a replacement.

## Reproducibility and review

The README lists exact local tooling preparation, public native-module fetch, commands and fixture limits. Structural validation reads Git objects/files only and does not mutate source. Browser tooling listens only on loopback, uses no merchant credentials and makes no store/API requests. Local test media/destination paths never enter theme defaults. Original-image hashes, source provenance and warning totals are recorded for PR review.

B2.1 is ready for source review with the documented configuration/design/access limitations. It does not establish production or visual-parity readiness. No merge, publication, deployment, production configuration, DNS, SMS/payment/order/database operation occurred. Stop before B2.2.
