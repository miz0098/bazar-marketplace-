# BAZAR standalone storefront

This isolated Next.js application adapts the approved BAZAR Shopify storefront from `bazar-latest-shopify` commit `105d10f` without importing Liquid, Shopify globals, Storefront APIs, tokens, or checkout redirects.

The current increment provides local catalog discovery, Ukrainian search, product details, a persistent demo cart, and an explicitly demo-only three-step checkout. Product records, prices, stock labels, reviews, cart, promo, delivery, and payment choices are deterministic browser-side data only. There is no carrier lookup, authoritative shipping price, inventory reservation, order creation, payment charge, account, SMS, database, or production backend integration.

## macOS setup

```sh
xcode-select --install                 # skip if already installed
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
git clone https://github.com/miz0098/bazar-marketplace-.git
cd bazar-marketplace-
git switch vps-migration
cd apps/storefront
cp .env.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On Intel Macs, the Node path may be `/usr/local/opt/node@20/bin`.

## Local routes

- `/` — approved homepage shell
- `/catalog` — catalog with categories, filters, sorting, and pagination
- `/search?q=...` — Ukrainian fixture search
- `/products/[handle]` — product details
- `/cart` — browser-persisted demo cart
- `/checkout` — three-step demo checkout; no order or payment side effect

## Verification

```sh
cd apps/storefront
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
npm run start
```

The production server opens on [http://localhost:3000](http://localhost:3000). Stop it with `Control-C`.

## Architecture boundary

- `services/contracts/` owns UI-facing catalog, cart, and checkout types.
- `fixtures/` contains deterministic demo records.
- `domain/` contains framework-independent query and cart rules.
- `services/mock/` implements the replaceable catalog contract.
- `services/service-provider.server.ts` is the server-only adapter boundary and rejects any mode except `mock`.
- `components/cart/cart-provider.tsx` persists only non-sensitive demo line items in `localStorage` under `bazar-demo-cart-v1`.
- Checkout contact/delivery choices are stored only for the current browser tab in `sessionStorage` under `bazar-demo-checkout-v1`; do not enter real personal data. `BAZAR10` is the deterministic demo promo code.

See `MIGRATION_PROGRESS.md` for the source mapping and remaining gaps.
