# B3.2 local homepage proof

All banners, image rectangles, benefit claims, category/product/brand names, prices, destinations and HTTP/form responses here are explicitly synthetic local-only fixtures. They never become theme defaults or merchant data. The server listens on loopback; no store credentials, remote Shopify calls, uploads, newsletter requests or deployment functionality.

```sh
python3 analysis/shopify-homepage-b3-2/validate.py --evidence
node --check assets/bazar-home.js
node analysis/shopify-homepage-b3-2/browser-check.mjs
python3 analysis/shopify-homepage-b3-2/regress.py
/tmp/bazar-theme-tools/node_modules/.bin/shopify theme check --path . --output json
```

Use Node24/Python3/system Chromium and existing repository Playwright/axe. Temporary CLI5/LiquidJS tooling lives in /tmp/bazar-theme-tools. Cached public native standard-events at /tmp/b2-1-standard-events.js follows prior B2 setup; see those READMEs for fresh-environment installation/cache provenance. No package or lockfile changes.

The preview renders actual homepage sections/helpers/canonical product-card via LiquidJS, adapting Shopify form/schema/doc/style/static-block syntax and filters. Shopify section context is explicitly passed into the local isolated render adapter, mirroring Shopify's global section drop. Actual new carousel/rail JS, existing product-card/catalog quick-add/cart-icon and native event modules execute. Synthetic cart add/refresh responses test the existing contract, not Shopify integration. Newsletter success/error examples are local server form-state fixtures only; no newsletter submission is made.

Browser coverage includes empty/editor states, ordered configured modules, skipped empty slides, mobile source, no autoplay, keyboard/dots/Escape-independent controls, editor block selection/reconnect, canonical cards/variants/cart success and rejection, featured-product override, rail scrolling, newsletter gates/response states, five widths, axe and no-JS fallbacks. Screenshots disclose simulation and retain missing-art limitations rather than fabricate actual BAZAR merchandise.

`regress.py` backs up all earlier suites' tracked browser JSON/screenshots, runs B2.1/B2.2/B2.4/B2.5 plus B3.1 and captures fresh result JSON here, then restores historical bytes even on failure. No earlier branch-pinned source assertion was weakened. The new validator pins this stack, verifies all previous non-home theme files, native disabled section data, source schemas/JSON/tag/asset contracts and 33 original PNG bytes.

No local proof establishes actual merchant rendering, editor saving, real collection/product app behavior, email-marketing consent/DOI delivery, font/CDN behavior on Shopify or pixel parity. Root PHASE_B3_2 reports and configuration guide define the next separately approved acceptance gate.
