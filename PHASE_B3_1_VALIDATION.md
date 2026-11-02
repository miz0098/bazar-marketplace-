# B3.1 — Validation

All results are **local source/fixture tests**. No Shopify merchant authentication, store request, theme upload, editor save, publication, customer/order/payment or settings operation was performed. Store and theme IDs are owner-provided context only. B3's earlier password-gate observation is historical, not a new authenticated test.

## Executed commands and final results

| Command/check | Result |
|---|---|
| `git fetch origin codex/shopify-visual-restoration-b3:refs/remotes/origin/codex/shopify-visual-restoration-b3` | Verified base `bc33fb543fb817e64d8fdb0a78efa87b02859e63`; task branch created directly from it, no merge/rebase. |
| `/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json` | **0 errors / 317 warnings**, exit0, valid true; unchanged from B2.5/B3 baseline. No suppressions/config changes. |
| `python3 analysis/shopify-visual-b3-1/validate.py --evidence` | **7 groups passed**: stack/scope/Horizon4.1.1, exact commerce source preservation, native settings preservation, syntax/schema/JSON/tag guards, tokens/font asset/license, original PNG bytes, JS/whitespace. |
| Top-level Liquid/schema/JSON checks within validator | **281 Liquid files /141 section-block schema payloads /66 JSON/JSONC resources passed**. Historical `7df5cf9` nested-javascript rejection still detected. New section code is not introduced. |
| `node analysis/shopify-visual-b3-1/browser-check.mjs` | **9 groups passed**, zero browser runtime exceptions. Actual theme markup/styles and local native shell modules with synthetic data. |
| `python3 analysis/shopify-visual-b3-1/regress.py` | Fresh **B2.1:12 / B2.2:17 / B2.4:22 / B2.5:15 groups passed**, exit0. Includes catalog/PDP add, cart quantity/removal/uncertainty, native event/counter/drawer contracts. Historical test artifacts restored byte-for-byte. |
| JS parsing | New browser/preview `.mjs` files parse through validator; `node --check assets/bazar-header.js` passed. **Every runtime JS file remains byte-identical** to B3 base. |
| PNG comparison | **33/33 byte-identical**, SHA-256 recorded versus B3 base and approved reference commit026c01b. No normalization/re-encoding. |
| `git diff --check` / staged whitespace | Passed. Scoped diff excludes unrelated applications/production settings. |

Theme Check warnings remain **173 ValidScopedCSSClass +138 OrphanedSnippet +5 UnusedDocParam +1 ExcessiveSettingsCount =317**, delta0. Existing warnings remain visible. See [summary](analysis/shopify-visual-b3-1/theme-check-results.json).

Tooling: Nodev24.19.0, Python3.12.14, Shopify CLI5.0.0, Chromium154.0.8037.57; existing LiquidJS10.24.0, Playwright1.64.1, axe-core4.14.0. No new runtime dependency or package/lockfile change. CLI engine's separate Theme Check version is unavailable; not fabricated.

## New local visual/accessibility evidence

- Actual bundled font response **HTTP200 on loopback**, decoded/loaded by Chromium; `document.fonts.ready` and FontFaceSet checks for **400/500/600/700** with Ukrainian sample. Computed BAZAR/heading family uses `Bazar Inter`, the CSS alias for the official Inter binary. No remote font dependency. FontTools cmap inspection was blocked by absent Brotli decoder, so no separate binary-glyph audit is claimed.
- Primary computed color **rgb(0,62,255)** despite simulated dark native button variables; exact normal/hover/active tokens checked. Existing outline actions use blue ink/border; no native Horizon variable was overwritten.
- Requested **320/390/768/1024/1280/1440px**: no horizontal document overflow, search width ≥160px, action hit areas ≥44×44px, measured containers1380 at1440 /1140 at1280 /720 at768.
- At every width, actual empty-cart Liquid renders against a deliberately hostile native96px/monospace/uppercase H2 rule: **20px/28px mobile,24px/32px tablet/desktop**, Inter, normal case and no overflow.
- Native disclosure keyboard Enter/Escape/focus return/outside click; actual GET search/cart destinations; unconfigured favorites/profile remain inert without technical text. Configured/unconfigured footer links and exact platform list checked.
- axe WCAG2 A/AA: **zero violations** on local configured shell at390/1440 and empty cart at320/390. Visible focus and reduced-motion emulation checked. This is not real-device/screen-reader certification.
- Local desktop/mobile/empty screenshots inspected against approved composition anatomy. Blue-region raster samples are recorded separately. No full-page pixel diff or numerical similarity score is claimed.

**Final failed checks: none.** During authoring, one source-preservation assertion incorrectly appended an extra newline when comparing the editor-paragraph change; corrected to exact original-byte comparison. Earlier synthetic empty screenshot used the shell fixture's old cart count while the main body was empty; fixture context was corrected before final screenshot/test runs. No production cart state change was involved. Tests were rerun after final styling changes.

## Blocked and deferred

Real Shopify Liquid compilation/editor compatibility, merchant CDN asset/cache behavior, real product/cart content and saved theme settings remain untested. No assumption about activated Plus or deployed revision. Actual Safari/iOS/Android, screen readers, full native drawer focus/visual acceptance, company/legal/social/app destination verification and exact official artwork remain pending.

Local LiquidJS strips/adapts Shopify-only doc/schema/style/form syntax; it cannot prove server acceptance. Prior regression fixtures exercise genuine native JS with local responses; they do not certify live cart/filter/variant/checkout operations. No unrelated backend/full-app tests were run because those sources remain unchanged.

Configuration needed later: real navigation/three footer menus, four social URLs, app-specific store URLs, legal destinations and actual enabled Markets/languages. Approved fixed typography/palette/container now require no provisional-picker selection. Dedicated search category selector/predictive UI, missing artwork and remaining page compositions require later scoped work. Recommend separately approved development-theme visual acceptance and the next homepage restoration slice. **No upload/deployment/merge or next phase starts here.**

Evidence: [README](analysis/shopify-visual-b3-1/README.md), [source/PNG/font/token evidence](analysis/shopify-visual-b3-1/source-evidence.json), [new browser checks/measurements](analysis/shopify-visual-b3-1/browser-results.json), four fresh regression JSON files alongside them, and [design comparison](PHASE_B3_1_DESIGN_COMPARISON.md).
