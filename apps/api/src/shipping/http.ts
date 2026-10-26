import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthService } from "../auth/service.js";
import { authorize, readJson } from "../auth/http.js";
import { ApiError } from "../contracts/foundation.js";
import { uuid } from "../business/validation.js";
import type { ShippingService } from "./service.js";
export function isShippingPath(path: string) {
  return path === "/api/v1/delivery" || path.startsWith("/api/v1/delivery/");
}
export async function handleShipping(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
  shipping?: ShippingService,
) {
  if (!auth || !shipping)
    throw new ApiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Delivery is not configured.",
    );
  const read = request.method === "GET" || request.method === "HEAD";
  const principal = await authorize(request, auth, !read);
  if (url.search)
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      "Delivery queries use bounded JSON bodies.",
    );
  const parts = url.pathname.split("/").slice(4),
    resource = parts[0];
  let allowed: string[] = [];
  if (parts.length === 1 && resource === "carriers") allowed = ["GET", "HEAD"];
  if (parts.length === 1 && ["cities", "points"].includes(resource))
    allowed = ["POST"];
  if (parts.length === 3 && resource === "checkouts") {
    if (parts[2] === "selection") allowed = ["GET", "HEAD", "PATCH"];
    if (["quotes", "check"].includes(parts[2])) allowed = ["POST"];
  }
  if (!allowed.length) throw new ApiError(404, "NOT_FOUND", "Route not found.");
  if (!allowed.includes(request.method ?? "")) {
    response.setHeader("allow", allowed.join(", "));
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }
  if (read) {
    if (
      request.headers["transfer-encoding"] ||
      Number(request.headers["content-length"] ?? 0) !== 0
    )
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "A read does not accept a body.",
      );
    return resource === "carriers"
      ? shipping.carriers()
      : shipping.getSelection(principal.userId, uuid(parts[1]));
  }
  const body = await readJson(request, response);
  if (resource === "cities") return shipping.cities(body);
  if (resource === "points") return shipping.points(body);
  const id = uuid(parts[1]);
  if (parts[2] === "selection")
    return shipping.select(principal.userId, id, body);
  if (parts[2] === "quotes") return shipping.quote(principal.userId, id, body);
  return shipping.check(principal.userId, id, body);
}
