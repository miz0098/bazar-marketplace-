-- Additive isolated communication foundation; no staff grants, live senders or channels.
CREATE SEQUENCE bazar.message_sequence MAXVALUE 9007199254740990;
ALTER TABLE bazar.messages ADD COLUMN sequence bigint;
WITH ordered AS (SELECT id,row_number() OVER (ORDER BY created_at,id) AS n FROM bazar.messages)
UPDATE bazar.messages m SET sequence=o.n FROM ordered o WHERE m.id=o.id;
SELECT setval('bazar.message_sequence',greatest(coalesce((SELECT max(sequence) FROM bazar.messages),0)+1,1),false);
ALTER TABLE bazar.messages ALTER COLUMN sequence SET NOT NULL, ALTER COLUMN sequence SET DEFAULT nextval('bazar.message_sequence');
ALTER TABLE bazar.messages ADD CONSTRAINT messages_sequence_unique UNIQUE(sequence), ADD CONSTRAINT messages_sequence_safe CHECK(sequence BETWEEN 1 AND 9007199254740990);
CREATE INDEX messages_cursor_idx ON bazar.messages(conversation_id,sequence);
CREATE SEQUENCE bazar.support_message_sequence MAXVALUE 9007199254740990;
ALTER TABLE bazar.support_messages ADD COLUMN sequence bigint;
WITH ordered AS (SELECT id,row_number() OVER (ORDER BY created_at,id) AS n FROM bazar.support_messages)
UPDATE bazar.support_messages m SET sequence=o.n FROM ordered o WHERE m.id=o.id;
SELECT setval('bazar.support_message_sequence',greatest(coalesce((SELECT max(sequence) FROM bazar.support_messages),0)+1,1),false);
ALTER TABLE bazar.support_messages ALTER COLUMN sequence SET NOT NULL, ALTER COLUMN sequence SET DEFAULT nextval('bazar.support_message_sequence');
ALTER TABLE bazar.support_messages ADD COLUMN client_message_id uuid;
ALTER TABLE bazar.support_messages ADD CONSTRAINT support_message_sequence_unique UNIQUE(sequence), ADD CONSTRAINT support_message_sequence_safe CHECK(sequence BETWEEN 1 AND 9007199254740990), ADD CONSTRAINT support_message_request_unique UNIQUE(ticket_id,user_id,client_message_id);
CREATE INDEX support_messages_cursor_idx ON bazar.support_messages(ticket_id,sequence);
ALTER TABLE bazar.support_tickets ADD COLUMN client_request_id uuid, ADD COLUMN request_digest bytea;
ALTER TABLE bazar.support_tickets ADD CONSTRAINT support_creation_request_unique UNIQUE(user_id,client_request_id), ADD CONSTRAINT support_creation_digest CHECK((client_request_id IS NULL AND request_digest IS NULL) OR (client_request_id IS NOT NULL AND octet_length(request_digest)=32));
CREATE TABLE bazar.notification_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sequence bigint GENERATED ALWAYS AS IDENTITY (MAXVALUE 9007199254740990) UNIQUE,
 user_id uuid NOT NULL REFERENCES bazar.users(id),
 kind text NOT NULL CHECK(kind IN ('order.created','order.status_changed','message.created','support.replied','order.cancelled','refund.completed')),
 source_id uuid NOT NULL, scope_id uuid NOT NULL, mode text NOT NULL DEFAULT 'integration-test' CHECK(mode='integration-test'),
 read_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(user_id,kind,source_id), CHECK(sequence BETWEEN 1 AND 9007199254740990)
);
CREATE INDEX notification_events_owner_page_idx ON bazar.notification_events(user_id,sequence);
-- Test protocol inbox only. No delivery queue, recipient contact or provider payload.
