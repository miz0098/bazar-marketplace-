# BAZAR standalone storefront

This isolated Next.js application adapts the approved BAZAR Shopify storefront from `bazar-latest-shopify` commit `105d10f` without importing Liquid, Shopify globals, Storefront APIs, tokens, or checkout redirects.

The current increment provides local catalog discovery, Ukrainian search, product details, a persistent demo cart, an explicitly demo-only three-step checkout, an approved phone-only identity UI preview, the approved customer-account interface, and demo messages/support backed by deterministic fixtures. Product records, prices, stock labels, reviews, cart, promo, delivery, payment choices, identity responses, orders, wishlist entries, profile values, addresses, conversations and support tickets are browser-side demo data only. There is no carrier lookup, authoritative shipping price, inventory reservation, order creation, payment charge, SMS delivery, authenticated account or session, customer persistence, database, or production backend integration.

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

## GitHub Codespaces

The repository-level `.devcontainer/devcontainer.json` provides Node.js 24, installs both npm lockfiles and prepares Chromium for Playwright. Create the Codespace from the current task branch, then run:

```sh
cp apps/storefront/.env.example apps/storefront/.env.local
npm --prefix apps/storefront run dev -- --hostname 0.0.0.0
```

Port `3000` is forwarded automatically. See [`docs/CODESPACES.md`](../../docs/CODESPACES.md) for first-run recovery, the full verification commands, security boundaries, and safe resume instructions.

## Local routes

- `/` — approved homepage shell
- `/catalog` — catalog with categories, filters, sorting, and pagination
- `/search?q=...` — Ukrainian fixture search
- `/products/[handle]` — product details
- `/cart` — browser-persisted demo cart
- `/checkout` — three-step demo checkout; no order or payment side effect
- `/account/login` — phone-only login UI preview; does not authenticate
- `/account/register` — phone verification, profile, and consent UI preview; does not create an account
- `/profile` — approved account overview landing; `Огляд` is deliberately absent from the sidebar
- `/profile/orders` — deterministic order summaries and status filters; no live order details
- `/profile/wishlist` — searchable and sortable demo wishlist with selection, removal, and add-to-demo-cart
- `/profile/messages` and `/profile/messages/[id]` — demo dialogs, search, pins, unread-dialog count and in-memory message composition
- `/profile/reviews` — demo review list and local editing preview
- `/profile/personal-data` — transient personal-data form preview
- `/profile/addresses` — transient add, edit, remove, and default-address preview
- `/profile/payment-methods` — safe empty/integration placeholder that collects no card details
- `/profile/support` and `/profile/support/[id]` — demo tickets, statuses, creation and in-memory replies

The same responsive login preview opens as an accessible modal from the header. Password login, email login, password reset, and Shopify account activation are intentionally absent.

## Phase D identity preview

The fixed code `123456` advances the non-authenticating demo screens. It does not prove phone ownership, create a browser flag or server session, or unlock protected data. These additional deterministic codes exist only for developer QA:

- any other six-digit code — invalid-code state
- `654321` — expired-code state
- `999999` — rate-limit state
- `000000` — network-error state

The resend action refreshes only an in-memory preview challenge and explicitly says that no SMS was sent. OTP values and complete phone numbers are never written to `localStorage`, `sessionStorage`, or logs. Registration profile values are also transient and are not submitted to a backend. The consent control acknowledges only the demo preview: legal Terms and Privacy text remains pending approval and is neither invented nor accepted here.

## Phase E1 account preview

The `/profile` routes are an openly available review surface, not an authenticated customer area. `IdentityService` remains anonymous, the displayed people and commerce records are deterministic fixtures, and no screen unlocks protected customer data. The responsive sidebar keeps the approved order exactly: `Мої замовлення`, `Обране`, `Повідомлення`, `Мої відгуки`, `Особисті дані`, `Улюблені адреси`, `Платіжні методи`, `BAZAR-підтримка`, `Вихід`. The legacy overview remains the `/profile` landing screen but is intentionally not a sidebar item.

Account edits and removals are preview-only, held in memory, and reset after a reload. The preview does not collect, transmit, or persist personal information; use fictional values only and do not enter real personal data. Adding a wishlist item to the cart delegates to the existing non-sensitive demo cart, so only that cart state follows its documented browser persistence. Demo order cards do not invent shipping, tracking, payment, timeline, or seller facts. The payment-method screen has no card-number or CVV inputs and stores no payment credentials. Logout explains that there is no server session to terminate. Phase E2 adds the separate in-memory messaging and support preview described below; it does not connect to users or operators.

## Phase E2 messages and support preview

`/profile/messages` provides fictional dialogs with search, avatars, previews, pinning and a count of unread **dialogs**, not messages. Opening `/profile/messages/[id]` marks that demo dialog read and scrolls its oldest-to-newest DOM history to the bottom. The header and composer stay outside the internally scrolling history; on mobile, the list and conversation are separate views with a back link. Empty message cards reuse the wishlist empty-state styling and have no action buttons or links.

The composer adds text only to in-memory demo history. Enter adds the preview and Shift+Enter inserts a newline. Attachments retain only a name and size (one file, up to 5 MB): file contents are never read, uploaded, stored or offered as a download. Every outgoing item says it was not delivered. There are no delivery receipts, automatic operator replies, WebSockets, push subscriptions or browser storage for communication data.

`/profile/support` lists fictional tickets and statuses. The inline new-ticket form validates a 5–120 character subject and a nonblank message of up to 2000 characters. `/profile/support/[id]` shows history and accepts demo replies unless the fictional ticket is closed. A newly created ticket exists only in the current mounted preview provider; refreshing its detail URL correctly shows a missing-record state. These forms do not contact support, promise response times, or collect contact details. Use fictional values only.

Both features use separate `MessagingService` and `SupportService` contracts with isolated mock adapters. Their mutations return `status: preview-only` and `persisted: false`. No E1 account contract, authenticated identity or persistence behavior is replaced. Chat search is local; read/pin/message/ticket changes reset after reload.

Developer preview query parameters on list and detail routes:

- `?preview=empty` — empty fixture collections (support creation still works locally).
- `?preview=error` — deterministic read failures and retry UI.
- `?preview=send-error` — readable fixtures with deterministic mutation failures; drafts remain editable and unchanged after failure.

Live authorized transport, real read synchronization, moderation, retention, file upload/scanning, replies/deletion/context menus and real operator workflows remain future work.

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

- `services/contracts/` owns UI-facing catalog, cart, checkout, identity, and account types.
- `fixtures/` contains deterministic catalog, content, and account demo records.
- `domain/` contains framework-independent catalog, cart, checkout, identity, and account rules.
- `services/mock/` implements replaceable catalog, checkout, identity-preview, and account-preview contracts.
- `services/service-provider.server.ts` is the server-only adapter boundary and rejects any mode except `mock`.
- `components/cart/cart-provider.tsx` persists only non-sensitive demo line items in `localStorage` under `bazar-demo-cart-v1`.
- Checkout contact/delivery choices are stored only for the current browser tab in `sessionStorage` under `bazar-demo-checkout-v1`; do not enter real personal data. `BAZAR10` is the deterministic demo promo code.
- `services/contracts/identity.ts` defines the replaceable `IdentityService` boundary. `services/mock/identity-service.ts` implements only a non-authenticating in-memory preview and always reports an anonymous session.
- The account service contract and mock adapter expose only deterministic preview reads and explicitly non-persistent mutations. They do not authorize routes, establish identity, or accept raw payment-card data.

Production phone authentication still requires a server-issued OTP challenge, enforced expiry, attempt and resend rate limits, replay prevention, an SMS provider-confirmed delivery result, and secure HttpOnly sessions with CSRF protection. Authorized profile, order, wishlist, review and address persistence remains assigned to the corresponding integration tasks. Tokenized payment methods require an approved provider and PCI/privacy review; live messages and support still require approved transport, authorization and retention decisions. Provider selection and credentials, consent wording, privacy policy, personal-data retention, support/escalation, and other legal decisions require explicit approval before production use.

See `MIGRATION_PROGRESS.md` for the source mapping and remaining gaps.
