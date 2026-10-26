-- Isolated technical checkout/order records only; no legal order number or provider success is invented.
ALTER TABLE bazar.orders ADD COLUMN foundation_mode text CHECK (foundation_mode='integration-test');
ALTER TABLE bazar.orders ADD CONSTRAINT integration_order_pending CHECK (foundation_mode IS NULL OR status='pending');
CREATE TABLE bazar.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES bazar.users(id),
  cart_id uuid NOT NULL, cart_version bigint NOT NULL CHECK (cart_version BETWEEN 1 AND 9007199254740991),
  version bigint NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 9007199254740991),
  stage text NOT NULL CHECK (stage IN ('contact-delivery','payment','confirmation')),
  address_id uuid, payment_selection text CHECK (payment_selection IN ('card-online','on-receipt')),
  promo_code text CHECK (length(promo_code) BETWEEN 1 AND 64),
  pricing_fingerprint text CHECK (pricing_fingerprint ~ '^[a-f0-9]{64}$'),
  create_key uuid NOT NULL, create_digest bytea NOT NULL CHECK (octet_length(create_digest)=32),
  order_id uuid UNIQUE, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  mode text NOT NULL CHECK (mode='integration-test'),
  UNIQUE(id,user_id), UNIQUE(user_id,create_key),
  FOREIGN KEY(cart_id,user_id) REFERENCES bazar.carts(id,user_id),
  FOREIGN KEY(address_id,user_id) REFERENCES bazar.addresses(id,user_id),
  FOREIGN KEY(order_id,user_id) REFERENCES bazar.orders(id,user_id),
  CHECK (stage='contact-delivery' OR address_id IS NOT NULL),
  CHECK (stage<>'confirmation' OR (payment_selection IS NOT NULL AND pricing_fingerprint IS NOT NULL)),
  CHECK (order_id IS NULL OR stage='confirmation')
);
CREATE INDEX checkout_owner_idx ON bazar.checkout_sessions(user_id,created_at,id);
CREATE INDEX checkout_cart_idx ON bazar.checkout_sessions(cart_id,user_id);
CREATE INDEX checkout_address_idx ON bazar.checkout_sessions(address_id,user_id);
CREATE TABLE bazar.order_checkout_snapshots (
  order_id uuid PRIMARY KEY, user_id uuid NOT NULL, checkout_id uuid NOT NULL UNIQUE,
  cart_id uuid NOT NULL, cart_version bigint NOT NULL CHECK (cart_version BETWEEN 1 AND 9007199254740991),
  subtotal_minor bazar.money_minor NOT NULL, discount_minor bazar.money_minor NOT NULL CHECK (discount_minor=0),
  merchandise_total_minor bazar.money_minor NOT NULL, currency bazar.currency_code NOT NULL,
  carrier text NOT NULL CHECK (carrier IN ('nova-poshta','meest')),
  city_ref text NOT NULL CHECK (length(city_ref) BETWEEN 1 AND 200),
  location_ref text NOT NULL CHECK (length(location_ref) BETWEEN 1 AND 200),
  payment_selection text NOT NULL CHECK (payment_selection IN ('card-online','on-receipt')),
  pricing_fingerprint text NOT NULL CHECK (pricing_fingerprint ~ '^[a-f0-9]{64}$'),
  delivery_cost_minor bazar.money_minor CHECK (delivery_cost_minor IS NULL),
  payable_total_minor bazar.money_minor CHECK (payable_total_minor IS NULL),
  mode text NOT NULL CHECK (mode='integration-test'),
  UNIQUE(cart_id,cart_version),
  FOREIGN KEY(order_id,user_id) REFERENCES bazar.orders(id,user_id),
  FOREIGN KEY(checkout_id,user_id) REFERENCES bazar.checkout_sessions(id,user_id),
  FOREIGN KEY(cart_id,user_id) REFERENCES bazar.carts(id,user_id),
  CHECK (merchandise_total_minor=subtotal_minor-discount_minor)
);
CREATE INDEX order_snapshots_owner_idx ON bazar.order_checkout_snapshots(user_id,order_id);
CREATE TABLE bazar.checkout_order_requests (
  user_id uuid NOT NULL, key uuid NOT NULL, request_digest bytea NOT NULL CHECK (octet_length(request_digest)=32),
  checkout_id uuid NOT NULL UNIQUE, order_id uuid NOT NULL UNIQUE,
  PRIMARY KEY(user_id,key),
  FOREIGN KEY(checkout_id,user_id) REFERENCES bazar.checkout_sessions(id,user_id),
  FOREIGN KEY(order_id,user_id) REFERENCES bazar.orders(id,user_id)
);
CREATE FUNCTION bazar.protect_integration_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.foundation_mode IS NOT NULL OR (TG_OP='UPDATE' AND NEW.foundation_mode IS DISTINCT FROM OLD.foundation_mode) THEN
    RAISE EXCEPTION 'Integration order history is immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER integration_order_immutable BEFORE UPDATE OR DELETE ON bazar.orders FOR EACH ROW EXECUTE FUNCTION bazar.protect_integration_order();
CREATE FUNCTION bazar.protect_integration_lines() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM bazar.orders WHERE id=OLD.order_id AND foundation_mode='integration-test') OR
     (TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM bazar.orders WHERE id=NEW.order_id AND foundation_mode='integration-test')) THEN
    RAISE EXCEPTION 'Integration line history is immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER integration_lines_immutable BEFORE UPDATE OR DELETE ON bazar.order_lines FOR EACH ROW EXECUTE FUNCTION bazar.protect_integration_lines();
CREATE FUNCTION bazar.immutable_checkout_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Checkout history is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER order_snapshot_immutable BEFORE UPDATE OR DELETE ON bazar.order_checkout_snapshots FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE TRIGGER order_request_immutable BEFORE UPDATE OR DELETE ON bazar.checkout_order_requests FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE FUNCTION bazar.check_integration_order_totals() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; amount numeric; line_count bigint; snapshot bazar.order_checkout_snapshots%ROWTYPE; order_row bazar.orders%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME='orders' THEN target=NEW.id; ELSE target=NEW.order_id; END IF;
  SELECT * INTO order_row FROM bazar.orders WHERE id=target;
  IF order_row.foundation_mode IS DISTINCT FROM 'integration-test' THEN
    IF TG_TABLE_NAME='order_checkout_snapshots' THEN RAISE EXCEPTION 'Snapshot requires integration order' USING ERRCODE='23514'; END IF;
    RETURN NULL;
  END IF;
  SELECT * INTO snapshot FROM bazar.order_checkout_snapshots WHERE order_id=target;
  SELECT count(*),coalesce(sum(line_total_minor::numeric),0) INTO line_count,amount FROM bazar.order_lines WHERE order_id=target;
  IF snapshot.order_id IS NULL OR line_count=0 OR amount<>snapshot.subtotal_minor OR order_row.total_minor<>snapshot.merchandise_total_minor OR order_row.currency<>snapshot.currency THEN
    RAISE EXCEPTION 'Integration order totals are inconsistent' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM bazar.checkout_sessions c JOIN bazar.checkout_order_requests r ON r.checkout_id=c.id WHERE c.id=snapshot.checkout_id AND c.user_id=order_row.user_id AND c.order_id=target AND c.cart_id=snapshot.cart_id AND c.cart_version=snapshot.cart_version AND c.payment_selection=snapshot.payment_selection AND c.pricing_fingerprint=snapshot.pricing_fingerprint AND c.address_id=order_row.address_id AND r.order_id=target AND r.user_id=order_row.user_id) THEN
    RAISE EXCEPTION 'Integration order requires completed checkout/request links' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER integration_order_totals AFTER INSERT ON bazar.orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.check_integration_order_totals();
CREATE CONSTRAINT TRIGGER integration_line_totals AFTER INSERT ON bazar.order_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.check_integration_order_totals();
CREATE CONSTRAINT TRIGGER integration_snapshot_totals AFTER INSERT ON bazar.order_checkout_snapshots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.check_integration_order_totals();
CREATE FUNCTION bazar.block_integration_provider_operation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM bazar.orders WHERE id=NEW.order_id AND foundation_mode='integration-test') THEN
    RAISE EXCEPTION 'Provider operations cannot target integration orders' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER integration_payment_block BEFORE INSERT OR UPDATE ON bazar.payment_attempts FOR EACH ROW EXECUTE FUNCTION bazar.block_integration_provider_operation();
CREATE TRIGGER integration_shipment_block BEFORE INSERT OR UPDATE ON bazar.shipments FOR EACH ROW EXECUTE FUNCTION bazar.block_integration_provider_operation();
CREATE FUNCTION bazar.block_closed_integration_line_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM bazar.orders o JOIN bazar.order_checkout_snapshots s ON s.order_id=o.id WHERE o.id=NEW.order_id AND o.foundation_mode='integration-test') THEN
    RAISE EXCEPTION 'Closed integration order cannot gain lines' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER integration_line_insert_guard BEFORE INSERT ON bazar.order_lines FOR EACH ROW EXECUTE FUNCTION bazar.block_closed_integration_line_insert();
CREATE FUNCTION bazar.protect_closed_checkout() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.order_id IS NOT NULL THEN RAISE EXCEPTION 'Recorded checkout is immutable' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER closed_checkout_immutable BEFORE UPDATE OR DELETE ON bazar.checkout_sessions FOR EACH ROW EXECUTE FUNCTION bazar.protect_closed_checkout();
