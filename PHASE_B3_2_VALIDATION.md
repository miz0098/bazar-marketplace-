# B3.2 — Executed validation

Base `a7233d9`; task `codex/shopify-homepage-restoration-b3-2`. All tests below are **local source or labeled synthetic browser contracts**, not Shopify merchant tests. No login, theme upload/overwrite/publication, editor save, data change, subscriber creation, real cart request, order or payment was performed.

## Final results

| Command/check | Actual final result |
|---|---|
| `git ls-remote --heads origin codex/shopify-visual-restoration-b3-1` | Remote base verified as `a7233d990e93c1936a1af9f687eef527f82540ae`; branch created directly from it. No merge. |
| `/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json` | **Exit0, valid true,0 errors /318 warnings**. B3.1 baseline0/317; delta **+1 warning**, no suppression. |
| `python3 analysis/shopify-homepage-b3-2/validate.py --evidence` | **7 groups passed**: stack/scope/Horizon, exact prior component preservation, original/default section data and order, syntax/schema/tag/JSON, assets/canonical-card/native-newsletter contract, PNG bytes, JS/whitespace. |
| Top-level Liquid/schema/JSON validation | **287 Liquid files,146 schema payloads,66 JSON/JSONC resources**. Original `7df5cf9` nested-javascript rejection still detected. Literal section/snippet/asset references resolve. No section-level javascript/stylesheet tag added inside conditionals. |
| `node --check assets/bazar-home.js` and new `.mjs` modules | Passed, also covered by structural validator. |
| `node analysis/shopify-homepage-b3-2/browser-check.mjs` | **16 groups passed**, final exit0; zero browser runtime exceptions. Actual theme files/native modules execute against synthetic local data/responses. |
| `python3 analysis/shopify-homepage-b3-2/regress.py` | Fresh **B2.1:12 /B2.2:17 /B2.4:22 /B2.5:15 /B3.1:9 groups passed**, exit0. Earlier tracked JSON/screenshots restored after copying fresh results here. No separate B2.3 runtime suite exists in this stack; that phase was preview preparation. |
| Original design integrity | **33/33 byte-identical** versus B3.1 and original approved026c01b; SHA-256 evidence recorded. |
| `git diff --check` / staged whitespace / bounded diff | Passed. All prior non-homepage theme code, commerce controllers, B3.1 tokens/font/shell, configs and unrelated services remain unchanged. |

Total **91 local browser groups passed** (16 new+75 regression), plus7 structural groups. No historical pass count is presented as a new merchant test.

Tools queried/used: Nodev24.19.0, Python3.12.14, Chromium154.0.8037.57, CLI5.0.0, LiquidJS10.24.0, Playwright1.64.1, axe-core4.14.0. CLI/LiquidJS are temporary tools outside the repository; no runtime package/lockfile dependency change. Separate Theme Check engine version remains unavailable.

### Warning comparison

| Warning | B3.1 | B3.2 |
|---|---:|---:|
| ValidScopedCSSClass |173|173|
| OrphanedSnippet |138|139|
| UnusedDocParam |5|5|
| ExcessiveSettingsCount |1|1|
| **Total** |**317**|**318**|

New warning: `snippets/bazar-home-slide.liquid`, **OrphanedSnippet**. It is called literally from both hero block/fallback paths; dependency checks and actual local rendering confirm those calls. The warning is retained and reported, not suppressed or presented as server acceptance. [Theme Check summary](analysis/shopify-homepage-b3-2/theme-check-results.json).

## Browser coverage

- Empty defaults hide all customer modules and diagnostics; editor displays seven setup explanations.
- Approved module order; genuine fixture links/images/collection data; incomplete brand records skipped.
- Hero skips empty-image blocks, prioritizes first valid image, uses configured mobile source; one visible slide, no autoplay, previous/next/dots/Arrow/Home/End and status semantics. Editor block selection/reconnect checked.
- Canonical card data, exact eligible variant101, unavailable and multi-variant paths, genuine local POST/GET-confirmed feedback and422 rejection. Featured list overrides collection without another renderer; finite8-card test list.
- Rail control/keyboard scrolling and reduced motion. Scroll tests allow native scroll-snap rounding rather than assume previous movement lands at exactly0.
- Newsletter has no submission form when unready or consent missing; shown controls disabled. Ready form has native customer/email/newsletter/affirmative consent contract. Only synthetic server `posted_successfully?`/errors render corresponding messages. **No form submission or real marketing delivery/consent test occurred.**
- **320/390/768/1024/1440px**: no document horizontal overflow, corresponding2/3/4/5 visible product columns, actual mobile picture selection.
- axe WCAG2 A/AA: **zero violations** on configured mobile/desktop with ready form,320px inactive form,390px empty homepage. Native no-JS slide images/links, finite cards/product POST and ready customer form remain available; JS controls remain hidden.
- Labeled local desktop/mobile screenshots captured and inspected; compact homepage card styling and benefits alignment refined after review. No full-page measured pixel parity claimed.

**Final failed checks: none.** Initial local card test failed because the fixture's isolated Liquid render adapter omitted Shopify's global section context; fixed the adapter, not production card logic. A rail assertion initially assumed an exact zero offset after reverse scrolling; changed to verify real backward movement under scroll snap. The first template-generation helper used strict JSON on an existing commented product template and stopped before writing index; rerun with JSONC handling. Final suites were rerun after corrections/style changes.

## Blocked / not executed

Actual Shopify compiler, theme editor add/save/block/static-card context, storefront/CDN rendering, native newsletter CAPTCHA/consent/double-opt-in delivery and live product/cart/app behavior remain untested. Local LiquidJS adapts Shopify-only syntax and cannot prove Shopify server acceptance. Genuine assets, policies, destinations, merchant collection/product selections and newsletter verification are unavailable; none were created.

Actual iPhone/Safari/Android, screen-reader device testing, all third-party bundle/property/app cases, real Markets contexts and pixel-aligned approved-art comparison remain pending. No authenticated development-store access was attempted; store/theme identities are owner-supplied, not newly verified. No checkout/payment/delivery/auth or independent application tests were run because those sources are unchanged/out of scope.

See [proof README](analysis/shopify-homepage-b3-2/README.md), [source/PNG evidence](analysis/shopify-homepage-b3-2/source-evidence.json), [homepage results](analysis/shopify-homepage-b3-2/browser-results.json), five fresh regression JSON files alongside them, [comparison](PHASE_B3_2_DESIGN_COMPARISON.md), and [configuration guide](PHASE_B3_2_SHOPIFY_CONFIGURATION.md). Stop after stacked PR. Next recommended phase is separately authorized real development-theme content configuration/visual acceptance and bounded corrections.
