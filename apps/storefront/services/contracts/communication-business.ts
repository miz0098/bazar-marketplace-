/** Private, isolated-test protocol. No delivery or production authentication claim. */
export const notificationKinds = [
  "order.created",
  "order.status_changed",
  "message.created",
  "support.replied",
  "order.cancelled",
  "refund.completed",
  "return.requested",
  "return.status_changed",
] as const;
export type NotificationKind = (typeof notificationKinds)[number];
export type FutureNotificationEnvelope = Readonly<{
  version: 1;
  eventId: string;
  kind: NotificationKind;
  recipientId: string;
  sourceId: string;
  scopeId: string;
  occurredAt: string;
}>;
export type NotificationChannel = "in-app" | "email" | "sms" | "push";
/** Implementations must be approved separately; no dispatcher is composed in F13. */
export interface FutureNotificationChannel {
  readonly channel: NotificationChannel;
  deliver(
    event: FutureNotificationEnvelope,
  ): Promise<{
    outcome: "accepted" | "rejected" | "unknown";
    providerRef?: string;
  }>;
}
export type ConversationItem = {
  id: string;
  pinned: boolean;
  unread: boolean;
  lastReadSequence: number;
  lastSequence: number;
  preview: string;
  updatedAt: string;
};
export type MessageItem = {
  id: string;
  sequence: number;
  author: "self" | "member";
  body: string;
  createdAt: string;
  clientMessageId: string | null;
};
export type TicketItem = {
  id: string;
  subject: string;
  category: "delivery" | "payment" | "other";
  status: "open" | "waiting" | "closed";
  createdAt: string;
};
export type NotificationItem = {
  id: string;
  sequence: number;
  kind: NotificationKind;
  sourceId: string;
  scopeId: string;
  read: boolean;
  createdAt: string;
};
export type CommunicationView =
  | {
      mode: "integration-test";
      resource: "conversations";
      scopeId: null;
      items: ConversationItem[];
      nextBefore: null;
      unreadChats: number;
    }
  | {
      mode: "integration-test";
      resource: "messages" | "replies";
      scopeId: string;
      items: MessageItem[];
      nextBefore: number | null;
      unreadChats: null;
    }
  | {
      mode: "integration-test";
      resource: "tickets";
      scopeId: null;
      items: TicketItem[];
      nextBefore: null;
      unreadChats: null;
    }
  | {
      mode: "integration-test";
      resource: "notifications";
      scopeId: null;
      items: NotificationItem[];
      nextBefore: number | null;
      unreadChats: null;
    };
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export const isId = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
const num = (v: unknown, min = 0): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min;
const txt = (v: unknown, max: number, min = 1): v is string =>
  typeof v === "string" &&
  v.length >= min &&
  v.length <= max &&
  !/\p{Cc}/u.test(v.replace(/[\n\t]/g, ""));
const date = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) &&
  Number.isFinite(Date.parse(v));
export function isCommunicationView(v: unknown): v is CommunicationView {
  if (
    !isRecord(v) ||
    !exact(v, [
      "mode",
      "resource",
      "scopeId",
      "items",
      "nextBefore",
      "unreadChats",
    ]) ||
    v.mode !== "integration-test" ||
    !Array.isArray(v.items) ||
    v.items.length > 100
  )
    return false;
  const items = v.items;
  if (
    new Set(items.map((i) => (isRecord(i) ? i.id : null))).size !== items.length
  )
    return false;
  if (v.resource === "conversations")
    return (
      v.scopeId === null &&
      v.nextBefore === null &&
      num(v.unreadChats) &&
      v.unreadChats === items.filter((i) => isRecord(i) && i.unread).length &&
      items.every(
        (i) =>
          isRecord(i) &&
          exact(i, [
            "id",
            "pinned",
            "unread",
            "lastReadSequence",
            "lastSequence",
            "preview",
            "updatedAt",
          ]) &&
          isId(i.id) &&
          typeof i.pinned === "boolean" &&
          typeof i.unread === "boolean" &&
          num(i.lastReadSequence) &&
          num(i.lastSequence) &&
          i.lastReadSequence <= i.lastSequence &&
          txt(i.preview, 2000, 0) &&
          date(i.updatedAt),
      )
    );
  if (v.unreadChats !== null) return false;
  if (v.resource === "tickets")
    return (
      v.scopeId === null &&
      v.nextBefore === null &&
      items.every(
        (i) =>
          isRecord(i) &&
          exact(i, ["id", "subject", "category", "status", "createdAt"]) &&
          isId(i.id) &&
          txt(i.subject, 120, 5) &&
          ["delivery", "payment", "other"].includes(i.category as string) &&
          ["open", "waiting", "closed"].includes(i.status as string) &&
          date(i.createdAt),
      )
    );
  if (v.nextBefore !== null && !num(v.nextBefore, 1)) return false;
  if (v.resource === "messages" || v.resource === "replies")
    return (
      isId(v.scopeId) &&
      items.every(
        (i, n) =>
          isRecord(i) &&
          exact(i, [
            "id",
            "sequence",
            "author",
            "body",
            "createdAt",
            "clientMessageId",
          ]) &&
          isId(i.id) &&
          num(i.sequence, 1) &&
          (n === 0 || i.sequence > items[n - 1].sequence) &&
          ["self", "member"].includes(i.author as string) &&
          txt(i.body, 2000) &&
          date(i.createdAt) &&
          (i.clientMessageId === null || isId(i.clientMessageId)),
      ) &&
      (v.nextBefore === null ||
        (items.length > 0 && v.nextBefore === items[0].sequence))
    );
  if (v.resource === "notifications")
    return (
      v.scopeId === null &&
      items.every(
        (i, n) =>
          isRecord(i) &&
          exact(i, [
            "id",
            "sequence",
            "kind",
            "sourceId",
            "scopeId",
            "read",
            "createdAt",
          ]) &&
          isId(i.id) &&
          num(i.sequence, 1) &&
          (n === 0 || i.sequence < items[n - 1].sequence) &&
          notificationKinds.includes(i.kind as NotificationKind) &&
          isId(i.sourceId) &&
          isId(i.scopeId) &&
          typeof i.read === "boolean" &&
          date(i.createdAt),
      ) &&
      (v.nextBefore === null ||
        (items.length > 0 && v.nextBefore === items.at(-1).sequence))
    );
  return false;
}
