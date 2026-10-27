-- F23 additive operational sidecars. F22 financial projections/snapshots and old history are unchanged.
CREATE TABLE bazar.commerce_order_lifecycle (
 seller_order_id uuid PRIMARY KEY REFERENCES bazar.commerce_seller_orders(id),
 status text NOT NULL CHECK(status IN ('new','confirmed','preparing','shipped','delivered','cancelled','system-cancelled','returning','returned')),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740990),
 prepared_at timestamptz,dispatch_due_at timestamptz,deadline_policy text,tracking_ref text,
 shipment_state text NOT NULL DEFAULT 'not-dispatched' CHECK(shipment_state IN ('not-dispatched','shipped','transport','delivered','returned')),
 CHECK((dispatch_due_at IS NULL)=(deadline_policy IS NULL)),CHECK(dispatch_due_at IS NULL OR dispatch_due_at>prepared_at)
);
INSERT INTO bazar.commerce_order_lifecycle(seller_order_id,status) SELECT id,CASE WHEN status='confirmed' THEN 'confirmed' ELSE 'new' END FROM bazar.commerce_seller_orders;
CREATE TABLE bazar.commerce_lifecycle_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 seller_order_id uuid NOT NULL REFERENCES bazar.commerce_order_lifecycle(seller_order_id),actor_id uuid REFERENCES bazar.users(id),
 kind text NOT NULL,from_status text,to_status text,source text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO bazar.commerce_lifecycle_events(seller_order_id,kind,to_status,source) SELECT seller_order_id,'history.imported',status,'documented-f22-projection' FROM bazar.commerce_order_lifecycle;
CREATE TABLE bazar.commerce_lifecycle_receipts (
 actor_id uuid NOT NULL REFERENCES bazar.users(id),request_key uuid NOT NULL,seller_order_id uuid NOT NULL REFERENCES bazar.commerce_order_lifecycle(seller_order_id),digest text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(actor_id,request_key)
);
CREATE TABLE bazar.commerce_cancellation_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_order_id uuid NOT NULL UNIQUE REFERENCES bazar.commerce_order_lifecycle(seller_order_id),buyer_id uuid NOT NULL REFERENCES bazar.users(id),reason text NOT NULL,
 state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','approved')),created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE bazar.commerce_return_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_order_id uuid NOT NULL REFERENCES bazar.commerce_order_lifecycle(seller_order_id),buyer_id uuid NOT NULL REFERENCES bazar.users(id),reason text NOT NULL,
 state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','received-for-test')),created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE bazar.commerce_return_items (
 request_id uuid NOT NULL REFERENCES bazar.commerce_return_requests(id),parent_id uuid NOT NULL,line_id uuid NOT NULL,quantity integer NOT NULL CHECK(quantity>0),PRIMARY KEY(request_id,line_id),FOREIGN KEY(parent_id,line_id) REFERENCES bazar.commerce_order_lines(parent_id,line_id)
);
CREATE FUNCTION bazar.commerce_return_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE so bazar.commerce_seller_orders; purchased integer; used bigint;
BEGIN
 SELECT s.* INTO STRICT so FROM bazar.commerce_return_requests r JOIN bazar.commerce_seller_orders s ON s.id=r.seller_order_id WHERE r.id=NEW.request_id AND r.state='requested' AND r.xmin=pg_current_xact_id()::xid;
 PERFORM 1 FROM bazar.commerce_order_lifecycle WHERE seller_order_id=so.id FOR UPDATE;
 SELECT (snapshot->>'quantity')::integer INTO purchased FROM bazar.commerce_order_lines WHERE parent_id=NEW.parent_id AND parent_id=so.parent_id AND seller_id=so.seller_id AND line_id=NEW.line_id;
 SELECT coalesce(sum(i.quantity),0) INTO used FROM bazar.commerce_return_items i JOIN bazar.commerce_return_requests r ON r.id=i.request_id WHERE r.seller_order_id=so.id AND i.line_id=NEW.line_id;
 IF purchased IS NULL OR used+NEW.quantity>purchased THEN RAISE EXCEPTION 'Return quantity exceeds owned purchased line' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER commerce_return_guard BEFORE INSERT ON bazar.commerce_return_items FOR EACH ROW EXECUTE FUNCTION bazar.commerce_return_guard();
CREATE TABLE bazar.commerce_refund_intents (
 seller_order_id uuid PRIMARY KEY REFERENCES bazar.commerce_order_lifecycle(seller_order_id),reason text NOT NULL,state text NOT NULL DEFAULT 'policy-required' CHECK(state='policy-required')
);
CREATE TABLE bazar.commerce_return_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid UNIQUE NOT NULL REFERENCES bazar.commerce_return_requests(id),attempt_id uuid NOT NULL REFERENCES bazar.commerce_payment_attempts(id),
 amount_minor bazar.money_minor NOT NULL CHECK(amount_minor>0),currency bazar.currency_code NOT NULL DEFAULT 'UAH',
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','pending','unknown','confirmed-for-test','rejected-for-test')),provider text NOT NULL,account_ref text NOT NULL
);
CREATE TABLE bazar.commerce_refund_events (
 provider text NOT NULL,account_ref text NOT NULL,event_id text NOT NULL,refund_id uuid NOT NULL REFERENCES bazar.commerce_return_refunds(id),digest text NOT NULL,PRIMARY KEY(provider,account_ref,event_id)
);
CREATE TABLE bazar.commerce_transport_events (
 event_id text PRIMARY KEY,seller_order_id uuid NOT NULL REFERENCES bazar.commerce_order_lifecycle(seller_order_id),digest text NOT NULL
);
CREATE TABLE bazar.commerce_dispatch_escalations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_order_id uuid UNIQUE NOT NULL REFERENCES bazar.commerce_order_lifecycle(seller_order_id),staff_user_id uuid NOT NULL REFERENCES bazar.users(id),ticket_id uuid NOT NULL REFERENCES bazar.support_tickets(id),
 created_at timestamptz NOT NULL,response_due_at timestamptz NOT NULL,response_at timestamptz,response_text text,
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','system-cancelled')),CHECK(response_due_at=created_at+interval '48 hours')
);
CREATE TRIGGER commerce_flow_events_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_lifecycle_events FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE TRIGGER commerce_flow_receipts_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_lifecycle_receipts FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE TRIGGER commerce_flow_returns_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_return_items FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE TRIGGER commerce_flow_transport_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_transport_events FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE TRIGGER commerce_flow_refund_events_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_refund_events FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE FUNCTION bazar.commerce_flow_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.seller_order_id<>OLD.seller_order_id OR NEW.version<>OLD.version+1 OR NOT (
 (OLD.status='new' AND NEW.status IN ('confirmed','cancelled')) OR
 (OLD.status='confirmed' AND NEW.status IN ('preparing','cancelled')) OR
 (OLD.status='preparing' AND NEW.status IN ('shipped','cancelled','system-cancelled')) OR
 (OLD.status='shipped' AND NEW.status IN ('delivered','cancelled')) OR
 (OLD.status='delivered' AND NEW.status='returning') OR
 (OLD.status='returning' AND NEW.status IN ('returned','delivered')) OR NEW.status=OLD.status) THEN RAISE EXCEPTION 'Invalid operational transition' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER commerce_flow_transition BEFORE UPDATE ON bazar.commerce_order_lifecycle FOR EACH ROW EXECUTE FUNCTION bazar.commerce_flow_transition();
ALTER TABLE bazar.commerce_lifecycle_events ADD CHECK(from_status IS NULL OR from_status IN ('new','confirmed','preparing','shipped','delivered','cancelled','system-cancelled','returning','returned')),ADD CHECK(to_status IS NULL OR to_status IN ('new','confirmed','preparing','shipped','delivered','cancelled','system-cancelled','returning','returned'));
CREATE FUNCTION bazar.commerce_flow_owner() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bazar.commerce_seller_orders s JOIN bazar.commerce_parent_orders p ON p.id=s.parent_id WHERE s.id=NEW.seller_order_id AND p.user_id=NEW.buyer_id) THEN RAISE EXCEPTION 'Invalid lifecycle owner' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER commerce_return_owner BEFORE INSERT ON bazar.commerce_return_requests FOR EACH ROW EXECUTE FUNCTION bazar.commerce_flow_owner();
CREATE TRIGGER commerce_cancel_owner BEFORE INSERT ON bazar.commerce_cancellation_requests FOR EACH ROW EXECUTE FUNCTION bazar.commerce_flow_owner();
CREATE FUNCTION bazar.commerce_refund_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE paid bazar.commerce_payment_attempts; parent uuid; entitlement numeric; claimed numeric;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (NEW.id,NEW.request_id,NEW.attempt_id,NEW.amount_minor,NEW.currency,NEW.provider,NEW.account_ref) IS DISTINCT FROM (OLD.id,OLD.request_id,OLD.attempt_id,OLD.amount_minor,OLD.currency,OLD.provider,OLD.account_ref) OR OLD.state IN ('confirmed-for-test','rejected-for-test') AND OLD.state<>NEW.state OR NEW.state='prepared' THEN RAISE EXCEPTION 'Immutable refund or terminal state' USING ERRCODE='23514';END IF;RETURN NEW;
 END IF;
 SELECT * INTO STRICT paid FROM bazar.commerce_payment_attempts WHERE id=NEW.attempt_id FOR UPDATE;
 SELECT s.parent_id INTO parent FROM bazar.commerce_return_requests r JOIN bazar.commerce_seller_orders s ON s.id=r.seller_order_id WHERE r.id=NEW.request_id AND r.state='received-for-test';
 IF parent IS NULL OR parent<>paid.parent_id OR paid.state<>'succeeded' OR paid.provider<>NEW.provider OR paid.account_ref<>NEW.account_ref OR paid.currency<>NEW.currency OR NOT EXISTS(SELECT 1 FROM bazar.commerce_payment_events WHERE attempt_id=paid.id AND observation->>'status'='succeeded') THEN RAISE EXCEPTION 'Refund lacks matching confirmed payment' USING ERRCODE='23514';END IF;
 IF EXISTS(SELECT 1 FROM bazar.commerce_return_items i JOIN bazar.commerce_order_lines l USING(parent_id,line_id) WHERE i.request_id=NEW.request_id AND i.quantity<>(l.snapshot->>'quantity')::integer AND mod((l.snapshot->>'netMinor')::numeric,(l.snapshot->>'quantity')::numeric)<>0) THEN RAISE EXCEPTION 'Partial unit allocation requires policy' USING ERRCODE='23514';END IF;
 SELECT sum(CASE WHEN i.quantity=(l.snapshot->>'quantity')::integer THEN (l.snapshot->>'netMinor')::numeric ELSE (l.snapshot->>'netMinor')::numeric/(l.snapshot->>'quantity')::numeric*i.quantity END) INTO entitlement FROM bazar.commerce_return_items i JOIN bazar.commerce_order_lines l USING(parent_id,line_id) WHERE i.request_id=NEW.request_id;
 SELECT coalesce(sum(amount_minor),0) INTO claimed FROM bazar.commerce_return_refunds WHERE attempt_id=paid.id;
 IF NEW.amount_minor<>entitlement OR claimed+NEW.amount_minor>paid.amount_minor OR NEW.state<>'prepared' THEN RAISE EXCEPTION 'Refund entitlement/capacity exceeded' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER commerce_refund_guard BEFORE INSERT OR UPDATE ON bazar.commerce_return_refunds FOR EACH ROW EXECUTE FUNCTION bazar.commerce_refund_guard();

ALTER TABLE bazar.commerce_lifecycle_events ADD COLUMN reason text CHECK(reason IS NULL OR length(reason) BETWEEN 1 AND 2000);
ALTER TABLE bazar.commerce_transport_events ADD COLUMN observation jsonb NOT NULL;
ALTER TABLE bazar.commerce_refund_events ADD COLUMN observation jsonb NOT NULL;
CREATE FUNCTION bazar.commerce_request_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Lifecycle request history is immutable' USING ERRCODE='23514';END IF;
 IF (NEW.id,NEW.seller_order_id,NEW.buyer_id,NEW.reason,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.seller_order_id,OLD.buyer_id,OLD.reason,OLD.created_at) OR OLD.state<>'requested' AND NEW.state<>OLD.state THEN RAISE EXCEPTION 'Immutable request basis or terminal state' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER commerce_cancellation_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_cancellation_requests FOR EACH ROW EXECUTE FUNCTION bazar.commerce_request_immutable();
CREATE TRIGGER commerce_return_request_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_return_requests FOR EACH ROW EXECUTE FUNCTION bazar.commerce_request_immutable();
CREATE TRIGGER commerce_refund_delete_immutable BEFORE DELETE ON bazar.commerce_return_refunds FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE INDEX commerce_flow_dispatch_due_idx ON bazar.commerce_order_lifecycle(dispatch_due_at,seller_order_id) WHERE status='preparing' AND dispatch_due_at IS NOT NULL;
CREATE INDEX commerce_flow_history_scope_idx ON bazar.commerce_lifecycle_events(seller_order_id,sequence);
CREATE INDEX commerce_flow_return_scope_idx ON bazar.commerce_return_requests(seller_order_id,state,id);
CREATE INDEX commerce_flow_refund_capacity_idx ON bazar.commerce_return_refunds(attempt_id);
