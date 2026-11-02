# B2.4 local product-page contracts

These are development-only analysis artifacts, not storefront dependencies. Synthetic product/options/prices/media/claims/API responses are prominently labeled, remain in this directory and never enter theme defaults. All requests stay on loopback; there are no Shopify credentials or merchant mutations.

## Reproduce

Use Python 3, Node 24, system Chromium and existing repository Playwright/axe tooling. Shopify CLI 5.0.0 and LiquidJS 10.24.0 are installed outside the repository under `/tmp/bazar-theme-tools`; optional `BAZAR_TOOL_ROOT`/`BAZAR_CHROMIUM` select equivalent local tooling. The cached native public standard-events module at `/tmp/b2-1-standard-events.js` is reused from prior phases; evidence records its hash. If reproducing in a new environment, use the public-module fetch/tool installation instructions in the B2.2 analysis README and review the CDN hash if it changes.

From this task branch:

```sh
/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json
python3 analysis/shopify-product-b2-4/validate.py
python3 analysis/shopify-catalog-b2-2/check_section_tags.py
node --check assets/bazar-pdp.js
node --check assets/product-form.js
node analysis/shopify-product-b2-4/browser-check.mjs
```

`preview.mjs` uses actual theme files through LiquidJS, with explicit adaptations for Shopify doc/schema/style/form/filter and static-block syntax. It executes actual native variant-picker/product-form/quantity/media/recommendation/cart-icon code and BAZAR code, not replacement component mocks. The local HTTP server provides synthetic option-value HTML, cart JSON and recommendation HTML to test their contracts. This is not Shopify's server/compiler/editor or live service acceptance. Public provider video playback and exact CDN fonts are not certified.

`browser-check.mjs` writes its own result/screenshots and closes the ephemeral loopback server/browser. Desktop/mobile screenshots visibly disclose simulated content. `validate.py` is read-only: pins the stacked base/scope, verifies exact preservation of the original disabled section data and existing pages, checks the narrow native rejection catch, schemas/JSONC/dependencies, all Liquid directive nesting, JS and 33 PNG hashes. It does not weaken the prior validator's branch assertion or overwrite historical evidence.

The old B2.1 and B2.2 browser suites were also rerun. Their generated files were backed up, their fresh result JSON copied here, and their original tracked artifacts restored. Captured 12/17-group passes are new **local** regression evidence, not historical merchant results. Application/backend tests were not rerun because those services remain unchanged.

No script uploads/deploys/publishes, changes merchant settings, creates orders or authenticates customers. See the [implementation report](../../PHASE_B2_4_IMPLEMENTATION_REPORT.md), [design comparison](../../PHASE_B2_4_DESIGN_COMPARISON.md) and [validation report](../../PHASE_B2_4_VALIDATION.md). Stop at the B2.4 stacked PR.
