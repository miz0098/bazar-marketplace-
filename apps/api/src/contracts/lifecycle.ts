export type RequestKind = "cancellation" | "return";
export type RequestState = "requested" | "under-review" | "closed-for-test";
export type RefundState =
  | "prepared"
  | "pending"
  | "unknown"
  | "confirmed-for-test"
  | "rejected-for-test";
export type LifecycleRequestInput = {
  idempotencyKey: string;
  reason: string;
  items?: { orderLineId: string; quantity: number }[];
};
export type LifecycleRequest = {
  id: string;
  kind: RequestKind;
  state: RequestState;
  version: number;
  reason: string;
  items: { orderLineId: string; quantity: number }[];
  createdAt: string;
};
export type LifecycleRefund = {
  id: string;
  requestId: string;
  paymentOperationId: string;
  extent: "partial" | "full";
  amountMinor: number;
  currency: "UAH";
  state: RefundState;
  version: number;
  basis: "isolated-test-plan";
  realRefund: false;
  fundsReturned: false;
};
export type LifecycleHistory = {
  id: string;
  sequence: number;
  requestId: string | null;
  refundId: string | null;
  fromState: string | null;
  toState: string;
  version: number;
  source:
    | "immutable-order"
    | "customer-request"
    | "isolated-review"
    | "test-plan"
    | "verified-test-event";
  createdAt: string;
};
export type LifecycleOrder = {
  id: string;
  createdAt: string;
  status: "pending";
  paymentStatus: "not-initiated";
  deliveryStatus: "not-requested";
  returnStatus: "not-requested" | "requested-for-test";
  refundStatus: "not-initiated" | "test-attempts-only";
  orderPaid: false;
  fundsReturned: false;
  lines: {
    id: string;
    title: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }[];
};
export type LifecycleView = {
  mode: "integration-test";
  resource: "order-lifecycle";
  order: LifecycleOrder;
  eligibility: {
    cancellation: "policy-required" | "request-only" | "unavailable";
    returns: "policy-required" | "request-only" | "unavailable";
  };
  requests: LifecycleRequest[];
  refunds: LifecycleRefund[];
  history: LifecycleHistory[];
};
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
export const lifecycleId = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const n = (v: unknown, min = 0): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min;
const txt = (v: unknown, max: number): v is string =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= max &&
  !/\p{Cc}/u.test(v.replace(/[\n\t]/g, ""));
const date = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) &&
  Number.isFinite(Date.parse(v));
const unique = (arr: Record<string, unknown>[]) =>
  new Set(arr.map((i) => i.id)).size === arr.length;
export function isLifecycleView(v: unknown): v is LifecycleView {
  if (
    !record(v) ||
    !exact(v, [
      "mode",
      "resource",
      "order",
      "eligibility",
      "requests",
      "refunds",
      "history",
    ]) ||
    v.mode !== "integration-test" ||
    v.resource !== "order-lifecycle" ||
    !record(v.order) ||
    !record(v.eligibility)
  )
    return false;
  const o = v.order,
    e = v.eligibility;
  if (
    !exact(o, [
      "id",
      "createdAt",
      "status",
      "paymentStatus",
      "deliveryStatus",
      "returnStatus",
      "refundStatus",
      "orderPaid",
      "fundsReturned",
      "lines",
    ]) ||
    !lifecycleId(o.id) ||
    !date(o.createdAt) ||
    o.status !== "pending" ||
    o.paymentStatus !== "not-initiated" ||
    o.deliveryStatus !== "not-requested" ||
    o.orderPaid !== false ||
    o.fundsReturned !== false ||
    !["not-requested", "requested-for-test"].includes(
      o.returnStatus as string,
    ) ||
    !["not-initiated", "test-attempts-only"].includes(
      o.refundStatus as string,
    ) ||
    !Array.isArray(o.lines) ||
    !o.lines.length ||
    o.lines.length > 100
  )
    return false;
  if (
    !o.lines.every(
      (i) =>
        record(i) &&
        exact(i, [
          "id",
          "title",
          "quantity",
          "unitPriceMinor",
          "lineTotalMinor",
        ]) &&
        lifecycleId(i.id) &&
        txt(i.title, 300) &&
        n(i.quantity, 1) &&
        n(i.unitPriceMinor) &&
        n(i.lineTotalMinor) &&
        BigInt(i.quantity) * BigInt(i.unitPriceMinor) ===
          BigInt(i.lineTotalMinor),
    ) ||
    !unique(o.lines)
  )
    return false;
  if (
    !exact(e, ["cancellation", "returns"]) ||
    ![e.cancellation, e.returns].every((s) =>
      ["policy-required", "request-only", "unavailable"].includes(s as string),
    )
  )
    return false;
  for (const key of ["requests", "refunds", "history"])
    if (!Array.isArray(v[key]) || (v[key] as unknown[]).length > 200)
      return false;
  const lines = o.lines as LifecycleOrder["lines"];
  const requests = v.requests as unknown[],
    refunds = v.refunds as unknown[],
    history = v.history as unknown[];
  if (
    !requests.every(
      (r) =>
        record(r) &&
        exact(r, [
          "id",
          "kind",
          "state",
          "version",
          "reason",
          "items",
          "createdAt",
        ]) &&
        lifecycleId(r.id) &&
        ["cancellation", "return"].includes(r.kind as string) &&
        ["requested", "under-review", "closed-for-test"].includes(
          r.state as string,
        ) &&
        n(r.version, 1) &&
        txt(r.reason, 2000) &&
        date(r.createdAt) &&
        Array.isArray(r.items) &&
        r.items.length <= 100 &&
        (r.kind === "return" ? r.items.length > 0 : r.items.length === 0) &&
        r.items.every(
          (i) =>
            record(i) &&
            exact(i, ["orderLineId", "quantity"]) &&
            lifecycleId(i.orderLineId) &&
            n(i.quantity, 1) &&
            lines.some(
              (l) => l.id === i.orderLineId && l.quantity >= Number(i.quantity),
            ),
        ) &&
        new Set(r.items.map((i) => i.orderLineId)).size === r.items.length,
    )
  )
    return false;
  if (
    !refunds.every(
      (r) =>
        record(r) &&
        exact(r, [
          "id",
          "requestId",
          "paymentOperationId",
          "extent",
          "amountMinor",
          "currency",
          "state",
          "version",
          "basis",
          "realRefund",
          "fundsReturned",
        ]) &&
        lifecycleId(r.id) &&
        lifecycleId(r.requestId) &&
        requests.some(
          (q) => record(q) && q.id === r.requestId && q.kind === "return",
        ) &&
        lifecycleId(r.paymentOperationId) &&
        ["partial", "full"].includes(r.extent as string) &&
        n(r.amountMinor, 1) &&
        r.currency === "UAH" &&
        [
          "prepared",
          "pending",
          "unknown",
          "confirmed-for-test",
          "rejected-for-test",
        ].includes(r.state as string) &&
        n(r.version, 1) &&
        r.basis === "isolated-test-plan" &&
        r.realRefund === false &&
        r.fundsReturned === false,
    )
  )
    return false;
  if (
    !history.every(
      (h, index) =>
        record(h) &&
        exact(h, [
          "id",
          "sequence",
          "requestId",
          "refundId",
          "fromState",
          "toState",
          "version",
          "source",
          "createdAt",
        ]) &&
        lifecycleId(h.id) &&
        n(h.sequence, 1) &&
        (index === 0 ||
          h.sequence > (history[index - 1] as LifecycleHistory).sequence) &&
        n(h.version, 1) &&
        date(h.createdAt) &&
        [
          "immutable-order",
          "customer-request",
          "isolated-review",
          "test-plan",
          "verified-test-event",
        ].includes(h.source as string) &&
        (h.fromState === null || txt(h.fromState, 40)) &&
        txt(h.toState, 40) &&
        (h.requestId === null ||
          requests.some((r) => record(r) && r.id === h.requestId)) &&
        (h.refundId === null ||
          refunds.some((r) => record(r) && r.id === h.refundId)) &&
        !(h.requestId !== null && h.refundId !== null),
    )
  )
    return false;
  const requestStates = ["requested", "under-review", "closed-for-test"],
    refundStates = [
      "prepared",
      "pending",
      "unknown",
      "confirmed-for-test",
      "rejected-for-test",
    ];
  if (
    !history.every((value) => {
      const h = value as LifecycleHistory;
      if (h.requestId !== null)
        return (
          ["customer-request", "isolated-review"].includes(h.source) &&
          requestStates.includes(h.toState) &&
          (h.fromState === null || requestStates.includes(h.fromState))
        );
      if (h.refundId !== null)
        return (
          ["test-plan", "verified-test-event"].includes(h.source) &&
          refundStates.includes(h.toState) &&
          (h.fromState === null || refundStates.includes(h.fromState))
        );
      return (
        h.source === "immutable-order" &&
        h.toState === "pending" &&
        h.fromState === null &&
        h.version === 1
      );
    })
  )
    return false;
  return (
    unique(requests as Record<string, unknown>[]) &&
    unique(refunds as Record<string, unknown>[]) &&
    unique(history as Record<string, unknown>[]) &&
    o.returnStatus ===
      (requests.some((r) => record(r) && r.kind === "return")
        ? "requested-for-test"
        : "not-requested") &&
    o.refundStatus === (refunds.length ? "test-attempts-only" : "not-initiated")
  );
}

export type LifecyclePage = {
  mode: "integration-test";
  resource: "order-lifecycle-list";
  items: { id: string; createdAt: string; status: "pending" }[];
  nextCursor: string | null;
};
export function isLifecyclePage(v: unknown): v is LifecyclePage {
  return (
    record(v) &&
    exact(v, ["mode", "resource", "items", "nextCursor"]) &&
    v.mode === "integration-test" &&
    v.resource === "order-lifecycle-list" &&
    Array.isArray(v.items) &&
    v.items.length <= 100 &&
    unique(v.items) &&
    v.items.every(
      (i) =>
        record(i) &&
        exact(i, ["id", "createdAt", "status"]) &&
        lifecycleId(i.id) &&
        date(i.createdAt) &&
        i.status === "pending",
    ) &&
    (v.nextCursor === null ||
      (typeof v.nextCursor === "string" &&
        /^[A-Za-z0-9_-]{1,150}$/.test(v.nextCursor)))
  );
}
