import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  IsolatedLifecyclePolicy,
  IsolatedRefundAdapter,
  RefundObservation,
} from "../../src/lifecycle/adapter.js";
/** Synthetic policy/signatures only, excluded from compiled src. No real financial rule. */
export function lifecycleFixture() {
  const key = randomBytes(32),
    state = {
      allowed: true,
      review: true,
      amount: 9000,
      revision: "synthetic-plan",
      denyPlan: false,
      stall: false,
    };
  const policy: IsolatedLifecyclePolicy = {
    scope: "isolated-test",
    canRequest: () => state.allowed,
    canReview: () => state.review,
    refundPlan: ({ extent, paymentAmountMinor }) =>
      state.denyPlan
        ? null
        : {
            amountMinor: extent === "full" ? paymentAmountMinor : state.amount,
            currency: "UAH",
            revision: state.revision,
          },
  };
  const adapter: IsolatedRefundAdapter = {
    scope: "isolated-test",
    name: "isolated-payment",
    accountRef: "synthetic-merchant",
    async verify(raw, signature, signal) {
      if (state.stall)
        await new Promise((_, reject) =>
          signal.addEventListener("abort", () => reject(new Error("timeout")), {
            once: true,
          }),
        );
      const match = /^(\d{13})\.([0-9a-f]{64})$/.exec(signature);
      if (!match || Math.abs(Date.now() - Number(match[1])) > 300000)
        throw new Error("unverified");
      const expected = createHmac("sha256", key)
        .update(match[1] + ".")
        .update(raw)
        .digest();
      if (!timingSafeEqual(expected, Buffer.from(match[2], "hex")))
        throw new Error("unverified");
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(raw),
      ) as RefundObservation;
    },
  };
  const signed = (event: unknown, time = Date.now()) => {
    const raw = Buffer.from(JSON.stringify(event));
    return {
      raw,
      signature:
        time +
        "." +
        createHmac("sha256", key)
          .update(String(time) + ".")
          .update(raw)
          .digest("hex"),
    };
  };
  return { state, policy, adapter, signed };
}
