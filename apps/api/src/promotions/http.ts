import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiError } from '../contracts/foundation.js';
import type { AuthService } from '../auth/service.js';
import { authorize, readJson } from '../auth/http.js';
import { promotionInput } from './input.js';
import type { PromotionService } from './service.js';
export const promotionPath = '/api/v1/pricing/promotions/evaluate';
export async function handlePromotion(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth?: AuthService,
  promotions?: PromotionService,
) {
  if (!auth || !promotions)
    throw new ApiError(
      503,
      'SERVICE_UNAVAILABLE',
      'Promotion pricing is not configured.',
    );
  const principal = await authorize(request, auth, true);
  if (request.method !== 'POST') {
    response.setHeader('allow', 'POST');
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
  }
  if (url.search)
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Promotion evaluation does not accept query parameters.',
    );
  const input = promotionInput(await readJson(request, response));
  return promotions.evaluate(principal.userId, input);
}
