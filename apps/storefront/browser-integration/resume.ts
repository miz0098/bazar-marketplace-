import type { IntegratedConfirmationInput } from "../services/contracts/checkout-business";
export const RESUME_KEY = "bazar-browser-checkout-v1",
  GUEST_KEY = "bazar-browser-guest-v1";
export type BrowserResume = {
  version: 1;
  userId: string;
  startKey?: string;
  checkoutId?: string;
  attemptId?: string;
  confirmation?: IntegratedConfirmationInput;
};
const id = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function parseResume(raw: string | null, userId: string): BrowserResume {
  try {
    if (!raw || raw.length > 4096) throw new Error();
    const v = JSON.parse(raw) as BrowserResume;
    if (
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).some(
        (k) =>
          ![
            "version",
            "userId",
            "startKey",
            "checkoutId",
            "attemptId",
            "confirmation",
          ].includes(k),
      ) ||
      v.version !== 1 ||
      v.userId !== userId ||
      !id(v.userId) ||
      [v.startKey, v.checkoutId, v.attemptId].some(
        (x) => x !== undefined && !id(x),
      )
    )
      throw new Error();
    const c = v.confirmation;
    if (
      c !== undefined &&
      (typeof c !== "object" ||
        Array.isArray(c) ||
        Object.keys(c).sort().join(",") !==
          "expectedFingerprint,expectedVersion,idempotencyKey,paymentAttemptId" ||
        !Number.isSafeInteger(c.expectedVersion) ||
        c.expectedVersion < 1 ||
        !id(c.idempotencyKey) ||
        !id(c.paymentAttemptId) ||
        !/^[a-f0-9]{64}$/.test(c.expectedFingerprint))
    )
      throw new Error();
    return v;
  } catch {
    return { version: 1, userId };
  }
}
export function readGuest(raw: string | null): string[] {
  try {
    if (!raw || raw.length > 16384) throw new Error();
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || v.length > 100 || v.some((i) => !id(i)))
      throw new Error();
    return [...new Set(v)] as string[];
  } catch {
    return [];
  }
}
