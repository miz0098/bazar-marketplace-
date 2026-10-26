import { ApiError } from "../contracts/foundation.js";
import type {
  Carrier,
  PickupKind,
  ShippingCity,
  ShippingPoint,
} from "../contracts/shipping.js";
/** Server-owned synthetic plan. Real origins, packaging/weight/declared-value rules are not approved. */
export interface ParcelPlan {
  originCityRef: string;
  massGrams: number;
  sizeMm: readonly [number, number, number];
  revision: string;
}
export interface QuoteContext {
  plan: ParcelPlan;
  cityRef: string;
  pointRef: string;
  kind: PickupKind;
  merchandiseSubtotalMinor: number;
}
/** No wire fields or live credentials are inferred by this normalized seam. */
export interface ShippingAdapter {
  scope: "isolated-test";
  carrier: Carrier;
  pickupKinds: readonly PickupKind[];
  cities(query: string, signal: AbortSignal): Promise<readonly ShippingCity[]>;
  city(ref: string, signal: AbortSignal): Promise<ShippingCity | null>;
  points(
    cityRef: string,
    kind: PickupKind,
    signal: AbortSignal,
  ): Promise<readonly ShippingPoint[]>;
  point(
    cityRef: string,
    pointRef: string,
    kind: PickupKind,
    signal: AbortSignal,
  ): Promise<ShippingPoint | null>;
  estimate(
    context: QuoteContext,
    signal: AbortSignal,
  ): Promise<{ amountMinor: number; currency: "UAH"; revision: string }>;
}
export const unavailable = () =>
  new ApiError(
    503,
    "DELIVERY_UNAVAILABLE",
    "Delivery provider is unavailable.",
  );
export const rejected = () =>
  new ApiError(
    409,
    "DELIVERY_REJECTED",
    "The delivery point or method is unavailable.",
  );
export const expired = () =>
  new ApiError(
    409,
    "DELIVERY_STALE",
    "Delivery selection or estimate has changed; request a new estimate.",
  );
export async function providerCall<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => run(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(unavailable());
        }, timeoutMs);
      }),
    ]);
  } catch {
    throw unavailable();
  } finally {
    clearTimeout(timer);
  }
}
