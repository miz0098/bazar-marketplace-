import { createServer, type ServerOptions } from "node:https";
import { request as httpRequest } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
export function requireBrowserTest() {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.BAZAR_BROWSER_INTEGRATION !== "1"
  )
    throw new Error("Browser integration requires isolated test process");
}
export function browserOrigin(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "127.0.0.1" ||
    u.origin !== value
  )
    throw new Error("Browser integration requires loopback HTTPS");
  return u;
}
export function createBrowserGateway(input: {
  origin: string;
  uiPort: number;
  apiPort: () => number;
  tls: ServerOptions;
  helper: (r: IncomingMessage, s: ServerResponse) => Promise<void>;
  control: (r: IncomingMessage, s: ServerResponse) => Promise<void>;
}) {
  requireBrowserTest();
  const origin = browserOrigin(input.origin);
  return createServer(
    {
      ...input.tls,
      maxHeaderSize: 16384,
      requestTimeout: 15000,
      headersTimeout: 10000,
    },
    async (req, res) => {
      const fail = (status: number) => {
        res.writeHead(status, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        res.end(JSON.stringify({ error: "Isolated gateway request denied" }));
        req.resume();
      };
      res.setHeader("cache-control", "no-store");
      res.setHeader("x-content-type-options", "nosniff");
      res.setHeader("x-frame-options", "DENY");
      res.setHeader("referrer-policy", "no-referrer");
      res.setHeader(
        "content-security-policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
      try {
        if (
          req.headers.host !== origin.host ||
          !req.url?.startsWith("/") ||
          req.url.startsWith("//") ||
          req.url.includes("\\")
        )
          return fail(400);
        const url = new URL(req.url, origin);
        decodeURIComponent(url.pathname);
        if (url.pathname.startsWith("/__control/")) {
          await input.control(req, res);
          return;
        }
        const api =
            url.pathname.startsWith("/api/") ||
            url.pathname.startsWith("/__browser/"),
          read = ["GET", "HEAD"].includes(req.method ?? "");
        if (
          Object.keys(req.headers).some(
            (k) =>
              k === "forwarded" ||
              k.startsWith("x-forwarded-") ||
              k === "authorization",
          )
        )
          return fail(403);
        if (api) {
          if (
            req.headers["sec-fetch-site"] !== "same-origin" ||
            (req.headers.origin !== undefined &&
              req.headers.origin !== input.origin) ||
            (!read && req.headers.origin !== input.origin)
          )
            return fail(403);
        }
        if (url.pathname.startsWith("/__browser/")) {
          await input.helper(req, res);
          return;
        }
        if (!api && !read) return fail(405);
        if (api && Number(req.headers["content-length"] ?? 0) > 4096)
          return fail(400);
        const headers: Record<string, string> = { host: origin.host };
        for (const key of [
          "accept",
          "content-type",
          "content-length",
          "origin",
          "sec-fetch-site",
          "x-csrf-token",
          ...(!api
            ? [
                "rsc",
                "next-router-state-tree",
                "next-router-prefetch",
                "next-url",
              ]
            : []),
        ]) {
          const v = req.headers[key];
          if (typeof v === "string") headers[key] = v;
        }
        if (api && req.headers.cookie)
          headers.cookie = req.headers.cookie
            .split(";")
            .filter((p) => /^\s*__Host-bazar-(session|flow)=/.test(p))
            .join(";");
        const upstream = httpRequest(
          {
            host: "127.0.0.1",
            port: api ? input.apiPort() : input.uiPort,
            path: req.url,
            method: req.method,
            headers,
            timeout: 10000,
          },
          (response) => {
            const cookies = response.headers["set-cookie"] ?? [];
            if (
              cookies.some(
                (c) =>
                  !/^__Host-bazar-(session|flow)=/.test(c) ||
                  !/;\s*HttpOnly/i.test(c) ||
                  !/;\s*Secure/i.test(c) ||
                  !/;\s*SameSite=Strict/i.test(c) ||
                  !/;\s*Path=\/(?:;|$)/i.test(c) ||
                  /;\s*Domain=/i.test(c),
              )
            ) {
              response.resume();
              fail(502);
              return;
            }
            res.statusCode = response.statusCode ?? 502;
            for (const key of [
              "content-type",
              "content-encoding",
              "vary",
              "allow",
              "retry-after",
              "x-request-id",
            ]) {
              const v = response.headers[key];
              if (v !== undefined) res.setHeader(key, v);
            }
            if (cookies.length) res.setHeader("set-cookie", cookies);
            response.on("error", () => res.destroy());
            response.pipe(res);
          },
        );
        upstream.on("timeout", () => upstream.destroy());
        upstream.on("error", () => {
          if (!res.headersSent) fail(502);
          else res.destroy();
        });
        req.on("aborted", () => upstream.destroy());
        req.pipe(upstream);
      } catch {
        if (!res.headersSent) fail(400);
        else res.destroy();
      }
    },
  );
}
