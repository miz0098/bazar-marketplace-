# ADR 0012 — F13 messages, support and notification foundation

Status: completed ephemeral customer preview and isolated PostgreSQL/HTTP protocol; no production transport, real staff or channels. Base: merged PR #23, c811c4d99f2e5c5127240ef0dc0a5ad9e9fad982. [Acceptance](../F13_COMMUNICATION_ACCEPTANCE.md).

## Existing UI and bounded completion

Phase E2 already implements list/search/pin/read-dialog count, oldest-to-newest history, open-bottom/keyboard scrolling, in-memory send, support creation/history/reply/status, loading/error/retry and white empty cards without actions. F13 preserves routes, account navigation, layout and Ukrainian copy. No new notification section, staff screen or WebSocket is added. Search-empty now uses the existing white AccountState as required; stable ID resolves demo list sort ties. Selected chat state uses the mark-read result. Immediate repeated submit events are guarded by an in-flight ref (state still drives pending UI), protecting chat/reply/new-ticket forms before React rerenders. Invalid control characters are rejected; newline/tab remain valid.

All texts/attachments/pins/read state remain ephemeral per preview service. Refresh resets E2 communication fixtures; F12 wishlist remains independently persistent IDs only. Demo messages are explicitly not delivered and never stored in browser storage. Existing attachments only read local name/size, never bytes or network upload. No real inbound contact/operator is simulated; fixture contact messages are visibly fictional.

## Isolated server composition

createCommunicationService requires NODE_ENV=test; createApiServer independently rejects injection in ordinary configuration. main never selects it. /api/v1/communication and descendants return 503 without the dependency; /ready retains businessModulesAvailable:false. No production SMS/auth bypass or Next.js provider switch. F4 verified session principal, exact Origin/Fetch Metadata, CSRF for mutation, 4 KiB body/time bounds, no credentialed CORS and static logging labels apply. No submitted user/sender/member/role/status/attachment fields are accepted. Missing and foreign resources use the same 404. SQL is parameterized; internal errors stay sanitized.

The new prefix avoids silently activating the old provisional /conversations and /support/tickets contracts. OpenAPI 1.9 and strict shared CommunicationView validators describe actual routes. Mode is always integration-test, with no delivered field, sender identity/contact data or raw provider payload. Returned text is private data and requires approved encryption/retention/abuse controls before live use. Plaintext synthetic content exists only in disposable tests.

| Route under /api/v1/communication | Operations and access |
| --- | --- |
| /conversations | GET/HEAD own explicit memberships; pinned first, latest sequence next, stable ID tie. Counts unread conversations, excluding self-authored messages. Up to 100; overflow 503, not silently truncated. |
| /conversations/{id}/messages | GET/HEAD paged member history; POST body/clientMessageId, member only. Same actor/conversation/key/body replays original item; changed body conflicts. No chat/member creation, seller/staff delegation, edit/delete or delivery acknowledgement endpoint. |
| /conversations/{id}/pin | PUT explicit pinned boolean, per member, idempotent set semantics. |
| /conversations/{id}/read | PUT explicit lastMessageId from that conversation; pointer can only advance. Does not mark unseen later messages read. No automatic GET side effect or other participant read status disclosure. |
| /tickets | GET/HEAD owned tickets; POST bounded subject/category/body/clientRequestId, starts at existing open status. Creation and first message commit atomically. No SLA/CRM receipt claim. Up to 100; overflow 503. |
| /tickets/{id}/messages | GET/HEAD owned paged history; POST owner reply with clientMessageId. Closed tickets deny new replies; replay of already committed input remains valid. Customer cannot set status. |
| /notifications | GET/HEAD own metadata inbox, newest first and paged. No text/contact/channel payload, external dispatcher or UI section. |
| /notifications/{id}/read | PUT empty object sets only own read_at once, independent of chat watermark. |

History limit is 1–100, default 50; before is an exclusive safe-integer sequence. First page contains newest entries in chronological DOM order; prepend older pages using nextBefore and deduplicate by ID. A read marker must name a message actually displayed, not just a next-page cursor. History is sorted by immutable insertion sequence; migration backfills legacy rows by (created_at,id), and service timestamps never precede the previous chat/ticket timestamp. Cursors reveal ordering, not authorization, and every fetch rechecks membership/ownership. No snapshot across pages is promised; new messages cannot reorder old pages. UUIDs and request keys are canonicalized. Message/request IDs are resource-and-actor scoped; there is no automatic re-send key generation, retry, expiry or guest merge.

Conversation-row locking serializes sends, read updates and pin changes across members. Ticket-row locking serializes replies/status observations; user-row locking serializes new-ticket receipts. READ COMMITTED gives later lock holders fresh post-commit state. Client request IDs plus unique constraints prevent duplicate rows. Support creation stores SHA-256 of canonical fields, no raw duplicate receipt body. Mutations are transactions; an inbox insertion failure rolls back a send. No client time, actor or delivery status is trusted. Production membership revocation, role grants, rate limits, participant creation and data deletion remain unapproved.

## Additive PostgreSQL 0012

Existing F2 conversations/members/messages/support tables are reused. Adds bounded sequences and scoped cursor indexes to message histories, support reply/request UUID uniqueness and paired request digest integrity, and notification_events with owner FK, deduplication, bounded sequence and owner paging index. Legacy data and FKs/read pointers remain intact; migrations 0001–0011 remain unchanged. Sequences are allocated on insert; gaps on rollback are normal and have no user-count meaning. No real event seed or contact field is installed. Runtime grants/release remain separate.

## Notification truth and future channels

The typed version-1 event envelope covers order.created, order.status_changed, message.created, support.replied, order.cancelled and refund.completed. Only isolated member sends currently write message.created metadata to other explicit members, in the same transaction. A row means a test inbox record, never delivered email/SMS/push or a real person receiving a message. Unique (user,kind,source) prevents duplicate inbox events. Replaying the send never recreates a row or resets read state. No generic browser event-ingestion endpoint exists.

Order creation/status/cancellation/refund emitters remain disabled until authoritative business transitions exist. In particular F6/F9 pending test orders and synthetic payment success are NOT paid-order/refund facts. Support-replied emission waits for approved staff identity and CRM protocol. Their event models are prepared, not functioning workflows. The future channel interface explicitly distinguishes accepted/rejected/unknown; no dispatcher, credentials, subscription/consent, retry worker or delivery-success UI exists. Channel policy, authentication, idempotent outbox/retry/reconciliation, opt-in/unsubscribe, PII-safe payload templates and retention require review before connecting email/SMS/push. Chat unread counts and notification read flags remain distinct.

## CRM and attachments remain unavailable

Typed FutureCrmBoundary separates raw-byte authenticity verification, staff authorization and atomic deduplicated apply; no signature algorithm/provider or default allow is invented. Resolve approved employee/seller roles, tenant boundaries, ticket assignments, customer-visible attribution, open/waiting/closed transition policy, SLA, auditing and deletion before implementation. Existing support_messages are owner-authored only; do not label customer replies as staff responses.

No upload endpoint or signed URL exists. FutureAttachmentPolicy documents access and inspection seams only. Required decisions: allow-listed MIME/extensions and byte limits, signature/content sniffing, quarantine/malware scanning, private encrypted storage/keys, expiring owner/member grants on upload/download, filename normalization, download disposition, quotas, deletion/retention and privacy. Never trust client MIME/size or expose public object keys. Unknown scan results deny access. Existing metadata-only demo is not file transfer.

## Client and remaining gates

The opt-in Next.js client uses same-origin browser cookies, closure CSRF, bounded UTF-8/JSON streams/timeouts, no redirects/cache/retry/fallback; validates exact resource/scope/page ordering and mutation correlation. It is not selected by preview providers. Real catalog/account IDs, BFF/TLS/browser auth rollout, staff/membership policy, per-actor abuse/capacity limits, privacy/encryption/retention/deletion and notifications design/consent/transport must be approved before live activation. Isolated tests are evidence of these protocol boundaries, not production readiness.
