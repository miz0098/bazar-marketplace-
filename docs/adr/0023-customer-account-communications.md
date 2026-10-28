# ADR0023 — Reuse customer and communication boundaries for F24

Status: implemented isolated extension; product scope APPROVED by explicit F24 instruction. Operational permissions, legal retention and external providers are not approved by this ADR.

Reuse F12 customer factory/tables, F13 conversations/support/inbox, F17 center, F21 same-origin session/BFF, F22 purchase lines and F23 return/request IDs. Do not create an independent notification/message store or make localStorage authoritative. Add migration0020 only. Keep legacy private contracts readable; actual commerce reviews are separately linked to immutable commerce records, never fabricated F12 purchase claims.

Customer commands use owner-derived sessions, canonical request receipts and optimistic versions. Public feedback is a contact-free projection of moderated content. Review/answer publication requires a separately injected isolated moderator capability; seller answer ownership does not confer publication or staff privilege. Staff replies require explicit assignment capability. These internal methods prepare F25/F26 integration, not a complete operator app or production grant service.

Archive saved addresses; do not cascade or mutate historical delivery/order snapshots. Save directory-verified locations and revalidate at checkout; do not calculate shipping costs. Card UI shows only synthetic provider display metadata; no raw credentials or tokenization endpoint. No phone change without its own OTP flow.

Preferences affect optional in-app fanout with durable suppression; order/return/refund history remains. No marketing/outbound consent is inferred. Test provider/channel behavior remains excluded from ordinary production composition. Attachments/photos deny access until private storage, scanning and access/retention controls are approved. Privacy requests are requests, not fulfilled erasure/export.

Acceptance/evidence, API/source links and remaining limits: [F24](../F24_CUSTOMER_COMMUNICATIONS.md). No UI redesign, new navigation, live channels, money, merge/deployment or readiness declaration.
