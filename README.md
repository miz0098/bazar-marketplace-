# BAZAR Marketplace Shopify Theme

BAZAR Marketplace is a Shopify Online Store 2.0 theme project built on Dawn. This repository starts as a clean development foundation for future BAZAR storefront work.

## Base Theme

- Platform: Shopify Online Store 2.0
- Base theme target: Dawn 15.5.0, latest stable release checked on 2026-07-01
- Languages: Liquid, HTML, CSS, JavaScript

This foundation does not redesign Dawn, create placeholder pages, or add fake storefront content. Dawn source files should be introduced intentionally before feature work begins, then BAZAR customizations should stay namespaced and modular.

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
layout/
locales/
sections/
snippets/
  bazar-assets.liquid
  bazar-section-attributes.liquid
templates/
```

## Architecture Guidelines

- Keep Dawn files close to upstream and isolate BAZAR-specific work with the `bazar-` prefix.
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

Before building features, import the approved Dawn version and wire `{% render 'bazar-assets' %}` into the Dawn layout so BAZAR assets load consistently.
