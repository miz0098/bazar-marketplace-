# BAZAR Storefront + BAZAR Business: isolated Codespaces Preview

This is **test infrastructure**, not a production deployment. Original seller mockup parity is **NOT VERIFIED**. Keep both forwarded ports **Private** in Codespaces; do not forward API4000, PostgreSQL5433 or internal Next5000/5001.

## Requirements

Use `codex/phase-f25-seller-dashboard` or the reviewed successor branch. Open the repository with its devcontainer (Node24 + Docker-in-Docker). No SMS, payment, carrier, push or bank credentials are required. Use synthetic data only.

The devcontainer retains the existing default Storefront launch; `npm --prefix apps/storefront run dev` still runs the standalone mock Storefront on3000. Stop it before starting the integration preview on the same port.

## Exact commands

Install once from the repository root:

```bash
npm run preview:install
```

Start the dedicated loopback PostgreSQL container:

```bash
npm run preview:postgres
```

Open three terminals in the same Codespace/repository:

```bash
# Terminal 1: central test API on127.0.0.1:4000; reviewed migrations and synthetic seed
npm run preview:api
```

```bash
# Terminal 2: Storefront public3000 -> internal Next5000
npm run preview:storefront
```

```bash
# Terminal 3: BAZAR Business public3001 -> internal Next5001
npm run preview:seller
```

Open the Codespaces **HTTPS** forwarded addresses for3000 and3001. API/database ports must remain unforwarded. Do not use raw HTTP to sign in: session cookies intentionally remain Secure.

The launcher derives exactly `https://${CODESPACE_NAME}-3000.app.github.dev` and `https://${CODESPACE_NAME}-3001.app.github.dev`. No wildcard CORS/cookie Domain is used. Private generated credentials/state are stored in gitignored `.bazar-preview/` (directory0700, state/OTP files0600). Never commit or share that directory. A single local test database persists synthetic changes across restarts; there is no production database option.

## Test accounts and OTP

Seller test phones: `+380990000001`, `+380990000002`, `+380990000003`. Each owns a different seeded synthetic store. Buyer phones: `+380990000010`, `+380990000011`, `+380990000012`. A buyer receives no seller permissions. Buyer `+380990000012` is seeded with one clearly synthetic, isolated-test order and a seller conversation/message so seller-order and communications synchronization can be verified without creating real orders.

Choose **login**, enter the nine digits after static+380, then request a code. In a fourth terminal, read the actual server-generated, short-lived OTP for that exact account and interface:

```bash
npm run preview:otp -- --app seller --phone +380990000001
npm run preview:otp -- --app storefront --phone +380990000010
npm run preview:otp -- --app storefront --phone +380990000012
```

Enter the displayed code in that interface. There is no fixed universal code, HTTP OTP endpoint or production bypass. The adapter accepts only these synthetic phone identities; nothing is sent by SMS. Do not paste OTPs or private state into issues/logs. Rate limits, expiry and attempt limits still apply.

Each interface has an independent host-only HttpOnly/Secure/SameSite session and origin-bound flow/CSRF secret. Signing into one does not silently sign into the other. Both resolve to the same PostgreSQL identities and central domain services. Seller permissions are rechecked against active membership for every request/replay.

## Shared-data verification

1. Sign into Seller Admin as seller1. Open Товари and change the exact variant price or availability. Refresh the buyer catalog; only that offer changes. Unavailable offers remain saved and cannot be purchased. Restoring availability uses the existing deduplicated F13 event pipeline.
2. Sign into Storefront as buyer1, add exact offers and use the existing three-step isolated checkout. Carrier cities/points are **synthetic fixtures**, not official directories/tariffs. BAZAR shipping text remains «Вартість доставки згідно з тарифами поштового оператора».
3. Payment initiation remains pending until an isolated provider proof. Obtain the test attempt UUID from the browser Network response for the commerce payment request (not a card credential), then request a filesystem-only test observation:

```bash
npm run preview:event -- payment-succeeded ATTEMPT_UUID
# Or test refusal:
npm run preview:event -- payment-declined ATTEMPT_UUID
```

The API process verifies the fixture-signed observation through the existing payment module. Check gitignored `.bazar-preview/result.json` for the command outcome, then refresh both interfaces. A decline preserves the cart. The operator command cannot be called by a browser; provider proofs are unavailable after losing the in-memory fixture operation on API restart (leave uncertain payment unresolved; do not manufacture success).
4. Open «Мої замовлення» and Seller Admin Замовлення. Seller views expose only their own seller-order lines, delivery and frozen financial snapshot, not another seller's data. No real orders/charges/TTN are created.
5. Use the buyer product contact action, send a synthetic message, then refresh Seller Admin's contextual «Повідомлення та запитання». Reply and refresh the buyer conversation. Conversation membership and notification recipients are persisted centrally.
6. Sign in to seller2 and verify seller1 resource IDs are denied; signing into another browser/account never transfers guest cart items automatically.

## Limits

- Seller promo drafts generate unique BZ+11-digit codes. Activation is blocked until marketplace/seller funding and individual applicability are approved.
- Finance shows frozen test sales/5% commission; withdrawable balance, settlement and payouts are unavailable.
- Bank storage accepts only synthetic IBAN bank-code000000 plus DEMO holder, encrypted with a private preview key; real banking data must not be entered.
- Document uploads/downloads remain unavailable until private object storage, scanning, grants and retention are approved. Metadata/contracts do not mean production-secure storage.
- Only approved synthetic media metadata is selectable. No supplier feeds or arbitrary uploads.
- F23 test shipping confirmations use a private signed synthetic carrier adapter. Real TTN/tracking is not activated. Production calendar/legal/provider policies remain pending.
- Refresh/focus/manual refresh synchronizes shared data; this is not real-time WebSocket delivery.
- Original admin screen parity and real Codespaces hosting acceptance require the separate desktop/mobile review. Local Linux dual-origin tests do not prove live provider readiness.

## Verification and shutdown

```bash
npm run preview:test
```

Runs a disposable Linux PostgreSQL + dual-origin HTTPS browser harness (requires `npm --prefix tests/e2e ci` and installed Playwright Chromium), using1440×900 and390×844, accessibility and overflow checks. The validated F25 harness covers 40 browser assertions, including shared catalog price, the same buyer order in both apps, and a seller reply rendered in the buyer account. Stop running preview processes/PostgreSQL first because it uses the same reserved ports. The harness removes only its own disposable database volume.

Stop the three foreground commands with Ctrl+C. Stop the regular preview PostgreSQL without deleting its synthetic data:

```bash
npm run preview:stop
```

The launcher supplies private Compose variables without printing them. Rerun `preview:postgres` to resume. Do not reset/delete the volume as a troubleshooting shortcut. No merge or deployment is performed by these scripts.
