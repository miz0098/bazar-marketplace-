import {handleCatalogV2} from './catalog/http.js';
import type {CatalogV2} from './catalog/service.js';
import {isLifecyclePath,handleLifecycle} from './lifecycle/http.js';
import type {OrderLifecycleService} from './lifecycle/service.js';
import {isCommunicationPath,handleCommunication} from './communication/http.js';
import type {CommunicationService} from './communication/service.js';
import {isCustomerPath,handleCustomer} from './customer/http.js';
import type {CustomerService} from './customer/service.js';
import { isCartPath, handleCart } from './cart/http.js';
import type { CurrentCartService } from './cart/service.js';
import { isPaymentPath, handlePayment } from './payments/http.js';
import type { PaymentService } from './payments/service.js';
import { isCheckoutPath, handleCheckout } from './checkout/http.js';
import { isShippingPath, handleShipping } from './shipping/http.js';
import type { ShippingService } from './shipping/service.js';
import type { CheckoutBusinessService } from './checkout/service.js';
import { promotionPath, handlePromotion } from './promotions/http.js';
import type { PromotionService } from './promotions/service.js';
import { authPaths, handleAuth } from './auth/http.js';
import { RateLimitError } from './auth/rate-limit.js';
import type { AuthService } from './auth/service.js';
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

export function createApiServer(config: ApiConfig, logger: Logger, dependencies: { isReady?: () => boolean | Promise<boolean>; catalogV2?:CatalogV2; catalog?: Catalog; auth?: AuthService; promotions?: PromotionService; checkout?: CheckoutBusinessService; shipping?: ShippingService; payments?: PaymentService; currentCart?: CurrentCartService; customer?:CustomerService; communication?:CommunicationService; lifecycle?:OrderLifecycleService } = {}) {
  if (dependencies.auth && config.environment !== 'test') throw new Error('Test authentication cannot be registered outside an isolated test server');
  if (dependencies.promotions && config.environment !== 'test') throw new Error('Promotion integration cannot be registered outside a test server');
  if (dependencies.checkout && config.environment !== 'test') throw new Error('Checkout integration cannot be registered outside a test server');
  if (dependencies.shipping && config.environment !== 'test') throw new Error('Shipping integration cannot be registered outside a test server');
  if (dependencies.payments && config.environment !== 'test') throw new Error('Payment integration cannot be registered outside a test server');
  if (dependencies.currentCart && config.environment !== 'test') throw new Error('Current cart integration cannot be registered outside a test server');
  if(dependencies.customer&&config.environment!=='test')throw new Error('Customer integration cannot be registered outside a test server');
  if(dependencies.communication&&config.environment!=='test')throw new Error('Communication integration cannot be registered outside a test server');
  if(dependencies.lifecycle&&config.environment!=='test')throw new Error('Order lifecycle cannot be registered outside a test server');
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
      if(url.pathname.startsWith('/api/v1/catalog/')){
        route='/api/v1/products';
        if(draining||!dependencies.isReady||!await dependencies.isReady())throw new ApiError(503,'SERVICE_UNAVAILABLE','Catalog v2 is unavailable.');
        const data=await handleCatalogV2(request,response,url,dependencies.catalogV2,config.corsOrigins,dependencies.auth);reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if(isLifecyclePath(url.pathname)){
        route='/api/v1/order-lifecycle';
        if(draining||(dependencies.lifecycle&&(!dependencies.isReady||!await dependencies.isReady())))throw new ApiError(503,'SERVICE_UNAVAILABLE','Order lifecycle is unavailable.');
        const data=await handleLifecycle(request,response,url,dependencies.auth,dependencies.lifecycle);reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if(isCommunicationPath(url.pathname)){
        route='/api/v1/communication';
        if(draining||(dependencies.communication&&(!dependencies.isReady||!await dependencies.isReady())))throw new ApiError(503,'SERVICE_UNAVAILABLE','Communication foundation is unavailable.');
        const data=await handleCommunication(request,response,url,dependencies.auth,dependencies.communication);reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if(isCustomerPath(url.pathname)){
        route='/api/v1/customer';
        if(draining||(dependencies.customer&&(!dependencies.isReady||!await dependencies.isReady())))throw new ApiError(503,'SERVICE_UNAVAILABLE','Customer foundation is unavailable.');
        const data=await handleCustomer(request,response,url,dependencies.auth,dependencies.customer);reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if(isCartPath(url.pathname)){
        route='/api/v1/cart';
        if(draining || (dependencies.currentCart && (!dependencies.isReady || !await dependencies.isReady())))throw new ApiError(503,'SERVICE_UNAVAILABLE','Current cart is unavailable.');
        const data=await handleCart(request,response,url,dependencies.auth,dependencies.currentCart);
        reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if(isPaymentPath(url.pathname)){
        route='/api/v1/payments';
        if(draining || (dependencies.payments && (!dependencies.isReady || !await dependencies.isReady())))throw new ApiError(503,'SERVICE_UNAVAILABLE','Payments are unavailable.');
        const data=await handlePayment(request,response,url,dependencies.auth,dependencies.payments);
        reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if(isShippingPath(url.pathname)){
        route='/api/v1/delivery';
        if(draining || (dependencies.shipping && (!dependencies.isReady || !await dependencies.isReady())))throw new ApiError(503,'SERVICE_UNAVAILABLE','Delivery is unavailable.');
        const data=await handleShipping(request,response,url,dependencies.auth,dependencies.shipping);
        reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if(isCheckoutPath(url.pathname)){
        route=url.pathname.startsWith('/api/v1/orders')?'/api/v1/orders':'/api/v1/checkouts';
        if(draining || (dependencies.checkout && (!dependencies.isReady || !await dependencies.isReady())))throw new ApiError(503,'SERVICE_UNAVAILABLE','Checkout is unavailable.');
        const data=await handleCheckout(request,response,url,dependencies.auth,dependencies.checkout);
        reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if(url.pathname===promotionPath){
        route='/api/v1/pricing/promotions/evaluate';
        if(draining || (dependencies.promotions && (!dependencies.isReady || !await dependencies.isReady())))throw new ApiError(503,'SERVICE_UNAVAILABLE','Promotion pricing is unavailable.');
        const data=await handlePromotion(request,response,url,dependencies.auth,dependencies.promotions);
        reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      if (authPaths.some(path=>path===url.pathname)) {
        route='/api/v1/auth';
        if(draining || (dependencies.auth && (!dependencies.isReady || !await dependencies.isReady()))) throw new ApiError(503,'SERVICE_UNAVAILABLE','Authentication is unavailable.');
        const data=await handleAuth(request,response,url,dependencies.auth);
        reply(response,method,200,{ok:true,data,meta:{requestId}});return;
      }
      const catalogRoute = url.pathname === '/api/v1/products' || /^\/api\/v1\/products\/[^/]+$/.test(url.pathname) ? '/api/v1/products' : url.pathname === '/api/v1/categories' ? '/api/v1/categories' : undefined;
      const matched = routes.find((item) => item === url.pathname) ?? catalogRoute;
      if (matched) route = matched;
      const origin = request.headers.origin;
      if (origin !== undefined) {
        if (!config.corsOrigins.includes(origin)) throw new ApiError(403, 'CORS_DENIED', 'Origin is not permitted.');
        response.setHeader('access-control-allow-origin', origin);
        response.setHeader('access-control-expose-headers', 'X-Request-Id');
      }

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
      if(error instanceof RateLimitError)response.setHeader('retry-after',String(error.retryAfterSeconds));
      if(request.headers['content-length'] || request.headers['transfer-encoding']) { request.resume(); response.setHeader('connection','close'); }
      if (error.status === 405 && !response.hasHeader('allow')) response.setHeader('allow', 'GET, HEAD, OPTIONS');
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
