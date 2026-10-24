# BAZAR standalone storefront

This isolated Next.js application adapts the approved BAZAR Shopify storefront from `bazar-latest-shopify` commit `105d10f` without importing Liquid, Shopify globals, Storefront APIs, tokens, or checkout redirects.

The current increment provides local catalog discovery, Ukrainian search, product details, a persistent demo cart, an explicitly demo-only three-step checkout, and an approved phone-only identity UI preview. Product records, prices, stock labels, reviews, cart, promo, delivery, payment choices, and identity responses are deterministic browser-side data only. There is no carrier lookup, authoritative shipping price, inventory reservation, order creation, payment charge, SMS delivery, authenticated account or session, database, or production backend integration.

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
- `/account/login` — phone-only login UI preview; does not authenticate
- `/account/register` — phone verification, profile, and consent UI preview; does not create an account

The same responsive login preview opens as an accessible modal from the header. Password login, email login, password reset, and Shopify account activation are intentionally absent.

## Phase D identity preview

The fixed code `123456` advances the non-authenticating demo screens. It does not prove phone ownership, create a browser flag or server session, or unlock protected data. These additional deterministic codes exist only for developer QA:

- any other six-digit code — invalid-code state
- `654321` — expired-code state
- `999999` — rate-limit state
- `000000` — network-error state

The resend action refreshes only an in-memory preview challenge and explicitly says that no SMS was sent. OTP values and complete phone numbers are never written to `localStorage`, `sessionStorage`, or logs. Registration profile values are also transient and are not submitted to a backend. The consent control acknowledges only the demo preview: legal Terms and Privacy text remains pending approval and is neither invented nor accepted here.

## Verification

```sh
cd apps/storefront
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
npm run start
```

The production server opens on [http://localhost:3000](http://localhost:3000). Stop it with `Control-C`.

Run the browser suite from a second terminal while the configured test server is available:

```sh
cd tests/e2e
npm ci
npm test

cd ../..
node scripts/autonomy/validate-ledger.mjs
git diff --check
```

## Architecture boundary

- `services/contracts/` owns UI-facing catalog, cart, checkout, and identity types.
- `fixtures/` contains deterministic demo records.
- `domain/` contains framework-independent query and cart rules.
- `services/mock/` implements the replaceable catalog contract.
- `services/service-provider.server.ts` is the server-only adapter boundary and rejects any mode except `mock`.
- `components/cart/cart-provider.tsx` persists only non-sensitive demo line items in `localStorage` under `bazar-demo-cart-v1`.
- Checkout contact/delivery choices are stored only for the current browser tab in `sessionStorage` under `bazar-demo-checkout-v1`; do not enter real personal data. `BAZAR10` is the deterministic demo promo code.
- `services/contracts/identity.ts` defines the replaceable `IdentityService` boundary. `services/mock/identity-service.ts` implements only a non-authenticating in-memory preview and always reports an anonymous session.

Production phone authentication still requires a server-issued OTP challenge, enforced expiry, attempt and resend rate limits, replay prevention, an SMS provider-confirmed delivery result, and secure HttpOnly sessions with CSRF protection. Provider selection and credentials, consent wording, privacy policy, personal-data retention, support/escalation, and other legal decisions require explicit approval before production use.

See `MIGRATION_PROGRESS.md` for the source mapping and remaining gaps.
