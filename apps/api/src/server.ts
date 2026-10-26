import { parseCatalogQuery, type Catalog } from './business/catalog.js';
import { invalid, uuid } from './business/validation.js';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { ApiConfig } from './config.js';
import { ApiError, type ApiFailure, type ApiSuccess, type HealthData, type ReadinessData, type VersionData } from './contracts/foundation.js';
import type { Logger, LogRecord } from './logger.js';

const routes = ['/health', '/ready', '/api/v1'] as const;
const methods = ['GET', 'HEAD'];

function reply(response: ServerResponse, method: string | undefined, status: number, body: ApiSuccess<unknown> | ApiFailure) {
  const json = JSON.stringify(body);
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(json), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-request-id': body.meta.requestId });
  response.end(method === 'HEAD' ? undefined : json);
}

function validateBody(request: IncomingMessage, response: ServerResponse) {
  if (request.headers['transfer-encoding'] || (request.headers['content-length'] && request.headers['content-length'] !== '0')) {
    response.setHeader('connection', 'close');
    request.resume();
    throw new ApiError(400, 'INVALID_REQUEST', 'This endpoint does not accept a request body.');
  }
}

export function createApiServer(config: ApiConfig, logger: Logger, dependencies: { isReady?: () => boolean | Promise<boolean>; catalog?: Catalog } = {}) {
  let draining = false;
  const server = createServer({ maxHeaderSize: 16384, headersTimeout: 10000, requestTimeout: 15000, keepAliveTimeout: 5000 }, async (request, response) => {
    const requestId = randomUUID();
    const start = performance.now();
    const method = request.method;
    let route: LogRecord['route'] = 'unmatched';
    let code: LogRecord['code'];
    response.setHeader('vary', 'Origin');
    response.on('finish', () => logger.write({ event: 'request', requestId, method: method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ? method : 'OTHER', route, status: response.statusCode, durationMs: performance.now() - start, code }));
    try {
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) throw new ApiError(400, 'INVALID_REQUEST', 'Invalid request target.');
      let url: URL;
      try { decodeURIComponent(request.url); url = new URL(request.url, 'http://api.invalid'); } catch { throw new ApiError(400, 'INVALID_REQUEST', 'Invalid request target.'); }
      const catalogRoute = url.pathname === '/api/v1/products' || /^\/api\/v1\/products\/[^/]+$/.test(url.pathname) ? '/api/v1/products' : url.pathname === '/api/v1/categories' ? '/api/v1/categories' : undefined;
      const cartRoute = url.pathname === '/api/v1/cart' || url.pathname.startsWith('/api/v1/cart/');
      const matched = routes.find((item) => item === url.pathname) ?? catalogRoute ?? (cartRoute ? '/api/v1/cart' : undefined);
      if (matched) route = matched;
      const origin = request.headers.origin;
      if (origin !== undefined) {
        if (!config.corsOrigins.includes(origin)) throw new ApiError(403, 'CORS_DENIED', 'Origin is not permitted.');
        response.setHeader('access-control-allow-origin', origin);
        response.setHeader('access-control-expose-headers', 'X-Request-Id');
      }
      // No principal resolver exists. Fail closed without consulting caller-provided identity.
      if (cartRoute) { request.resume(); response.setHeader('connection', 'close'); throw new ApiError(401, 'AUTH_REQUIRED', 'Verified authentication is required; cart API is not enabled.'); }
      validateBody(request, response);
      if (!matched) throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
      if (!catalogRoute && url.search) throw new ApiError(400, 'INVALID_REQUEST', 'This endpoint does not accept query parameters.');
      if (method === 'OPTIONS') {
        if (!origin || !request.headers['access-control-request-method']) throw new ApiError(400, 'INVALID_REQUEST', 'A CORS preflight requires an origin and method.');
        if (!methods.includes(request.headers['access-control-request-method'])) throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
        const headers = request.headers['access-control-request-headers']?.split(',').map((item) => item.trim().toLowerCase()) ?? [];
        if (headers.some((header) => header !== 'content-type')) throw new ApiError(400, 'INVALID_REQUEST', 'Preflight headers are not permitted.');
        response.writeHead(204, { 'access-control-allow-methods': 'GET, HEAD', 'access-control-allow-headers': 'Content-Type', 'access-control-max-age': '600', 'cache-control': 'no-store', vary: 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers', 'x-request-id': requestId });
        response.end(); return;
      }
      if (!methods.includes(method ?? '')) {
        response.setHeader('allow', 'GET, HEAD, OPTIONS');
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
      }
      if (catalogRoute) {
        if (draining || !dependencies.catalog || !dependencies.isReady || !await dependencies.isReady()) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Catalog is temporarily unavailable.');
        let data: unknown;
        try {
          if (catalogRoute === '/api/v1/categories') {
            for (const key of url.searchParams.keys()) if (key !== 'parentId' || url.searchParams.getAll(key).length !== 1) invalid();
            const parent = url.searchParams.get('parentId');
            data = await dependencies.catalog.categories(parent === null ? undefined : parent === 'root' ? null : uuid(parent));
          } else if (url.pathname === catalogRoute) data = await dependencies.catalog.list(parseCatalogQuery(url.searchParams));
          else {
            if (url.search) invalid();
            data = await dependencies.catalog.get(decodeURIComponent(url.pathname.slice('/api/v1/products/'.length)));
            if (!data) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
          }
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Catalog is temporarily unavailable.');
        }
        reply(response, method, 200, { ok: true, data, meta: { requestId } }); return;
      }
      let data: HealthData | ReadinessData | VersionData;
      if (matched === '/health') data = { status: 'ok', scope: 'process', uptimeSeconds: Math.floor(process.uptime()) };
      else if (matched === '/ready') {
        if (draining || !dependencies.isReady || !await dependencies.isReady()) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'PostgreSQL is unavailable or schema is not current.');
        data = { status: 'ready', dependencies: [{ name: 'postgresql', status: 'ready' }], businessModulesAvailable: false };
      } else data = { service: 'bazar-api', apiVersion: 'v1', businessModulesAvailable: false };
      reply(response, method, 200, { ok: true, data, meta: { requestId } });
    } catch (reason) {
      const error = reason instanceof ApiError ? reason : new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
      code = error.code;
      if (error.status === 405) response.setHeader('allow', 'GET, HEAD, OPTIONS');
      reply(response, method, error.status, { ok: false, error: { code: error.code, message: error.message }, meta: { requestId } });
    }
  });
  server.on('clientError', (error, socket) => {
    const requestId = randomUUID();
    const headerOverflow = 'code' in error && error.code === 'HPE_HEADER_OVERFLOW';
    const status = headerOverflow ? 431 : 400;
    const code = headerOverflow ? 'HEADERS_TOO_LARGE' : 'INVALID_REQUEST';
    const body = JSON.stringify({ ok: false, error: { code, message: 'Invalid HTTP request.' }, meta: { requestId } } satisfies ApiFailure);
    logger.write({ event: 'client_error', requestId, status, code });
    if (socket.writable) socket.end(`HTTP/1.1 ${status} ${headerOverflow ? 'Request Header Fields Too Large' : 'Bad Request'}\r\nConnection: close\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nContent-Length: ${Buffer.byteLength(body)}\r\nX-Request-Id: ${requestId}\r\n\r\n${body}`);
  });
  let shutdownPromise: Promise<void> | undefined;
  const shutdown = () => shutdownPromise ??= new Promise<void>((resolve, reject) => {
    draining = true;
    logger.write({ event: 'shutdown' });
    if (!server.listening) { resolve(); return; }
    const timer = setTimeout(() => { server.closeAllConnections(); }, config.shutdownTimeoutMs);
    timer.unref();
    server.close((error) => { clearTimeout(timer); if (error) reject(error); else resolve(); });
    server.closeIdleConnections();
  });
  return { server, shutdown };
}
