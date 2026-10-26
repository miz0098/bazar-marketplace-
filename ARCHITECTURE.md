# BAZAR Storefront Architecture

Phase F8 adds isolated provider-neutral payment operations, authenticated event processing, durable retry/exclusion and immutable state audit. Ukrposhta extends F7 delivery and the demo checkout choice. No real charge/wallet/refund/shipment is activated; see [ADR 0008](docs/adr/0008-payment-infrastructure-security.md) and [ADR 0009](docs/adr/0009-ukrposhta-delivery-extension.md).

Phase F7 adds isolated carrier directory/selection/estimate contracts, PostgreSQL shipping persistence and final F6 freshness guards. No real provider, tariff guarantee or shipment is activated; see [ADR 0007](docs/adr/0007-delivery-shipping-foundation.md).

Phase F6 adds PostgreSQL three-stage checkout drafts and immutable pending integration-order records. Existing cart/auth/promo transactions are reused; no real order/provider/inventory activation occurs. See [ADR 0006](docs/adr/0006-orders-checkout-foundation.md).

Phase F5 adds isolated PostgreSQL promotion evaluation and usage-limit tests with exact integer pricing. Live checkout/redemption, rounding, stacking and seller allocation remain blocked; see [ADR 0005](docs/adr/0005-promotions-pricing-foundation.md). Storefront mocks/design are unchanged.

Phase F4 adds isolated PostgreSQL OTP/session/CSRF/security composition. Production auth remains 503 without an approved SMS/provider/policy rollout; storefront mocks are unchanged. See [ADR 0004](docs/adr/0004-server-auth-foundation.md).

Phase F3 adds public PostgreSQL catalog/category reads and tested internal cart persistence. Cart HTTP stays blocked with 401 until verified authentication exists; storefront remains on mocks. See [ADR 0003](docs/adr/0003-catalog-cart-boundaries.md).

Phase F2 adds controlled PostgreSQL SQL migrations, a bounded API pool and exact-schema /ready probes. Business modules remain unavailable and storefront mocks are unchanged. See [ADR 0002](docs/adr/0002-postgresql-foundation.md) for implemented integrity rules and unresolved policy questions.

## Purpose and constraints

Historical Phase F1 state (database readiness is superseded by F2 above): F1 adds an isolated native Node.js/TypeScript foundation in `apps/api`; see [ADR 0001](docs/adr/0001-api-foundation.md), [module contracts](docs/API_MODULES.md), and [PostgreSQL design](docs/POSTGRES_ARCHITECTURE.md). Only process health/readiness and `/api/v1` discovery are live HTTP routes. Business APIs, database connections and provider integrations remain unimplemented. The Next.js storefront continues to select its existing mock adapters; the new server-only foundation client is opt-in and unused by current screens.

The target is a standalone Next.js App Router storefront, initially isolated under `apps/storefront`, while the existing Shopify Horizon theme remains untouched and runnable. The visual/interaction source of truth for migration is `bazar-latest-shopify` commit `105d10f`; the migration base and rules remain `vps-migration` at `722a58b`. This document defines boundaries; it does not assert that `api.bazar.ua`, authentication, payments, SMS, server wishlist, or messaging integrations already exist.

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
  |-- BAZAR auth/account UI over Shopify customer Liquid/session data
  |-- BAZAR local wishlist/messages prototypes
  |-- Horizon <shopify-account>/<shopify-chat> fallback integrations
  `-- Shopify-hosted checkout / accelerated checkout
```

At `105d10f`, BAZAR adds a presentation/application layer over Horizon:

- `templates/index.json`, `templates/collection.json`, `templates/list-collections.json`, and `templates/product.json` select BAZAR sections for the primary shopping journey.
- `sections/header.liquid` mounts `snippets/bazar-header-desktop.liquid`, BAZAR actions, catalog menu, authentication modal, favorites modal, and their scripts/styles.
- `templates/page.profile.json` and `sections/bazar-account-dashboard.liquid` mount a client-rendered account application from `assets/bazar-account.js` and `assets/bazar-account.css`.
- `snippets/bazar-account-provider-data.liquid` serializes Shopify customer, order, and address objects; wishlist, messages, notifications, reviews, support tickets, and payment methods are initialized empty.
- `assets/bazar-auth.js` uses optional `window.BazarSmsAuth` hooks but otherwise simulates SMS/registration and stores auth state in browser storage.
- `assets/bazar-wishlist-store.js` and account message providers persist only in `localStorage`; they do not synchronize with another device or user.
- `snippets/stylesheets.liquid` globally loads BAZAR tokens/home/catalog/product/modal styles alongside Horizon `base.css`, with additional feature CSS loaded by header/footer/account sections.

`layout/theme.liquid` still composes Horizon layout facilities, and `snippets/scripts.liquid` still defines Shopify import maps and `Theme.routes`. Liquid continues to provide catalog, product, cart, customer, order, address, and configuration data. The BAZAR browser layer uses Shopify cart/product JSON endpoints and browser-local state rather than a repository-defined backend API.

This coupling means BAZAR Liquid/CSS/JavaScript are the primary migration specifications, while Horizon remains the platform fallback. They are not directly portable React components. UI completeness must not be confused with backend completeness.

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

The service contracts must replace these verified prototype seams without preserving their unsafe behavior:

- `window.BazarSmsAuth` and `bazarAuth` browser storage in `assets/bazar-auth.js` → `IdentityService` with a server-managed session.
- Shopify customer JSON from `snippets/bazar-account-provider-data.liquid` and in-memory profile edits in `assets/bazar-account.js` → `CustomerService`.
- Shopify order summary plus hard-coded detail fallbacks in `assets/bazar-account.js` → `OrderService` with authoritative delivery/payment/seller timelines.
- `bazarWishlistItems` in `assets/bazar-wishlist-store.js` → authenticated `WishlistService`, with an explicitly designed guest-to-account merge.
- local chat/message/pin/read keys in `assets/bazar-account.js` → `MessagingService` plus an approved realtime/polling and attachment-upload mechanism.

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

Ukrainian is visibly implemented in BAZAR Liquid and JavaScript at `105d10f`, including auth, catalog, product, account, orders, wishlist, and messages, but it is hard-coded rather than represented by `locales/uk.json`. Extract it into reviewed Ukrainian message catalogs, use locale-aware pluralization/number/date/money formatting, and define fallback behavior explicitly. Do not use `locales/ru.json` as Ukrainian source material.

Preserve the theme's verified accessibility patterns: semantic landmarks, skip links, logical headings, visible focus, focus trapping and return, keyboard-operable menus/dialogs/galleries, status live regions, reduced motion, descriptive media alternatives, zoom/reflow, and minimum touch targets. Automated checks supplement, not replace, keyboard and screen-reader review.

## Mapping from Shopify to target components

| Shopify source | Target responsibility | Migration note |
| --- | --- | --- |
| `assets/bazar-global.css`, `snippets/stylesheets.liquid`, BAZAR feature CSS | reviewed design tokens and component styles | Extract the BAZAR tokens and visual states; audit global loading, collisions with `assets/base.css`, fonts, breakpoints, and unused page CSS. |
| `sections/header.liquid`, `snippets/bazar-header-*.liquid`, `assets/bazar-header.*` | `navigation/` and `layout/` | Preserve Ukrainian search, catalog overlay, favorites/profile/cart actions, responsive states, and focus/scroll behavior. |
| `sections/bazar-main-collection.liquid`, `snippets/bazar-catalog-filter.liquid` | catalog route/grid/filter controls | Replace Shopify Liquid collection/filter/pagination objects with typed queries and URL state; preserve native `/collections/{handle}` until URL strategy is approved. |
| `snippets/bazar-product-card.liquid` | catalog product-card components | Preserve the verified minimal card first; add missing quick-add/wishlist/rating/badge behavior only from approved requirements. |
| `sections/bazar-main-product.liquid`, gallery/product assets | product route and components | Replace Shopify product/variant/metafield/cart objects; correct the wishlist link-only behavior through `WishlistService`. |
| search sections/snippets/assets | search route/dialog | Replace predictive-search HTML endpoint; define query, grouping, and debounce/cancellation behavior. |
| cart template/snippets/assets | cart page/drawer and `CartService` | Preserve live announcements and reconciliation; backend decides totals and availability. |
| BAZAR auth modal/sections and `assets/bazar-auth.js` | identity routes/modal and `IdentityService` | Preserve the approved UI states, but never migrate the six-digit UI-only verification or browser-auth flag as security logic. |
| BAZAR account template/section/sidebar and `assets/bazar-account.*` | account layout and domain routes | Split the 3,554-line client module into route-level features and typed providers; retain loading/empty/error/responsive states. |
| Shopify order bootstrap plus BAZAR order screens | `OrderService` and order routes | Separate verified Shopify summary fields from placeholder detail/timeline/seller fields. |
| BAZAR wishlist store/account/modal | `WishlistService` and shared wishlist UI | Design product add controls, guest merge, server persistence, consistency, and cart mutation errors. |
| BAZAR message screens/providers | `MessagingService` and message routes | Preserve the rich UI and `105d10f` empty state; replace local-only messages, attachments, pins, and read state with authorized APIs. |
| Shopify checkout controls | `CheckoutService` handoff | Keep payment outside the app until separately approved. |
| settings schema, Liquid CSS variables, `base.css` | reviewed design tokens and component styles | Merchant setting values are missing; capture them before extraction. |

## Error and observability model

Normalize expected service failures into domain errors such as unauthenticated, forbidden, not found, validation, conflict/stale inventory, rate limited, and temporarily unavailable. Routes must provide localized recovery paths; unexpected exceptions go to the route error boundary with a correlation ID, not raw details.

Emit structured server logs with request/correlation ID, route, service operation, duration, outcome, and cache status. Add health/readiness checks that distinguish process health from required dependency availability. Metrics and alerts should cover latency, error rate, checkout-handoff failure, sign-in failure, and API contract violations without recording personal payloads.

## Architectural acceptance gates

1. Shopify sources remain byte-for-byte present; `105d10f` is audited as reference and is not merged into the migration documentation branch.
2. Every screen declares whether it uses mock or live data; production cannot start in mock mode.
3. UI modules depend on typed service contracts and domain models, not raw fetch calls or fixtures.
4. Browser bundles contain no private API credentials or server-only modules.
5. Ukrainian copy and formatting pass product review; responsive and accessibility parity pass the agreed matrix.
6. Catalog/product metadata and canonical/redirect behavior meet the approved SEO inventory.
7. Lint, strict typecheck, unit, contract, browser, accessibility, and production build/start checks run in CI.
8. Live adapter, session, checkout, wishlist merge, messaging/attachment transport, cache, logging, monitoring, VPS, and rollback designs receive owner approval before deployment.

## Decisions to record before implementation

Create short architecture decision records for: system of record during transition; API/auth protocol; URL and locale strategy; cart identity/persistence; checkout ownership; rendering/cache policy; package manager and supported Node release; styling/token approach; image/media delivery; test stack; deployment topology; and observability/privacy policy. Each record should state evidence, alternatives, decision owner, consequences, and revisit trigger.
