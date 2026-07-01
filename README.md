# BAZAR Marketplace Shopify Theme

BAZAR Marketplace is a Shopify Online Store 2.0 theme project built on Shopify Horizon. This repository starts as a clean development foundation for future BAZAR storefront work.

## Base Theme

- Platform: Shopify Online Store 2.0
- Base theme: Shopify Horizon
- Languages: Liquid, HTML, CSS, JavaScript

This foundation does not redesign Horizon, create placeholder pages, or add fake storefront content. Horizon source files should be preserved as the technical base, and BAZAR customizations should stay namespaced and modular.

## Project Structure

```text
assets/
  bazar-base.css
  bazar-components.css
  bazar-sections.css
  bazar-utilities.css
  bazar.js
  bazar-events.js
  bazar-sections.js
config/
docs/
  horizon-base.md
layout/
locales/
sections/
snippets/
  bazar-assets.liquid
  bazar-section-attributes.liquid
templates/
```

## Architecture Guidelines

- Preserve native Shopify and Horizon files. Do not replace Horizon with Dawn or another base theme.
- Keep Horizon files close to the store theme and isolate BAZAR-specific work with the `bazar-` prefix.
- Use Shopify theme folders directly. Shopify theme assets are flat, so organize assets by filename convention rather than nested asset folders.
- Keep section behavior self-contained and initialize it through `data-bazar-section` attributes.
- Place reusable Liquid fragments in `snippets/` before duplicating markup across sections.
- Add page templates only when real storefront requirements exist.
- Avoid committing merchant-specific settings, generated files, secrets, or local Shopify state.

## Development

Useful local commands after Shopify CLI is installed and the store is connected:

```sh
npm run theme:dev
npm run theme:check
npm run theme:pull
npm run theme:push
```

Before building features, pull or import the approved Horizon theme from Shopify and wire `{% render 'bazar-assets' %}` into the Horizon layout only after confirming the store theme integration point.
