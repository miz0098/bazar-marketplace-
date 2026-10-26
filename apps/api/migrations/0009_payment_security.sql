-- Isolated payment protocol records, deliberately separate from legacy order payment_attempts.
-- No provider, merchant credentials, live order or financial policy is provisioned.
ALTER TABLE bazar.checkout_sessions ADD CONSTRAINT checkout_payment_cart_link UNIQUE(id,user_id,cart_id,cart_version);
CREATE TABLE bazar.payment_intents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), checkout_id uuid NOT NULL UNIQUE,user_id uuid NOT NULL,
 cart_id uuid NOT NULL,cart_version bigint NOT NULL CHECK(cart_version BETWEEN 1 AND 9007199254740991),
 amount_minor bazar.money_minor NOT NULL CHECK(amount_minor>0),currency bazar.currency_code NOT NULL,
 basis text NOT NULL CHECK(basis='isolated-test-plan'),binding text NOT NULL CHECK(binding ~ '^[a-f0-9]{64}$'),
 mode text NOT NULL CHECK(mode='integration-test'),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(checkout_id,user_id) REFERENCES bazar.checkout_sessions(id,user_id),
 FOREIGN KEY(checkout_id,user_id,cart_id,cart_version) REFERENCES bazar.checkout_sessions(id,user_id,cart_id,cart_version),
 FOREIGN KEY(cart_id,user_id) REFERENCES bazar.carts(id,user_id),UNIQUE(cart_id),
 UNIQUE(id,user_id,amount_minor,currency)
);
CREATE TABLE bazar.payment_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),intent_id uuid NOT NULL,user_id uuid NOT NULL,
 amount_minor bazar.money_minor NOT NULL,currency bazar.currency_code NOT NULL,
 request_key uuid NOT NULL,request_digest bytea NOT NULL CHECK(octet_length(request_digest)=32),
 method text NOT NULL CHECK(method IN ('card','apple-pay','google-pay')),
 provider text NOT NULL CHECK(length(provider) BETWEEN 1 AND 100),provider_ref text CHECK(length(provider_ref) BETWEEN 1 AND 200),
 status text NOT NULL CHECK(status IN ('submitting','pending','unknown','declined','cancelled','succeeded')),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),
 last_source text NOT NULL CHECK(last_source IN ('submission','webhook','reconcile','cancel')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(status NOT IN ('pending','succeeded','declined','cancelled') OR provider_ref IS NOT NULL),
 FOREIGN KEY(intent_id,user_id,amount_minor,currency) REFERENCES bazar.payment_intents(id,user_id,amount_minor,currency),
 UNIQUE(user_id,request_key),UNIQUE(provider,provider_ref)
);
CREATE UNIQUE INDEX payment_one_active_or_success_idx ON bazar.payment_operations(intent_id) WHERE status IN ('submitting','pending','unknown','succeeded');
CREATE INDEX payment_operations_owner_idx ON bazar.payment_operations(user_id,id);
CREATE INDEX payment_intents_owner_idx ON bazar.payment_intents(user_id,checkout_id);
CREATE TABLE bazar.payment_verified_events (
 provider text NOT NULL,event_id text NOT NULL CHECK(length(event_id) BETWEEN 1 AND 200),operation_id uuid NOT NULL REFERENCES bazar.payment_operations(id),
 digest bytea NOT NULL CHECK(octet_length(digest)=32),received_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(provider,event_id)
);
CREATE INDEX payment_events_operation_idx ON bazar.payment_verified_events(operation_id);
CREATE TABLE bazar.payment_transition_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,operation_id uuid NOT NULL REFERENCES bazar.payment_operations(id),
 from_status text,to_status text NOT NULL,version bigint NOT NULL,source text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(operation_id,version)
);
CREATE FUNCTION bazar.payment_state_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  PERFORM 1 FROM bazar.payment_intents WHERE id=NEW.intent_id FOR UPDATE;
  IF NEW.status<>'submitting' OR NEW.version<>1 OR NEW.last_source<>'submission' OR EXISTS(SELECT 1 FROM bazar.payment_operations WHERE intent_id=NEW.intent_id AND status IN ('submitting','pending','unknown','succeeded')) THEN
   RAISE EXCEPTION 'Payment attempt cannot start' USING ERRCODE='23514';
  END IF;
 ELSE
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment history is immutable' USING ERRCODE='23514'; END IF;
  IF (NEW.id,NEW.intent_id,NEW.user_id,NEW.amount_minor,NEW.currency,NEW.request_key,NEW.request_digest,NEW.method,NEW.provider,NEW.created_at) IS DISTINCT FROM
     (OLD.id,OLD.intent_id,OLD.user_id,OLD.amount_minor,OLD.currency,OLD.request_key,OLD.request_digest,OLD.method,OLD.provider,OLD.created_at) OR
     (OLD.provider_ref IS NOT NULL AND NEW.provider_ref IS DISTINCT FROM OLD.provider_ref) OR NEW.version<>OLD.version+1 OR
     OLD.status IN ('succeeded','declined','cancelled') OR
     (OLD.status NOT IN ('submitting','pending','unknown')) OR NEW.status='submitting' OR
     (NEW.status IN ('succeeded','declined','cancelled') AND NEW.last_source='submission') THEN
   RAISE EXCEPTION 'Invalid payment state transition' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_state_guard BEFORE INSERT OR UPDATE OR DELETE ON bazar.payment_operations FOR EACH ROW EXECUTE FUNCTION bazar.payment_state_guard();
CREATE FUNCTION bazar.payment_state_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO bazar.payment_transition_audit(operation_id,from_status,to_status,version,source) VALUES(NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.version,NEW.last_source);
 RETURN NULL;
END $$;
CREATE TRIGGER payment_state_audit AFTER INSERT OR UPDATE ON bazar.payment_operations FOR EACH ROW EXECUTE FUNCTION bazar.payment_state_audit();
CREATE TRIGGER payment_intents_immutable BEFORE UPDATE OR DELETE ON bazar.payment_intents FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE TRIGGER payment_events_immutable BEFORE UPDATE OR DELETE ON bazar.payment_verified_events FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE TRIGGER payment_audit_immutable BEFORE UPDATE OR DELETE ON bazar.payment_transition_audit FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
