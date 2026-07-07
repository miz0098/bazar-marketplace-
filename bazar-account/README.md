# BAZAR Account Module

This folder documents the standalone BAZAR customer account module.

The BAZAR dashboard no longer uses Shopify's `/account` customer page as the storefront entry point. The intended public entry is `/profile`, with the Shopify page template `templates/page.profile.json` rendering the dashboard UI.

- `sections/bazar-account-dashboard.liquid` mounts the account app.
- `snippets/bazar-account-provider-data.liquid` exposes temporary Shopify customer data.
- `snippets/bazar-account-sidebar.liquid` renders the persistent dashboard sidebar.
- `assets/bazar-account.css` contains account-only styles.
- `assets/bazar-account.js` owns SPA-like routing, UI state, providers, and reusable render components.
- `templates/page.profile.json` mounts the dashboard on a Shopify page template.

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

- `/profile`
- `/profile/orders`
- `/profile/orders/{id}`
- `/profile/wishlist`
- `/profile/messages`
- `/profile/reviews`
- `/profile/personal-data`
- `/profile/addresses`
- `/profile/payment-methods`
- `/profile/support`

Navigation between sections is handled with JavaScript and the History API, so the header, footer, and sidebar remain in place while only the content area changes.

## Shopify Route Setup

Shopify themes cannot create a custom top-level `/profile` route by Liquid code alone.

For MVP:

1. Create a Shopify page with handle `profile`.
2. Assign it the `page.profile` template.
3. Add a Shopify URL redirect from `/profile` to the profile page route if the store does not already resolve `/profile`.

The storefront code links to `/profile` and never to `/account`. The `/account` customer template may remain in the theme for compatibility, but it is not used by BAZAR navigation.

## Future api.bazar Migration

Replace the provider internals with api.bazar calls while keeping the same provider method contracts. The UI should continue to consume normalized account, order, wishlist, review, support, notification, address, and payment objects.
