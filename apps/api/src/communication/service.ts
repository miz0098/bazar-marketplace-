import type pg from "pg";
import { createHash } from "node:crypto";
import { ApiError } from "../contracts/foundation.js";
import { uuid, money, invalid } from "../business/validation.js";
import { fields } from "../checkout/input.js";
import { sendInput, ticketInput } from "./input.js";
import {
  isCommunicationView,
  type CommunicationView,
  type MessageItem,
} from "../contracts/communication.js";
const missing = () =>
  new ApiError(404, "NOT_FOUND", "Communication resource not found.");
const conflict = () =>
  new ApiError(
    409,
    "CONFLICT",
    "Communication request conflicts with current state.",
  );
const timestamp = (v: Date) => v.toISOString();
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest();
export function createCommunicationService(pool: pg.Pool) {
  if (process.env.NODE_ENV !== "test")
    throw new Error("Communication requires an isolated test process");
  async function tx(
    actor: string,
    run: (c: pg.PoolClient) => Promise<CommunicationView>,
  ) {
    actor = uuid(actor);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const view = await run(c);
      if (!isCommunicationView(view))
        throw new Error("Invalid communication result");
      await c.query("COMMIT");
      return view;
    } catch (e) {
      await c.query("ROLLBACK");
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        ["23505", "23503", "40001", "40P01"].includes(String(e.code))
      )
        throw conflict();
      throw e;
    } finally {
      c.release();
    }
  }
  async function conversation(c: pg.PoolClient, actor: string, id: string) {
    // One parent lock orders sends, read markers and pin changes for all members.
    if (
      !(
        await c.query(
          "SELECT c.id FROM bazar.conversations c JOIN bazar.conversation_members m ON m.conversation_id=c.id WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c",
          [id, actor],
        )
      ).rowCount
    )
      throw missing();
  }
  async function ticket(c: pg.PoolClient, actor: string, id: string) {
    const r = (
      await c.query(
        "SELECT * FROM bazar.support_tickets WHERE id=$1 AND user_id=$2 FOR UPDATE",
        [id, actor],
      )
    ).rows[0];
    if (!r) throw missing();
    return r;
  }
  async function chats(
    c: pg.PoolClient,
    actor: string,
  ): Promise<CommunicationView> {
    const rows = (
      await c.query(
        `SELECT m.conversation_id AS id,m.pinned,coalesce(r.sequence,0)::text AS read_sequence,
   coalesce(z.sequence,0)::text AS last_sequence,coalesce(z.body,'') AS preview,coalesce(z.created_at,c.created_at) AS updated_at,
   EXISTS(SELECT 1 FROM bazar.messages n WHERE n.conversation_id=c.id AND n.sender_id<>$1 AND n.sequence>coalesce(r.sequence,0)) AS unread
   FROM bazar.conversation_members m JOIN bazar.conversations c ON c.id=m.conversation_id
   LEFT JOIN bazar.messages r ON r.id=m.last_read_message_id AND r.conversation_id=c.id
   LEFT JOIN LATERAL(SELECT sequence,body,created_at FROM bazar.messages WHERE conversation_id=c.id ORDER BY sequence DESC LIMIT 1) z ON true
   WHERE m.user_id=$1 ORDER BY m.pinned DESC,z.sequence DESC NULLS LAST,c.id LIMIT 101`,
        [actor],
      )
    ).rows;
    if (rows.length > 100)
      throw new ApiError(
        503,
        "SERVICE_UNAVAILABLE",
        "Conversation pagination needs an approved follow-up.",
      );
    const items = rows.map((r) => ({
      id: r.id,
      pinned: r.pinned,
      unread: r.unread,
      lastReadSequence: money(r.read_sequence),
      lastSequence: money(r.last_sequence),
      preview: r.preview,
      updatedAt: timestamp(r.updated_at),
    }));
    return {
      mode: "integration-test",
      resource: "conversations",
      scopeId: null,
      items,
      nextBefore: null,
      unreadChats: items.filter((i) => i.unread).length,
    };
  }
  async function history(
    c: pg.PoolClient,
    actor: string,
    id: string,
    kind: "messages" | "replies",
    before: number,
    limit: number,
  ): Promise<CommunicationView> {
    const query =
      kind === "messages"
        ? "SELECT id,sequence::text,body,created_at,sender_id AS author_id,client_message_id FROM bazar.messages WHERE conversation_id=$1 AND sequence<$2 ORDER BY sequence DESC LIMIT $3"
        : "SELECT id,sequence::text,body,created_at,user_id AS author_id,client_message_id FROM bazar.support_messages WHERE ticket_id=$1 AND sequence<$2 ORDER BY sequence DESC LIMIT $3";
    const rows = (await c.query(query, [id, before, limit + 1])).rows,
      hasMore = rows.length > limit;
    const items: MessageItem[] = rows
      .slice(0, limit)
      .reverse()
      .map((r) => ({
        id: r.id,
        sequence: money(r.sequence),
        author: r.author_id === actor ? "self" : "member",
        body: r.body,
        createdAt: timestamp(r.created_at),
        clientMessageId: r.client_message_id,
      }));
    return {
      mode: "integration-test",
      resource: kind,
      scopeId: id,
      items,
      nextBefore: hasMore ? items[0].sequence : null,
      unreadChats: null,
    };
  }
  async function tickets(
    c: pg.PoolClient,
    actor: string,
  ): Promise<CommunicationView> {
    const rows = (
      await c.query(
        "SELECT id,subject,category,status,created_at FROM bazar.support_tickets WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 101",
        [actor],
      )
    ).rows;
    if (rows.length > 100)
      throw new ApiError(
        503,
        "SERVICE_UNAVAILABLE",
        "Ticket pagination needs an approved follow-up.",
      );
    return {
      mode: "integration-test",
      resource: "tickets",
      scopeId: null,
      items: rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        category: r.category,
        status: r.status,
        createdAt: timestamp(r.created_at),
      })),
      nextBefore: null,
      unreadChats: null,
    };
  }
  async function inbox(
    c: pg.PoolClient,
    actor: string,
    before: number,
    limit: number,
  ): Promise<CommunicationView> {
    const rows = (
      await c.query(
        "SELECT id,sequence::text,kind,source_id,scope_id,read_at,created_at FROM bazar.notification_events n WHERE user_id=$1 AND n.sequence<$2 ORDER BY n.sequence DESC LIMIT $3",
        [actor, before, limit + 1],
      )
    ).rows;
    const items = rows
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        sequence: money(r.sequence),
        kind: r.kind,
        sourceId: r.source_id,
        scopeId: r.scope_id,
        read: r.read_at !== null,
        createdAt: timestamp(r.created_at),
      }));
    return {
      mode: "integration-test",
      resource: "notifications",
      scopeId: null,
      items,
      nextBefore: rows.length > limit ? items.at(-1)!.sequence : null,
      unreadChats: null,
    };
  }
  const bounds = (before: number, limit: number) => {
    if (
      !Number.isSafeInteger(before) ||
      before < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      invalid();
  };
  async function summary(c:pg.PoolClient,actor:string) {
    const r=(await c.query('SELECT count(*) FILTER(WHERE read_at IS NULL)::text AS unread,coalesce(max(sequence),0)::text AS through FROM bazar.notification_events WHERE user_id=$1',[actor])).rows[0];
    return {mode:'integration-test' as const,resource:'notification-summary' as const,unread:money(r.unread),throughSequence:money(r.through)};
  }
  async function summaryTx(actor:string,through?:number) {
    actor=uuid(actor);const c=await pool.connect();
    try{
      await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['notification-owner:'+actor]);
      const current=await summary(c,actor);
      if(through!==undefined){
        if(!Number.isSafeInteger(through)||through<0||through>current.throughSequence)invalid();
        await c.query('UPDATE bazar.notification_events SET read_at=coalesce(read_at,clock_timestamp()) WHERE user_id=$1 AND sequence<=$2 AND read_at IS NULL',[actor,through]);
      }
      const result=await summary(c,actor);await c.query('COMMIT');return result;
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  return {
    notificationSummary:(actor:string)=>summaryTx(actor),
    async readAllNotifications(actor:string,value:unknown){const r=fields(value,['throughSequence']);if(typeof r.throughSequence!=='number'||!Number.isSafeInteger(r.throughSequence)||r.throughSequence<0)invalid();return summaryTx(actor,r.throughSequence);},
    async getNotification(actor:string,id:string){
      actor=uuid(actor);id=uuid(id);
      return tx(actor,async c=>{
        const row=(await c.query('SELECT sequence::text FROM bazar.notification_events WHERE id=$1 AND user_id=$2',[id,actor])).rows[0];
        if(!row)throw missing();return inbox(c,actor,money(row.sequence)+1,1);
      });
    },
    async list(
      actor: string,
      resource: "conversations" | "tickets" | "notifications",
      before = Number.MAX_SAFE_INTEGER,
      limit = 50,
    ) {
      uuid(actor);
      bounds(before, limit);
      return tx(actor, (c) =>
        resource === "conversations"
          ? chats(c, actor)
          : resource === "tickets"
            ? tickets(c, actor)
            : inbox(c, actor, before, limit),
      );
    },
    async history(
      actor: string,
      id: string,
      kind: "messages" | "replies",
      before = Number.MAX_SAFE_INTEGER,
      limit = 50,
    ) {
      actor = uuid(actor);
      id = uuid(id);
      bounds(before, limit);
      return tx(actor, async (c) => {
        if (kind === "messages") await conversation(c, actor, id);
        else await ticket(c, actor, id);
        return history(c, actor, id, kind, before, limit);
      });
    },
    async send(
      actor: string,
      id: string,
      kind: "messages" | "replies",
      value: unknown,
    ) {
      actor = uuid(actor);
      id = uuid(id);
      const input = sendInput(value);
      return tx(actor, async (c) => {
        const parent =
          kind === "messages"
            ? (await conversation(c, actor, id), null)
            : await ticket(c, actor, id);
        const sql =
          kind === "messages"
            ? "SELECT id,body FROM bazar.messages WHERE conversation_id=$1 AND sender_id=$2 AND client_message_id=$3"
            : "SELECT id,body FROM bazar.support_messages WHERE ticket_id=$1 AND user_id=$2 AND client_message_id=$3";
        let row = (await c.query(sql, [id, actor, input.clientMessageId]))
          .rows[0];
        if (row && row.body !== input.body) throw conflict();
        if (!row) {
          if (parent?.status === "closed") throw conflict();
          const insert =
            kind === "messages"
              ? `INSERT INTO bazar.messages(conversation_id,sender_id,client_message_id,body,created_at) VALUES($1,$2,$3,$4,greatest(clock_timestamp(),coalesce((SELECT max(created_at) FROM bazar.messages WHERE conversation_id=$1),'-infinity'::timestamptz))) RETURNING id`
              : `INSERT INTO bazar.support_messages(ticket_id,user_id,client_message_id,body,created_at) VALUES($1,$2,$3,$4,greatest(clock_timestamp(),coalesce((SELECT max(created_at) FROM bazar.support_messages WHERE ticket_id=$1),'-infinity'::timestamptz))) RETURNING id`;
          row = (
            await c.query(insert, [
              id,
              actor,
              input.clientMessageId,
              input.body,
            ])
          ).rows[0];
          if (kind === "messages")
            await c.query(
              `INSERT INTO bazar.notification_events(user_id,kind,source_id,scope_id) SELECT user_id,'message.created',$1,$2 FROM bazar.conversation_members WHERE conversation_id=$2 AND user_id<>$3 ORDER BY user_id ON CONFLICT(user_id,kind,source_id) DO NOTHING`,
              [row.id, id, actor],
            );
        }
        const q =
          kind === "messages"
            ? "SELECT sequence::text FROM bazar.messages WHERE id=$1"
            : "SELECT sequence::text FROM bazar.support_messages WHERE id=$1";
        const sequence = money((await c.query(q, [row.id])).rows[0].sequence);
        return history(c, actor, id, kind, sequence + 1, 1);
      });
    },
    async pin(actor: string, id: string, value: unknown) {
      actor = uuid(actor);
      id = uuid(id);
      const r = fields(value, ["pinned"]);
      if (typeof r.pinned !== "boolean") invalid();
      return tx(actor, async (c) => {
        await conversation(c, actor, id);
        await c.query(
          "UPDATE bazar.conversation_members SET pinned=$3 WHERE conversation_id=$1 AND user_id=$2",
          [id, actor, r.pinned],
        );
        return chats(c, actor);
      });
    },
    async markRead(actor: string, id: string, value: unknown) {
      actor = uuid(actor);
      id = uuid(id);
      const r = fields(value, ["lastMessageId"]),
        messageId = uuid(r.lastMessageId);
      return tx(actor, async (c) => {
        await conversation(c, actor, id);
        const target = (
          await c.query(
            "SELECT sequence::text FROM bazar.messages WHERE conversation_id=$1 AND id=$2",
            [id, messageId],
          )
        ).rows[0];
        if (!target) throw missing();
        await c.query(
          `UPDATE bazar.conversation_members m SET last_read_message_id=$3 WHERE conversation_id=$1 AND user_id=$2 AND coalesce((SELECT sequence FROM bazar.messages WHERE id=m.last_read_message_id),0)<$4`,
          [id, actor, messageId, target.sequence],
        );
        return chats(c, actor);
      });
    },
    async createTicket(actor: string, value: unknown) {
      actor = uuid(actor);
      const input = ticketInput(value),
        hash = digest(input);
      return tx(actor, async (c) => {
        if (
          !(
            await c.query("SELECT id FROM bazar.users WHERE id=$1 FOR UPDATE", [
              actor,
            ])
          ).rowCount
        )
          throw missing();
        let row = (
          await c.query(
            "SELECT id,request_digest FROM bazar.support_tickets WHERE user_id=$1 AND client_request_id=$2",
            [actor, input.clientRequestId],
          )
        ).rows[0];
        if (row && !row.request_digest.equals(hash)) throw conflict();
        if (!row) {
          row = (
            await c.query(
              "INSERT INTO bazar.support_tickets(user_id,subject,category,client_request_id,request_digest) VALUES($1,$2,$3,$4,$5) RETURNING id",
              [
                actor,
                input.subject,
                input.category,
                input.clientRequestId,
                hash,
              ],
            )
          ).rows[0];
          await c.query(
            "INSERT INTO bazar.support_messages(ticket_id,user_id,body) VALUES($1,$2,$3)",
            [row.id, actor, input.body],
          );
        }
        const view = await tickets(c, actor);
        if (view.resource !== "tickets") throw new Error("Invalid resource");
        return { ...view, items: view.items.filter((i) => i.id === row.id) };
      });
    },
    async readNotification(actor: string, id: string, value: unknown) {
      actor = uuid(actor);
      id = uuid(id);
      fields(value, []);
      return tx(actor, async (c) => {
        const row = (
          await c.query(
            "UPDATE bazar.notification_events SET read_at=coalesce(read_at,clock_timestamp()) WHERE id=$1 AND user_id=$2 RETURNING sequence::text",
            [id, actor],
          )
        ).rows[0];
        if (!row) throw missing();
        return inbox(c, actor, money(row.sequence) + 1, 1);
      });
    },
  };
}
export type CommunicationService = ReturnType<
  typeof createCommunicationService
>;
