# Horizon Base Theme

BAZAR Marketplace uses Shopify Horizon as the base theme. Horizon is the technical foundation for layouts, theme settings, native sections, blocks, accessibility behavior, and Shopify editor compatibility.

## Current Repository Analysis

The current local checkout contains the BAZAR customization foundation only. No native Horizon source files are present in this repository yet.

Existing foundation files are limited to:

- BAZAR namespaced assets in `assets/bazar-*.css` and `assets/bazar*.js`
- BAZAR reusable snippets in `snippets/bazar-*.liquid`
- Standard Shopify theme folders with `.gitkeep` markers
- Development metadata and documentation

## Preservation Rules

- Do not replace Horizon with Dawn or any other starter theme.
- Do not remove native Shopify or Horizon files after they are pulled into the repository.
- Keep Horizon files as close to the store theme as practical.
- Add BAZAR custom code with the `bazar-` prefix.
- Avoid page templates, sections, settings, or content until there is a real BAZAR requirement.

## Customization Layer

BAZAR code should live beside Horizon as a small, explicit layer:

- `assets/bazar-base.css` for BAZAR tokens and global integration rules
- `assets/bazar-components.css` for reusable BAZAR component styles
- `assets/bazar-sections.css` for BAZAR section-level styles
- `assets/bazar-utilities.css` for shared utilities
- `assets/bazar.js` for the BAZAR namespace
- `assets/bazar-events.js` for shared event names
- `assets/bazar-sections.js` for section lifecycle helpers
- `snippets/bazar-assets.liquid` for loading BAZAR assets from Horizon
- `snippets/bazar-section-attributes.liquid` for consistent section data attributes

## Next Step Before Feature Work

Pull the approved Horizon theme from Shopify into this repository, then review the native structure before wiring in BAZAR assets. Integration should be limited to the smallest necessary layout or section changes.
