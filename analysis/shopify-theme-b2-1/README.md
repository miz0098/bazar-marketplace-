# B2.1 local validation artifacts

These tools are **not** storefront runtime dependencies. They are not loaded by Liquid, do not touch merchant accounts and do not change production configuration. The storefront itself adds only scoped CSS, one dependency-free disclosure module, Liquid snippets/sections and theme settings.

## Reproduce in a development environment

Node 24, Python 3, Chromium and the repository's existing Playwright/axe development tooling are required. Optional `BAZAR_TOOL_ROOT` and `BAZAR_CHROMIUM` choose temporary tooling/system-browser paths; no credential variables are read.

Install local tooling outside the repository (this exact package installation was performed):

```sh
npm install --prefix /tmp/bazar-theme-tools --no-audit --no-fund @shopify/cli@5.0.0 liquidjs@10.24.0
```

Fetch the **public native runtime module** used by Horizon into temporary test storage; this does not call a merchant API:

```sh
python - <<'PY'
import urllib.request
with urllib.request.urlopen('https://cdn.shopify.com/storefront/standard-events.js', timeout=20) as r:
    data = r.read()
with open('/tmp/b2-1-standard-events.js', 'wb') as f:
    f.write(data)
PY
```

Run:

```sh
/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json
python analysis/shopify-theme-b2-1/validate.py
node --check assets/bazar-header.js
node --check analysis/shopify-theme-b2-1/preview.mjs
node --check analysis/shopify-theme-b2-1/browser-check.mjs
node analysis/shopify-theme-b2-1/browser-check.mjs
```

`preview.mjs` serves actual BAZAR Liquid snippets/sections through LiquidJS, with Shopify-only schema/doc tags stripped and selected Shopify filters/forms supplied locally. It includes native `base.css`, the native header stylesheet, native header/cart/drawer component scripts and a locally cached public standard-events module. It is **not Shopify's Liquid renderer or theme editor**. Native CSS variables and sample menu/collection/cart objects are explicit local fixtures. Fonts use system fallback; there is no authenticated customer or real cart.

The local server binds only to `127.0.0.1` with an ephemeral port and closes after browser checks. It has no mutation endpoint or store credentials. `?editor=1` exposes setup messages; `?configured=1` supplies explicitly named test media/destination paths; `?drawer=1` exercises native drawer delegation against a simplified dialog shell. None of that fixture content enters the theme JSON defaults or original references.

Browser results and two screenshots are checked in for review. Screenshots carry a conspicuous local-fixture notice and are not a visual-regression/merchant-preview pass. `browser-check.mjs` rewrites only its own result/screenshot artifacts. The public event-module hash in evidence identifies the version actually exercised; a future fetch may change and must be reviewed.

`validate.py` is read-only. It checks Horizon metadata/settings, schemas/template/group references, new asset/snippet dependencies, isolation from demo auth, original disabled-section data preservation, protected paths, all 33 original-image bytes, branch ancestry, JS syntax and whitespace. It prints hashes without modifying images. Evidence records the final run, baseline/final Theme Check warning counts and source provenance.

No SMS, customer login, payment/order/refund, carrier lookup/quote/tracking, merchant setting, database, DNS, theme upload or deployment is tested or performed here. See [validation report](../../PHASE_B2_1_VALIDATION.md) for actual passes and blockers.
