# BAZAR Account Module

This folder documents the standalone BAZAR customer account module.

The storefront entry point is still the Shopify customer account template at `/account`, but the dashboard UI is owned by the BAZAR module:

- `sections/bazar-account-dashboard.liquid` mounts the account app.
- `snippets/bazar-account-provider-data.liquid` exposes temporary Shopify customer data.
- `snippets/bazar-account-sidebar.liquid` renders the persistent dashboard sidebar.
- `assets/bazar-account.css` contains account-only styles.
- `assets/bazar-account.js` owns SPA-like routing, UI state, providers, and reusable render components.

## Architecture

Shopify Customer Accounts are used only for authentication and temporary customer/session data.

UI components must not read Shopify Liquid objects directly. Data enters through provider classes:

- `AccountProvider`
- `OrderProvider`
- `WishlistProvider`
- `ReviewProvider`
- `SupportProvider`
- `NotificationProvider`
- `AddressProvider`
- `PaymentProvider`

Each provider includes a `TODO: Replace Shopify implementation with api.bazar.` marker. During the future backend migration, these providers can be swapped without rebuilding the dashboard UI.

## Routing

The account module uses one page entry point and client-side navigation:

- `/account`
- `/account/orders`
- `/account/orders/{id}`
- `/account/wishlist`
- `/account/messages`
- `/account/reviews`
- `/account/profile`
- `/account/addresses`
- `/account/payment-methods`
- `/account/support`

Navigation between sections is handled with JavaScript and the History API, so the header, footer, and sidebar remain in place while only the content area changes.

## Future api.bazar Migration

Replace the provider internals with api.bazar calls while keeping the same provider method contracts. The UI should continue to consume normalized account, order, wishlist, review, support, notification, address, and payment objects.
