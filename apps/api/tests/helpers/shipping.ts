import type { Carrier, ShippingPoint } from "../../src/contracts/shipping.js";
import type {
  ShippingAdapter,
  ParcelPlan,
} from "../../src/shipping/adapter.js";
/** Explicit synthetic fixtures. Not imported by src or included in production build. */
export function shippingFixture() {
  const state = {
    available: true,
    amount: 7350,
    revision: "synthetic-tariff-1",
    pointRevision: "synthetic-point-1",
    fail: false,
    stall: false,
    calls: 0,
    planRevision: "synthetic-plan-1",
  };
  function point(): ShippingPoint {
    return {
      ref: "synthetic-location",
      cityRef: "synthetic-city",
      name: "Тестовий пункт",
      kind: "branch",
      available: state.available,
      revision: state.pointRevision,
    };
  }
  const adapters: ShippingAdapter[] = (
    ["nova-poshta", "meest"] as Carrier[]
  ).map((carrier) => ({
    scope: "isolated-test",
    carrier,
    pickupKinds: ["branch"],
    async cities() {
      return [{ ref: "synthetic-city", name: "Тестове місто" }];
    },
    async city(ref) {
      return ref === "synthetic-city" ? { ref, name: "Тестове місто" } : null;
    },
    async points() {
      return [point()];
    },
    async point(cityRef, ref) {
      return cityRef === "synthetic-city" && ref === "synthetic-location"
        ? point()
        : null;
    },
    async estimate(_context, signal) {
      state.calls++;
      if (state.fail)
        throw new Error("private-provider-key-and-recipient-must-not-leak");
      if (state.stall)
        await new Promise<void>((_, reject) =>
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          }),
        );
      return {
        amountMinor: state.amount,
        currency: "UAH",
        revision: state.revision,
      };
    },
  }));
  const config = {
    timeoutMs: 100,
    quoteTtlMs: 60000,
    async plan(): Promise<ParcelPlan> {
      return {
        originCityRef: "synthetic-origin",
        massGrams: 500,
        sizeMm: [100, 100, 100],
        revision: state.planRevision,
      };
    },
  };
  return { state, adapters, config };
}
