-- Isolated F25 seller capability/operation metadata, not production grants or settlement.
-- F25 seller archiving is additive: archived rows stay in seller workspace but are hidden from public catalog queries.
ALTER TABLE bazar.catalog_products DROP CONSTRAINT catalog_products_status_check;
ALTER TABLE bazar.catalog_products ADD CONSTRAINT catalog_products_status_check CHECK(status IN ('draft','published','archived'));
CREATE TABLE bazar.seller_profiles (
 seller_id uuid PRIMARY KEY REFERENCES bazar.sellers(id),description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),
 contact text NOT NULL DEFAULT '' CHECK(length(contact)<=254),logo_path text CHECK(logo_path ~ '^/images/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpg)$'),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),shipping jsonb NOT NULL DEFAULT '["nova-poshta","meest","ukrposhta"]' CHECK(jsonb_typeof(shipping)='array'),
 preferences jsonb NOT NULL DEFAULT '{"orders":true,"requests":true,"messages":true,"questions":true,"deadlines":true}' CHECK(jsonb_typeof(preferences)='object')
);
CREATE TABLE bazar.seller_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),actor_id uuid NOT NULL REFERENCES bazar.users(id),
 kind text NOT NULL,resource_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX seller_audit_page ON bazar.seller_audit(seller_id,created_at DESC,id);
CREATE TRIGGER seller_audit_immutable BEFORE UPDATE OR DELETE ON bazar.seller_audit FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE TABLE bazar.seller_commands (
 actor_id uuid NOT NULL REFERENCES bazar.users(id),request_id uuid NOT NULL,seller_id uuid NOT NULL REFERENCES bazar.sellers(id),digest text NOT NULL CHECK(length(digest)=64),
 result jsonb NOT NULL,PRIMARY KEY(actor_id,request_id)
);
CREATE TRIGGER seller_command_immutable BEFORE UPDATE OR DELETE ON bazar.seller_commands FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE TABLE bazar.seller_bank_details (
 seller_id uuid PRIMARY KEY REFERENCES bazar.sellers(id),cipher bytea NOT NULL,nonce bytea NOT NULL CHECK(octet_length(nonce)=12),tag bytea NOT NULL CHECK(octet_length(tag)=16),
 last_four text NOT NULL CHECK(last_four ~ '^[0-9]{4}$'),version bigint NOT NULL DEFAULT 1 CHECK(version>0),mode text NOT NULL DEFAULT 'integration-test' CHECK(mode='integration-test')
);
CREATE TABLE bazar.seller_import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),actor_id uuid NOT NULL REFERENCES bazar.users(id),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='array' AND jsonb_array_length(payload) BETWEEN 1 AND 10),digest text NOT NULL CHECK(length(digest)=64),
 expires_at timestamptz NOT NULL,applied_at timestamptz,created_ids jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(created_ids)='array')
);
CREATE TABLE bazar.seller_promotions (
 promotion_id uuid PRIMARY KEY REFERENCES bazar.promotions(id),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),campaign_type text NOT NULL CHECK(campaign_type IN ('general','individual')),
 buyer_id uuid REFERENCES bazar.users(id),product_ids uuid[] NOT NULL,category_ids uuid[] NOT NULL DEFAULT '{}',version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 activation text NOT NULL DEFAULT 'funding-policy-required' CHECK(activation='funding-policy-required'),CHECK((campaign_type='individual')=(buyer_id IS NOT NULL))
);
CREATE INDEX seller_promotions_owner ON bazar.seller_promotions(seller_id,promotion_id);
CREATE TABLE bazar.seller_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),kind text NOT NULL CHECK(kind IN ('agreement','verification','other')),
 status text NOT NULL CHECK(status IN ('not-submitted','pending','approved-for-test','rejected-for-test')),object_ref text CHECK(object_ref ~ '^synthetic-[a-f0-9-]+$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX seller_documents_owner ON bazar.seller_documents(seller_id,id);
CREATE TABLE bazar.seller_order_notes (
 seller_order_id uuid PRIMARY KEY REFERENCES bazar.commerce_seller_orders(id),comment text NOT NULL DEFAULT '' CHECK(length(comment)<=1000),tracking_ref text CHECK(length(tracking_ref) BETWEEN 1 AND 100),
 accepted_at timestamptz,version bigint NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE TABLE bazar.seller_request_responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_order_id uuid NOT NULL REFERENCES bazar.commerce_seller_orders(id),request_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('cancellation','return')),
 decision text NOT NULL CHECK(decision IN ('accepted-for-test','staff-review-required')),reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),actor_id uuid NOT NULL REFERENCES bazar.users(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(request_id)
);
CREATE TRIGGER seller_response_immutable BEFORE UPDATE OR DELETE ON bazar.seller_request_responses FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
-- Reuse F13 inbox; map only notices whose provenance belongs to a seller resource.
CREATE TABLE bazar.seller_notification_scopes (
 notification_id uuid PRIMARY KEY REFERENCES bazar.notification_events(id),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),resource_kind text NOT NULL CHECK(resource_kind IN ('order','conversation','question')),resource_id uuid NOT NULL
);
CREATE INDEX seller_notifications_scope ON bazar.seller_notification_scopes(seller_id,notification_id);
ALTER TABLE bazar.notification_events DROP CONSTRAINT notification_events_kind_check;
ALTER TABLE bazar.notification_events ADD CONSTRAINT notification_events_kind_check CHECK(kind IN ('product.availability_restored','order.created','order.status_changed','message.created','support.replied','order.cancelled','refund.completed','return.requested','return.status_changed','review.moderated','question.answered','question.created'));
CREATE FUNCTION bazar.seller_notice_target(p_recipient uuid,p_k text,p_source uuid,p_scope uuid) RETURNS TABLE(seller uuid,resource_kind text,resource uuid) LANGUAGE sql STABLE AS $$
 SELECT c.seller_id,'conversation',c.conversation_id FROM bazar.seller_conversation_contexts c JOIN bazar.seller_owners o ON o.seller_id=c.seller_id AND o.user_id=p_recipient WHERE p_k='message.created' AND c.conversation_id=p_scope AND EXISTS(SELECT 1 FROM bazar.messages m WHERE m.id=p_source AND m.conversation_id=c.conversation_id)
 UNION ALL SELECT q.seller_id,'question',q.id FROM bazar.product_questions q JOIN bazar.seller_owners o ON o.seller_id=q.seller_id AND o.user_id=p_recipient WHERE p_k='question.created' AND q.id=p_scope AND q.id=p_source
 UNION ALL SELECT s.seller_id,'order',s.id FROM bazar.commerce_seller_orders s JOIN bazar.seller_owners o ON o.seller_id=s.seller_id AND o.user_id=p_recipient WHERE p_k='order.created' AND s.id=p_source AND s.parent_id=p_scope
 UNION ALL SELECT s.seller_id,'order',s.id FROM bazar.commerce_lifecycle_events e JOIN bazar.commerce_seller_orders s ON s.id=e.seller_order_id JOIN bazar.seller_owners o ON o.seller_id=s.seller_id AND o.user_id=p_recipient WHERE p_k IN ('order.status_changed','order.cancelled','return.requested','return.status_changed') AND e.id=p_source AND s.parent_id=p_scope
$$;
CREATE FUNCTION bazar.scope_seller_notice() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r record; BEGIN FOR r IN SELECT * FROM bazar.seller_notice_target(NEW.user_id,NEW.kind,NEW.source_id,NEW.scope_id) LOOP INSERT INTO bazar.seller_notification_scopes(notification_id,seller_id,resource_kind,resource_id) VALUES(NEW.id,r.seller,r.resource_kind,r.resource) ON CONFLICT DO NOTHING; END LOOP; RETURN NEW; END $$;
CREATE TRIGGER seller_notice_scope AFTER INSERT ON bazar.notification_events FOR EACH ROW EXECUTE FUNCTION bazar.scope_seller_notice();
CREATE FUNCTION bazar.seller_order_notice() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r record; BEGIN IF NEW.payment_state='succeeded' AND NEW.status='confirmed' AND OLD.status<>'confirmed' THEN FOR r IN SELECT s.id,o.user_id FROM bazar.commerce_seller_orders s JOIN bazar.seller_owners o ON o.seller_id=s.seller_id WHERE s.parent_id=NEW.id ORDER BY o.user_id,s.id LOOP INSERT INTO bazar.notification_events(user_id,kind,source_id,scope_id) VALUES(r.user_id,'order.created',r.id,NEW.id) ON CONFLICT DO NOTHING; END LOOP; END IF; RETURN NEW; END $$;
CREATE TRIGGER seller_order_notice AFTER UPDATE ON bazar.commerce_parent_orders FOR EACH ROW EXECUTE FUNCTION bazar.seller_order_notice();
CREATE FUNCTION bazar.seller_question_notice() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r record; BEGIN FOR r IN SELECT user_id FROM bazar.seller_owners WHERE seller_id=NEW.seller_id AND user_id<>NEW.user_id ORDER BY user_id LOOP INSERT INTO bazar.notification_events(user_id,kind,source_id,scope_id) VALUES(r.user_id,'question.created',NEW.id,NEW.id) ON CONFLICT DO NOTHING; END LOOP; RETURN NEW; END $$;
CREATE TRIGGER seller_question_notice AFTER INSERT ON bazar.product_questions FOR EACH ROW EXECUTE FUNCTION bazar.seller_question_notice();
-- Seller preferences are tenant-scoped; buyer preferences must not suppress a store inbox.
CREATE OR REPLACE FUNCTION bazar.notification_preference_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p bazar.customer_preferences; old_scope uuid; target record; prefs jsonb; category text; suppress boolean:=false;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('notification-owner:'||NEW.user_id::text,0));
 SELECT scope_id INTO old_scope FROM bazar.notification_suppressions WHERE user_id=NEW.user_id AND kind=NEW.kind AND source_id=NEW.source_id;
 IF FOUND THEN IF old_scope<>NEW.scope_id THEN RAISE EXCEPTION 'Event scope conflict'; END IF; RETURN NULL; END IF;
 SELECT * INTO target FROM bazar.seller_notice_target(NEW.user_id,NEW.kind,NEW.source_id,NEW.scope_id) LIMIT 1;
 IF FOUND THEN
   SELECT preferences INTO prefs FROM bazar.seller_profiles WHERE seller_id=target.seller;
   category:=CASE WHEN NEW.kind='message.created' THEN 'messages' WHEN NEW.kind='question.created' THEN 'questions' WHEN NEW.kind IN ('return.requested','return.status_changed','order.cancelled') THEN 'requests' WHEN EXISTS(SELECT 1 FROM bazar.commerce_lifecycle_events WHERE id=NEW.source_id AND kind LIKE 'dispatch.%') THEN 'deadlines' ELSE 'orders' END;
   suppress:=coalesce((prefs->>category)::boolean,true)=false;
 ELSE
   SELECT * INTO p FROM bazar.customer_preferences WHERE user_id=NEW.user_id;
   suppress:=FOUND AND ((NEW.kind='product.availability_restored' AND NOT p.availability) OR (NEW.kind IN ('message.created','support.replied') AND NOT p.messages) OR (NEW.kind IN ('review.moderated','question.answered') AND NOT p.reviews_questions));
 END IF;
 IF suppress THEN INSERT INTO bazar.notification_suppressions(user_id,kind,source_id,scope_id) VALUES(NEW.user_id,NEW.kind,NEW.source_id,NEW.scope_id) ON CONFLICT DO NOTHING; RETURN NULL; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION bazar.seller_lifecycle_notice() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r record; parent uuid; event_kind text;
BEGIN
 SELECT parent_id INTO parent FROM bazar.commerce_seller_orders WHERE id=NEW.seller_order_id;
 event_kind:=CASE WHEN NEW.kind IN ('return.requested','return.status_changed') THEN NEW.kind WHEN NEW.to_status IN ('cancelled','system-cancelled') THEN 'order.cancelled' ELSE 'order.status_changed' END;
 FOR r IN SELECT o.user_id FROM bazar.commerce_seller_orders s JOIN bazar.seller_owners o ON o.seller_id=s.seller_id WHERE s.id=NEW.seller_order_id AND o.user_id IS DISTINCT FROM NEW.actor_id ORDER BY o.user_id LOOP
 INSERT INTO bazar.notification_events(user_id,kind,source_id,scope_id) VALUES(r.user_id,event_kind,NEW.id,parent) ON CONFLICT DO NOTHING;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER seller_lifecycle_notice AFTER INSERT ON bazar.commerce_lifecycle_events FOR EACH ROW EXECUTE FUNCTION bazar.seller_lifecycle_notice();
