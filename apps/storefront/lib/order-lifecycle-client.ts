import {
  isLifecycleView,
  isLifecyclePage,
  type LifecycleView,
  type LifecyclePage,
  type LifecycleRequestInput,
} from "../services/contracts/order-lifecycle";
export class OrderLifecycleClientError extends Error {
  constructor(
    readonly code:
      | "invalid-input"
      | "invalid-response"
      | "http-error"
      | "timeout"
      | "unavailable",
    readonly status?: number,
  ) {
    super("Сервіс особистого кабінету недоступний.");
    this.name = "OrderLifecycleClientError";
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function createOrderLifecycleClient(
  getCsrf: () => string,
  transport: typeof fetch = fetch,
  timeoutMs = 5000,
) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new OrderLifecycleClientError("invalid-input");
  function path(variantId: string) {
    if (!id(variantId)) throw new OrderLifecycleClientError("invalid-input");
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
        throw new OrderLifecycleClientError("invalid-input");
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
        throw new OrderLifecycleClientError("http-error", response.status);
      }
      if (
        !response.body ||
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .startsWith("application/json")
      ) {
        await response.body?.cancel();
        throw new OrderLifecycleClientError("invalid-response");
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
            throw new OrderLifecycleClientError("invalid-response");
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
        throw new OrderLifecycleClientError("invalid-response");
      }
      if (
        !object(value) ||
        value.ok !== true ||
        !object(value.meta) ||
        !id(value.meta.requestId) ||
        !validate(value.data)
      )
        throw new OrderLifecycleClientError("invalid-response");
      return value.data as T;
    } catch (error) {
      if (error instanceof OrderLifecycleClientError) throw error;
      throw new OrderLifecycleClientError(
        signal.aborted ? "timeout" : "unavailable",
      );
    }
  }
  const root = "/api/v1/order-lifecycle/orders";
  const getOrder = (id: string) =>
    request<LifecycleView>(
      `${root}/${path(id)}`,
      "GET",
      undefined,
      (v) => isLifecycleView(v) && v.order.id === id.toLowerCase(),
    );
  function mutation(
    id: string,
    input: LifecycleRequestInput,
    kind: "cancellation" | "return",
  ) {
    path(input.idempotencyKey);
    if (
      typeof input.reason !== "string" ||
      !input.reason.trim() ||
      input.reason.length > 2000
    )
      throw new OrderLifecycleClientError("invalid-input");
    if (
      kind === "return" &&
      (!Array.isArray(input.items) ||
        !input.items.length ||
        input.items.length > 100 ||
        input.items.some(
          (i) =>
            !i ||
            !object(i) ||
            !idValid(i.orderLineId) ||
            !Number.isInteger(i.quantity) ||
            i.quantity < 1,
        ))
    )
      throw new OrderLifecycleClientError("invalid-input");
    return request<LifecycleView>(
      `${root}/${path(id)}/${kind === "return" ? "returns" : "cancellations"}`,
      "POST",
      input,
      (v) =>
        isLifecycleView(v) &&
        v.order.id === id.toLowerCase() &&
        v.requests.some(
          (r) =>
            r.kind === kind &&
            r.reason === input.reason.trim().normalize("NFC") &&
            r.items.length === (input.items?.length ?? 0) &&
            r.items.every(item => input.items?.some(sent => sent.orderLineId.toLowerCase() === item.orderLineId && sent.quantity === item.quantity)),
        ),
    );
  }
  const idValid = (v: unknown) =>
    typeof v === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
  return {
    listOrders: (limit = 20, cursor?: string) => {
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        (cursor !== undefined && !/^[A-Za-z0-9_-]{1,150}$/.test(cursor))
      )
        throw new OrderLifecycleClientError("invalid-input");
      return request<LifecyclePage>(
        `${root}?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`,
        "GET",
        undefined,
        (v) => isLifecyclePage(v) && v.items.length <= limit,
      );
    },
    getOrder,
    requestCancellation: (
      id: string,
      input: Omit<LifecycleRequestInput, "items">,
    ) => mutation(id, input, "cancellation"),
    requestReturn: (
      id: string,
      input: LifecycleRequestInput &
        Required<Pick<LifecycleRequestInput, "items">>,
    ) => mutation(id, input, "return"),
  };
}
