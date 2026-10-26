import type {
  Carrier,
  PickupKind,
  ShippingCity,
  ShippingPoint,
  ShippingSelection,
  ShippingQuote,
  ShippingCheck,
  SelectShippingInput,
  QuoteShippingInput,
} from "../services/contracts/shipping-business.js";
export class ShippingClientError extends Error {
  constructor(
    readonly code:
      | "invalid-input"
      | "invalid-response"
      | "http-error"
      | "timeout"
      | "unavailable",
    readonly status?: number,
  ) {
    super("Доставка тимчасово недоступна.");
    this.name = "ShippingClientError";
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const ref = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(v);
const text = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 200;
const count = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const code = (v: unknown) => v === "nova-poshta" || v === "meest";
const pickup = (v: unknown) => v === "branch" || v === "parcel-locker";
const date = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) &&
  Number.isFinite(Date.parse(v));
const city = (v: unknown) => object(v) && ref(v.ref) && text(v.name);
const point = (v: unknown) =>
  object(v) &&
  ref(v.ref) &&
  ref(v.cityRef) &&
  text(v.name) &&
  pickup(v.kind) &&
  typeof v.available === "boolean" &&
  text(v.revision);
function selection(v: unknown): v is ShippingSelection {
  return (
    object(v) &&
    v.mode === "integration-test" &&
    id(v.checkoutId) &&
    id(v.addressId) &&
    count(v.checkoutVersion) &&
    v.checkoutVersion > 0 &&
    code(v.carrier) &&
    ref(v.cityRef) &&
    ref(v.pointRef) &&
    pickup(v.kind) &&
    text(v.pointRevision) &&
    (v.quoteId === null || id(v.quoteId)) &&
    v.canCreateShipment === false
  );
}
function quote(v: unknown): v is ShippingQuote {
  return (
    object(v) &&
    v.mode === "integration-test" &&
    id(v.id) &&
    id(v.checkoutId) &&
    count(v.checkoutVersion) &&
    v.checkoutVersion > 0 &&
    code(v.carrier) &&
    pickup(v.kind) &&
    object(v.cost) &&
    count(v.cost.amountMinor) &&
    v.cost.currency === "UAH" &&
    date(v.quotedAt) &&
    date(v.expiresAt) &&
    Date.parse(v.expiresAt) > Date.parse(v.quotedAt) &&
    v.validitySource === "integration-policy" &&
    typeof v.binding === "string" &&
    /^[a-f0-9]{64}$/.test(v.binding) &&
    v.status === "estimate-for-test" &&
    v.canCreateShipment === false
  );
}
export function createShippingBusinessClient(
  getCsrf: () => string,
  transport: typeof fetch = fetch,
  timeoutMs = 5000,
) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new ShippingClientError("invalid-input");
  function path(checkoutId: string) {
    if (!id(checkoutId)) throw new ShippingClientError("invalid-input");
    return `/api/v1/delivery/checkouts/${checkoutId}`;
  }
  async function request<T>(
    path: string,
    method: string,
    body: unknown,
    valid: (value: unknown) => boolean,
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (method !== "GET") {
      const token = getCsrf();
      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        throw new ShippingClientError("invalid-input");
      headers["content-type"] = "application/json";
      headers["x-csrf-token"] = token;
    }
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await transport(path, {
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
        throw new ShippingClientError("http-error", response.status);
      }
      if (
        !response.body ||
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .startsWith("application/json")
      ) {
        await response.body?.cancel();
        throw new ShippingClientError("invalid-response");
      }
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 131072) {
            await reader.cancel();
            throw new ShippingClientError("invalid-response");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const buffer = new Uint8Array(bytes);
      let offset = 0;
      for (const c of chunks) {
        buffer.set(c, offset);
        offset += c.length;
      }
      let envelope: unknown;
      try {
        envelope = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(buffer),
        );
      } catch {
        throw new ShippingClientError("invalid-response");
      }
      if (
        !object(envelope) ||
        envelope.ok !== true ||
        !object(envelope.meta) ||
        !id(envelope.meta.requestId) ||
        !valid(envelope.data)
      )
        throw new ShippingClientError("invalid-response");
      return envelope.data as T;
    } catch (error) {
      if (error instanceof ShippingClientError) throw error;
      throw new ShippingClientError(signal.aborted ? "timeout" : "unavailable");
    }
  }
  return {
    carriers: () =>
      request<{
        mode: "integration-test";
        carriers: {
          code: Carrier;
          pickupKinds: PickupKind[];
          liveAvailable: false;
        }[];
        bazarPickup: { available: false };
      }>(
        "/api/v1/delivery/carriers",
        "GET",
        undefined,
        (v) =>
          object(v) &&
          v.mode === "integration-test" &&
          object(v.bazarPickup) &&
          v.bazarPickup.available === false &&
          Array.isArray(v.carriers) &&
          v.carriers.length <= 2 &&
          new Set(v.carriers.map((c) => (object(c) ? c.code : null))).size ===
            v.carriers.length &&
          v.carriers.every(
            (c) =>
              object(c) &&
              code(c.code) &&
              c.liveAvailable === false &&
              Array.isArray(c.pickupKinds) &&
              c.pickupKinds.length <= 2 &&
              c.pickupKinds.every(pickup),
          ),
      ),
    cities: (input: { carrier: Carrier; query: string }) =>
      request<{
        mode: "integration-test";
        carrier: Carrier;
        items: ShippingCity[];
      }>(
        "/api/v1/delivery/cities",
        "POST",
        input,
        (v) =>
          object(v) &&
          v.mode === "integration-test" &&
          v.carrier === input.carrier &&
          Array.isArray(v.items) &&
          v.items.length <= 100 &&
          v.items.every(city) &&
          new Set(v.items.map((x) => x.ref)).size === v.items.length,
      ),
    points: (input: { carrier: Carrier; cityRef: string; kind: PickupKind }) =>
      request<{
        mode: "integration-test";
        carrier: Carrier;
        items: ShippingPoint[];
      }>(
        "/api/v1/delivery/points",
        "POST",
        input,
        (v) =>
          object(v) &&
          v.mode === "integration-test" &&
          v.carrier === input.carrier &&
          Array.isArray(v.items) &&
          v.items.length <= 100 &&
          v.items.every(
            (p) =>
              point(p) && p.cityRef === input.cityRef && p.kind === input.kind,
          ) &&
          new Set(v.items.map((x) => x.ref)).size === v.items.length,
      ),
    getSelection: (checkoutId: string) =>
      request<ShippingSelection>(
        path(checkoutId) + "/selection",
        "GET",
        undefined,
        (v) => selection(v) && v.checkoutId === checkoutId,
      ),
    select: (checkoutId: string, input: SelectShippingInput) =>
      request<ShippingSelection>(
        path(checkoutId) + "/selection",
        "PATCH",
        input,
        (v) =>
          selection(v) &&
          v.checkoutId === checkoutId &&
          v.addressId === input.addressId &&
          v.kind === input.kind &&
          v.checkoutVersion === input.expectedVersion + 1 &&
          v.quoteId === null,
      ),
    quote: (checkoutId: string, input: QuoteShippingInput) =>
      request<{ quote: ShippingQuote; replayed: boolean }>(
        path(checkoutId) + "/quotes",
        "POST",
        input,
        (v) =>
          object(v) &&
          quote(v.quote) &&
          v.quote.checkoutId === checkoutId &&
          v.quote.checkoutVersion === input.expectedVersion &&
          typeof v.replayed === "boolean",
      ),
    check: (
      checkoutId: string,
      input: { expectedVersion: number; quoteId: string },
    ) =>
      request<ShippingCheck>(
        path(checkoutId) + "/check",
        "POST",
        input,
        (v) =>
          object(v) &&
          v.mode === "integration-test" &&
          v.quoteId === input.quoteId &&
          v.current === true &&
          date(v.checkedAt) &&
          v.canPlaceRealOrder === false,
      ),
  };
}
