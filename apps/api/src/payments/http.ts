import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthService } from '../auth/service.js';
import { authorize, readJson } from '../auth/http.js';
import { ApiError } from '../contracts/foundation.js';
import { uuid } from '../business/validation.js';
import type { PaymentService } from './service.js';
export const isPaymentPath = (path: string) =>
  path === '/api/v1/payments' || path.startsWith('/api/v1/payments/');
export async function rawBody(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<Uint8Array> {
  if (
    !/^application\/json(?:;\s*charset=utf-8)?$/i.test(
      request.headers['content-type'] ?? '',
    ) ||
    request.headers['content-encoding'] ||
    Number(request.headers['content-length'] ?? 0) > 4096
  )
    throw new ApiError(400, 'INVALID_REQUEST', 'Invalid payment event body.');
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    const clean = () => {
      clearTimeout(timer);
      request.off('data', data);
      request.off('end', end);
      request.off('error', failed);
      request.off('aborted', failed);
    };
    const failed = () => {
      clean();
      response.setHeader('connection', 'close');
      request.once('error', () => {});
      request.resume();
      reject(
        new ApiError(400, 'INVALID_REQUEST', 'Invalid payment event body.'),
      );
    };
    const data = (chunk: Buffer) => {
      size += chunk.length;
      if (size > 4096) failed();
      else chunks.push(chunk);
    };
    const end = () => {
      clean();
      resolve(Buffer.concat(chunks));
    };
    const timer = setTimeout(failed, 2000);
    request.on('data', data);
    request.once('end', end);
    request.once('error', failed);
    request.once('aborted', failed);
  });
}
export async function handlePayment(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
  payments?: PaymentService,
) {
  if (!auth || !payments)
    throw new ApiError(
      503,
      'SERVICE_UNAVAILABLE',
      'Payments are not configured.',
    );
  if (url.search)
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Payment queries are not accepted.',
    );
  if (url.pathname === '/api/v1/payments/webhooks/isolated') {
    if (request.method !== 'POST') {
      response.setHeader('allow', 'POST');
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    }
    const signature = request.headers['x-isolated-signature'];
    if (typeof signature !== 'string' || signature.length > 300)
      throw new ApiError(
        401,
        'PAYMENT_AUTH_FAILED',
        'Payment event authentication failed.',
      );
    const result = await payments.webhook(
      await rawBody(request, response),
      signature,
    );
    return {
      mode: 'integration-test',
      receivedForTest: true,
      replayed: result.replayed,
    };
  }
  const read = request.method === 'GET' || request.method === 'HEAD';
  const principal = await authorize(request, auth, !read),
    parts = url.pathname.split('/').slice(4);
  let allowed: string[] = [];
  if (parts.length === 1 && parts[0] === 'capabilities')
    allowed = ['GET', 'HEAD'];
  if (parts.length === 1 && parts[0] === 'attempts') allowed = ['POST'];
  if (parts.length === 2 && parts[0] === 'attempts') allowed = ['GET', 'HEAD'];
  if (
    parts.length === 3 &&
    parts[0] === 'attempts' &&
    ['reconcile', 'cancel'].includes(parts[2])
  )
    allowed = ['POST'];
  if (!allowed.length) throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
  if (!allowed.includes(request.method ?? '')) {
    response.setHeader('allow', allowed.join(', '));
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
  }
  if (read) {
    if (
      request.headers['transfer-encoding'] ||
      Number(request.headers['content-length'] ?? 0) !== 0
    )
      throw new ApiError(400, 'INVALID_REQUEST', 'A read accepts no body.');
    return parts[0] === 'capabilities'
      ? payments.capabilities()
      : payments.get(principal.userId, uuid(parts[1]));
  }
  const body = await readJson(request, response);
  if (parts.length === 1) return payments.create(principal.userId, body);
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).length
  )
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Only an empty operation body is accepted.',
    );
  return parts[2] === 'cancel'
    ? payments.cancel(principal.userId, uuid(parts[1]))
    : payments.reconcile(principal.userId, uuid(parts[1]));
}
