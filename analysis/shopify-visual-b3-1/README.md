# B3.1 local shared visual proof

All fixture media, menus, footer destinations and cart values are synthetic, analysis-only and prominently labeled. Production files never reference these records. No merchant credentials, store calls, upload/deployment or configuration mutation.

```sh
python3 analysis/shopify-visual-b3-1/validate.py --evidence
node analysis/shopify-visual-b3-1/browser-check.mjs
python3 analysis/shopify-visual-b3-1/regress.py
/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json
```

Tool setup follows earlier B2 analysis READMEs: Node24/Python3/system Chromium, existing Playwright/axe under tests/e2e, temporary CLI5/LiquidJS under /tmp/bazar-theme-tools and cached public native standard-events under /tmp/b2-1-standard-events.js. No runtime package was added. The local preview adapts B2.1's LiquidJS shell with real theme snippets/styles and a hostile native H2 fallback; it serves the actual new WOFF2 as font/woff2. Browser checks load real native shell/controller modules, verify font response/FontFaceSet weights, computed colors/geometry/empty typography, keyboard/disclosure, inert links, six viewport widths and axe.

`regress.py` runs all four existing B2 browser suites, captures their fresh JSON here, and restores their historical tracked result/screenshots even on failure. Earlier branch-pinned structural validators are not weakened. The new read-only validator checks this stack, exact preservation of all JS/templates/sections/blocks/layouts, native settings groups, schemas/JSON/tag nesting and 33 original PNG bytes. Font binary/source/license hashes and exact tokens are in source-evidence.json. Color observations record read-only primary-button raster sampling, not pixel-parity scores.

Screenshots have local fixture labels. Real Shopify compiler/editor/CDN rendering, merchant data/settings, actual drawer acceptance, iOS/Safari and original SVG/badge/empty art remain unavailable or outside authorization. See the root three PHASE_B3_1 reports for evidence boundaries and remaining work.
