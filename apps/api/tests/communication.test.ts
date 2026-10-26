import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  messageBody,
  sendInput,
  ticketInput,
  historyQuery,
} from "../src/communication/input.js";
import {
  isCommunicationView,
  notificationKinds,
} from "../src/contracts/communication.js";
import { createApiServer } from "../src/server.js";
import { readConfig } from "../src/config.js";
import { createLogger } from "../src/logger.js";
import type { CommunicationService } from "../src/communication/service.js";
test("F13 strict message/ticket/cursor inputs reject owner, status, attachment and cursor overrides", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  assert.equal(messageBody("  Приклад\nтексту  "), "Приклад\nтексту");
  for (const body of ["", " ", "a".repeat(2001), "a\u0000b", {}, null])
    assert.throws(() => messageBody(body), { status: 400 });
  for (const field of [
    "senderId",
    "userId",
    "attachment",
    "delivered",
    "status",
  ])
    assert.throws(
      () => sendInput({ clientMessageId: id, body: "Example", [field]: id }),
      { status: 400 },
    );
  assert.equal(
    ticketInput({
      clientRequestId: id,
      subject: "Example",
      category: "other",
      body: "Sample",
    }).category,
    "other",
  );
  for (const patch of [
    { category: "staff" },
    { category: { toString: "invalid" } },
    { subject: "tiny" },
    { body: " " },
    { status: "closed" },
  ])
    assert.throws(
      () =>
        ticketInput({
          clientRequestId: id,
          subject: "Example",
          category: "other",
          body: "Sample",
          ...patch,
        }),
      { status: 400 },
    );
  for (const query of [
    "limit=0",
    "limit=101",
    "limit=1&limit=2",
    "before=-1",
    "before=1e3",
    "before=9007199254740992",
    "userId=x",
  ])
    assert.throws(() => historyQuery(new URLSearchParams(query)), {
      status: 400,
    });
  assert.deepEqual(historyQuery(new URLSearchParams("limit=2&before=7")), {
    limit: 2,
    before: 7,
  });
});
test("F13 response validation enforces isolated scope, chronology, counters and no delivery claim", () => {
  const id = "12345678-1234-1234-1234-123456789abc",
    item = {
      id,
      sequence: 1,
      author: "self",
      body: "Test",
      createdAt: "2026-10-26T12:00:00.000Z",
      clientMessageId: id,
    };
  const view = {
    mode: "integration-test",
    resource: "messages",
    scopeId: id,
    items: [item],
    nextBefore: null,
    unreadChats: null,
  };
  assert.ok(isCommunicationView(view));
  for (const patch of [
    { mode: "production" },
    { scopeId: null },
    { delivered: true },
    { items: [{ ...item, body: "" }] },
    { items: [{ ...item, token: "private" }] },
    { items: [item, item] },
    { nextBefore: 2 },
  ])
    assert.equal(isCommunicationView({ ...view, ...patch }), false);
  const chat = {
    id,
    pinned: false,
    unread: true,
    lastReadSequence: 0,
    lastSequence: 2,
    preview: "Test",
    updatedAt: item.createdAt,
  };
  const chats = {
    mode: "integration-test",
    resource: "conversations",
    scopeId: null,
    items: [chat],
    nextBefore: null,
    unreadChats: 1,
  };
  assert.ok(isCommunicationView(chats));
  assert.equal(isCommunicationView({ ...chats, unreadChats: 2 }), false);
  assert.equal(notificationKinds.length, 8);
});
test("F13 service and HTTP composition refuse ordinary production activation", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      "import assert from 'node:assert/strict';import {createCommunicationService} from './src/communication/service.ts';assert.throws(()=>createCommunicationService({}),/isolated test/);",
    ],
    {
      env: { PATH: process.env.PATH, NODE_ENV: "production" },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.throws(
    () =>
      createApiServer(
        readConfig({ NODE_ENV: "production", CORS_ORIGINS: "" }),
        createLogger("error"),
        { communication: {} as CommunicationService },
      ),
    /outside a test server/,
  );
});

test("F13 normalized Unicode length is validated before PostgreSQL writes", () => {
  assert.throws(() => messageBody("\u0344".repeat(1001)), { status: 400 });
  assert.throws(() => ticketInput({clientRequestId:"12345678-1234-1234-1234-123456789abc",subject:"\u0344".repeat(61),category:"other",body:"Example"}), {status:400});
});
