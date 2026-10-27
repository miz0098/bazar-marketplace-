import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthService } from "../auth/service.js";
import { authorize, readJson } from "../auth/http.js";
import { ApiError } from "../contracts/foundation.js";
import { invalid } from "../business/validation.js";
import { historyQuery } from "./input.js";
import type { CommunicationService } from "./service.js";
export const isCommunicationPath = (path: string) =>
  path === "/api/v1/communication" || path.startsWith("/api/v1/communication/");
export async function handleCommunication(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
  service?: CommunicationService,
) {
  if (!auth || !service)
    throw new ApiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Communication foundation is not configured.",
    );
  const read = ["GET", "HEAD"].includes(request.method ?? ""),
    actor = (await authorize(request, auth, !read)).userId;
  const route = url.pathname.slice("/api/v1/communication".length),
    list = route.match(/^\/(conversations|tickets|notifications)$/),
    history = route.match(/^\/(conversations|tickets)\/([^/]+)\/messages$/),
    action = route.match(/^\/conversations\/([^/]+)\/(pin|read)$/),
    notice = route.match(/^\/notifications\/([^/]+)\/read$/);
  const summary = route === "/notifications/summary", all = route === "/notifications/read-all", single=route.match(/^\/notifications\/([^/]+)$/);
  const allowed = summary ? ["GET","HEAD"] : all ? ["PUT"] : single ? ["GET","HEAD"] : list
    ? list[1] === "tickets"
      ? ["GET", "HEAD", "POST"]
      : ["GET", "HEAD"]
    : history
      ? ["GET", "HEAD", "POST"]
      : action || notice
        ? ["PUT"]
        : [];
  if (!allowed.length)
    throw new ApiError(404, "NOT_FOUND", "Communication route not found.");
  if (!allowed.includes(request.method ?? "")) {
    response.setHeader("allow", allowed.join(", "));
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }
  const paged = read && (history || list?.[1] === "notifications");
  if (!paged && url.search) invalid();
  const { before, limit } = historyQuery(
    paged ? url.searchParams : new URLSearchParams(),
  );
  if (read) {
    if (
      request.headers["transfer-encoding"] ||
      Number(request.headers["content-length"] ?? 0) !== 0
    )
      invalid();
    if(summary)return service.notificationSummary(actor);
    if(single)return service.getNotification(actor,single[1]);
    if (history)
      return service.history(
        actor,
        history[2],
        history[1] === "tickets" ? "replies" : "messages",
        before,
        limit,
      );
    return service.list(
      actor,
      list![1] as "conversations" | "tickets" | "notifications",
      before,
      limit,
    );
  }
  const body = await readJson(request, response);
  if(all)return service.readAllNotifications(actor,body);
  if (history)
    return service.send(
      actor,
      history[2],
      history[1] === "tickets" ? "replies" : "messages",
      body,
    );
  if (list) return service.createTicket(actor, body);
  if (notice) return service.readNotification(actor, notice[1], body);
  return action![2] === "pin"
    ? service.pin(actor, action![1], body)
    : service.markRead(actor, action![1], body);
}
