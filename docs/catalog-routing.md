# BAZAR Catalog Routing

Status: Future SEO architecture — not used in MVP.

For the MVP, BAZAR uses stable native Shopify collection URLs:

- `/collections/{handle}`

The storefront must not use `/catalog/{handle}` links until a real routing layer is implemented.

## Future Goal

BAZAR uses customer-friendly catalog URLs in theme-generated navigation:

- `/catalog`
- `/catalog/електроніка`
- `/catalog/планшети`
- `/catalog/смартфони-та-телефони`
- `/catalog/косметика`

Shopify collections would still live at the native Shopify route:

- `/collections/{handle}`

## Future Architecture

Future theme code that needs a public catalog URL should use one centralized URL builder instead of duplicating handle logic.

The Horizon collection template remains the single source for collection rendering:

- `templates/collection.json`
- `sections/bazar-main-collection.liquid`

No duplicate collection template is created. Filtering, sorting, pagination, product count, collection media where rendered, collection description, breadcrumbs, and SEO data continue to come from Shopify's native collection object.

## Future Routing Flow

Recommended production flow:

1. Customer opens `/catalog/планшети`.
2. A routing layer maps that request to Shopify's native collection resource for `/collections/планшети`.
3. Shopify renders the existing collection template.
4. Theme-generated catalog links, filter forms, sorting forms, clear-filter links, and pagination links keep using the public `/catalog/планшети` URL shape.

This keeps the storefront URL clean while preserving Shopify collection functionality.

## Shopify Limitation

A Shopify Online Store theme cannot create arbitrary top-level dynamic server routes such as `/catalog/{handle}`.

Liquid can render templates for Shopify's existing route types, such as:

- `/collections/{handle}`
- `/products/{handle}`
- `/pages/{handle}`
- `/blogs/{blog}/{article}`
- `/search`

Liquid cannot register a new dynamic route namespace like `/catalog/*`, and a theme cannot intercept the request before Shopify decides which resource to render.

Shopify URL redirects are also not a good fit for BAZAR because native redirects require explicit source and target paths. They do not provide a maintainable wildcard route inside the theme, and redirecting `/catalog/{handle}` to `/collections/{handle}` would expose the Shopify URL again after navigation.

Official Shopify references:

- Liquid `request` object: https://shopify.dev/docs/api/liquid/objects/request
- App proxy route shape and allowed prefixes: https://shopify.dev/docs/apps/build/online-store/app-proxies
- URL redirect limitations: https://help.shopify.com/en/manual/online-store/menus-and-links/url-redirect

## MVP Implementation

The MVP intentionally uses Shopify's native collection URLs:

- catalog modal links use `/collections/{handle}`;
- collection sidebar links use native Shopify menu URLs;
- collection filters, sorting, active filter removal, and pagination use `collection.url`;
- no active storefront links use `/catalog/{handle}`.

This keeps the MVP stable and preserves native Shopify collection behavior.

## Production Routing Options

To make `/catalog/{handle}` return a real server-side `200` page with SEO-friendly metadata, use one of these approaches:

1. Hydrogen or another custom storefront.
   Hydrogen can define `/catalog/:handle` as a real route, load the Shopify collection by handle, and render the catalog UI server-side.

2. Edge routing in front of Shopify.
   A platform such as Cloudflare Workers can receive `/catalog/:handle`, fetch the matching Shopify collection page, and return it while preserving the public URL. This must be implemented carefully so canonical tags, filter URLs, pagination, cache headers, and status codes remain correct.

3. A Shopify app or app proxy for a compatible namespace.
   This can be useful for custom catalog experiences, but Shopify app proxies do not provide a clean arbitrary top-level `/catalog/*` route in a theme-only setup.

## Advantages

- No hundreds of manual redirects.
- One reusable URL builder.
- No duplicated collection templates.
- Native Shopify collection features are preserved.
- Horizon architecture stays intact.
- The future `/catalog/{handle}` path can be implemented later without changing collection handles.

## Limitations

- A theme alone cannot make `/catalog/{handle}` resolve server-side.
- Without Hydrogen, edge routing, or another platform routing layer, direct visits to `/catalog/{handle}` are not guaranteed to render as collection pages.
- Client-side JavaScript routing from a 404 page is intentionally avoided because it would not be truly SEO-friendly and would return the wrong server status.

## Future Migration Path

If BAZAR moves to Hydrogen or a custom storefront:

1. Keep Shopify collection handles as the source of truth.
2. Create a real route: `/catalog/:handle`.
3. Load the collection by `handle`.
4. Render the existing BAZAR catalog UI with server-side data.
5. Keep `/collections/{handle}` available as a fallback or redirect it to `/catalog/{handle}` only after the new route is live.
6. Update canonical URLs to point to `/catalog/{handle}`.

The current theme changes are intentionally small so this migration can happen without rewriting the catalog UI.
