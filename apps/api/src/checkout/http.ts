import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiError } from '../contracts/foundation.js';
import type { AuthService } from '../auth/service.js';
import { authorize, readJson } from '../auth/http.js';
import { uuid } from '../business/validation.js';
import type { CheckoutBusinessService } from './service.js';
export function isCheckoutPath(path: string) {
  return (
    path === '/api/v1/checkouts' ||
    path.startsWith('/api/v1/checkouts/') ||
    path === '/api/v1/orders' ||
    path.startsWith('/api/v1/orders/')
  );
}
export async function handleCheckout(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
  checkout?: CheckoutBusinessService,
): Promise<unknown> {
  if (!auth || !checkout)
    throw new ApiError(
      503,
      'SERVICE_UNAVAILABLE',
      'Orders and checkout are not configured.',
    );
  const read = request.method === 'GET' || request.method === 'HEAD';
  const principal = await authorize(request, auth, !read);
  const parts = url.pathname.split('/').slice(3);
  const resource = parts[0],
    id = parts[1] === undefined ? undefined : uuid(parts[1]),
    action = parts[2];
  let allowed: string[] = [];
  if (resource === 'orders' && parts.length <= 2) allowed = ['GET', 'HEAD'];
  if (resource === 'checkouts' && parts.length === 1) allowed = ['POST'];
  if (resource === 'checkouts' && parts.length === 2) allowed = ['GET', 'HEAD'];
  if (
    resource === 'checkouts' &&
    parts.length === 3 &&
    ['contact-delivery', 'payment', 'orders'].includes(action)
  )
    allowed = [action === 'orders' ? 'POST' : 'PATCH'];
  if (!allowed.length) throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
  if (!allowed.includes(request.method ?? '')) {
    response.setHeader('allow', allowed.join(', '));
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
  }
  if (!(resource === 'orders' && id === undefined) && url.search)
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'This checkout route does not accept query parameters.',
    );
  if (read) {
    if (
      request.headers['transfer-encoding'] ||
      Number(request.headers['content-length'] ?? 0) !== 0
    )
      throw new ApiError(
        400,
        'INVALID_REQUEST',
        'A read endpoint does not accept a body.',
      );
    if (resource === 'orders')
      return id
        ? checkout.getOrder(principal.userId, id)
        : checkout.listOrders(principal.userId, url.searchParams);
    return checkout.get(principal.userId, id!);
  }
  const body = await readJson(request, response);
  if (!id) return checkout.start(principal.userId, body);
  if (action === 'contact-delivery')
    return checkout.setDelivery(principal.userId, id, body);
  if (action === 'payment')
    return checkout.setPayment(principal.userId, id, body);
  return checkout.recordOrderForTest(principal.userId, id, body);
}
