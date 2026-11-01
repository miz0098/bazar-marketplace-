# Phase F26 — Staff CRM & operational workflows

Status: **implemented for a bounded isolated integration preview; not production-ready**. The original `staff.bazar.ua` screen design was not available for comparison, so visual parity is **NOT VERIFIED**. This phase adds no production staff grants, no live customer-support operation and no production provider.

## Implemented boundary

`apps/staff-crm` is a dedicated Ukrainian Next.js interface. In the isolated Codespaces/browser preview it runs at port 3002 beside the buyer app on 3000 and seller admin on 3001, through the same central API and PostgreSQL database. It reuses F4 OTP/session/CSRF, F13 communication/notification records, F23 dispatch escalations and F24 content moderation. The preview has an exact third origin and independent host-only session realm. Production API composition rejects the staff service; the gateway and filesystem OTP harness require `NODE_ENV=test` and a private Codespaces/test state.

The UI exposes only capability-qualified queues for Support, Moderation and Dispatch. Support and moderation cases must be explicitly assigned to the signed-in staff member; a known UUID does not grant access. Dispatch visibility follows the existing F23 `staff_user_id` assignment. The response includes only the assigned support conversation and its necessary case context; there is no customer directory, arbitrary customer search, impersonation, cross-seller order view, payment credential access, or general staff dashboard of customer accounts.

## Authorization and persistence

Additive migration `0022_staff_crm.sql` records active/revocable staff memberships, explicit capability grants and immutable revocations, current case assignments and assignment events, private staff notes, idempotency receipts and immutable staff audit events. Existing migrations 0001–0021 are unchanged. Membership and capability defaults deny. The API checks an active membership and a currently valid capability on every call; support/moderation case reads and writes additionally require a current assignment. Capability revocation is effective on the next request. Assignment changes require a global assignment capability, a scoped-capable recipient and an expected assignment version under an advisory transaction lock.

Supported capabilities are `support.read/reply/assign/note`, `moderation.read/review/question/answer/assign`, and `dispatch.read/note`. There is no browser endpoint that creates grants, revokes capabilities, changes membership, elevates staff, or bypasses the assignment rule. Isolated preview fixtures are provisioned in PostgreSQL by the test bootstrap process; the non-login fixture provisioner is not a staff account. `dispatch` assignment continues to use the F23 lifecycle's assigned staff reference; F26 does not replace or silently migrate that workflow.

Support replies reuse F13 `support_messages` and emit its deduplicated in-app `support.replied` event. They are retried by `clientMessageId`; internal notes remain separate and private. Moderation uses F24 review/question states, expected resource version, reason records, audit and existing notification events. Seller/buyer-authored messages are never represented as staff messages. The current F26 API does not change support ticket status or resolve/escalate a case; no status transition policy or staff coverage/SLA fallback has been approved. Queue listing is bounded; continuation cursors are not implemented.

## Synthetic preview identities

In Codespaces only, the API seeds separate OTP identities: support `+380990000020`, support peer `+380990000021`, mobile-browser support actor `+380990000025`, moderator `+380990000022`, moderator peer `+380990000023`, and dispatch reader/note actor `+380990000024`. Test codes are generated per challenge and read through `npm run preview:otp -- --app staff --phone +380…`; there is no fixed code and no browser OTP bypass. Seeded support/review/question cases are synthetic. A support actor cannot read moderation queues; an unassigned peer cannot read the case. Do not place personal data in this database.

## Tests and evidence

Verification on the F26 branch: API unit **64/64**; compiled-production smoke **3/3**; PostgreSQL/HTTP integration **158/158** (including F26 migration, authorization, audit, idempotency, revocation, CSRF/Origin and production-composition cases); storefront unit **99/99**; Seller Admin contract unit **4/4**; Staff CRM contract unit **4/4**; full existing desktop/mobile browser regression **44/44**; three-origin Codespaces preview **45/45 assertions**. API, Storefront, Seller Admin and Staff CRM lint/typecheck/build checks passed, and governance/path validation plus `git diff --check` passed. Dependency audits passed at the CI `high` threshold; npm reports inherited transitive moderate `minimatch` advisories in the lint toolchain (API 11, Storefront/Seller Admin/Staff CRM 16), with zero high/critical findings. These checks establish isolated test behavior only, not production authorization or visual parity.

## Explicitly pending

- **PD-09:** authoritative staff grant administration, revocation authority, staff onboarding, role delegation, escalation/fallback coverage, unassigned queue policy, operational ownership and sensitive capability segregation.
- **PL-02 / privacy:** staff audit/note retention, customer-message access purpose and limits, case export, deletion/legal hold and lawful access review. No retention period is inferred.
- **AD-23 scope gaps:** customer support status transitions, resolution/reopen/transfer/close, work assignment service-level targets, queue continuation/paging and operational workload dashboard need an approved contract before implementation.
- **Production:** OTP/SMS and domain/TLS operations, staff provisioning, database role/grants, monitoring, key management, backups/recovery and provider channels are unavailable. The preview's exact private Codespaces domains and synthetic records do not qualify.
- **Design:** original staff CRM screens were not available. The app uses the existing BAZAR palette, Inter type and responsive components, but staff visual parity remains **NOT VERIFIED** pending product review.

No Demo 100%, Full Audit Ready, or Production Ready claim follows from this test-only slice.
