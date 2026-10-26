import type { IncomingMessage, ServerResponse } from "node:http";
import { authorize, readJson } from "../auth/http.js";
import type { AuthService } from "../auth/service.js";
import { ApiError } from "../contracts/foundation.js";
import { invalid } from "../business/validation.js";
import type { OrderLifecycleService } from "./service.js";
export const isLifecyclePath = (s: string) =>
  s === "/api/v1/order-lifecycle" || s.startsWith("/api/v1/order-lifecycle/");
export async function handleLifecycle(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
  service?: OrderLifecycleService,
) {
  if (!auth || !service)
    throw new ApiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Order lifecycle is not configured.",
    );
  const read = ["GET", "HEAD"].includes(request.method ?? ""),
    actor = (await authorize(request, auth, !read)).userId;
  const list = url.pathname === "/api/v1/order-lifecycle/orders",
    match = url.pathname.match(
      /^\/api\/v1\/order-lifecycle\/orders\/([^/]+)(\/(cancellations|returns))?$/,
    );
  if (!list && !match)
    throw new ApiError(404, "NOT_FOUND", "Order lifecycle route not found.");
  const allowed = match?.[3] ? ["POST"] : ["GET", "HEAD"];
  if (!allowed.includes(request.method ?? "")) {
    response.setHeader("allow", allowed.join(", "));
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }
  if (!list && url.search) invalid();
  if (read) {
    if (
      request.headers["transfer-encoding"] ||
      Number(request.headers["content-length"] ?? 0) !== 0
    )
      invalid();
    return list
      ? service.list(actor, url.searchParams)
      : service.get(actor, match![1]);
  }
  return service.request(
    actor,
    match![1],
    match![3] === "returns" ? "return" : "cancellation",
    await readJson(request, response),
  );
}
