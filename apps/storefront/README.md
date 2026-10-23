# BAZAR standalone storefront — Phase 1

This is the isolated Next.js foundation for BAZAR. It reproduces the approved Shopify storefront shell from `bazar-latest-shopify` commit `105d10f` without importing Shopify Liquid, globals, routes, or runtime APIs.

Phase 1 uses deterministic mock catalog/content fixtures. Authentication, profile, orders, wishlist, messages, cart, checkout, payments, SMS, PostgreSQL, and `api.bazar.ua` are not connected.

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
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On Intel Macs, the Node path may be `/usr/local/opt/node@20/bin`.

## Verification

```sh
cd apps/storefront
npm run lint
npm run typecheck
npm run build
npm run start
```

The production server also opens on [http://localhost:3000](http://localhost:3000). Stop either server with `Control-C`.

## Data boundary

- `services/contracts/` owns UI-facing types.
- `fixtures/` contains clearly isolated mock records.
- `services/mock/` implements the contracts.
- `services/service-provider.server.ts` is the server-only adapter boundary and rejects any mode except `mock` in Phase 1.

See `MIGRATION_PROGRESS.md` for source mapping and remaining gaps.
