# BAZAR API modules — provisional v1 contracts

F13: OpenAPI 1.9 adds the explicit /api/v1/communication prefix for isolated membership-scoped messages, owner support and notification inbox/read. Old provisional /conversations and /support/tickets stay unavailable. [ADR 0012](adr/0012-messages-support-notifications.md) distinguishes working test routes from future staff/CRM/channels.

F12: OpenAPI 1.8 adds private /customer/profile, /customer/addresses, /customer/reviews and /wishlist/items contracts. All success is isolated verified-session only; production remains 503. Old generic public review/address placeholders are not implicitly activated. See [ADR 0011](adr/0011-customer-account-foundation.md).

Phase F9 update: current cart policy is approved (one active/user, explicit ensure, local guest/no merge). GET/HEAD and POST /api/v1/cart, POST /cart/lines, PATCH/DELETE /cart/lines/{variantId}, and POST /checkouts/{id}/confirmation are documented in OpenAPI 1.7.0. Success is isolated verified-session composition only; ordinary runtime SMS/session activation remains blocked. Integrated confirmation requires same-owner succeeded synthetic payment proof and fresh shipping/pricing; orderPaid stays false. See [ADR 0010](adr/0010-cart-checkout-integration.md). Earlier phase notes below are historical.

Phase F8 update: isolated payment protocol/capabilities/reconciliation/cancellation and raw signed-test-event receipt are implemented. Production payment paths return 503; no real order-paid state/refund/handoff exists. Shipping supports ukrposhta with branch-only isolated adapter. See ADRs 0008–0009 and OpenAPI.

Phase F7 update: typed city/point/selection/quote/check routes exist only in isolated verified-session composition. Live delivery remains 503; no shipment/tracking operation is activated. See [ADR 0007](adr/0007-delivery-shipping-foundation.md) and OpenAPI shipping contracts.

Phase F6 update: isolated checkout start/read/contact-delivery/payment/test-record and owned order list/detail routes are documented in OpenAPI. Ordinary runtime returns 503; no real placement/provider/status transition is enabled. See [ADR 0006](adr/0006-orders-checkout-foundation.md).

Phase F5 update: isolated POST /api/v1/pricing/promotions/evaluate reads PostgreSQL prices with a verified actor/CSRF and returns a non-binding merchandise quote. Ordinary runtime is 503; no redemption endpoint exists. See [ADR 0005](adr/0005-promotions-pricing-foundation.md).

Phase F4 update: OTP, session/current-user and revocation handlers exist only in isolated test composition; ordinary runtime returns 503. Cart stays blocked on current-cart policy. See [ADR 0004](adr/0004-server-auth-foundation.md) and OpenAPI for exact routes and security limits. Earlier phase notes below are historical.

Phase F3 update: catalog and categories have live read handlers; cart paths return 401 AUTH_REQUIRED because verified sessions are absent. The cart PostgreSQL repository is internal only. Remaining modules below are planned. See [ADR 0003](adr/0003-catalog-cart-boundaries.md) and the updated OpenAPI for actual query/response contracts. Historical F1 descriptions below are superseded for these three modules.

Historical F1 baseline: only `/health`, `/ready` and `/api/v1` were implemented. The actual HTTP contract is [OpenAPI](../apps/api/contracts/openapi.json). All 13 modules below are **planned**; even their proposed paths return 404 today. Their representative transport types and service signatures are in [modules.ts](../apps/api/src/contracts/modules.ts), not handlers. They are deliberately separate from the existing frontend mock contracts.

## Common rules before enabling a business route

Use `{ok:true,data,meta:{requestId}}` or `{ok:false,error:{code,message},meta:{requestId}}`. Errors must have stable public codes and sanitized messages; never pass through database/provider errors. Map missing authentication to 401, ownership/role violations to 403 or a consistent non-disclosing 404, validation to 400/422, stale versions to 409, throttling to 429 with Retry-After and temporary outage to 503. These business error codes/statuses are not implemented in F1; extend the versioned error schema and tests when adding them.

IDs are opaque UUIDs, timestamps are RFC3339 UTC instants, money uses nonnegative integer minor units (safe-integer range) and an explicit currency. F1 proposes UAH; multicurrency/tax behavior needs review. Lists use opaque bounded cursors and limits 1–100. Sort messages by `(created_at,id)` ascending; unread totals count conversations. Missing delivery/payment facts stay absent instead of being invented.

Validate JSON objects at the transport boundary: content type, byte limit, unknown fields, string bounds, enums, UUIDs, timestamps and numerical ranges. F1 accepts no business JSON, so it rejects all nonempty request bodies instead of parsing them. Activate runtime request/response schemas with the first real module. Do not treat TypeScript interfaces as validation of external data.

For mutations, define idempotency keys scoped to actor+operation, durable request hashes, replayed results and mismatch rejection before processing money/orders/messages. Ownership is derived from the server session, never a client-supplied `userId`. Validate all output from database/provider adapters and map to DTOs. No credentials or PII may enter URLs or logs.

| Module / proposed route family | Representative contract | Required invariants and remaining decisions |
| --- | --- | --- |
| Users `/api/v1/users/me` | UserDto; get/update current | Server-derived user; validate names and optional approved profile fields; phone changes require re-verification. No arbitrary user lookup. |
| Phone OTP `/api/v1/auth/otp/challenges`, `/verify`, `/session` | OtpChallengeInput, OtpChallengeDto, OtpVerifyInput, SessionDto | E.164 phone, opaque challenge, keyed hash of code, short expiry, one-time consumption, rate/attempt/resend limits and anti-enumeration. Provider-confirmed state is distinct from delivery. SMS provider, consent and retention remain undecided. No fixed code or mock-auth flag. Session only through secure HttpOnly cookies; rotation/revocation, SameSite and CSRF before activation. |
| Catalog `/api/v1/products` | ProductDto, ProductQuery, Page | Approved source/import ownership, server prices/availability, indexed Ukrainian search, bounded filtering/cursors; cache freshness contract before caching. Map real media to UI without copying fixture visuals into transport. |
| Categories `/api/v1/categories` | CategoryDto | Unique handle, valid parent, no cycles, stable ordering and reviewed navigation mapping. |
| Cart `/api/v1/cart` | CartDto, CartLineInput | Positive bounded quantity, optimistic version checks, authoritative inventory/prices/totals, guest ownership and merge decision. UI localStorage cart is not authoritative. |
| Orders `/api/v1/orders` | OrderDto | Current-user authorization, transactional/idempotent creation after validation; snapshot prices and addresses, inventory lock/reservation policy, verified status transitions. No fabricated shipment/payment timeline. |
| Wishlist `/api/v1/wishlist` | WishlistDto | Unique user+product, authorized mutations, deterministic guest merge and synchronized counts. |
| Reviews `/api/v1/reviews` | ReviewDto, ReviewInput | Rating 1–5, text bounds, verified order-line ownership and moderation; upload policy before photos. |
| Addresses `/api/v1/addresses` | AddressDto, AddressInput | Ownership, E.164 recipient phone, approved carrier/location IDs, one default per user; create/edit/delete transactions and retention. No live carrier validation exists in F1. |
| Messages `/api/v1/conversations` | ConversationDto, MessageDto, MessageInput | Membership enforced on every read/write; bounded text, durable clientMessageId deduplication, chronological history, per-member read cursor/pin state, conversation unread count; delivery acknowledgement differs from persistence. No WebSocket/upload until separately designed and approved. |
| Support `/api/v1/support/tickets` | TicketDto, TicketInput | Actor ownership, bounded subject/text, authorized staff transitions, separate message history; operator channels/SLA, attachments and retention need review. |
| Payments `/api/v1/payments` | PaymentDto, PaymentHandoffDto, TokenizedPaymentMethodDto | Provider selection and PCI/legal approval first. Hosted HTTPS allow-listed handoff only, signed/replay-safe webhooks, idempotency and explicit unknown state. No PAN/CVV, invented paid status or success on timeout. |
| Delivery `/api/v1/delivery/quotes` | DeliveryQuoteDto | Approved Нова пошта/Meest adapter; authoritative location IDs, expiring quote bound to cart/address/version. Null cost means unavailable, never free shipping. Credentials/tariffs/fulfillment ownership remain external decisions. |

## Gradual storefront integration

Existing `CatalogService`, `AccountService`, `IdentityService`, `MessagingService`, `SupportService` and cart/checkout mocks remain unchanged. API DTOs do not claim the mocks' synchronous/local behavior is a live capability. Each future HTTP adapter must validate its responses, map DTOs to the existing domain, normalize errors and pass a shared behavior suite before that domain's server-side selector can opt in. Switch one domain at a time behind a reviewed server-only allow-list; never fall back to invented success when the API fails.

There is no global `http` switch, live auth session, payment operation, persistent order or server wishlist in F1. The only opt-in client methods currently available are foundation health and discovery reads; they send no cookies/tokens, do not follow redirects, use bounded timeouts/responses and do not run during normal mock storefront rendering.
