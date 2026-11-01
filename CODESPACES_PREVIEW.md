# BAZAR Storefront + BAZAR Business + Staff CRM: isolated Codespaces Preview

This is **test infrastructure**, not a production deployment. Original seller mockup parity remains **NOT VERIFIED**; original staff mockup parity is also **NOT VERIFIED**. Keep all forwarded UI ports **Private** in Codespaces; do not forward API4000, PostgreSQL5433 or internal Next5000/5001/5002.

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

```bash
# Terminal 4: BAZAR Staff CRM public3002 -> internal Next5002
npm run preview:staff
```

Open the Codespaces **HTTPS** forwarded addresses for3000, 3001 and 3002. API/database ports must remain unforwarded. Do not use raw HTTP to sign in: session cookies intentionally remain Secure.

The launcher derives exactly `https://${CODESPACE_NAME}-3000.app.github.dev`, `https://${CODESPACE_NAME}-3001.app.github.dev` and `https://${CODESPACE_NAME}-3002.app.github.dev`. No wildcard CORS/cookie Domain is used. Private generated credentials/state are stored in gitignored `.bazar-preview/` (directory0700, state/OTP files0600). Never commit or share that directory. A single local test database persists synthetic changes across restarts; there is no production database option. An existing F25 state file is extended with the staff origin without replacing its PostgreSQL password or cryptographic keys.

## Test accounts and OTP

Seller test phones: `+380990000001`, `+380990000002`, `+380990000003`. Each owns a different seeded synthetic store. Buyer phones: `+380990000010`, `+380990000011`, `+380990000012`. A buyer receives no seller permissions. Buyer `+380990000012` is seeded with one clearly synthetic, isolated-test order and a seller conversation/message so seller-order and communications synchronization can be verified without creating real orders.

Staff test phones: `+380990000020` (support), `+380990000021` (support peer), `+380990000025` (mobile-browser support actor), `+380990000022` (moderator), `+380990000023` (moderator peer), and `+380990000024` (dispatch read/note). A separate non-login fixture provisioner grants only these local synthetic capabilities. The support and moderation accounts see only cases explicitly assigned to them. There is no staff-wide unassigned queue, customer directory, grant-management UI, buyer impersonation, live provider, or production staff realm. These accounts cannot be used outside the isolated preview process.

Choose **login**, enter the nine digits after static+380, then request a code. In a fourth terminal, read the actual server-generated, short-lived OTP for that exact account and interface:

```bash
npm run preview:otp -- --app seller --phone +380990000001
npm run preview:otp -- --app storefront --phone +380990000010
npm run preview:otp -- --app storefront --phone +380990000012
npm run preview:otp -- --app staff --phone +380990000020
npm run preview:otp -- --app staff --phone +380990000025
npm run preview:otp -- --app staff --phone +380990000022
```

Enter the displayed code in that interface. There is no fixed universal code, HTTP OTP endpoint or production bypass. The adapter accepts only these synthetic phone identities; nothing is sent by SMS. Do not paste OTPs or private state into issues/logs. Rate limits, expiry and attempt limits still apply.

Each interface has an independent host-only HttpOnly/Secure/SameSite session and origin-bound flow/CSRF secret. Signing into one does not silently sign into the other. Both resolve to the same PostgreSQL identities and central domain services. Seller permissions are rechecked against active membership for every request/replay.

The staff page is a third isolated session realm. Test a seeded support ticket by signing in as `+380990000020`; use `+380990000025` for the separate mobile-browser ticket; sign in as `+380990000022` to review synthetic moderation cases. Staff capability grants are checked server-side on each request, case access additionally requires a current assignment, and the grantor identity cannot log in. Revocation immediately removes access. The API has no browser endpoint for granting staff permissions.

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
7. Sign in to Staff CRM as support and reply to the assigned synthetic ticket. The buyer account receives the existing F13 support-reply notification; refreshing the storefront shows the persisted reply. A support account opening a moderation case (or another unassigned support ticket) is denied. The moderator account sees only its assigned review/question queue; updates use the existing F24 moderation state and audit/notification records.

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

Runs a disposable Linux PostgreSQL + three-origin HTTPS browser harness (requires `npm --prefix tests/e2e ci` and installed Playwright Chromium), using1440×900 and390×844, accessibility and overflow checks. The F26 harness adds staff authentication, assignment-scoped support/moderation views, reply-to-buyer persistence and cross-role denials to the F25 shared catalog/order/message checks. The exact assertion count is emitted by the command and CI artifact; this document does not predeclare a pass. Stop running preview processes/PostgreSQL first because it uses the same reserved ports. The harness removes only its own disposable database volume.

Stop the three foreground commands with Ctrl+C. Stop the regular preview PostgreSQL without deleting its synthetic data:

```bash
npm run preview:stop
```

The launcher supplies private Compose variables without printing them. Rerun `preview:postgres` to resume. Do not reset/delete the volume as a troubleshooting shortcut. No merge or deployment is performed by these scripts.
