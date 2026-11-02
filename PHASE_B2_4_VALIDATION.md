# BAZAR.UA — Phase B2.4 validation

Date: 2026-11-02. Source base `f747000`; branch `codex/shopify-product-page-restoration-b2-4`. **All checks here are local source/fixture checks. No Shopify merchant login, request, upload, editor save, live cart mutation or remote preview was performed.** Store/theme IDs are owner-provided context only. [Evidence](analysis/shopify-product-b2-4/evidence.json), [PDP browser results](analysis/shopify-product-b2-4/browser-results.json), [reproduction instructions](analysis/shopify-product-b2-4/README.md).

## Executed commands and results

| Check | Actual result and scope |
|---|---|
| Instructions, pinned audit/recovery reports, native/S source, primary + eight supporting PNGs | Reviewed before implementation. `git ls-remote` verified B2.2 base tip `f747000`; new branch created directly from that commit. No branch merge. |
| `/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json` | **Exit 0, valid true; 0 errors / 317 warnings**, compared with the recorded B2.2 `0 / 312` baseline. No rule/configuration suppression. |
| `python3 analysis/shopify-product-b2-4/validate.py` | **9 groups passed**: ancestry/scope/Horizon metadata; exact narrow native edit; original section-data and existing foundation preservation; 280 Liquid top-level directive guards/140 schemas; 66 JSON/JSONC files and template references; real-object dependencies/no mock auth; native commerce contract guard; 33 images; JS/working+staged whitespace. |
| `python3 analysis/shopify-catalog-b2-2/check_section_tags.py` | **280 Liquid files passed** on final theme. The B2.4 validator also confirms the old `7df5cf9` file still reproduces the forbidden nesting, so the guard is not weakened. |
| `node --check assets/bazar-pdp.js`, `assets/product-form.js`, new preview/browser modules | **Passed**, also run by the structural validator. |
| `node analysis/shopify-product-b2-4/browser-check.mjs` | **22 groups passed**, no browser runtime exceptions in final run; actual native option/form/quantity/recommendation/cart-icon modules executed against local synthetic responses. |
| `node analysis/shopify-theme-b2-1/browser-check.mjs` | **12 regression groups passed**, exit 0, fresh run. [Captured results](analysis/shopify-product-b2-4/b2-1-regression-results.json). |
| `node analysis/shopify-catalog-b2-2/browser-check.mjs` | **17 regression groups passed**, exit 0, fresh run. [Captured results](analysis/shopify-product-b2-4/b2-2-regression-results.json). |
| axe WCAG 2 A/AA on PDP desktop, mobile and mobile out-of-stock | **Zero violations in all three local scans**. Not whole-store, real-device or screen-reader certification. |
| Original design Git-byte/SHA-256 comparison | **33/33 unchanged** versus `f747000` and approved reference commit `026c01b`. No originals renamed/re-encoded or used as fake merchandise. |
| Scoped diff, report links/evidence hashes, `git diff --check` and staged whitespace | **Passed**. No unrelated runtime/application/configuration files changed. |

Tools: Node v24.19.0, Python 3, Shopify CLI **5.0.0**, LiquidJS **10.24.0**, existing Playwright **1.64.1**, axe-core **4.14.0**, system Chromium **154.0.8037.57**. CLI/LiquidJS are temporary development tools outside the repository. No package manifest/lockfile or runtime dependency change. Separate Theme Check engine version remains unreported (`unknown` in prior CLI output); none is invented.

The official Shopify variant guide was retrieved read-only (HTTP 200) to verify `option_values` and null selected-variant behavior for impossible combinations. This is public documentation evidence, not access to the BAZAR store. The public native standard-events bundle already cached by earlier phases is served locally to tests and hashed in evidence. Legacy suites' generated artifacts were backed up/restored byte-for-byte after capturing their fresh results; historical reports/images were not rewritten.

### Theme Check comparison

| Warning type | B2.2 baseline | B2.4 final |
|---|---:|---:|
| `ValidScopedCSSClass` | 173 | 173 |
| `OrphanedSnippet` | 133 | 138 |
| `UnusedDocParam` | 5 | 5 |
| `ExcessiveSettingsCount` | 1 | 1 |
| **Errors / warnings** | **0 / 312** | **0 / 317** |

Five new PDP helpers are flagged orphaned despite their direct render references and actual local rendering. They remain visible in the result; no lint rule is disabled. Native warning debt was not rewritten away. The previous upload incident proves Theme Check alone is not Shopify server compilation acceptance; the separate top-level `javascript`/`stylesheet`/`schema` guard remains mandatory. New runtime behavior lives in external JS modules, not nested `{% javascript %}` tags.

Two pre-existing English locale JSON files use inline comments; the structural parser accepts JSONC outside quoted strings and parses all Liquid schema payloads as strict JSON. Those native locale resources remain unchanged. No claim of full Ukrainian localization of all native theme strings is made; newly authored interface labels/statuses are Ukrainian, merchant option names remain data.

## PDP local browser groups actually executed

1. Real-template title/vendor/SKU/current currency; explicit pending favorite; no fabricated rating; no nested forms.
2. Selected main image/thumbnails and Arrow/Home/End/Space focus/active behavior.
3. Native option-value request updates exact ID, price/compare/percentage/SKU and featured image.
4. Existing unavailable variant remains selected, disables purchase/quantity and never adds another variant.
5. Impossible combination clears variant ID/price and disables purchase instead of substituting first available.
6. Direct unavailable `?variant=` URL renders its actual unavailable state.
7. Pending selection blocks even a synthetic submit until the newest server response settles.
8. Failed variant response locks stale purchase; explicit retry recovers the confirmed choice.
9. Rapid changes ignore aborted/stale responses and preserve the latest selection.
10. Native min/max/increment quantity behavior, +/- buttons, disabled boundaries and invalid typed input.
11. Native product-form POST exact selected ID/quantity, pending lock and no early success; confirmed native cart-icon count and feedback.
12. Simulated 422 safely displays real error text and allows recovery without false success.
13. Simulated unknown POST outcome stays locked with cart link, no automatic retry/success.
14. Successful local POST followed by failed cart refresh remains unconfirmed/locked.
15. Supported typed content only; hidden absent/unsupported fields; tab arrows/Home/End and overview-to-full-specification focus.
16. Genuine media branches only: conditional native deferred video, static model preview/no 3D viewer and honest image-less state.
17. Required selling-plan product is explicitly blocked pending integration; no arbitrary plan selection.
18. Actual native recommendation loader displays only returned products; no catalog/random fallback.
19. No-JS media/content remain readable; real variant GET fallback and product POST markup remain present.
20. No horizontal overflow at 320/390/767/768/1023/1024/1439/1440 with configured information sidebar.
21. Desktop/mobile/mobile-unavailable axe scans.
22. Labeled local screenshots saved and inspected; no final browser runtime exception.

The harness renders the actual new Liquid snippets/sections and native variant-main-picker. It adapts Shopify-only tags/filters and OS2 static-block calls, supplies synthetic product/options/media/metafield/cart/recommendation data, and serves a loopback-only server. It does not run Shopify's Liquid service or theme editor. Option-value responses and cart mutations are local contract simulations, not live inventory/order/payment operations. Native deferred video structure is rendered, but real provider video playback is not certified. Synthetic products/prices are confined to test files and clearly labeled images, never shipped in theme defaults.

### Failures found and corrected

The first full run passed functional/state/accessibility assertions but exposed an unhandled **native** aborted variant-event promise during rapid selection. Added a narrow catch to the existing product-form listener; final full suite passes without that runtime exception. Visual inspection also exposed native fixed-basis option-label clipping; scoped sizing now permits actual option text to fit/wrap. Early fixture work required clicking the visible native option label instead of the intentionally hidden radio input. None of these local failures is represented as a successful merchant test, and no global unhandled-rejection suppression was used.

## Blocked / not executed

- **Actual Shopify compiler/rendering/editor/static-block acceptance and real preview:** uploads are explicitly prohibited for B2.4. No `theme dev`, push/pull, publish, remote store inventory or configuration command attempted. The owner-provided development theme `192306544952` and published theme `192303661368` were not accessed.
- **Genuine media/Inter/CDN/Markets, real product assortment and pixel comparison:** no merchant preview/artwork assignment. Local fallback-font/synthetic screenshots are review aids, not parity passes.
- **Live cart/drawer bundled-section morphing, inventory races, cross-tab behavior, B2B/customer-specific price tiers, subscriptions/plans, app-required properties/bundles/gift-card recipients:** require separate authorized integration acceptance. Required plan products are deliberately unavailable; volume-tier UI is not restored. Native cart/add/quantity contracts are locally exercised but no live Shopify cart request made.
- **Combined listings/high-variant catalogs/no-JS selection above 250, video-provider playback and real device Safari/iOS/Android/screen reader:** not fully exercised. Native picker contract avoids an all-variants client array; no-JS fallback is explicitly bounded.
- **Actual review/Q&A app rendering, verification/moderation/ownership or favorites service:** no configured integration was supplied; only truthful OS2 slots/pending states. No invented review/rating/Q&A/wishlist data.
- **Independent apps/database suites, auth/OIDC, checkout, payment/delivery/FCM services:** unchanged and outside this slice; no historical pass counts borrowed as new results.

No merge, upload, deployment, publication, merchant setting, subscription, DNS, customer/order/payment/SMS/database change. Stop at the stacked PR. Actual development-theme visual/functional acceptance and narrowly scoped corrections require separate approval.
