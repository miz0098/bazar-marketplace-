import {
  decodeMeestCost,
  meestCitySearch,
  meestBranchSearch,
} from "../src/shipping/meest-contract.js";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  selectInput,
  quoteInput,
  carrier,
  reference,
} from "../src/shipping/input.js";
import { providerCall } from "../src/shipping/adapter.js";
const id = "00000000-0000-0000-0000-000000000001";
test("shipping rejects client money, recipient PII, unknown carriers and unbounded references", () => {
  for (const extra of [
    { cost: 1 },
    { userId: id },
    { recipientPhone: "+380671234567" },
    { apiKey: "forbidden" },
    { expiresAt: "invented" },
  ])
    assert.throws(
      () =>
        selectInput({
          expectedVersion: 1,
          addressId: id,
          kind: "branch",
          ...extra,
        }),
      { status: 400 },
    );
  assert.throws(() => carrier("bazar-pickup"), { status: 400 });
  assert.throws(() => reference("../private?token=secret"), { status: 400 });
  assert.throws(
    () =>
      quoteInput({ expectedVersion: 1, idempotencyKey: id, amountMinor: 0 }),
    { status: 400 },
  );
});
test("provider errors and ignored cancellation become bounded sanitized failures", async () => {
  await assert.rejects(
    providerCall(10, async () => {
      throw new Error("private-provider-token");
    }),
    (e) =>
      e instanceof Error &&
      !e.message.includes("private") &&
      "status" in e &&
      e.status === 503,
  );
  await assert.rejects(
    providerCall(10, () => new Promise(() => {})),
    { status: 503, code: "DELIVERY_UNAVAILABLE" },
  );
});
test("production cannot construct an isolated shipping adapter service", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      "import assert from 'node:assert/strict'; import {createShippingService} from './src/shipping/service.ts'; assert.throws(()=>createShippingService({},[],{}),/isolated test adapters/);",
    ],
    {
      env: { PATH: process.env.PATH, NODE_ENV: "production" },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
});

test("official Meest subset uses documented filters and exact decimal costServices without fabricated currency or expiry", () => {
  assert.equal(
    meestCitySearch("Київ").filters.countryID,
    "c35b6195-4ea3-11de-8591-001d600938f8",
  );
  assert.deepEqual(meestBranchSearch("city-id", "branch-id"), {
    filters: { cityID: "city-id", branchID: "branch-id" },
  });
  assert.equal(
    decodeMeestCost({ status: "ok", result: [{ costServices: "257.12" }] })
      .amountMinor,
    25712,
  );
  for (const costServices of [257.12, "1.001", "-1.00", "90071992547409.92"])
    assert.throws(
      () => decodeMeestCost({ status: "ok", result: [{ costServices }] }),
      { status: 503 },
    );
  assert.throws(
    () =>
      decodeMeestCost({
        status: "error",
        info: { message: "secret" },
        result: [],
      }),
    (e) => e instanceof Error && !e.message.includes("secret"),
  );
});
