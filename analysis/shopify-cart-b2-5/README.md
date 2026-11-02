# B2.5 local cart contracts

Development-only fixtures and evidence. Synthetic cart products, options, prices, discount allocations, availability and HTTP responses are confined here; theme defaults never reference them. The server listens on loopback, uses no merchant credentials and implements no deployment/upload functionality.

Tooling: Python 3, Node 24, system Chromium, existing `tests/e2e/node_modules` Playwright/axe, temporary Shopify CLI and LiquidJS in `/tmp/bazar-theme-tools`. Public native `@shopify/events` is served from the previously cached `/tmp/b2-1-standard-events.js`; see the B2.2 analysis README for tool/cache setup in a fresh environment. No package or lockfile changes.

```sh
/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json
python3 analysis/shopify-cart-b2-5/validate.py --evidence
python3 analysis/shopify-catalog-b2-2/check_section_tags.py
node --check assets/component-cart-items.js
node analysis/shopify-cart-b2-5/browser-check.mjs
python3 analysis/shopify-cart-b2-5/regress.py
```

The fixture renders **actual** `bazar-main-cart` and native `quantity-selector` Liquid through LiquidJS. Shopify-only schema/doc/style/filter syntax is adapted, not server-certified. Actual native cart-items, quantity, section renderer/morph, cart-icon and standard-event modules execute against simulated Ajax/section responses. A hidden minimal drawer hydration target tests cross-surface native controller events; full native drawer dialog/layout/focus is not simulated as merchant acceptance. Browser tests cover authoritative totals, line keys, quantity, confirmation timing, error/uncertain recovery, variant availability, no-JS fallbacks, responsive overflow, keyboard focus, axe and empty cart. No real checkout submit or discount application occurs.

`regress.py` backs up the earlier suites' result/screenshots, runs B2.1/B2.2/B2.4 browser suites and captures fresh JSON here, then restores historical bytes even on failure. Earlier branch-pinned structural validators are deliberately **not weakened** to pass B2.5. The new read-only validator verifies B2.4 ancestry/scope, legacy template configuration, prior components, native row attribute, dependency/schema/JSON/tag/JS contracts and all PNG bytes. The original `7df5cf9` nested-JavaScript failure must still be detected.

Screenshots visibly disclose local simulation. Reports distinguish these local checks from blocked real Shopify compiler/editor/cart/checkout acceptance. See the three root `PHASE_B2_5_*` reports. No credentials, real customer data or Shopify theme upload package is included.
