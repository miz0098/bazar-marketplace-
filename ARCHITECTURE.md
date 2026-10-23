# BAZAR Storefront Architecture

## Purpose and constraints

The target is a standalone Next.js App Router storefront, initially isolated under `apps/storefront`, while the existing Shopify Horizon theme remains untouched and runnable. This document defines boundaries; it does not assert that `api.bazar.ua`, authentication, payments, SMS, wishlist, or messaging integrations already exist.

The architecture must preserve the approved Ukrainian BAZAR experience, responsive behavior, accessibility, URLs/SEO where applicable, and an explicit path from deterministic mocks to live services. Shopify remains the observed current implementation and parity reference until product and backend owners approve replacements.

## Current architecture (verified)

```text
Shopify request and store configuration
        |
        v
Liquid layouts + JSON templates + section/block schema
        |
        +--> Shopify objects/filters/forms/routes
        +--> generated CSS variables + assets/base.css
        +--> Horizon web components and ES modules
        |
        v
Browser
  |-- Shopify cart/search/recommendation/section endpoints
  |-- Shopify CDN @shopify/events
  |-- <shopify-account> (identity/profile/orders UI)
  |-- <shopify-chat> (Shopify Inbox support chat, if installed)
  `-- Shopify-hosted checkout / accelerated checkout
```

`layout/theme.liquid` composes the header group, content, footer group, chat, cart drawer, search modal, and quick-add modal. `snippets/scripts.liquid` defines the import map and global `Theme.routes`. JSON templates select sections/blocks, while Liquid renders Shopify data and inline/asset CSS and JavaScript. The browser modules frequently request Shopify HTML fragments and morph them into the page rather than consuming a repository-defined JSON API.

This coupling means Liquid components are migration specifications, not directly portable React components.

## Target architecture

```text
Browser
  |
  v
Next.js App Router (`apps/storefront`)
  |-- server-rendered routes and metadata
  |-- client interaction islands
  |-- route handlers / server actions only where justified
  |-- shared UI and Ukrainian localization
  |
  v
Typed domain service interfaces
  |-------------------------|
  v                         v
Mock adapters          HTTP adapters
(fixtures, dev/test)    (`api.bazar.ua`, contract pending)
                            |
                            +--> identity/customer/orders
                            +--> catalog/search/recommendations
                            +--> wishlist/messages
                            `--> cart/checkout handoff
```

The UI imports domain services, never mock fixtures or raw HTTP clients. Server-only adapter selection chooses mock or HTTP implementations from validated environment configuration. The browser must not receive private backend credentials.

## Proposed repository structure

```text
apps/
  storefront/
    app/
      [locale]/
        (shop)/
          page.tsx
          catalog/page.tsx
          collections/[handle]/page.tsx
          products/[handle]/page.tsx
          search/page.tsx
          cart/page.tsx
        (account)/
          sign-in/page.tsx
          profile/page.tsx
          orders/page.tsx
          orders/[id]/page.tsx
          wishlist/page.tsx
          messages/page.tsx
          messages/[conversationId]/page.tsx
        layout.tsx
        loading.tsx
        not-found.tsx
        error.tsx
      api/health/route.ts
      globals.css
    components/
      layout/
      navigation/
      catalog/
      product/
      cart/
      account/
      messages/
      feedback/
    domain/
      catalog/
      identity/
      customer/
      orders/
      wishlist/
      messaging/
      cart/
      checkout/
    services/
      contracts/
      mock/
      http/
      service-provider.server.ts
    fixtures/
    i18n/
      uk/
    lib/
      env.server.ts
      http.server.ts
      money.ts
      logging.server.ts
    styles/
      tokens.css
    tests/
      contract/
      browser/
```

Route names are proposals and must be reconciled with the approved URL/redirect inventory. Route groups do not affect public URLs. Dynamic data should be server-rendered by default; add `'use client'` at the smallest interactive boundary (drawers, filters, variant picker, quantity controls, wishlist button, and message composer).

## Domain contracts

Define small interfaces around user outcomes rather than mirroring Shopify Liquid objects or an unapproved backend payload.

```ts
type Money = Readonly<{ amountMinor: number; currency: string }>;

interface CatalogService {
  listProducts(input: ProductQuery): Promise<Page<ProductSummary>>;
  getProduct(handle: string): Promise<Product | null>;
  search(input: SearchQuery): Promise<SearchResult>;
  getRecommendations(productId: string): Promise<ProductSummary[]>;
}

interface CartService {
  getCart(): Promise<Cart>;
  addLine(input: AddCartLine): Promise<CartMutationResult>;
  updateLine(input: UpdateCartLine): Promise<CartMutationResult>;
  removeLine(lineId: string): Promise<CartMutationResult>;
}

interface CheckoutService {
  createHandoff(cartId: string): Promise<{ url: string }>;
}
```

Equivalent focused interfaces should cover `IdentityService`, `CustomerService`, `OrderService`, `WishlistService`, and `MessagingService`. Contract types must represent loading-independent data, stable IDs, pagination cursors, localized content, explicit availability, error codes, and timestamps with documented timezone semantics.

Validate external responses at the HTTP boundary (for example with JSON Schema or a selected runtime schema library), then map transport DTOs to domain types. Do not let backend response shapes leak into components. Use integer minor units or an approved decimal representation for money—never binary floating-point arithmetic.

## Mock-to-live boundary

- `services/contracts/` owns interfaces and transport-independent types.
- `services/mock/` implements them from immutable, deterministic fixtures covering normal, empty, error, unauthorized, sold-out, and pagination states.
- `services/http/` implements the same interfaces against the approved API contract and maps validated DTOs into domain models.
- `service-provider.server.ts` selects an adapter from a server-only, allow-listed environment value such as `STOREFRONT_DATA_SOURCE=mock|http`. Production must fail closed if configured for mocks.
- Components and route modules receive or import only contract-facing services. Tests run the same behavioral suite against mock and HTTP contract fixtures.
- A visible development indicator and structured log field identify mock mode. No mock response may be presented as a completed payment, sent message, placed order, or other live side effect.

## Rendering, caching, and state

- Render catalog/product/content reads on the server for SEO and fast first paint. Cache policy and revalidation tags must follow backend freshness guarantees; until those guarantees exist, prefer correctness over long shared caches.
- Encode catalog filter, sort, query, and page/cursor state in the URL. This preserves shareability, back/forward navigation, and server rendering.
- Keep ephemeral UI state local. Do not introduce a global client state library unless cross-route requirements demonstrate a need.
- Treat cart and session identity as server-backed state. Mutation responses are authoritative; optimistic updates must roll back and announce failures accessibly.
- Use framework image/font support only after allowed image origins, transformation ownership, cache headers, and licensing are confirmed.

## Identity, privacy, and security

- Prefer a backend-for-frontend session using secure, `HttpOnly`, `SameSite` cookies. The exact OAuth/OIDC/session flow is blocked on the API contract and threat model.
- Enforce authorization in the backend and again at server route boundaries; hiding UI is not access control.
- Apply CSRF protection to cookie-authenticated mutations, validate redirect URLs, rate-limit sensitive actions, and define CORS narrowly.
- Parse and validate environment variables at startup. Commit only a redacted `.env.example`; never expose server tokens via `NEXT_PUBLIC_*`.
- Redact tokens, message content, addresses, phone numbers, and other personal data from logs. Define retention and deletion requirements before customer messaging is implemented.
- Keep payment and SMS handling outside this storefront unless separately designed and approved. Checkout should initially be an opaque, allow-listed HTTPS handoff URL from `CheckoutService`.

## Localization and accessibility

Ukrainian is a required product surface but is not available in the current theme repository. Store copy in reviewed Ukrainian message catalogs, use locale-aware pluralization/number/date/money formatting, and define fallback behavior explicitly. Do not treat Russian copy as Ukrainian source material.

Preserve the theme's verified accessibility patterns: semantic landmarks, skip links, logical headings, visible focus, focus trapping and return, keyboard-operable menus/dialogs/galleries, status live regions, reduced motion, descriptive media alternatives, zoom/reflow, and minimum touch targets. Automated checks supplement, not replace, keyboard and screen-reader review.

## Mapping from Shopify to target components

| Shopify source | Target responsibility | Migration note |
| --- | --- | --- |
| `layout/theme.liquid`, header/footer groups | root locale layout and layout components | Resolve merchant settings and navigation before visual sign-off. |
| `sections/header.liquid`, header snippets/assets | `navigation/` and `layout/` | Preserve desktop overflow behavior, mobile drawer, search, account, and cart states. |
| `sections/main-collection.liquid`, `blocks/filters.liquid` | catalog route/grid/filter controls | Replace Liquid pagination and section HTML fetches with typed queries and URL state. |
| product card blocks/snippets/assets | catalog product-card components | Start here because catalog, search, recommendations, and related products reuse it. |
| product template/information/media/buy blocks | product route and components | Replace Shopify product/variant objects, media filters, and HTML hydration with domain models. |
| search sections/snippets/assets | search route/dialog | Replace predictive-search HTML endpoint; define query, grouping, and debounce/cancellation behavior. |
| cart template/snippets/assets | cart page/drawer and `CartService` | Preserve live announcements and reconciliation; backend decides totals and availability. |
| `<shopify-account>` | account routes and identity/customer/order services | Existing inner UI is not owned locally; require approved designs and contract. |
| `<shopify-chat>` | messaging domain only if marketplace scope is confirmed | Do not equate Shopify Inbox support chat with buyer/seller messaging. |
| Shopify checkout controls | `CheckoutService` handoff | Keep payment outside the app until separately approved. |
| settings schema, Liquid CSS variables, `base.css` | reviewed design tokens and component styles | Merchant setting values are missing; capture them before extraction. |

## Error and observability model

Normalize expected service failures into domain errors such as unauthenticated, forbidden, not found, validation, conflict/stale inventory, rate limited, and temporarily unavailable. Routes must provide localized recovery paths; unexpected exceptions go to the route error boundary with a correlation ID, not raw details.

Emit structured server logs with request/correlation ID, route, service operation, duration, outcome, and cache status. Add health/readiness checks that distinguish process health from required dependency availability. Metrics and alerts should cover latency, error rate, checkout-handoff failure, sign-in failure, and API contract violations without recording personal payloads.

## Architectural acceptance gates

1. Shopify sources remain byte-for-byte present except separately reviewed documentation/configuration changes.
2. Every screen declares whether it uses mock or live data; production cannot start in mock mode.
3. UI modules depend on typed service contracts and domain models, not raw fetch calls or fixtures.
4. Browser bundles contain no private API credentials or server-only modules.
5. Ukrainian copy and formatting pass product review; responsive and accessibility parity pass the agreed matrix.
6. Catalog/product metadata and canonical/redirect behavior meet the approved SEO inventory.
7. Lint, strict typecheck, unit, contract, browser, accessibility, and production build/start checks run in CI.
8. Live adapter, session, checkout, cache, logging, monitoring, VPS, and rollback designs receive owner approval before deployment.

## Decisions to record before implementation

Create short architecture decision records for: system of record during transition; API/auth protocol; URL and locale strategy; cart identity/persistence; checkout ownership; rendering/cache policy; package manager and supported Node release; styling/token approach; image/media delivery; test stack; deployment topology; and observability/privacy policy. Each record should state evidence, alternatives, decision owner, consequences, and revisit trigger.
