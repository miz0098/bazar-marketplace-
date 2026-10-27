import assert from "node:assert/strict";
import test from "node:test";
import { parseResume, readGuest } from "../browser-integration/resume";
const id = "12345678-1234-1234-1234-123456789abc";
test("F15 browser resume stores only bounded opaque intent IDs, never identity or monetary authority", () => {
  const good = {
    version: 1,
    userId: id,
    checkoutId: id,
    attemptId: id,
    confirmation: {
      expectedVersion: 3,
      expectedFingerprint: "a".repeat(64),
      idempotencyKey: id,
      paymentAttemptId: id,
    },
  };
  assert.deepEqual(parseResume(JSON.stringify(good), id), good);
  for (const raw of [
    "bad",
    "[]",
    "null",
    JSON.stringify({ ...good, userId: "other" }),
    JSON.stringify({ ...good, price: 1 }),
    JSON.stringify({ ...good, confirmation: null }),
    JSON.stringify({ ...good, csrfToken: "private" }),
    JSON.stringify({
      ...good,
      confirmation: {
        ...good.confirmation,
        expectedFingerprint: "_".repeat(64),
      },
    }),
    "a".repeat(4097),
  ])
    assert.deepEqual(parseResume(raw, id), { version: 1, userId: id });
  assert.deepEqual(readGuest(JSON.stringify([id, id])), [id]);
  assert.deepEqual(readGuest(JSON.stringify([{ id, price: 1 }])), []);
  assert.deepEqual(readGuest("bad"), []);
});
