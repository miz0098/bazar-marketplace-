# Storefront migration progress

Phase F2 adds API PostgreSQL schema/migrations and readiness only. This storefront, demo identity, components, service providers and mock persistence remain unchanged; no DB credential enters the browser.

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

## Phase C three-step checkout

- [x] Exactly three steps: contact and delivery, payment, confirmation
- [x] Ukrainian contact/address validation with focus on the first invalid field
- [x] Нова пошта and Meest demo choices; ПВЗ BAZAR visible and disabled
- [x] Current-tab draft persistence, back/forward navigation, deterministic `BAZAR10` demo promo
- [x] Cart-backed item summary and integer-minor-unit discount total
- [x] Explicit demo stop without order creation, payment confirmation, inventory reservation, or cart clearing

Delivery branch lookup and tariffs are not live. Shipping is shown only as `вартість за тарифами перевізника`; no shipping amount is included in totals.

## Phase D phone authentication UI

- [x] Approved responsive phone-only login modal launched from the shared header
- [x] Dedicated `/account/login` and `/account/register` routes with no password or email-login alternative
- [x] Ukrainian phone formatting, normalization, validation, and masked confirmation display
- [x] Six-position OTP UI with keyboard movement, paste distribution, focus management, and resend countdown
- [x] Registration profile and consent fields with accessible validation and first-error focus
- [x] Loading, invalid-code, expired-code, rate-limit, resend, network-error, and completed-preview states
- [x] Modal Escape, backdrop dismissal, focus trap, scroll lock, and trigger focus return
- [x] Typed `IdentityService` contract and isolated deterministic preview adapter

This phase is demo-ready UI only. The fixed code `123456` advances the preview without authenticating; `654321`, `999999`, and `000000` produce deterministic expired, enforced rate-limit, and network-error states for developer QA. Other six-digit values show the invalid-code state. No SMS is sent, account or session is created, authentication flag is set, or protected user data is exposed. OTP values and complete phone numbers are not persisted in browser storage or written to logs. The checkbox acknowledges only a demo preview; no unapproved legal terms are displayed or accepted. Password login, email login, password reset, and Shopify account activation remain out of scope.

Production identity remains pending: server-issued challenges, expiry and attempt enforcement, resend throttling, replay prevention, provider-confirmed SMS delivery, secure HttpOnly sessions, CSRF protection, redacted observability, and approved privacy/legal/retention decisions.

## Phase E1 profile and account UI

- [x] Responsive `/profile` account shell with the approved overview landing, exact nine-entry sidebar order, and no `Огляд` navigation item
- [x] Accessible mobile account drawer with focus containment and return, Escape/backdrop dismissal, scroll lock, and no horizontal overflow
- [x] Demo order status filters, list/cards, show-more, loading, empty, and error presentation without invented delivery, tracking, payment, timeline, or seller facts
- [x] Demo wishlist search, sorting, selection, single/bulk removal, show-more, empty state, and add-to-existing-demo-cart behavior
- [x] Review cards and local editing validation; personal-data and address add/edit/remove/default previews
- [x] Safe payment-method empty/integration state with no card-number or CVV collection
- [x] `/profile/messages` and `/profile/support` navigation shells reserved for Phase E2
- [x] Typed account models, deterministic fixtures, preview service adapters, and explicit non-session logout behavior

This phase is a demo-ready UI preview, not an authenticated account. `IdentityService` remains anonymous and the profile routes expose only fictional deterministic fixtures, never protected customer data. Account mutations are kept in memory and reset on reload; they are not evidence of account persistence. The preview does not collect, transmit, or persist personal information; use fictional values only and do not enter real personal information. Wishlist add-to-cart uses the separately documented demo-cart persistence, but wishlist state itself is not synchronized to an account. No real order, shipment, payment method, review, address, support ticket, or message is fetched, created, changed, or delivered.

## Phase E2 customer messages and support UI

- [x] Dedicated `/profile/messages/[id]` and `/profile/support/[id]` demo detail routes alongside both list routes
- [x] Searchable dialog list with avatars, last-message previews/times, pins and unread-dialog counting
- [x] Chronological DOM histories, open-at-bottom behavior and internal scrolling with separate header/composer
- [x] Mobile list/conversation navigation, keyboard composer, explicit demo-only notices and metadata-only file previews
- [x] Wishlist-style white empty message cards without actions; loading, missing-record, read-error and mutation-error states
- [x] Support landing, ticket list/statuses, validated creation and replies, and closed-ticket behavior
- [x] Separate typed services, isolated fixtures and in-memory adapters; account/session/cart behavior from E1 is preserved

Every outgoing message and support reply is a local preview, not a delivery. No real users/operators, server persistence, sockets, push, SMS or paid services are involved. Reload resets communication data, read/pin state and ticket creation. Attachment contents are never opened or transmitted. Real transport, authorization, attachment upload/scanning, reply/delete/context-menu workflows and retention remain integration work.

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
| `app/checkout`, `components/checkout`, `domain/checkout`, `services/contracts/checkout.ts` | `snippets/cart-summary.liquid`, payment presentation in `assets/bazar-account.{css,js}`, and the approved three-step target documented in `docs/APPROVED_SCREENS_AUDIT.md` |
| `components/auth/*`, `app/account/login/page.tsx`, `app/account/register/page.tsx` | `snippets/bazar-auth-modal.liquid`, `snippets/bazar-phone-input.liquid`, `snippets/bazar-sms-code-input.liquid`, `sections/bazar-auth-login.liquid`, `sections/bazar-auth-register.liquid`, `assets/bazar-auth.{css,js}` |
| `domain/identity/identity.ts`, `services/contracts/identity.ts`, `services/mock/identity-service.ts` | standalone typed identity boundary and deterministic demo replacement for Shopify customer/auth runtime behavior |
| `app/profile/*`, `components/account/*`, account domain/contracts/fixtures/mock adapter | `sections/bazar-account-dashboard.liquid`, `snippets/bazar-account-sidebar.liquid`, `snippets/bazar-account-provider-data.liquid`, `assets/bazar-account.{css,js}`, `assets/bazar-wishlist-store.js`, `snippets/bazar-wishlist-data.liquid` |
| `fixtures/catalog.ts`, `services/mock/catalog-service.ts` | isolated deterministic replacements for Shopify product and collection records |

## Pending

Phase F1 introduces a separate `apps/api` technical foundation and an unused server-only health/discovery client. Storefront domain mocks, layouts, design, demo persistence and Shopify source remain unchanged. Business contracts and PostgreSQL architecture are proposals; no live domain route, DB connection/migration, phone verification, payment or message delivery has been activated. See `docs/API_MODULES.md` and `docs/POSTGRES_ARCHITECTURE.md`.

- [ ] Live catalog API, inventory, pricing, media, and seller data
- [ ] Production phone authentication, secure sessions, route authorization, personal-data persistence, phone re-verification, and server logout
- [ ] Authoritative current-user orders, synchronized wishlist, verified reviews, owned addresses, and tokenized payment methods
- [ ] Live authorized messaging and support services, including delivery/error, privacy, attachment upload/scanning, and retention decisions
- [ ] Authoritative promotions, payment gateway, SMS, shipping-provider integration, and order creation
- [ ] PostgreSQL/backend integration, merchant settings/content export, analytics, and complete SEO redirect parity
- [ ] Production accessibility and visual-regression baselines against every approved screen

Demo behavior must not be represented as live commerce or account functionality.

## Phase F3 — opt-in catalog transport

Added a typed, runtime-validated catalog HTTP client and server-only factory, plus a future authenticated cart adapter interface. Existing service providers remain mock-only: no components, visual tokens, demo persistence, auth D, account E or communication flow changed. Mapping PostgreSQL data to the existing visual domain is blocked on approved media/vendor/ratings/navigation contracts; no mock visuals or facts are silently used as live data. See ADR 0003 and SHOPIFY_RESTORATION.md for cart access and commerce gates.

## Phase F4 — prepared server-auth transport, preview preserved

Added a separate typed same-origin server-auth client with bounded validated responses, browser-managed cookies and in-memory CSRF. It is not selected by the Phase D IdentityService or any screen and accepts explicit test-only success today. No component/style/persistence/preview completion is changed into a live session. BFF/TLS/provider/policy and registration-state mapping remain activation blockers documented in ADR 0004. Profile, catalog, checkout, messages and support keep their current behavior.

## Phase F5 — future checkout promotion pricing boundary

Added a separate typed, validated PromotionPricingService/client for step 2 using only cart ID/version/code and CSRF. The existing demo validatePromo(code, subtotal), its fixture rounding, UI, three-step flow and persistence are unchanged. No provider selects the new client. PostgreSQL quotes are explicit integration-test merchandise evaluations with checkoutAvailable:false; real redemption/payment/order and multi-line/rounding/compatibility/refund scenarios remain blocked in ADR 0005.

## Phase F6 — server checkout/order boundary, demo preserved

Added an opt-in typed CheckoutBusinessClient/contracts for three server draft stages and immutable pending integration records. It is never selected by the demo checkout/profile providers. Actual client → authenticated HTTP → PostgreSQL start/delivery/payment/test-record/order detail/list/replay is covered. canPlaceRealOrder remains false, payable/delivery amounts null and provider/inventory actions absent. Existing three-step UI/design/persistence, auth, cart, profile and communications are unchanged; see ADR 0006 for live blockers.

Phase F7 adds a separate typed opt-in ShippingBusinessClient for step 1, tested against isolated verified-session HTTP/PostgreSQL. The approved demo carrier selection and tariff copy are unchanged. No live selector, recipient PII, TTN, fee override or production provider fallback is added; see ADR 0007.

Phase F8 adds an opt-in PaymentBusinessClient and secure-context/provider/device capability seam (no OS guessing or SDK selection). Existing promo/summary/demo payment controls remain unchanged. Step 1 adds the requested third carrier Ukrposhta within the same fieldset, persists/reviews its selection and retains disabled BAZAR pickup. No live transport, card collection, order completion or payment success is selected. ADRs 0008–0009 record activation blockers.
