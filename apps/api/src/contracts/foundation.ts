export const errorCodes = ['INVALID_REQUEST', 'CORS_DENIED', 'METHOD_NOT_ALLOWED', 'NOT_FOUND', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'HEADERS_TOO_LARGE', 'AUTH_REQUIRED', 'CONFLICT', 'AUTH_FAILED', 'CSRF_DENIED', 'RATE_LIMITED', 'PROMOTION_REJECTED', 'PROMOTION_POLICY_REQUIRED', 'PRICING_CHANGED', 'DELIVERY_UNAVAILABLE', 'DELIVERY_REJECTED', 'DELIVERY_STALE', 'CHECKOUT_REJECTED', 'CHECKOUT_STALE', 'CHECKOUT_POLICY_REQUIRED'] as const;
export type ErrorCode = typeof errorCodes[number];
export type ApiSuccess<T> = Readonly<{ ok: true; data: T; meta: { requestId: string } }>;
export type ApiFailure = Readonly<{ ok: false; error: { code: ErrorCode; message: string }; meta: { requestId: string } }>;
export type HealthData = Readonly<{ status: 'ok'; scope: 'process'; uptimeSeconds: number }>;
export type ReadinessData = Readonly<{ status: 'ready'; dependencies: readonly [{ name: 'postgresql'; status: 'ready' }]; businessModulesAvailable: false }>;
export type VersionData = Readonly<{ service: 'bazar-api'; apiVersion: 'v1'; businessModulesAvailable: false }>;

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode, message: string) { super(message); this.name = 'ApiError'; }
}
