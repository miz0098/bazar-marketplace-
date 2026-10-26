-- Test-only sidecars; F6 immutable orders and financial boundaries remain unchanged.
ALTER TABLE bazar.order_lines ADD CONSTRAINT lifecycle_line_owner UNIQUE(id,order_id,user_id);
CREATE TABLE bazar.order_lifecycle_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL,user_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('cancellation','return')),state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','under-review','closed-for-test')),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740990),
 request_key uuid NOT NULL,request_digest bytea NOT NULL CHECK(octet_length(request_digest)=32),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),source text NOT NULL CHECK(source IN ('customer-request','isolated-review')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(user_id,request_key),UNIQUE(id,order_id,user_id),
 FOREIGN KEY(order_id,user_id) REFERENCES bazar.orders(id,user_id)
);
CREATE UNIQUE INDEX one_cancellation_request_idx ON bazar.order_lifecycle_requests(order_id) WHERE kind='cancellation';
CREATE INDEX lifecycle_requests_owner_idx ON bazar.order_lifecycle_requests(user_id,order_id,created_at,id);
CREATE TABLE bazar.order_return_items (
 request_id uuid NOT NULL,order_id uuid NOT NULL,user_id uuid NOT NULL,order_line_id uuid NOT NULL,quantity integer NOT NULL CHECK(quantity>0),
 PRIMARY KEY(request_id,order_line_id),FOREIGN KEY(request_id,order_id,user_id) REFERENCES bazar.order_lifecycle_requests(id,order_id,user_id),
 FOREIGN KEY(order_line_id,order_id,user_id) REFERENCES bazar.order_lines(id,order_id,user_id)
);
CREATE INDEX return_items_line_idx ON bazar.order_return_items(order_line_id);
CREATE FUNCTION bazar.return_quantity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchased integer; claimed bigint;
BEGIN
 PERFORM 1 FROM bazar.orders WHERE id=NEW.order_id AND user_id=NEW.user_id AND foundation_mode='integration-test' FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM bazar.order_lifecycle_requests WHERE id=NEW.request_id AND kind='return' AND state='requested' AND xmin=pg_current_xact_id()::xid) THEN RAISE EXCEPTION 'Invalid return scope' USING ERRCODE='23514'; END IF;
 SELECT quantity INTO purchased FROM bazar.order_lines WHERE id=NEW.order_line_id AND order_id=NEW.order_id AND user_id=NEW.user_id;
 SELECT coalesce(sum(quantity),0) INTO claimed FROM bazar.order_return_items WHERE order_line_id=NEW.order_line_id;
 IF purchased IS NULL OR claimed+NEW.quantity>purchased THEN RAISE EXCEPTION 'Return quantity exceeded' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER return_quantity_guard BEFORE INSERT ON bazar.order_return_items FOR EACH ROW EXECUTE FUNCTION bazar.return_quantity_guard();
CREATE TRIGGER return_items_immutable BEFORE UPDATE OR DELETE ON bazar.order_return_items FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE TABLE bazar.order_refund_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL,user_id uuid NOT NULL,payment_operation_id uuid NOT NULL,
 request_id uuid NOT NULL UNIQUE,request_key uuid NOT NULL,request_digest bytea NOT NULL CHECK(octet_length(request_digest)=32),
 amount_minor bazar.money_minor NOT NULL CHECK(amount_minor>0),currency bazar.currency_code NOT NULL,
 extent text NOT NULL CHECK(extent IN ('partial','full')),basis text NOT NULL CHECK(basis='isolated-test-plan'),plan_revision text NOT NULL CHECK(length(btrim(plan_revision)) BETWEEN 1 AND 100),
 provider text NOT NULL,account_ref text NOT NULL,state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','pending','unknown','confirmed-for-test','rejected-for-test')),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740990),source text NOT NULL CHECK(source IN ('test-plan','verified-test-event')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(user_id,request_key),UNIQUE(id,order_id,user_id),
 FOREIGN KEY(order_id,user_id) REFERENCES bazar.orders(id,user_id),FOREIGN KEY(payment_operation_id,user_id) REFERENCES bazar.payment_operations(id,user_id),
 FOREIGN KEY(request_id,order_id,user_id) REFERENCES bazar.order_lifecycle_requests(id,order_id,user_id)
);
CREATE INDEX refunds_payment_idx ON bazar.order_refund_attempts(payment_operation_id);
CREATE INDEX refunds_owner_idx ON bazar.order_refund_attempts(user_id,order_id,id);
CREATE FUNCTION bazar.refund_capacity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE paid bazar.payment_operations; reserved numeric;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Refund history is immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  SELECT * INTO paid FROM bazar.payment_operations WHERE id=NEW.payment_operation_id AND user_id=NEW.user_id FOR UPDATE;
  IF NOT FOUND OR paid.status<>'succeeded' OR paid.amount_minor<NEW.amount_minor OR paid.currency<>NEW.currency OR paid.provider<>NEW.provider OR paid.account_ref<>NEW.account_ref OR
   NOT EXISTS(SELECT 1 FROM bazar.checkout_completion_links WHERE order_id=NEW.order_id AND user_id=NEW.user_id AND payment_operation_id=paid.id) OR
   NOT EXISTS(SELECT 1 FROM bazar.order_lifecycle_requests WHERE id=NEW.request_id AND order_id=NEW.order_id AND user_id=NEW.user_id AND kind='return') OR
   NOT EXISTS(SELECT 1 FROM bazar.payment_verified_events WHERE operation_id=paid.id) OR NEW.state<>'prepared' OR NEW.source<>'test-plan' OR NEW.version<>1 THEN
   RAISE EXCEPTION 'Refund requires matching isolated proof' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum(amount_minor),0) INTO reserved FROM bazar.order_refund_attempts WHERE payment_operation_id=paid.id;
  IF reserved+NEW.amount_minor>paid.amount_minor OR (NEW.extent='full' AND (NEW.amount_minor<>paid.amount_minor OR reserved<>0)) OR (NEW.extent='partial' AND NEW.amount_minor>=paid.amount_minor) THEN RAISE EXCEPTION 'Refund capacity exceeded' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.order_id,NEW.user_id,NEW.payment_operation_id,NEW.request_id,NEW.request_key,NEW.request_digest,NEW.amount_minor,NEW.currency,NEW.extent,NEW.basis,NEW.plan_revision,NEW.provider,NEW.account_ref,NEW.created_at) IS DISTINCT FROM
   (OLD.id,OLD.order_id,OLD.user_id,OLD.payment_operation_id,OLD.request_id,OLD.request_key,OLD.request_digest,OLD.amount_minor,OLD.currency,OLD.extent,OLD.basis,OLD.plan_revision,OLD.provider,OLD.account_ref,OLD.created_at) OR
   OLD.state IN ('confirmed-for-test','rejected-for-test') OR NEW.state='prepared' OR NEW.version<>OLD.version+1 OR NEW.source<>'verified-test-event' THEN RAISE EXCEPTION 'Invalid refund transition' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER refund_capacity_guard BEFORE INSERT OR UPDATE OR DELETE ON bazar.order_refund_attempts FOR EACH ROW EXECUTE FUNCTION bazar.refund_capacity_guard();
CREATE TABLE bazar.refund_verified_events (
 provider text NOT NULL,account_ref text NOT NULL,event_id uuid NOT NULL,refund_id uuid NOT NULL REFERENCES bazar.order_refund_attempts(id),
 digest bytea NOT NULL CHECK(octet_length(digest)=32),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(provider,account_ref,event_id)
);
CREATE INDEX refund_events_refund_idx ON bazar.refund_verified_events(refund_id);
CREATE TRIGGER refund_events_immutable BEFORE UPDATE OR DELETE ON bazar.refund_verified_events FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE TABLE bazar.order_lifecycle_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sequence bigint GENERATED ALWAYS AS IDENTITY (MAXVALUE 9007199254740990) UNIQUE,
 order_id uuid NOT NULL,user_id uuid NOT NULL,request_id uuid,refund_id uuid,from_state text,to_state text NOT NULL,version bigint NOT NULL,
 source text NOT NULL CHECK(source IN ('immutable-order','customer-request','isolated-review','test-plan','verified-test-event')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(NOT(request_id IS NOT NULL AND refund_id IS NOT NULL)),
 FOREIGN KEY(order_id,user_id) REFERENCES bazar.orders(id,user_id),FOREIGN KEY(request_id,order_id,user_id) REFERENCES bazar.order_lifecycle_requests(id,order_id,user_id),FOREIGN KEY(refund_id,order_id,user_id) REFERENCES bazar.order_refund_attempts(id,order_id,user_id)
);
CREATE UNIQUE INDEX lifecycle_initial_order_idx ON bazar.order_lifecycle_history(order_id) WHERE request_id IS NULL AND refund_id IS NULL;
CREATE INDEX lifecycle_history_owner_idx ON bazar.order_lifecycle_history(user_id,order_id,sequence);
CREATE UNIQUE INDEX lifecycle_request_version_idx ON bazar.order_lifecycle_history(request_id,version) WHERE request_id IS NOT NULL;
CREATE UNIQUE INDEX lifecycle_refund_version_idx ON bazar.order_lifecycle_history(refund_id,version) WHERE refund_id IS NOT NULL;
CREATE TRIGGER lifecycle_history_immutable BEFORE UPDATE OR DELETE ON bazar.order_lifecycle_history FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE FUNCTION bazar.lifecycle_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Request history is immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'requested' OR NEW.version<>1 OR NEW.source<>'customer-request' OR NOT EXISTS(SELECT 1 FROM bazar.orders WHERE id=NEW.order_id AND user_id=NEW.user_id AND foundation_mode='integration-test') THEN RAISE EXCEPTION 'Invalid request scope' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.order_id,NEW.user_id,NEW.kind,NEW.request_key,NEW.request_digest,NEW.reason,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.order_id,OLD.user_id,OLD.kind,OLD.request_key,OLD.request_digest,OLD.reason,OLD.created_at) OR
   NOT ((OLD.state='requested' AND NEW.state='under-review') OR (OLD.state='under-review' AND NEW.state='closed-for-test')) OR NEW.version<>OLD.version+1 OR NEW.source<>'isolated-review' THEN RAISE EXCEPTION 'Invalid request transition' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER lifecycle_request_guard BEFORE INSERT OR UPDATE OR DELETE ON bazar.order_lifecycle_requests FOR EACH ROW EXECUTE FUNCTION bazar.lifecycle_request_guard();
ALTER TABLE bazar.notification_events DROP CONSTRAINT notification_events_kind_check;
ALTER TABLE bazar.notification_events ADD CONSTRAINT notification_events_kind_check CHECK(kind IN ('order.created','order.status_changed','message.created','support.replied','order.cancelled','refund.completed','return.requested','return.status_changed'));
CREATE FUNCTION bazar.lifecycle_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_id uuid;
BEGIN
 INSERT INTO bazar.order_lifecycle_history(order_id,user_id,request_id,refund_id,from_state,to_state,version,source)
 VALUES(NEW.order_id,NEW.user_id,CASE WHEN TG_TABLE_NAME='order_lifecycle_requests' THEN NEW.id END,CASE WHEN TG_TABLE_NAME='order_refund_attempts' THEN NEW.id END,CASE WHEN TG_OP='UPDATE' THEN OLD.state END,NEW.state,NEW.version,NEW.source) RETURNING id INTO event_id;
 IF TG_TABLE_NAME='order_lifecycle_requests' AND NEW.kind='return' THEN
  INSERT INTO bazar.notification_events(user_id,kind,source_id,scope_id) VALUES(NEW.user_id,CASE WHEN TG_OP='INSERT' THEN 'return.requested' ELSE 'return.status_changed' END,event_id,NEW.order_id);
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER lifecycle_request_audit AFTER INSERT OR UPDATE ON bazar.order_lifecycle_requests FOR EACH ROW EXECUTE FUNCTION bazar.lifecycle_audit();
-- Separate wrapper avoids referencing a request-only field on a refund row.
CREATE FUNCTION bazar.refund_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO bazar.order_lifecycle_history(order_id,user_id,refund_id,from_state,to_state,version,source) VALUES(NEW.order_id,NEW.user_id,NEW.id,CASE WHEN TG_OP='UPDATE' THEN OLD.state END,NEW.state,NEW.version,NEW.source);
 RETURN NULL;
END $$;
CREATE TRIGGER refund_audit AFTER INSERT OR UPDATE ON bazar.order_refund_attempts FOR EACH ROW EXECUTE FUNCTION bazar.refund_audit();
INSERT INTO bazar.order_lifecycle_history(order_id,user_id,to_state,version,source,created_at) SELECT id,user_id,'pending',1,'immutable-order',created_at FROM bazar.orders WHERE foundation_mode='integration-test';
CREATE FUNCTION bazar.initial_order_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.foundation_mode='integration-test' THEN INSERT INTO bazar.order_lifecycle_history(order_id,user_id,to_state,version,source,created_at) VALUES(NEW.id,NEW.user_id,'pending',1,'immutable-order',NEW.created_at); END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER initial_order_history AFTER INSERT ON bazar.orders FOR EACH ROW EXECUTE FUNCTION bazar.initial_order_history();

CREATE FUNCTION bazar.return_request_complete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.kind='return' AND NOT EXISTS(SELECT 1 FROM bazar.order_return_items WHERE request_id=NEW.id) THEN RAISE EXCEPTION 'Return request requires selected items' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER return_request_complete AFTER INSERT ON bazar.order_lifecycle_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.return_request_complete();
