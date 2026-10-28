# F24 — Customer account, reviews, Q&A and communications

Base: merged PR #35 (`ee612d7345fea060254579df7d087209cc34e5a8`). Branch `codex/phase-f24-customer-account-communications`. This extends F12/F13/F17/F21/F23 through the existing ordinary storefront in the explicit isolated HTTPS/browser entry. Main, Shopify reference, account navigation and production composition remain unchanged. No Demo100% or Production Ready claim.

## Actual implementation

- F12 customer service owns an additive `account` extension, using the same users/addresses and verified F4 session owner. Profile first/last names, optional patronymic/email, versions and masked immutable phone are server-backed. No phone-change/recovery/password/email-login shortcut. The +380 prefix is static.
- Saved addresses use the existing NP/Meest/Ukrposhta adapter directory and bounded timeout, not browser-supplied names or tariffs. Carrier city/point/kind/availability are checked on save; checkout revalidates the selected location per seller. Saving is optional. Default changes serialize per user. Removal archives a destination, preserving existing order FKs and immutable F22 delivery snapshots. No country picker, BAZAR pickup or compulsory profile address.
- Provider methods expose only masked metadata/expiry/availability/default/version. Isolated provider refs are synthetic-only and never returned by the API. No browser token creation, PAN/CVV form, real tokenization, payment activation or remote unbinding claim. Expired/unavailable references cannot become default.
- Commerce reviews reference real F22 immutable parent/line/product/offer/seller identity and paid evidence, not F12 synthetic claims. One review per purchased line; withdrawal does not reset eligibility. Pending by default; published content only enters public listing/rating. Owner edits return to pending; edit/withdraw authorization uses an explicit isolated policy, not an invented universal editing deadline. Future moderation capability is injected server-side, unavailable by default and not exposed as a buyer HTTP command. States pending/published/rejected/hidden are content states, not order states. Private moderator actions/reasons are immutable.
- Q&A preserves exact offer/seller identity. Customer submissions have durable request receipts, pending moderation and bounded text. Only current matching seller membership on an active seller can answer; answers require separate moderation. Public projections contain no customer/contact IDs, phone or email. Published feedback is capped at50; summary uses actual published ratings, not synthetic rating badges. Public reporting is owner-authenticated and audited. Non-purchaser review policy remains pending; no such creation path.
- F13 tables/client/thread styles are reused for server messaging, oldest-to-newest history, exclusive sequence pagination, pin/read markers and unread-conversation counts. Latest history is opened at the bottom; prepending older entries preserves position. Contact seller resolves exact offer + optional owned order and creates one contextual conversation on retry. Current seller membership is rechecked, including list previews; removed membership denies access. No full seller app or self-grants.
- Support tickets/replies reuse F13. Owner can create/open/send and link an owned parent plus optional owned cancellation/return. Linking is a separate idempotent step; an uncertain link retry reuses the already-created ticket receipt. Staff replies require an explicit assigned isolated capability; no live-agent or autonomous-response claim. Future CRM composition remains F26.
- F17 notification center is reused inside existing account content, without a new menu section. F13 in-app history receives order/return/refund/restoration events plus review.moderated/question.answered. Read/count/refresh/safe deep links and owner paging remain. Preferences are server-persisted: optional in-app message/review-question/availability categories; order/return/refund facts remain available in account history. Suppression is durable across retries/preferences changes. Marketing is locked off; outboundEnabled is always false. These preferences are not email/SMS/push/FCM consent.
- Privacy access/deletion requests are registered and audited only. No automatic erasure or retained-financial-data deletion. Attachment/photo upload/download is explicitly unavailable (403 after session checks), pending private storage, MIME/signature/size/scan/grants/retention contracts. Metadata-only demo attachments are not file transfer.

## Source and compatibility

[Account extension](../apps/api/src/customer/account.ts), [portable codec](../apps/api/src/contracts/customer-account.ts), [additive migration0020](../apps/api/migrations/0020_customer_communications.sql), [F13 service](../apps/api/src/communication/service.ts), [account screens](../apps/storefront/components/account/server-account.tsx), [server conversations](../apps/storefront/components/communication/server-communication.tsx), [product feedback](../apps/storefront/components/product/offer-feedback.tsx).

Legacy F12 profile/review/address endpoints/fixtures stay compatible and are not presented as actual commerce review proof. New browser account selects the versioned extension instead. F21 cart/wishlist, F22/F22.1 money snapshots and F23 operational statuses remain authoritative and unchanged. Migrations0001–0019 are not rewritten. An actual disposable schema19→20 upgrade checks preservation, as do existing historical upgrade suites.

The approved Shopify account/sidebar, message bubbles, empty cards, profile/form/cards, payment empty state and product tabs are the layout reference. No Overview, seller block, new sidebar section, country picker, 360 view or header/footer redesign. Necessary approved fields/controls use existing account/checkout classes.

## Security and limits

Verified session supplies the only customer owner. Exact Origin/CSRF remain enforced by F4/F15; no local auth fallback, developer OTP in production or browser ingestion of staff/provider proofs. Same-origin clients retain timeout/size/JSON/runtime checks, no redirects/cache/automatic success fallback. Mutations serialize per owner; canonical UUID/digest receipts and optimistic versions reject changed-body replays and stale writes. Account changes have a technical per-actor60/minute limit; this is not a marketing/business limit. No personal values, card refs or message bodies are copied into audit metadata or application logs.

Only synthetic data may be used in the isolated entry. Profile email/patronymic/address labels and UGC are not approved encrypted production PII storage; PL-02 encryption/key rotation/retention/deletion/export/recovery and lawful public-content moderation remain release gates. Lists are bounded (account100, public feedback50, existing chat/ticket list100); production pagination/capacity review remains explicit. Message history and notifications already have cursor pagination. Production RBAC, CRM assignment, membership lifecycle, anti-abuse tuning and actual channels are F25–F28 dependencies.

## Verification

Final-head GitHub results are recorded on PR #36; documentation/types alone are not coverage. Consolidated local verification completed on 2026-10-28:

| Suite | Passed |
| --- | ---: |
| API unit | 60 |
| Storefront unit | 99 |
| Compiled API smoke | 3 |
| PostgreSQL / HTTP / security | 149 |
| Shared ordinary-page HTTPS browser | 44 |
| Existing isolated checkout/notifications | 44 |
| Ordinary desktop/mobile Playwright | 100 |
| Governance unit | 5 |

**504 passed; zero final failures;8 unchanged viewport exclusions.** Thirty new cases compared with F23:6 client/codec,16 PostgreSQL,8 viewport browser cases. An additional25-case F12/F24 compatibility replay and8-case final UI replay are not added to the total. The latter covers approved profile/grid/address-editor parity and a single white empty chat card without a duplicate workspace. API/storefront/isolated-entry typechecks, lint, production builds, three dependency audits (0 vulnerabilities), ledger/allowlist/reference checks and git diff --check pass. Existing tests/assertions/retries/timeouts are preserved.  New PostgreSQL tests cover profile/phone restrictions, all carrier addresses, replay/archival/default, payment refs, paid review/moderation/review races, seller Q&A, preference suppression, conversation isolation/revocation/order/read/pin, support assignment, privacy, HTTP CSRF/Origin and schema19→20 preservation. New desktop/mobile browser cases cover ordinary account persistence, cross-device session reads, checkout address selection, paid review/Q&A/moderation notices, message/support reply persistence, safe errors, keyboard/axe and overflow. Existing F12–F23 regressions are preserved.

## Remaining gates / recommended F25

Implement reviewed seller capabilities and tenant-scoped operator workflows reusing these contact, answer and moderation seams; do not build a customer directory. Define review editing/publication/appeal policy, non-purchaser scope, privacy/retention/consent, attachment scanning/storage, production provider tokens/SMS, staff assignment/grants and live channels before activation. F23 calendar/legal/refund-unit and F22 remaining financial rules are not resolved by F24. No deployment, merge, live payments/refunds/SMS/push or final acceptance is authorized here.

Concurrency detail: account owner locking uses NO KEY UPDATE (compatible with notification FK KEY SHARE). Preference updates take the existing F17 recipient advisory lock before modifying preferences; producer triggers use the same lock before reading them. Durable suppressed-event identity prevents old optional events from reappearing after opt-in. UI treats an acknowledged send followed by list-refresh failure as saved-with-refresh-error, preserving the same message instead of inviting a second send.

Long-history regression: F13 message/support history now orders by the qualified numeric sequence, not the text-cast output alias. Multi-digit histories remain chronological and the latest-page cursor is correct; new PostgreSQL/browser coverage includes35 counterpart messages, unread-conversation rather than message counts, scroll-to-latest and prepended older-page history.

Review and final-head check evidence: [PR #36](https://github.com/miz0098/bazar-marketplace-/pull/36), targeting `vps-migration`. CI runs the full API/PostgreSQL/unit/browser/governance/audit suites on the actual head; final results and SHA are recorded in the PR. No merge/deployment.

Reference provenance: remote `bazar-latest-shopify` remains `105d10fb6b8e65c5f163016aa8c69072e85faa0e`; inspected read-only Git objects for account JS/CSS and existing F12 screens. Server profile preserves profile-aside/form layout; saved addresses/payment methods/reviews reuse existing approved grids/cards, and the address editor opens explicitly. No reference checkout, modification or claim of final visual acceptance.

Debugging evidence: fixes address actual selected-offer feedback identity, approved button contrast and numeric multi-digit history ordering. New test locators are scoped to semantic history/account cards/main errors rather than composer previews or the Next route announcer; no accessibility/security assertion or time budget is relaxed. Final code commit/CI is linked through PR checks; no merge or deployment.
