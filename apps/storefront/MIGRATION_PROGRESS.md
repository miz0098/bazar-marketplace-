# Storefront migration progress

## Phase A foundation

- [x] Next.js App Router and strict TypeScript foundation under `apps/storefront`
- [x] Responsive BAZAR header, navigation, footer, homepage shell, and 404 page
- [x] Typed service boundary with deterministic demo fixtures and no Shopify runtime dependency

## Phase B catalog, search, product and cart

- [x] Category and subcategory navigation with responsive catalog menu and keyboard dismissal
- [x] Catalog filtering, sorting, URL query state, pagination, quick add, loading, error, and empty states
- [x] Ukrainian fixture search, suggestions, integrated filters/sorting, clearing, and no-results state
- [x] Product routes with approved gallery, price, stock status, specifications, reviews UI, quantity, and add-to-cart
- [x] Demo cart with validated quantities, totals, removal, empty state, and browser refresh persistence
- [x] Automated catalog/search/sort/cart tests

All catalog, availability, reviews, and cart data remain deterministic demo data. Cart persistence uses local browser storage and does not reserve inventory, create orders, or initiate payment.

## Source mapping

| Standalone file | Shopify reference at `105d10f` |
| --- | --- |
| `app/globals.css` | `assets/bazar-global.css`, `assets/bazar-home.css`, `assets/bazar-header.css`, `assets/bazar-footer.css`, `assets/bazar-collection.css`, `assets/bazar-product.css` |
| `components/layout/site-header.tsx` | `sections/header.liquid`, `snippets/bazar-header-desktop.liquid`, `snippets/bazar-header-actions.liquid`, `snippets/bazar-catalog-menu.liquid` |
| `app/catalog/page.tsx` | `sections/bazar-main-collection.liquid`, `snippets/bazar-product-card.liquid` |
| `components/search/search-box.tsx`, `app/search/page.tsx` | `snippets/bazar-header-actions.liquid`, Shopify search patterns adapted to local fixtures |
| `components/product/product-card.tsx` | `snippets/bazar-product-card.liquid` |
| `components/product/product-detail.tsx`, `app/products/[handle]/page.tsx` | `sections/bazar-main-product.liquid`, `assets/bazar-product.css` |
| `components/cart/*`, `domain/cart/cart.ts` | approved cart interactions reimplemented without Shopify cart endpoints |
| `fixtures/catalog.ts`, `services/mock/catalog-service.ts` | isolated deterministic replacements for Shopify product and collection records |

## Pending

- [ ] Live catalog API, inventory, pricing, media, and seller data
- [ ] Authentication, profile, orders, wishlist, and messages
- [ ] Discounts, checkout, payments, SMS, shipping-provider integration, and order creation
- [ ] PostgreSQL/backend integration, merchant settings/content export, analytics, and complete SEO redirect parity
- [ ] Production accessibility and visual-regression baselines against every approved screen

Demo behavior must not be represented as live commerce or account functionality.
