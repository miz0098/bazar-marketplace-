import assert from "node:assert/strict";
import test from "node:test";
import {
  createShippingBusinessClient,
  ShippingClientError,
} from "../lib/shipping-business-client";
const id = "00000000-0000-0000-0000-000000000001";
function response(data: unknown) {
  return new Response(
    JSON.stringify({ ok: true, data, meta: { requestId: id } }),
    { headers: { "content-type": "application/json" } },
  );
}
test("shipping client preserves cookie/CSRF boundaries and accepts only explicit test estimates", async () => {
  const quote = {
    mode: "integration-test",
    id,
    checkoutId: id,
    checkoutVersion: 2,
    carrier: "meest",
    kind: "branch",
    cost: { amountMinor: 7350, currency: "UAH" },
    quotedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:01:00.000Z",
    validitySource: "integration-policy",
    binding: "a".repeat(64),
    status: "estimate-for-test",
    canCreateShipment: false,
  };
  let sent: RequestInit | undefined;
  const transport: typeof fetch = async (path, init) => {
    assert.equal(path, `/api/v1/delivery/checkouts/${id}/quotes`);
    sent = init;
    return response({ quote, replayed: false });
  };
  const client = createShippingBusinessClient(() => "a".repeat(43), transport);
  assert.equal(
    (await client.quote(id, { expectedVersion: 2, idempotencyKey: id })).quote
      .cost.amountMinor,
    7350,
  );
  assert.equal(sent?.credentials, "same-origin");
  assert.equal(sent?.redirect, "error");
  assert.equal(sent?.cache, "no-store");
  assert.equal(new Headers(sent?.headers).get("x-csrf-token"), "a".repeat(43));
  assert.equal(
    sent?.body,
    JSON.stringify({ expectedVersion: 2, idempotencyKey: id }),
  );
  for (const patch of [
    { mode: "production" },
    { canCreateShipment: true },
    { status: "booked" },
    { cost: { amountMinor: -1, currency: "UAH" } },
    { expiresAt: quote.quotedAt },
  ]) {
    const bad = createShippingBusinessClient(
      () => "a".repeat(43),
      async () => response({ quote: { ...quote, ...patch }, replayed: false }),
    );
    await assert.rejects(
      bad.quote(id, { expectedVersion: 2, idempotencyKey: id }),
      { code: "invalid-response" },
    );
  }
});
test("shipping client refuses invented BAZAR availability, wrong points and private upstream errors without fallback", async () => {
  const client = createShippingBusinessClient(
    () => "a".repeat(43),
    async () =>
      response({
        mode: "integration-test",
        carriers: [],
        bazarPickup: { available: true },
      }),
  );
  await assert.rejects(client.carriers(), { code: "invalid-response" });
  const bad = createShippingBusinessClient(
    () => "a".repeat(43),
    async () =>
      response({
        mode: "integration-test",
        carrier: "meest",
        items: [
          {
            ref: "point",
            cityRef: "another-city",
            name: "Wrong",
            kind: "branch",
            available: true,
            revision: "1",
          },
        ],
      }),
  );
  await assert.rejects(
    bad.points({ carrier: "meest", cityRef: "city", kind: "branch" }),
    { code: "invalid-response" },
  );
  let calls = 0;
  const offline = createShippingBusinessClient(
    () => "a".repeat(43),
    async () => {
      calls++;
      return new Response("private-provider-key", { status: 503 });
    },
  );
  await assert.rejects(
    offline.carriers(),
    (e) =>
      e instanceof ShippingClientError &&
      e.status === 503 &&
      !e.message.includes("private"),
  );
  assert.equal(calls, 1);
  assert.throws(() => offline.getSelection("../orders"), {
    code: "invalid-input",
  });
});
