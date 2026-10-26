-- No production carrier, tariff, key, recipient PII or actual shipment is provisioned.
CREATE TABLE bazar.shipping_carriers (
  code text PRIMARY KEY CHECK(code IN ('nova-poshta','meest')),
  mode text NOT NULL CHECK(mode='integration-test')
);
CREATE TABLE bazar.shipping_cities (
  carrier text NOT NULL REFERENCES bazar.shipping_carriers(code), ref text NOT NULL CHECK(length(ref) BETWEEN 1 AND 200),
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200), observed_at timestamptz NOT NULL,
  PRIMARY KEY(carrier,ref)
);
CREATE TABLE bazar.shipping_points (
  carrier text NOT NULL, ref text NOT NULL CHECK(length(ref) BETWEEN 1 AND 200), city_ref text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('branch','parcel-locker')), name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
  available boolean NOT NULL, revision text NOT NULL CHECK(length(revision) BETWEEN 1 AND 200), observed_at timestamptz NOT NULL,
  PRIMARY KEY(carrier,ref), UNIQUE(carrier,ref,city_ref,kind),
  FOREIGN KEY(carrier,city_ref) REFERENCES bazar.shipping_cities(carrier,ref)
);
CREATE INDEX shipping_points_city_idx ON bazar.shipping_points(carrier,city_ref,kind);
CREATE TABLE bazar.checkout_shipping (
  checkout_id uuid PRIMARY KEY, user_id uuid NOT NULL, address_id uuid NOT NULL,
  carrier text NOT NULL, city_ref text NOT NULL, point_ref text NOT NULL, kind text NOT NULL,
  point_revision text NOT NULL, quote_id uuid,
  FOREIGN KEY(checkout_id,user_id) REFERENCES bazar.checkout_sessions(id,user_id),
  FOREIGN KEY(address_id,user_id) REFERENCES bazar.addresses(id,user_id),
  FOREIGN KEY(carrier,point_ref,city_ref,kind) REFERENCES bazar.shipping_points(carrier,ref,city_ref,kind),
  UNIQUE(checkout_id,user_id)
);
CREATE INDEX checkout_shipping_owner_idx ON bazar.checkout_shipping(user_id,checkout_id);
CREATE INDEX checkout_shipping_address_idx ON bazar.checkout_shipping(address_id,user_id);
CREATE TABLE bazar.shipping_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), checkout_id uuid NOT NULL, user_id uuid NOT NULL,
  checkout_version bigint NOT NULL CHECK(checkout_version BETWEEN 1 AND 9007199254740991),
  request_key uuid NOT NULL, request_digest bytea NOT NULL CHECK(octet_length(request_digest)=32),
  carrier text NOT NULL, city_ref text NOT NULL, point_ref text NOT NULL, kind text NOT NULL,
  amount_minor bazar.money_minor NOT NULL, currency bazar.currency_code NOT NULL,
  binding text NOT NULL CHECK(binding ~ '^[a-f0-9]{64}$'),
  quoted_at timestamptz NOT NULL, expires_at timestamptz NOT NULL CHECK(expires_at>quoted_at),
  validity_source text NOT NULL CHECK(validity_source='integration-policy'), mode text NOT NULL CHECK(mode='integration-test'),
  FOREIGN KEY(checkout_id,user_id) REFERENCES bazar.checkout_shipping(checkout_id,user_id),
  FOREIGN KEY(carrier,point_ref,city_ref,kind) REFERENCES bazar.shipping_points(carrier,ref,city_ref,kind),
  UNIQUE(user_id,request_key), UNIQUE(id,checkout_id,user_id)
);
CREATE INDEX shipping_quotes_checkout_idx ON bazar.shipping_quotes(checkout_id,user_id,expires_at);
ALTER TABLE bazar.checkout_shipping ADD FOREIGN KEY(quote_id,checkout_id,user_id) REFERENCES bazar.shipping_quotes(id,checkout_id,user_id);
CREATE TRIGGER shipping_quote_immutable BEFORE UPDATE OR DELETE ON bazar.shipping_quotes FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE FUNCTION bazar.protect_recorded_shipping() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  IF TG_OP='DELETE' THEN target=OLD.checkout_id; ELSE target=NEW.checkout_id; END IF;
  IF TG_OP='UPDATE' AND (NEW.checkout_id<>OLD.checkout_id OR NEW.user_id<>OLD.user_id) THEN
    RAISE EXCEPTION 'Shipping ownership is immutable' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM bazar.checkout_sessions WHERE id=target AND order_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Recorded checkout shipping is immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER recorded_shipping_immutable BEFORE INSERT OR UPDATE OR DELETE ON bazar.checkout_shipping FOR EACH ROW EXECUTE FUNCTION bazar.protect_recorded_shipping();
