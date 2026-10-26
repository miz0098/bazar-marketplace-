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

- [ ] Live catalog API, inventory, pricing, media, and seller data
- [ ] Production phone authentication, secure sessions, route authorization, personal-data persistence, phone re-verification, and server logout
- [ ] Authoritative current-user orders, synchronized wishlist, verified reviews, owned addresses, and tokenized payment methods
- [ ] Phase E2 authorized messaging and support services, including delivery/error, privacy, attachment, and retention decisions
- [ ] Authoritative promotions, payment gateway, SMS, shipping-provider integration, and order creation
- [ ] PostgreSQL/backend integration, merchant settings/content export, analytics, and complete SEO redirect parity
- [ ] Production accessibility and visual-regression baselines against every approved screen

Demo behavior must not be represented as live commerce or account functionality.
