# BAZAR.UA — Proposed Phase B2 implementation plan

Date: 2026-11-02. **This is a proposal, not authorization to start B2.** B1 stops after its PR. Base remains `design-reference-storefront`; do not merge PR #41 or any feature branch automatically. B2 work requires an explicit scope decision and separate branch/PRs.

## Recommended bounded B2 scope

Recommend **development-store feasibility completion + integration foundations + one reviewed theme slice**, not a full storefront rollout. Keep `api.bazar.ua`, seller admin, staff CRM and Flutter independent; Firebase is FCM only. Use the conclusions in [Plus feasibility](SHOPIFY_PLUS_FEASIBILITY.md), [authentication architecture](AUTHENTICATION_ARCHITECTURE.md), [checkout matrix](CHECKOUT_FEASIBILITY_MATRIX.md), [payment/delivery compatibility](PAYMENT_DELIVERY_COMPATIBILITY.md) and [71-file recovery matrix](SHOPIFY_THEME_RECOVERY_MATRIX.md).

Dependency order: `G1/G2 decisions → isolated tool/app/IdP setup → real account/checkout continuity and provider evidence → approved design deviations/ownership contracts → minimal adapter foundations and shell recovery → acceptance PR`. Theme-token preparation can proceed independently once C2–C4/C9 are resolved; sensitive integration wiring waits for its gates.

## Work packages and acceptance

| Order | Work package | Prerequisites | Concrete output / acceptance | Stop if |
|---|---|---|---|---|
| 1 | Merchant evidence and architecture decisions | B2 authorization; G1–G6 owners | Record actual plan/store/account mode, approved dev scope/scopes, merchant country/provider list and A/B/C choice. A includes explicitly approved real-email verification gate; keep passwords prohibited. | Plus remains unverified, email change unapproved or merchant evidence contradicts selected design. |
| 2 | Isolated developer tooling and harmless extension | Authorized merchant-owned dev store/app, approved tooling installation | Pin supported Shopify CLI/API (revalidate 2026-10 baseline); build minimal static block at actual supported checkout target and inspect without production deployment. Validate app scopes/protected-data needs and branding schema. | No eligible dev checkout or current API/target compatibility. Do not claim local bundle proves rendering. |
| 3 | Architecture A IdP and session proof | G2 approved; eligible external IdP with email/SMS test facilities; exact Shopify callback/logout metadata | Code+PKCE flow, actual test inbox verification, stable subject ↔ customer linking, existing/new collision handling, refresh expiry/revocation, RP logout, no secrets in browser. Use non-customer test identities approved for dev only. | SMS identity cannot supply genuinely verified email, subject changes per connection, false success or unsafe linking. |
| 4 | Web and Flutter auth/checkout continuity | Item 3; Customer Account API public-client registration, test devices | Web account → theme/cart → checkout → account uses same test principal. Flutter system browser PKCE/callback and correct cart buyer token path, expiry/logout and cross-user denial. Document device-cookie/express limitations. | BAZAR session is mistaken for Shopify session; checkout buyer/account data disagree. |
| 5 | Payment provider selection evidence | Actual Settings → Payments filtered to legitimate Ukraine entity; G4 | Obtain demonstrations/contracts for LiqPay/mono/Portmone; resolve WayForPay CZ/EU listing conflict if considered. Verify UAH/cards/Apple Pay/Google Pay separately, exact connector/redirect behavior, refunds/webhooks, fees, no installments/COD. Choose only after sufficient evidence. | Any required wallet/method/currency/eligibility or controlled PSP-page method set cannot be proven. |
| 6 | Two-carrier fit-gap and custom-app spike | G5, available app demos/sandbox/carrier docs, Plus | Nova Poshta app proves pre-payment city/branch/locker/rates/tracking plus direct/express validation. For Meest demonstrate custom minimal selector+server lookup/calculation against an authorized non-production facility, or a vendor's complete proof. Confirm real spec contract/schema and canonical order metadata. | App only supports cart/post-purchase placement without approved flow; rates/tracking synthetic; missing branch can bypass validation. |
| 7 | Checkout design acceptance | Real harmless extension/branding proof, items 3–6 as available | Capture native one-page and three-page comparison; resolve D1–D12 with exact screenshots/spec. Confirm header/footer, native field layout, payment controls, summary and pending confirmation copy; choose supported layout explicitly. | Exact three-stage flow required without accepting native platform restrictions. Do not build Liquid imitation. |
| 8 | Commerce adapter foundations | G6, selected test integration boundaries | Versioned mapping/inbox/outbox contract, tenant/actor authorization, HMAC ingress prototype and meaningful contract tests for duplicate/out-of-order events and one order/charge authority. Isolated database only if expressly included. | Two payable orders or independent PSP charge/refund authority, unreviewed tax/availability/commission semantics. |
| 9 | One theme recovery slice | Design C1–C4/C9 decisions, source provenance and tooling | Selectively recover agreed tokens/logo/header/footer or a smaller approved slice from pinned `bazar-latest-shopify`; native Horizon editor preserved; Ukrainian/mobile/a11y screenshots and Theme Check results. No account/auth fake-success behavior imported. | Missing reference decision/assets or implementation requires wholesale branch merge/settings replacement. |
| 10 | B2 review and next-scope decision | Evidence above with truthful blocked results | Separate PR(s), source/tool versions, test results, accepted deviations and remaining blockers. Full storefront scope remains future work. | Requested scope or access cannot support a valid proof; document blocker instead of fabrication. |

No paid SMS, real customer authentication, real card charges or live orders are authorized by this plan. If B2 needs any such action, present the concrete non-production configuration and exact action for explicit authorization first. Prefer provider mock/sandbox facilities that do not incur sends or financial side effects. “Test card” against a live gateway is not automatically safe or permitted. No production app/settings/Plus activation, extension deploy, theme publication, DNS change or production database mutation is included.

## Authentication acceptance criteria

- Returning flow remains +380 + six-digit SMS, with no password fields or fallback passwords. First-time Shopify enrollment requires a real verified inbox under approved A; email can remain absent only before the Shopify-linked boundary.
- Never create email aliases/substitutes, set verification from client metadata or reuse the old six-digit demo acceptance/browser flag. Preserve immutable subject and verify customer linkage by trusted server state.
- OTP has actual transport outcomes, expiry, resend/attempt/spend limits, abuse controls and atomic single-use enforcement; duplicate verification fails. Risk recovery and phone-change do not transfer accounts to recycled numbers.
- Validate issuer/signature/audience/nonce/expiry, key rotation, transaction binding, token refresh/revocation and RP logout, including web/mobile state. An ID token for Shopify is not an API authorization token.
- Orders, favorites, addresses, reviews and support are owner-bound. A missing or expired integration shows unavailable/sign-in state, never fabricated orders or authenticated status.

The B1 local verifier is evidence of a narrow contract, **not production code to promote unchanged**. Use a maintained OIDC library/provider in B2 and review its complete protocol/security behavior. No backend auth rewrite was started in B1.

## Commerce/integration acceptance criteria

Adopt the [ownership table and synchronization contract](SHOPIFY_PLUS_FEASIBILITY.md) after review. API masters approved product/variant/base-price/availability inputs; Shopify calculates final cart/discount/tax/shipping totals and owns merchant checkout/order/payment/refund facts. API seller components are non-payable projections. One app/worker owns each shipment/financial command. Per-seller commission/payouts require a separate reviewed accounting model; no automatic split settlement implied.

Require authenticated raw-body webhook tests, invalid signature/tenant rejection, durable acknowledgement, event/delivery deduplication and operation-level idempotency. Repeated creation event must not create another BAZAR order component; timeout must not trigger another charge/refund/waybill. Test out-of-order payment/fulfillment events, partial payloads, rate limits/backoff, dead letters/replay and reconciliation drift. Retain exact UAH minor-unit snapshots, deterministic allocations and real status provenance. Do not alter production schema or replay captured live webhooks during the proof.

## Theme recovery constraints

Use file-level/hunk recovery from `105d10f`, never merge `bazar-latest-shopify`. Keep the 33 original PNGs byte-identical. Confirm a live/unpublished theme snapshot in a separate authorized location before overriding any merchant setting. Do not import old account/reset/activation templates as current native accounts. `/profile/...` routes require a supported explicit solution. Use agreed tokens and actual assets; no redesign to avoid platform restrictions.

A theme-only package must exclude `apps/`, `analysis/`, original references, docs and secrets. Existing `.shopifyignore` is not a validated release allowlist. Future CI must add the restoration base and meaningful Shopify/proof checks in a separately reviewed change; existing migration CI does not auto-run for this base.

## Validation and rollback for B2

Record every command/version/result and distinguish platform documentation, local contracts and merchant-dev evidence. Run local contract tests plus affected application lint/types/unit/build; carrier/payment/auth browser flows in authorized sandboxes, Shopify Theme Check and theme-editor checks, actual iOS/Android/desktop screenshots, accessibility/keyboard/focus/contrast and long Ukrainian content. PostgreSQL integration is required only for approved adapter persistence changes. No historical Phase A/B1 result can be reused as a new integration pass.

Keep proof app/theme uninstalled or unpublished on production. Remove/revert experimental dev settings using recorded snapshots; revoke only proof credentials when appropriate. Preserve branch/source provenance and independent services. No live money/data rollback is needed for a correctly isolated proof. A later production release requires its own publish/configuration/migration/backup/reconciliation/rollback plan; theme rollback cannot undo identity changes, charges, refunds or carrier labels.

## Decisions to approve before starting

1. Architecture A with real verified-email enrollment, subject/recovery policy and appropriate IdP/SMS/email test facilities, or explicit choice of B/C.
2. Merchant Plus/dev access and exact permitted non-production actions; no assumption subscription is active.
3. Checkout/account deviation review and design conflict owners; ability to choose supported native layout after proof.
4. Provider-selection evidence, carrier app/custom-app spike and ownership/financial-policy agreement.
5. Exact first theme slice and tooling/CI scope. Full theme restoration, production rollout and portal/mobile migration are excluded.

**Stop at B1 PR. Wait for explicit B2 approval; do not start any work package merely because it appears in this plan.**
