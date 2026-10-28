import {verifyPreviewBody} from './preview-context.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiError } from '../contracts/foundation.js';
import { uuid } from '../business/validation.js';
import { phone, requireCsrf } from './crypto.js';
import type { AuthService } from './service.js';

import { strictObject as object, registration } from './input.js';

export const authPaths = [
  '/api/v1/auth/csrf',
  '/api/v1/auth/otp/challenges',
  '/api/v1/auth/otp/verify',
  '/api/v1/auth/session',
  '/api/v1/users/me',
  '/api/v1/auth/logout',
  '/api/v1/auth/logout-all',
] as const;
export const sessionCookie = '__Host-bazar-session';
export const flowCookie = '__Host-bazar-flow';
const invalid = (): never => {
  throw new ApiError(400, 'INVALID_REQUEST', 'Invalid authentication request.');
};
export function cookies(request: IncomingMessage): {
  token: string;
  flow: string;
} {
  const result: { token: string; flow: string } = { token: '', flow: '' };
  const seen = new Set<string>();
  for (const part of request.headers.cookie?.split(';') ?? []) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    const name = part.slice(0, at).trim();
    if (name !== sessionCookie && name !== flowCookie) continue;
    if (seen.has(name))
      throw new ApiError(403, 'CSRF_DENIED', 'Request verification failed.');
    seen.add(name);
    result[name === sessionCookie ? 'token' : 'flow'] = part
      .slice(at + 1)
      .trim();
  }
  return result;
}
function cookie(name: string, value: string, seconds: number) {
  return `${name}=${value}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Strict`;
}
export function requireOrigin(request: IncomingMessage, auth: AuthService) {
  const origin = request.headers.origin,
    site = request.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin')
    throw new ApiError(403, 'CSRF_DENIED', 'Request origin is not permitted.');
  const safeRead = request.method === 'GET' || request.method === 'HEAD';
  if (origin === auth.config.publicOrigin) return;
  if (
    origin === undefined &&
    safeRead &&
    site === 'same-origin' &&
    request.headers.host === new URL(auth.config.publicOrigin).host
  )
    return;
  throw new ApiError(403, 'CSRF_DENIED', 'Request origin is not permitted.');
}
export async function authorize(
  request: IncomingMessage,
  auth: AuthService,
  mutation: boolean,
) {
  requireOrigin(request, auth);
  const c = cookies(request);
  if (mutation)
    requireCsrf(auth.config, c.flow, request.headers['x-csrf-token']);
  return auth.principal(c.token, c.flow);
}
export async function readJson(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<unknown> {
  if (
    !/^application\/json(?:;\s*charset=utf-8)?$/i.test(
      request.headers['content-type'] ?? '',
    ) ||
    request.headers['content-encoding']
  )
    invalid();
  if (Number(request.headers['content-length'] ?? 0) > 4096) invalid();
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    const clean = () => {
      clearTimeout(timer);
      request.off('data', data);
      request.off('end', end);
      request.off('error', error);
      request.off('aborted', aborted);
    };
    const error = () => {
      request.once('error', () => {});
      clean();
      response.setHeader('connection', 'close');
      request.resume();
      reject(
        new ApiError(400, 'INVALID_REQUEST', 'Invalid authentication body.'),
      );
    };
    const aborted = () => error();
    const data = (chunk: Buffer) => {
      size += chunk.length;
      if (size > 4096) error();
      else chunks.push(chunk);
    };
    const end = () => {
      clean();
      try {
        verifyPreviewBody(request,Buffer.concat(chunks));
        resolve(
          JSON.parse(
            new TextDecoder('utf-8', { fatal: true }).decode(
              Buffer.concat(chunks),
            ),
          ),
        );
      } catch (e) {
        reject(e instanceof ApiError?e:new ApiError(400, 'INVALID_REQUEST', 'Invalid JSON body.'));
      }
    };
    const timer = setTimeout(error, 2000);
    timer.unref();
    request.on('data', data);
    request.once('end', end);
    request.once('error', error);
    request.once('aborted', aborted);
  });
}
export async function handleAuth(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
): Promise<unknown> {
  if (!auth) {
    request.resume();
    response.setHeader('connection', 'close');
    throw new ApiError(
      503,
      'SERVICE_UNAVAILABLE',
      'SMS authentication is not configured.',
    );
  }
  requireOrigin(request, auth);
  if (url.search) invalid();
  const read = [
    '/api/v1/auth/csrf',
    '/api/v1/auth/session',
    '/api/v1/users/me',
  ].includes(url.pathname);
  const allowed = read ? ['GET', 'HEAD'] : ['POST'];
  if (!allowed.includes(request.method ?? '')) {
    response.setHeader('allow', allowed.join(', '));
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
  }
  const c = cookies(request);
  if (read) {
    if (
      request.headers['transfer-encoding'] ||
      Number(request.headers['content-length'] ?? 0) !== 0
    )
      invalid();
    if (url.pathname === '/api/v1/auth/csrf') {
      const boot = auth.bootstrap(c.flow);
      response.setHeader(
        'set-cookie',
        cookie(flowCookie, boot.flow, auth.config.policy.flowTtlSeconds),
      );
      return { csrfToken: boot.csrfToken, mode: 'test-only' };
    }
    const principal = await auth.principal(c.token, c.flow);
    return url.pathname === '/api/v1/users/me'
      ? principal.data.user
      : principal.data;
  }
  requireCsrf(auth.config, c.flow, request.headers['x-csrf-token']);
  const body = await readJson(request, response);
  const clientAddress = request.socket.remoteAddress ?? 'unknown'; // Never trust X-Forwarded-For / X-User-Id.
  if (url.pathname === '/api/v1/auth/otp/challenges') {
    const value = object(body, ['phone', 'intent']);
    phone(value.phone);
    if (value.intent !== 'login' && value.intent !== 'register') invalid();
    return auth.challenge(
      {
        phone: value.phone as string,
        intent: value.intent as 'login' | 'register',
      },
      c.flow,
      clientAddress,
    );
  }
  if (url.pathname === '/api/v1/auth/otp/verify') {
    const value = object(body, ['challengeId', 'code', 'profile']);
    const challengeId = uuid(value.challengeId);
    if (typeof value.code !== 'string' || !/^\d{6}$/.test(value.code))
      invalid();
    const result = await auth.verify(
      {
        challengeId,
        code: value.code as string,
        profile:
          value.profile === undefined ? undefined : registration(value.profile),
      },
      c.flow,
      clientAddress,
      c.token,
    );
    response.setHeader('set-cookie', [
      cookie(sessionCookie, result.token, auth.config.policy.sessionTtlSeconds),
      cookie(flowCookie, result.flow, auth.config.policy.flowTtlSeconds),
    ]);
    return result.data;
  }
  object(body, []);
  const principal = await auth.principal(c.token, c.flow);
  const result = await auth.revoke(
    principal,
    url.pathname === '/api/v1/auth/logout-all',
  );
  response.setHeader('set-cookie', [
    cookie(sessionCookie, '', 0),
    cookie(flowCookie, '', 0),
  ]);
  return result;
}
