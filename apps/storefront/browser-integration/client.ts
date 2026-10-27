import { createServerAuthClient } from "../lib/server-auth-client";
import { createServerCartClient } from "../lib/server-cart-client";
import { createCheckoutBusinessClient } from "../lib/checkout-business-client";
import { createCatalogApiClient } from "../lib/catalog-api-client";
import { createShippingBusinessClient } from "../lib/shipping-business-client";
import { createPaymentBusinessClient } from "../lib/payment-business-client";
import { createCustomerBusinessClient } from "../lib/customer-business-client";
import { createOrderLifecycleClient } from "../lib/order-lifecycle-client";
/** Isolated UI entry point only. Credentials stay browser-managed, CSRF in this closure. */
export function browserClients() {
  let csrf = "";
  const auth = createServerAuthClient();
  const capture = async <T extends { csrfToken: string }>(p: Promise<T>) => {
    const value = await p;
    csrf = value.csrfToken;
    return value;
  };
  async function helper<T>(
    path: string,
    body: unknown,
    validate: (v: unknown) => v is T,
  ): Promise<T> {
    const response = await fetch("/__browser/" + path, {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify(body),
    });
    if (
      !response.ok ||
      !response.body ||
      !response.headers.get("content-type")?.startsWith("application/json")
    ) {
      await response.body?.cancel();
      throw new Error("Ізольована дія недоступна.");
    }
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 4096) {
          await reader.cancel();
          throw new Error("Ізольована відповідь завелика.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!validate(value)) throw new Error("Невірна ізольована відповідь.");
    return value;
  }
  return {
    auth: {
      bootstrap: () => capture(auth.bootstrap()),
      start: auth.start,
      verify: (v: Parameters<typeof auth.verify>[0]) => capture(auth.verify(v)),
      session: () => capture(auth.getSession()),
      logout: async () => {
        await auth.logout();
        csrf = "";
      },
    },
    catalog: (origin: string) =>
      createCatalogApiClient({ baseUrl: origin, timeoutMs: 5000 }),
    cart: createServerCartClient(() => csrf),
    checkout: createCheckoutBusinessClient(() => csrf),
    shipping: createShippingBusinessClient(() => csrf),
    payments: createPaymentBusinessClient(() => csrf),
    customer: createCustomerBusinessClient(() => csrf),
    lifecycle: createOrderLifecycleClient(() => csrf),
    code: (challengeId: string) =>
      helper(
        "otp",
        { challengeId },
        (v): v is { code: string } =>
          !!v &&
          typeof v === "object" &&
          Object.keys(v).join(",") === "code" &&
          "code" in v &&
          typeof v.code === "string" &&
          /^\d{6}$/.test(v.code),
      ),
    settle: (operationId: string, result: "succeeded" | "declined") =>
      helper(
        "payment",
        { operationId, result },
        (v): v is { recordedForTest: true } =>
          !!v &&
          typeof v === "object" &&
          Object.keys(v).join(",") === "recordedForTest" &&
          "recordedForTest" in v &&
          v.recordedForTest === true,
      ),
  };
}
