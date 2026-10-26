import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { requestInput } from "../src/lifecycle/input.js";
import {
  isLifecycleView,
  isLifecyclePage,
} from "../src/contracts/lifecycle.js";
import { createApiServer } from "../src/server.js";
import { createLogger } from "../src/logger.js";
import { readConfig } from "../src/config.js";
import type { OrderLifecycleService } from "../src/lifecycle/service.js";
const id = "12345678-1234-1234-1234-123456789abc";
test("F14 strict lifecycle inputs reject customer authority, financial values, duplicate lines and unsafe quantities", () => {
  const good = {
    idempotencyKey: id,
    reason: "Synthetic reason",
    items: [{ orderLineId: id, quantity: 1 }],
  };
  assert.equal(requestInput(good, "return").items.length, 1);
  for (const patch of [
    { items: [] },
    { items: [...good.items, ...good.items] },
    { items: [{ orderLineId: id, quantity: 1.5 }] },
    { items: [{ orderLineId: id, quantity: 0 }] },
    { items: [{ orderLineId: "foreign-format", quantity: 1 }] },
    { reason: "\u0344".repeat(1001) },
    { reason: "\u0000" },
    { state: "approved" },
    { userId: id },
    { amountMinor: 1 },
    { delivered: true },
  ])
    assert.throws(() => requestInput({ ...good, ...patch }, "return"), {
      status: 400,
    });
  assert.throws(() => requestInput(good, "cancellation"), { status: 400 });
  assert.equal(isLifecycleView({ mode: "production" }), false);
  assert.equal(
    isLifecyclePage({
      mode: "integration-test",
      resource: "order-lifecycle-list",
      items: [],
      nextCursor: null,
    }),
    true,
  );
});
test("F14 production process and HTTP dependency cannot activate test lifecycle", () => {
  const r = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      "import assert from 'node:assert/strict';import {createOrderLifecycleService} from './src/lifecycle/service.ts';assert.throws(()=>createOrderLifecycleService({}),/isolated test/);",
    ],
    {
      env: { PATH: process.env.PATH, NODE_ENV: "production" },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.throws(
    () =>
      createApiServer(
        readConfig({ NODE_ENV: "production", CORS_ORIGINS: "" }),
        createLogger("error"),
        { lifecycle: {} as OrderLifecycleService },
      ),
    /outside a test server/,
  );
});
