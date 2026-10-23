# Phase 1 migration progress

## Completed in this increment

- [x] Next.js App Router and strict TypeScript foundation under `apps/storefront`
- [x] Responsive BAZAR header, catalog navigation, search form, footer, and 404 page
- [x] Homepage shell with hero, categories, product rails, and promo cards
- [x] Typed catalog/content interfaces, deterministic mock fixtures, and server-only adapter selection
- [x] macOS/local setup, environment example, lint, typecheck, and build scripts

## Source mapping

| Standalone file | Shopify reference at `105d10f` |
| --- | --- |
| `app/globals.css` | `assets/bazar-global.css`, `assets/bazar-home.css`, `assets/bazar-header.css`, `assets/bazar-footer.css` |
| `components/brand/logo.tsx` | `assets/bazar-logo.svg`, `snippets/bazar-logo.liquid` |
| `components/layout/site-header.tsx` | `sections/header.liquid`, `snippets/bazar-header-desktop.liquid`, `snippets/bazar-header-actions.liquid`, `snippets/bazar-catalog-menu.liquid` |
| `components/layout/site-footer.tsx` | `sections/bazar-footer.liquid` |
| `components/home/hero.tsx` | `sections/bazar-home-hero.liquid`, `assets/bazar-home-hero.js` |
| `app/page.tsx` | `templates/index.json`, category/product/promo BAZAR sections |
| `components/product/product-card.tsx` | `snippets/bazar-product-card.liquid` |
| `fixtures/home.ts` | approved Ukrainian defaults in `templates/index.json`; product records are explicitly mock-only |

## Not migrated

- [ ] Live catalog/search, product detail, filters, sorting, and pagination
- [ ] Authentication, profile, orders, wishlist, and messages
- [ ] Cart, discounts, checkout, payments, SMS, and backend integration
- [ ] Merchant settings/content export, live media, analytics, SEO redirect parity, and visual regression baselines

Mock data is not live behavior and must not be used to imply successful commerce or account actions.
