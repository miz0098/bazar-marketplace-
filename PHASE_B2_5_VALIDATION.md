# BAZAR.UA — Phase B2.5 validation

Date: 2026-11-02. Base `949923d`; task `codex/shopify-cart-restoration-b2-5`. All results below are **local source or synthetic-browser contracts**, not Shopify merchant integration tests. No merchant login/request, theme upload, editor save, live checkout/order or payment occurred.

## Executed checks

| Command/check | Actual final result |
|---|---|
| `git ls-remote --heads origin codex/shopify-product-page-restoration-b2-4` | Remote base tip verified as `949923d93171b1a59c18fd4882ae9e76e2f44c2d`; branch created directly from it. |
| `/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json` | Exit **0**, valid true, **0 errors / 317 warnings**. Same as B2.4 baseline; warning delta **0**. No rule/configuration suppression. |
| `python3 analysis/shopify-cart-b2-5/validate.py --evidence` | **7 groups passed**: stacked ancestry/Horizon/scope; prior components and legacy cart data; native drawer row change; Liquid/schema; JSON/section references; dependencies/commerce contracts; image integrity and JS/whitespace checks. |
| `python3 analysis/shopify-catalog-b2-2/check_section_tags.py` | **281 Liquid files passed** top-level javascript/stylesheet/schema guard. New validator also checks the historical `7df5cf9` nested-JavaScript case is still rejected. |
| `node --check assets/component-cart-items.js` and both new `.mjs` tools | Passed, also executed by structural validator. Shopify JSONC/schema parsing is included, not naive strict parsing of legacy commented JSON. |
| `node analysis/shopify-cart-b2-5/browser-check.mjs` | **15 groups passed**, final exit 0; **0 browser runtime exceptions**. Actual native cart-items/quantity/morph/cart-icon/event code against local simulated Ajax and section rendering. |
| `node analysis/shopify-theme-b2-1/browser-check.mjs` | **12 regression groups passed**, final fresh run, exit 0. |
| `node analysis/shopify-catalog-b2-2/browser-check.mjs` | **17 regression groups passed**, final fresh run, exit 0, including catalog quick-add contracts. |
| `node analysis/shopify-product-b2-4/browser-check.mjs` | **22 regression groups passed**, final fresh run, exit 0, including native variant and PDP add-to-cart contracts. |
| PNG Git-byte/SHA-256 comparison | **33/33 unchanged** versus B2.4 base and approved reference commit `026c01b`; evidence records every hash. |
| `git diff --check` and scoped source checks | Passed. No unrelated apps, credentials, settings, original image or historical test-artifact modification. |

Regression commands were executed through `/tmp/b25-regress.py`, which backs up/restores old generated artifacts and captures new result JSON in this phase's analysis directory. Reproducible equivalent: `python3 analysis/shopify-cart-b2-5/regress.py`. Branch-pinned earlier structural scripts were not weakened or falsely reported passing on another branch; this phase's read-only validator owns the new structural check.

Tools actually queried: Node **v24.19.0**, Python **3.12.14**, Shopify CLI **5.0.0**, Chromium **154.0.8037.57**. Existing local tools from prior phases: LiquidJS **10.24.0**, Playwright **1.64.1**, axe-core **4.14.0**. No runtime dependencies/package files changed. Theme Check engine version separately unavailable; no version is invented.

### Cart browser coverage

- Actual Liquid cart rows/options/images, original/final unit prices, line totals, cart-level discounts and server cart amount.
- Actual cart form/checkout name and associated button; honest checkout promo notice, no fake wallet/discount controls. **Actual Shopify checkout was not opened/submitted.**
- Native plus/minus/direct-input events; exact line key in Ajax request; confirmed section HTML updates.
- Bundled native drawer hydration target and actual cart-icon count synchronize after confirmed page mutation. Other cart surfaces are inert during request.
- Delayed removal retains its row until confirmation, with busy/keyboard/checkout guards.
- Inventory 422 restores the confirmed server quantity, retains item, displays text-only error and permits correction.
- Network uncertainty retains item, blocks further mutation/checkout, provides reload and never announces success or retries automatically.
- Missing/unavailable variant quantity groups are disabled by Liquid; the browser test explicitly covers the unavailable case and removal availability. Removed-product rejection remains a merchant-data acceptance scenario, not a fabricated pass.
- Native no-JavaScript quantity-update POST and real removal URL; final confirmed removal produces empty state and shopping route.
- No horizontal overflow at **320/390/767/768/1023/1024/1439/1440px**, keyboard focus, reduced-motion emulation. axe WCAG 2 A/AA: **zero violations** on populated desktop, populated mobile and empty mobile fixtures. No real assistive-device certification.

**Final failed checks: none.** Intermediate browser runs exposed stale quantity restoration after morph and an unhandled derived standard-event promise rejection. Both were fixed in the canonical controller, then tests/regressions rerun. A local assertion also initially checked before the native 300ms quantity debounce settled; the fixture now waits for the debounced request before assessing confirmation. One new structural assertion incorrectly assumed an extra EOF newline in the native file; it was corrected to compare exact original bytes. No Theme Check warning was hidden to obtain a pass.

### Theme Check warning comparison

| Type | B2.4 | B2.5 | Delta |
|---|---:|---:|---:|
| ValidScopedCSSClass | 173 | 173 | 0 |
| OrphanedSnippet | 138 | 138 | 0 |
| UnusedDocParam | 5 | 5 | 0 |
| ExcessiveSettingsCount | 1 | 1 | 0 |
| **Total** | **317** | **317** | **0** |

## Blocked / not executed

- Shopify's actual Liquid compiler, development-store rendering, theme editor add/save/configuration, real section endpoints and genuine inventory/Markets/discount/bundle/app scenarios. Local LiquidJS adaptations are not server acceptance; the earlier upload rejection is why the separate top-level tag guard remains required.
- Real drawer dialog/focus/scroll/animation acceptance; the cart suite uses actual controller/morph behavior with a minimal hidden hydration target. Earlier shell regression checks are also local.
- Actual checkout transition and discount-code application, real taxes/shipping/currency Markets behavior; no checkout setting or merchant configuration was touched.
- Exact PNG parity, genuine images/CDN fonts, Safari/iOS/Android/touch/screen-reader devices; screenshots use labeled synthetic data and browser viewport emulation.
- Simultaneous third-party app/multiple-tab mutations, specialized bundle/selling-plan applications and server-adjusted inventory quantities require actual merchant tests. No real order/customer/payment/SMS test was attempted.

Store `vbgvzy-ay.myshopify.com`, published Horizon `192303661368` and unpublished BAZAR DEV B2.2 `192306544952` were supplied by the owner and were **not queried or changed**. Merchant access/Plus entitlements were not tested; Plus is not necessary for these theme primitives. Remote theme acceptance remains subject to separate approval.

Evidence and reproduction: [README](analysis/shopify-cart-b2-5/README.md), [source/image evidence](analysis/shopify-cart-b2-5/source-evidence.json), [cart results](analysis/shopify-cart-b2-5/browser-results.json), [Theme Check summary](analysis/shopify-cart-b2-5/theme-check-results.json), and fresh B2.1/B2.2/B2.4 regression JSON alongside them. Recommended next phase: separately approved development-theme cart/PDP/catalog visual and real-data acceptance, followed by bounded corrections/design decisions. No deployment or next-phase implementation begins here.
