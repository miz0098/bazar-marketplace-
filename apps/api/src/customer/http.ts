import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthService } from '../auth/service.js';
import { authorize, readJson } from '../auth/http.js';
import { ApiError } from '../contracts/foundation.js';
import type { CustomerService } from './service.js';
export const isCustomerPath = (path: string) =>
  path === '/api/v1/wishlist' ||
  path.startsWith('/api/v1/wishlist/') ||
  path === '/api/v1/customer' ||
  path.startsWith('/api/v1/customer/');
export async function handleCustomer(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
  service?: CustomerService,
) {
  if (!service || !auth)
    throw new ApiError(
      503,
      'SERVICE_UNAVAILABLE',
      'Customer foundation is not configured.',
    );
  const read = request.method === 'GET' || request.method === 'HEAD',
    actor = (await authorize(request, auth, !read)).userId;
  if (url.search)
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Customer queries are not accepted.',
    );
  const path = url.pathname,
    profile = path === '/api/v1/customer/profile',
    addresses = path === '/api/v1/customer/addresses',
    reviews = path === '/api/v1/customer/reviews',
    wishlist = path === '/api/v1/wishlist';
  const wish = path.match(/^\/api\/v1\/wishlist\/items\/([^/]+)$/),
    addr = path.match(/^\/api\/v1\/customer\/addresses\/([^/]+)(\/default)?$/),
    review = path.match(/^\/api\/v1\/customer\/reviews\/([^/]+)$/);
  const allowed = profile
    ? ['GET', 'HEAD', 'PATCH']
    : wishlist
      ? ['GET', 'HEAD']
      : addresses || reviews
        ? ['GET', 'HEAD', 'POST']
        : wish
          ? ['PUT', 'DELETE']
          : addr
            ? addr[2]
              ? ['PUT']
              : ['PATCH', 'DELETE']
            : review
              ? ['PATCH', 'DELETE']
              : [];
  if (!allowed.length)
    throw new ApiError(404, 'NOT_FOUND', 'Customer route not found.');
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
    return service.get(
      actor,
      profile
        ? 'profile'
        : wishlist
          ? 'wishlist'
          : addresses
            ? 'addresses'
            : 'reviews',
    );
  }
  const body = await readJson(request, response);
  if (profile) return service.updateProfile(actor, body);
  if (wish)
    return service.wishlist(actor, wish[1], request.method === 'PUT', body);
  if (addresses) return service.createAddress(actor, body);
  if (addr)
    return service.changeAddress(
      actor,
      addr[1],
      body,
      addr[2] ? 'default' : request.method === 'PATCH' ? 'edit' : 'delete',
    );
  if (reviews) return service.createReview(actor, body);
  return service.changeReview(
    actor,
    review![1],
    body,
    request.method === 'PATCH' ? 'edit' : 'delete',
  );
}
