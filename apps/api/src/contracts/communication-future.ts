/** Design-only seams. No implementation, keys, staff grants, upload URL or HTTP route. */
export type FutureCrmEvent = Readonly<{
  version: 1;
  eventId: string;
  ticketId: string;
  staffRef: string;
  occurredAt: string;
  change:
    | { kind: "reply"; text: string }
    | { kind: "status"; status: "open" | "waiting" | "closed" };
}>;
export interface FutureCrmBoundary {
  /** Must authenticate provider/account/environment over raw bytes before decoding. */
  verify(
    rawBody: Uint8Array,
    headers: Readonly<Record<string, string>>,
  ): Promise<FutureCrmEvent>;
  /** Requires approved staff role, tenant, assignment and ticket transition policies. */
  authorize(event: FutureCrmEvent): Promise<boolean>;
  /** Must atomically deduplicate events with history/audit; acceptance is not delivery. */
  apply(
    event: FutureCrmEvent,
  ): Promise<{ outcome: "applied" | "rejected" | "unknown" }>;
}
export interface FutureAttachmentPolicy {
  /** Resolve membership/owner on request AND download, never trust a public object key. */
  authorize(
    actorId: string,
    resource: { kind: "conversation" | "ticket"; id: string },
  ): Promise<boolean>;
  /** Server-approved type/size limits, content sniffing, malware scan and private storage are required. */
  inspect(
    quarantinedObjectRef: string,
  ): Promise<{
    state: "safe" | "rejected" | "unknown";
    mediaType: string;
    size: number;
  }>;
}

/** Design-only push targets; no registration, FCM credentials, delivery or consent bypass. */
export type FuturePushTarget = { platform: "web"; subscriptionRef: string } | { platform:"flutter-fcm"; installationRef:string };
