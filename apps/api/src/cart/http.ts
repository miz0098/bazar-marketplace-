import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiError } from '../contracts/foundation.js';
import type { AuthService } from '../auth/service.js';
import { authorize, readJson } from '../auth/http.js';
import type { CurrentCartService } from './service.js';
export const isCartPath = (path: string) =>
  path === '/api/v1/cart' || path.startsWith('/api/v1/cart/');
export async function handleCart(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
  cart?: CurrentCartService,
) {
  if (!auth)
    throw new ApiError(
      401,
      'AUTH_REQUIRED',
      'Verified server authentication is required.',
    );
  const read = request.method === 'GET' || request.method === 'HEAD',
    principal = await authorize(request, auth, !read);
  if (!cart)
    throw new ApiError(
      503,
      'SERVICE_UNAVAILABLE',
      'Current cart is not configured.',
    );
  if (url.search)
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Cart queries are not accepted.',
    );
  const parts = url.pathname.split('/').slice(4);
  let allowed: string[] = [];
  if (parts.length === 0) allowed = ['GET', 'HEAD', 'POST'];
  if (parts.length === 1 && parts[0] === 'lines') allowed = ['POST'];
  if (parts.length === 2 && parts[0] === 'lines') allowed = ['PATCH', 'DELETE'];
  if (!allowed.length)
    throw new ApiError(404, 'NOT_FOUND', 'Cart route not found.');
  if (!allowed.includes(request.method ?? '')) {
    response.setHeader('allow', allowed.join(', '));
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
  }
  if (read) {
    if (
      request.headers['transfer-encoding'] ||
      Number(request.headers['content-length'] ?? 0) !== 0
    )
      throw new ApiError(
        400,
        'INVALID_REQUEST',
        'A read does not accept a body.',
      );
    return cart.get(principal.userId);
  }
  const body = await readJson(request, response);
  if (parts.length === 0) return cart.ensure(principal.userId, body);
  return cart.mutate(
    principal.userId,
    parts.length === 1 ? 'add' : request.method === 'PATCH' ? 'set' : 'remove',
    body,
    parts[1],
  );
}
