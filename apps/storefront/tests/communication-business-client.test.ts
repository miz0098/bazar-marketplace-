import assert from "node:assert/strict";
import test from "node:test";
import { createCommunicationBusinessClient } from "../lib/communication-business-client";
import {
  isCommunicationView,
  notificationKinds,
} from "../services/contracts/communication-business";
const id = "12345678-1234-1234-1234-123456789abc";
const reply = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data, meta: { requestId: id } }), {
    headers: { "content-type": "application/json" },
  });
const empty = {
  mode: "integration-test",
  resource: "conversations",
  scopeId: null,
  items: [],
  nextBefore: null,
  unreadChats: 0,
};
test("F13 client uses bounded same-origin cookies and CSRF without retry/fallback or private URL parameters", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const client = createCommunicationBusinessClient(
    () => "a".repeat(43),
    async (url, init) => {
      calls.push({ url: String(url), init });
      return reply(empty);
    },
  );
  await client.conversations();
  assert.equal(calls[0].url, "/api/v1/communication/conversations");
  assert.equal(calls[0].init?.credentials, "same-origin");
  assert.equal(calls[0].init?.cache, "no-store");
  assert.equal(calls[0].init?.redirect, "error");
  await assert.rejects(client.pin(id, true), { code: "invalid-response" });
  assert.equal(
    new Headers(calls[1].init?.headers).get("x-csrf-token"),
    "a".repeat(43),
  );
  assert.equal(calls.length, 2);
  const bad = createCommunicationBusinessClient(
    () => "",
    async () => {
      throw new Error("should not request");
    },
  );
  assert.throws(() => bad.send(id, id, " "), { code: "invalid-input" });
  await assert.rejects(bad.pin(id, true), { code: "invalid-input" });
  for (const before of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => client.history(id, before), { code: "invalid-input" });
});
test("F13 client rejects forged delivery/owner payloads, mismatched messages, unbounded streams and transport failures", async () => {
  for (const data of [
    { ...empty, mode: "production" },
    { ...empty, delivered: true },
    { ...empty, userId: id },
    { ...empty, unreadChats: 1 },
  ]) {
    assert.equal(isCommunicationView(data), false);
    await assert.rejects(
      createCommunicationBusinessClient(
        () => "",
        async () => reply(data),
      ).conversations(),
      { code: "invalid-response" },
    );
  }
  const message = {
    mode: "integration-test",
    resource: "messages",
    scopeId: id,
    items: [
      {
        id,
        sequence: 1,
        author: "self",
        body: "Wrong text",
        createdAt: "2026-10-26T12:00:00.000Z",
        clientMessageId: id,
      },
    ],
    nextBefore: null,
    unreadChats: null,
  };
  await assert.rejects(
    createCommunicationBusinessClient(
      () => "a".repeat(43),
      async () => reply(message),
    ).send(id, id, "Expected"),
    { code: "invalid-response" },
  );
  let count = 0;
  const fail = createCommunicationBusinessClient(
    () => "",
    async () => {
      count++;
      return new Response("private error", { status: 503 });
    },
  );
  await assert.rejects(fail.conversations(), {
    code: "http-error",
    status: 503,
  });
  assert.equal(count, 1);
  const huge = createCommunicationBusinessClient(
    () => "",
    async () =>
      new Response("a".repeat(1048577), {
        headers: { "content-type": "application/json" },
      }),
  );
  await assert.rejects(huge.conversations(), { code: "invalid-response" });
  assert.equal(notificationKinds.length, 9);
});
