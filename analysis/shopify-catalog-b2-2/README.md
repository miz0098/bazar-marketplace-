# B2.2 local proof artifacts

These files are development-only. They are not loaded by Shopify Liquid or included as storefront runtime dependencies. No store credentials are read. Synthetic products, prices, menus, images and responses exist only here, are prominently labeled, and never enter theme defaults.

## Reproduce

Use Node 24, Python 3, system Chromium and the existing repository Playwright/axe packages under `tests/e2e/node_modules`. Install the same temporary tool versions outside the repository if needed:

```sh
npm install --prefix /tmp/bazar-theme-tools --no-audit --no-fund @shopify/cli@5.0.0 liquidjs@10.24.0
```

The native public event module is cached at `/tmp/b2-1-standard-events.js` in this environment. On a new environment fetch it read-only and compare its hash with evidence (the CDN may change):

```sh
python3 - <<'PY'
import urllib.request
with urllib.request.urlopen('https://cdn.shopify.com/storefront/standard-events.js', timeout=20) as response:
    data = response.read()
with open('/tmp/b2-1-standard-events.js', 'wb') as output:
    output.write(data)
PY
```

Then run from the task branch root:

```sh
/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json
python3 analysis/shopify-catalog-b2-2/validate.py
node --check assets/bazar-catalog.js
node --check analysis/shopify-catalog-b2-2/preview.mjs
node --check analysis/shopify-catalog-b2-2/browser-check.mjs
node analysis/shopify-catalog-b2-2/browser-check.mjs
```

Optional `BAZAR_TOOL_ROOT` selects temporary tooling; `BAZAR_CHROMIUM` selects the system browser. The server binds to `127.0.0.1` on an ephemeral port, and browser tests close it. All Ajax requests stay on loopback. The only mutating handler increments a synthetic in-memory cart; it has no merchant/API/provider access. No external product search, SMS or payment occurs.

`preview.mjs` renders actual collection/index/card/header/footer Liquid files via LiquidJS. It strips/adapts Shopify-only schema/doc/style/form/paginate/OS2 block syntax, supplies explicit fixture objects and returns a local fake Cart API response **only for contract tests**. It executes native Horizon product-card/cart-icon modules and dependencies plus BAZAR code. This is not Shopify's renderer/editor or proof of native service evaluation. Pagination objects/URLs and available filter/sort data are supplied, not obtained from a merchant.

`browser-check.mjs` writes only its own results/screenshots. Browser results contain pass group names; screenshots visibly label test data and fallback fonts. They are not production previews or approved visual matches. `validate.py` is read-only and checks source scope, preservation, schemas/references, bounded contracts, JS, image hashes and whitespace.

`b2-1-regression-results.json` captures an actual rerun of the existing twelve-group suite. Its old generated artifacts were restored from `75db8b8` afterward, preserving prior evidence bytes; its commands/results are recorded in the main validation report. Machine evidence records final tool/check summaries, theme-file hashes, source refs and all 33 original PNG hashes. No previous-phase success is counted as a newly executed service integration.

See [implementation report](../../PHASE_B2_2_IMPLEMENTATION_REPORT.md), [design comparison](../../PHASE_B2_2_DESIGN_COMPARISON.md) and [validation report](../../PHASE_B2_2_VALIDATION.md). B2.2 stops at the stacked PR; no deployment or next-phase authorization is implied.
