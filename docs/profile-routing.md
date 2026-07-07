# BAZAR Profile Routing

## Status

MVP route: `/profile`

The storefront should no longer link customers to Shopify's native `/account` customer page, because that route can redirect to Shopify-hosted authentication.

## Implemented In Theme

- Header profile action links to `/profile`.
- Authentication success redirects to `/profile`.
- The BAZAR Account Module uses `/profile/...` for its client-side navigation.
- `templates/page.profile.json` renders the BAZAR Account Module for a Shopify page template.
- If the visitor is not authenticated, the BAZAR login modal opens on the profile page instead of sending the customer to Shopify `/account`.

## Shopify Admin Setup Required

Shopify themes cannot create a true custom top-level route like `/profile` only through Liquid, JSON templates, CSS, or JavaScript.

To make `/profile` resolve in production:

1. Create a Shopify page named `Профіль`.
2. Set its handle to `profile`.
3. Assign the `page.profile` template.
4. If Shopify serves the page as `/pages/profile`, create a URL redirect:
   - from `/profile`
   - to `/pages/profile`

## Future api.bazar Path

When BAZAR moves to `api.bazar` or a custom storefront, `/profile` should become a real application route handled by the BAZAR router. At that point the provider layer in `assets/bazar-account.js` can switch from Shopify data bootstrap to api.bazar responses without changing the dashboard UI components.
