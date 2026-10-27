import {
  isCommunicationView,
  isNotificationSummary,
  type NotificationSummary,
  type CommunicationView,
  type TicketItem,
} from "../services/contracts/communication-business";
export class CommunicationClientError extends Error {
  constructor(
    readonly code:
      | "invalid-input"
      | "invalid-response"
      | "http-error"
      | "timeout"
      | "unavailable",
    readonly status?: number,
  ) {
    super("Сервіс повідомлень недоступний.");
    this.name = "CommunicationClientError";
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function createCommunicationBusinessClient(
  getCsrf: () => string,
  transport: typeof fetch = fetch,
  timeoutMs = 5000,
) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new CommunicationClientError("invalid-input");
  function path(variantId: string) {
    if (!id(variantId)) throw new CommunicationClientError("invalid-input");
    return variantId.toLowerCase();
  }
  async function request<T>(
    url: string,
    method: string,
    body: unknown,
    validate: (v: unknown) => boolean,
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (method !== "GET") {
      const token = getCsrf();
      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        throw new CommunicationClientError("invalid-input");
      headers["content-type"] = "application/json";
      headers["x-csrf-token"] = token;
    }
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await transport(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new CommunicationClientError("http-error", response.status);
      }
      if (
        !response.body ||
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .startsWith("application/json")
      ) {
        await response.body?.cancel();
        throw new CommunicationClientError("invalid-response");
      }
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 1048576) {
            await reader.cancel();
            throw new CommunicationClientError("invalid-response");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      let value: unknown;
      try {
        value = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        );
      } catch {
        throw new CommunicationClientError("invalid-response");
      }
      if (
        !object(value) ||
        value.ok !== true ||
        !object(value.meta) ||
        !id(value.meta.requestId) ||
        !validate(value.data)
      )
        throw new CommunicationClientError("invalid-response");
      return value.data as T;
    } catch (error) {
      if (error instanceof CommunicationClientError) throw error;
      throw new CommunicationClientError(
        signal.aborted ? "timeout" : "unavailable",
      );
    }
  }
  function call(
    url: string,
    method: string,
    body: unknown,
    resource: CommunicationView["resource"],
    scopeId: string | null,
    check?: (v: CommunicationView) => boolean,
  ) {
    return request<CommunicationView>(
      url,
      method,
      body,
      (v) =>
        isCommunicationView(v) &&
        v.resource === resource &&
        v.scopeId === scopeId &&
        (!check || check(v)),
    );
  }
  const root = "/api/v1/communication";
  function query(before?: number, limit = 50) {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      (before !== undefined && (!Number.isSafeInteger(before) || before < 1))
    )
      throw new CommunicationClientError("invalid-input");
    return `?limit=${limit}${before === undefined ? "" : `&before=${before}`}`;
  }
  const messagePath = (id: string, support: boolean) =>
    `${root}/${support ? "tickets" : "conversations"}/${path(id)}/messages`;
  return {
    conversations: () =>
      call(`${root}/conversations`, "GET", undefined, "conversations", null),
    tickets: () => call(`${root}/tickets`, "GET", undefined, "tickets", null),
    history: (id: string, before?: number, limit = 50, support = false) =>
      call(
        messagePath(id, support) + query(before, limit),
        "GET",
        undefined,
        support ? "replies" : "messages",
        path(id),
        (v) =>
          v.items.length <= limit &&
          v.items.every(
            (i) =>
              "sequence" in i && (before === undefined || i.sequence < before),
          ),
      ),
    send: (
      id: string,
      clientMessageId: string,
      body: string,
      support = false,
    ) => {
      path(clientMessageId);
      if (typeof body !== "string" || !body.trim() || body.length > 2000)
        throw new CommunicationClientError("invalid-input");
      return call(
        messagePath(id, support),
        "POST",
        { clientMessageId, body },
        support ? "replies" : "messages",
        path(id),
        (v) =>
          v.items.length === 1 &&
          v.items.every(
            (i) =>
              "body" in i &&
              i.author === "self" &&
              i.clientMessageId === clientMessageId.toLowerCase() &&
              i.body === body.trim().normalize("NFC"),
          ),
      );
    },
    pin: (id: string, pinned: boolean) => {
      if (typeof pinned !== "boolean")
        throw new CommunicationClientError("invalid-input");
      const key = path(id);
      return call(
        `${root}/conversations/${key}/pin`,
        "PUT",
        { pinned },
        "conversations",
        null,
        (v) =>
          v.resource === "conversations" &&
          v.items.some((i) => i.id === key && i.pinned === pinned),
      );
    },
    markRead: (id: string, lastMessageId: string) =>
      call(
        `${root}/conversations/${path(id)}/read`,
        "PUT",
        { lastMessageId: path(lastMessageId) },
        "conversations",
        null,
        (v) => v.items.some((i) => i.id === id.toLowerCase()),
      ),
    createTicket: (input: {
      clientRequestId: string;
      subject: string;
      category: TicketItem["category"];
      body: string;
    }) => {
      path(input.clientRequestId);
      if (
        typeof input.subject !== "string" ||
        typeof input.body !== "string" ||
        input.subject.trim().length < 5 ||
        input.subject.length > 120 ||
        !input.body.trim() ||
        input.body.length > 2000 ||
        !["delivery", "payment", "other"].includes(input.category)
      )
        throw new CommunicationClientError("invalid-input");
      return call(
        `${root}/tickets`,
        "POST",
        input,
        "tickets",
        null,
        (v) =>
          v.resource === "tickets" &&
          v.items.length === 1 &&
          v.items[0].subject === input.subject.trim().normalize("NFC") &&
          v.items[0].category === input.category,
      );
    },
    notificationSummary:()=>request<NotificationSummary>(`${root}/notifications/summary`,"GET",undefined,isNotificationSummary),
    readAllNotifications:(throughSequence:number)=>{
      if(!Number.isSafeInteger(throughSequence)||throughSequence<0)throw new CommunicationClientError("invalid-input");
      return request<NotificationSummary>(`${root}/notifications/read-all`,"PUT",{throughSequence},isNotificationSummary);
    },
    notification:(id:string)=>call(`${root}/notifications/${path(id)}`,"GET",undefined,"notifications",null,v=>v.resource==="notifications"&&v.items.length===1&&v.items[0].id===id.toLowerCase()),
    notifications: (before?: number, limit = 50) =>
      call(
        `${root}/notifications${query(before, limit)}`,
        "GET",
        undefined,
        "notifications",
        null,
        (v) =>
          v.items.length <= limit &&
          v.items.every(
            (i) =>
              "sequence" in i && (before === undefined || i.sequence < before),
          ),
      ),
    readNotification: (id: string) =>
      call(
        `${root}/notifications/${path(id)}/read`,
        "PUT",
        {},
        "notifications",
        null,
        (v) =>
          v.resource === "notifications" &&
          v.items.length === 1 &&
          v.items[0].id === id.toLowerCase() &&
          v.items[0].read,
      ),
  };
}
