# ADR 0002 — PostgreSQL foundation and unresolved business policy

Status: implemented technical foundation; open policy questions below are not approved defaults.

Use PostgreSQL 17 and the small `pg` driver with explicit parameterized SQL, not an ORM. Keep migrations inside `apps/api/migrations`, separate from HTTP startup. Each immutable numbered file is SHA-256 checked, applied in its own transaction, recorded only after success, and protected by one session advisory lock. A second additive migration exercises upgrades from the previous supported version. Unknown, modified or future migration history fails closed. Production migration execution remains a separately approved release workflow; the local CLI refuses NODE_ENV=production.

The runtime and migration connections use different environment variables. Runtime needs only CONNECT, schema USAGE and SELECT on the migration history for F2; business table privileges are intentionally not granted. Production readiness rejects superuser/CREATEDB/CREATEROLE, schema CREATE and writable migration-history credentials. No role password or grant-provisioning secret is embedded in SQL. Database-owner credentials in the disposable integration runner are not deployment credentials.

A bounded pool checks real migration history/checksums for `/ready`. Missing config, unavailable DB, missing/stale/future/modified history or permissions fail readiness with 503; `/health` remains process-only. A healthy response names PostgreSQL and still says businessModulesAvailable=false. F2 does not add any business route or switch storefront mocks.

## Deliberately unresolved — questions for a later reviewed module

- Phone encryption, normalized lookup and key management: users currently store no phone/email field. OTP/session tables accept only opaque digests; there is no code generation, delivery, verification or session issuance. Choose keyed-hash/encryption/rotation/consent/retention rules before real contact data is stored.
- Address recipient PII: addresses currently hold owner, carrier and synthetic/opaque location references only. Recipient name/phone storage and carrier validation need an approved follow-up migration. No real personal data is imported.
- Guest cart identity/merge: carts require a user foreign key; no invented anonymous ownership or cross-user merge policy is implemented.
- Staff/seller authorization: conversation senders must be members; support_messages currently represent owner-authored history only. Staff replies, roles, moderation and delegated access need approval. FKs are integrity checks, not an application authorization layer or RLS policy.
- Category ancestry cycles beyond direct self-parenting, conversation minimum membership, monotonic read cursors, closed-ticket transitions, verified-fulfillment review eligibility and immutable financial snapshots must be enforced by reviewed transactional services/additional constraints when those workflows exist.
- Discounts/tax/refunds/reservations and aggregate order totals are not defined here. Amounts and line arithmetic are constrained, but no invented order-placement or settlement policy is encoded. Payment state `unknown` remains explicit; no PAN/CVV or provider secrets are stored.
- Deletion/anonymization, message retention and production backup destinations/RPO/RTO remain owner decisions. Foreign keys use restrictive deletion; there are no cascading customer/financial-history deletions or automated cleanup jobs.

These questions do not block the technical schema, migrations, isolated tests or readiness checks; they block activating the corresponding business capability. Database migrations and real credentials require normal human review before release.
