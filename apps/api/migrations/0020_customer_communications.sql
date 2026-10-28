-- F24: additive isolated-account/UGC metadata. No live PII, payment credentials or uploads.
ALTER TABLE bazar.users ADD COLUMN patronymic text NOT NULL DEFAULT '' CHECK(length(patronymic)<=100), ADD COLUMN contact_email text NOT NULL DEFAULT '' CHECK(length(contact_email)<=254);
ALTER TABLE bazar.addresses ADD COLUMN label text NOT NULL DEFAULT '' CHECK(length(label)<=100), ADD COLUMN city_name text NOT NULL DEFAULT '' CHECK(length(city_name)<=200), ADD COLUMN location_name text NOT NULL DEFAULT '' CHECK(length(location_name)<=200), ADD COLUMN pickup_kind text NOT NULL DEFAULT 'branch' CHECK(pickup_kind IN ('branch','parcel-locker'));
CREATE TABLE bazar.customer_payment_methods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES bazar.users(id),
 provider text NOT NULL CHECK(provider='isolated-payment'),provider_ref text NOT NULL UNIQUE CHECK(provider_ref ~ '^synthetic-[a-zA-Z0-9-]{1,100}$'),
 brand text NOT NULL CHECK(brand IN ('Visa','Mastercard','Test')),last_four text NOT NULL CHECK(last_four ~ '^[0-9]{4}$'),
 expiry_month int NOT NULL CHECK(expiry_month BETWEEN 1 AND 12),expiry_year int NOT NULL CHECK(expiry_year BETWEEN 2020 AND 2200),
 available boolean NOT NULL DEFAULT true,is_default boolean NOT NULL DEFAULT false,removed_at timestamptz,version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 CHECK(removed_at IS NULL OR NOT is_default),UNIQUE(id,user_id)
);
CREATE UNIQUE INDEX payment_method_default ON bazar.customer_payment_methods(user_id) WHERE is_default AND removed_at IS NULL;
CREATE TABLE bazar.customer_preferences (
 user_id uuid PRIMARY KEY REFERENCES bazar.users(id),version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 messages boolean NOT NULL DEFAULT true,reviews_questions boolean NOT NULL DEFAULT true,availability boolean NOT NULL DEFAULT true,
 promotions boolean NOT NULL DEFAULT false,CHECK(NOT promotions)
);
CREATE TABLE bazar.customer_account_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES bazar.users(id),resource_id uuid NOT NULL,kind text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX customer_audit_owner ON bazar.customer_account_audit(actor_id,created_at,id);
CREATE TRIGGER customer_audit_immutable BEFORE UPDATE OR DELETE ON bazar.customer_account_audit FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE TABLE bazar.customer_account_receipts (
 user_id uuid NOT NULL REFERENCES bazar.users(id),request_id uuid NOT NULL,digest text NOT NULL CHECK(length(digest)=64),resource_id uuid NOT NULL,
 PRIMARY KEY(user_id,request_id)
);
CREATE TRIGGER customer_receipt_immutable BEFORE UPDATE OR DELETE ON bazar.customer_account_receipts FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
-- Actual F22 parent/line references; F12 synthetic purchase claims are neither copied nor upgraded.
CREATE TABLE bazar.commerce_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES bazar.users(id),parent_id uuid NOT NULL REFERENCES bazar.commerce_parent_orders(id),line_id uuid NOT NULL,
 offer_id uuid NOT NULL REFERENCES bazar.variants(id),product_id uuid NOT NULL REFERENCES bazar.products(id),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),
 rating int NOT NULL CHECK(rating BETWEEN 1 AND 5),body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 2000),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published','rejected','hidden')),withdrawn boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(parent_id,line_id) REFERENCES bazar.commerce_order_lines(parent_id,line_id),UNIQUE(parent_id,line_id)
);
CREATE INDEX commerce_reviews_owner ON bazar.commerce_reviews(user_id,created_at,id);
CREATE INDEX commerce_reviews_public ON bazar.commerce_reviews(offer_id,created_at,id) WHERE state='published' AND NOT withdrawn;
CREATE FUNCTION bazar.review_purchase_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND (NEW.user_id,NEW.parent_id,NEW.line_id,NEW.offer_id,NEW.product_id,NEW.seller_id,NEW.created_at) IS DISTINCT FROM (OLD.user_id,OLD.parent_id,OLD.line_id,OLD.offer_id,OLD.product_id,OLD.seller_id,OLD.created_at) THEN RAISE EXCEPTION 'Immutable review purchase'; END IF;
 IF NOT EXISTS(SELECT 1 FROM bazar.commerce_order_lines l JOIN bazar.commerce_parent_orders o ON o.id=l.parent_id WHERE l.parent_id=NEW.parent_id AND l.line_id=NEW.line_id AND o.user_id=NEW.user_id AND o.payment_state='succeeded' AND o.status='confirmed' AND EXISTS(SELECT 1 FROM bazar.commerce_payment_attempts a JOIN bazar.commerce_payment_events e ON e.attempt_id=a.id WHERE a.parent_id=o.id AND a.state='succeeded' AND e.observation->>'status'='succeeded') AND (l.snapshot->>'variantId')::uuid=NEW.offer_id AND (l.snapshot->>'productId')::uuid=NEW.product_id AND (l.snapshot->>'sellerId')::uuid=NEW.seller_id) THEN RAISE EXCEPTION 'Verified owned purchase required'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER review_purchase_guard BEFORE INSERT OR UPDATE ON bazar.commerce_reviews FOR EACH ROW EXECUTE FUNCTION bazar.review_purchase_guard();
CREATE TABLE bazar.product_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES bazar.users(id),offer_id uuid NOT NULL REFERENCES bazar.variants(id),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 2000),answer text CHECK(length(btrim(answer)) BETWEEN 1 AND 2000),answer_actor uuid REFERENCES bazar.users(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published','rejected','hidden')),answer_state text NOT NULL DEFAULT 'pending' CHECK(answer_state IN ('pending','published','rejected','hidden')),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK((answer IS NULL)=(answer_actor IS NULL))
);
CREATE INDEX questions_offer ON bazar.product_questions(offer_id,created_at,id);
CREATE INDEX questions_owner ON bazar.product_questions(user_id,created_at,id);
CREATE FUNCTION bazar.question_owner_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND (NEW.user_id,NEW.offer_id,NEW.seller_id,NEW.created_at) IS DISTINCT FROM (OLD.user_id,OLD.offer_id,OLD.seller_id,OLD.created_at) THEN RAISE EXCEPTION 'Immutable question owner'; END IF;
 IF NOT EXISTS(SELECT 1 FROM bazar.seller_offers o WHERE o.id=NEW.offer_id AND o.seller_id=NEW.seller_id) THEN RAISE EXCEPTION 'Offer seller mismatch'; END IF;
 IF NEW.answer_actor IS NOT NULL AND (TG_OP='INSERT' OR (NEW.answer,NEW.answer_actor) IS DISTINCT FROM (OLD.answer,OLD.answer_actor)) AND NOT EXISTS(SELECT 1 FROM bazar.seller_owners s JOIN bazar.sellers seller ON seller.id=s.seller_id AND seller.active WHERE s.seller_id=NEW.seller_id AND s.user_id=NEW.answer_actor) THEN RAISE EXCEPTION 'Answer seller mismatch'; END IF; RETURN NEW; END $$;
CREATE TRIGGER question_owner_guard BEFORE INSERT OR UPDATE ON bazar.product_questions FOR EACH ROW EXECUTE FUNCTION bazar.question_owner_guard();
CREATE TABLE bazar.customer_privacy_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES bazar.users(id),kind text NOT NULL CHECK(kind IN ('access','deletion')),state text NOT NULL DEFAULT 'requested' CHECK(state='requested'),created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE bazar.customer_abuse_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES bazar.users(id),resource_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('review','question')),reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(user_id,kind,resource_id)
);
CREATE TABLE bazar.seller_conversation_contexts (
 conversation_id uuid PRIMARY KEY REFERENCES bazar.conversations(id),buyer_id uuid NOT NULL REFERENCES bazar.users(id),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),offer_id uuid NOT NULL REFERENCES bazar.variants(id),parent_id uuid REFERENCES bazar.commerce_parent_orders(id),
 UNIQUE(buyer_id,offer_id)
);
CREATE INDEX seller_conversation_scope ON bazar.seller_conversation_contexts(seller_id,buyer_id);
CREATE TABLE bazar.support_contexts (
 ticket_id uuid PRIMARY KEY REFERENCES bazar.support_tickets(id),user_id uuid NOT NULL REFERENCES bazar.users(id),parent_id uuid REFERENCES bazar.commerce_parent_orders(id),request_id uuid
);
-- Preferences govern optional in-app fanout; mandatory order/return/refund facts remain in-app.
-- No outbound consent is implied, and marketing cannot be activated by this migration.
ALTER TABLE bazar.notification_events DROP CONSTRAINT notification_events_kind_check;
ALTER TABLE bazar.notification_events ADD CONSTRAINT notification_events_kind_check CHECK(kind IN ('product.availability_restored','order.created','order.status_changed','message.created','support.replied','order.cancelled','refund.completed','return.requested','return.status_changed','review.moderated','question.answered'));
CREATE FUNCTION bazar.notification_preference_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE p bazar.customer_preferences; BEGIN
 SELECT * INTO p FROM bazar.customer_preferences WHERE user_id=NEW.user_id;
 IF FOUND AND ((NEW.kind='product.availability_restored' AND NOT p.availability) OR (NEW.kind IN ('message.created','support.replied') AND NOT p.messages) OR (NEW.kind IN ('review.moderated','question.answered') AND NOT p.reviews_questions)) THEN RETURN NULL; END IF; RETURN NEW; END $$;
CREATE TRIGGER notification_preference BEFORE INSERT ON bazar.notification_events FOR EACH ROW EXECUTE FUNCTION bazar.notification_preference_guard();
CREATE TABLE bazar.customer_moderation_reasons(event_id uuid PRIMARY KEY REFERENCES bazar.customer_account_audit(id),reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000));
CREATE TRIGGER moderation_reason_immutable BEFORE UPDATE OR DELETE ON bazar.customer_moderation_reasons FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
ALTER TABLE bazar.support_messages ADD COLUMN staff_actor_id uuid REFERENCES bazar.users(id);
-- Staff provenance never changes an owner-authored message into a staff reply.
CREATE FUNCTION bazar.support_author_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF (NEW.ticket_id,NEW.user_id,NEW.staff_actor_id,NEW.client_message_id,NEW.body) IS DISTINCT FROM (OLD.ticket_id,OLD.user_id,OLD.staff_actor_id,OLD.client_message_id,OLD.body) THEN RAISE EXCEPTION 'Immutable support author and content'; END IF; RETURN NEW; END $$;
CREATE TRIGGER support_author_immutable BEFORE UPDATE ON bazar.support_messages FOR EACH ROW EXECUTE FUNCTION bazar.support_author_immutable();
CREATE TABLE bazar.notification_suppressions(user_id uuid NOT NULL REFERENCES bazar.users(id),kind text NOT NULL,source_id uuid NOT NULL,scope_id uuid NOT NULL,PRIMARY KEY(user_id,kind,source_id));
CREATE TRIGGER suppression_immutable BEFORE UPDATE OR DELETE ON bazar.notification_suppressions FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE OR REPLACE FUNCTION bazar.notification_preference_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE p bazar.customer_preferences; old_scope uuid; BEGIN
 SELECT scope_id INTO old_scope FROM bazar.notification_suppressions WHERE user_id=NEW.user_id AND kind=NEW.kind AND source_id=NEW.source_id;
 IF FOUND THEN IF old_scope<>NEW.scope_id THEN RAISE EXCEPTION 'Event scope conflict'; END IF; RETURN NULL; END IF;
 SELECT * INTO p FROM bazar.customer_preferences WHERE user_id=NEW.user_id;
 IF FOUND AND ((NEW.kind='product.availability_restored' AND NOT p.availability) OR (NEW.kind IN ('message.created','support.replied') AND NOT p.messages) OR (NEW.kind IN ('review.moderated','question.answered') AND NOT p.reviews_questions)) THEN
 INSERT INTO bazar.notification_suppressions(user_id,kind,source_id,scope_id) VALUES(NEW.user_id,NEW.kind,NEW.source_id,NEW.scope_id) ON CONFLICT DO NOTHING; RETURN NULL; END IF; RETURN NEW; END $$;
-- Archive saved destinations without breaking historical F2 order foreign keys.
ALTER TABLE bazar.addresses ADD COLUMN archived_at timestamptz;
