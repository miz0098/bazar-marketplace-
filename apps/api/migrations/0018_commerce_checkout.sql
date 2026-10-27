-- Additive isolated multi-seller checkout. No live provider/payout or inventory counters.
CREATE TABLE bazar.cart_line_identity (
 cart_id uuid NOT NULL,variant_id uuid NOT NULL,generation uuid NOT NULL DEFAULT gen_random_uuid(),
 PRIMARY KEY(cart_id,variant_id),FOREIGN KEY(cart_id,variant_id) REFERENCES bazar.cart_lines(cart_id,variant_id) ON DELETE CASCADE
);
INSERT INTO bazar.cart_line_identity(cart_id,variant_id) SELECT cart_id,variant_id FROM bazar.cart_lines;
CREATE FUNCTION bazar.commerce_cart_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO bazar.cart_line_identity(cart_id,variant_id) VALUES(NEW.cart_id,NEW.variant_id);RETURN NEW;END $$;
CREATE TRIGGER commerce_cart_identity AFTER INSERT ON bazar.cart_lines FOR EACH ROW EXECUTE FUNCTION bazar.commerce_cart_identity();
CREATE TABLE bazar.commerce_promotions (
 promotion_id uuid PRIMARY KEY REFERENCES bazar.promotions(id),scope text NOT NULL CHECK(scope IN ('order','category','product'))
);
CREATE TABLE bazar.commerce_promotion_categories (
 promotion_id uuid NOT NULL REFERENCES bazar.commerce_promotions(promotion_id),category_id uuid NOT NULL REFERENCES bazar.categories(id),PRIMARY KEY(promotion_id,category_id)
);
CREATE TABLE bazar.commerce_checkouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES bazar.users(id),cart_id uuid NOT NULL,
 request_key uuid NOT NULL,request_digest text NOT NULL,cart_version bigint NOT NULL CHECK(cart_version>0),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),fingerprint text NOT NULL,
 promotion_id uuid REFERENCES bazar.promotions(id),promotion_version bigint,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(user_id,request_key),UNIQUE(id,user_id),FOREIGN KEY(cart_id,user_id) REFERENCES bazar.carts(id,user_id)
);
CREATE TABLE bazar.commerce_parent_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),checkout_id uuid NOT NULL UNIQUE,user_id uuid NOT NULL,
 payment_state text NOT NULL CHECK(payment_state IN ('initiated','pending','succeeded','declined','unknown','verification-required')),
 status text NOT NULL CHECK(status IN ('awaiting-payment','confirmed','verification-required')),
 currency bazar.currency_code NOT NULL DEFAULT 'UAH',created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(id,user_id),FOREIGN KEY(checkout_id,user_id) REFERENCES bazar.commerce_checkouts(id,user_id)
);
CREATE INDEX commerce_parent_owner_idx ON bazar.commerce_parent_orders(user_id,created_at,id);
CREATE TABLE bazar.commerce_seller_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),parent_id uuid NOT NULL REFERENCES bazar.commerce_parent_orders(id),seller_id uuid NOT NULL REFERENCES bazar.sellers(id),
 financial jsonb NOT NULL CHECK(jsonb_typeof(financial)='object'),delivery jsonb NOT NULL CHECK(jsonb_typeof(delivery)='object'),
 status text NOT NULL CHECK(status IN ('awaiting-payment','confirmed','verification-required')),UNIQUE(parent_id,seller_id),UNIQUE(id,parent_id,seller_id)
);
CREATE TABLE bazar.commerce_order_lines (
 parent_id uuid NOT NULL,seller_id uuid NOT NULL,line_id uuid NOT NULL,product_id uuid NOT NULL,variant_id uuid NOT NULL,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),PRIMARY KEY(parent_id,line_id),
 FOREIGN KEY(parent_id,seller_id) REFERENCES bazar.commerce_seller_orders(parent_id,seller_id),
 FOREIGN KEY(variant_id,product_id) REFERENCES bazar.variants(id,product_id)
);
CREATE TABLE bazar.commerce_payment_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ordinal bigint GENERATED ALWAYS AS IDENTITY UNIQUE,parent_id uuid NOT NULL REFERENCES bazar.commerce_parent_orders(id),user_id uuid NOT NULL REFERENCES bazar.users(id),
 request_key uuid NOT NULL,request_digest text NOT NULL,provider text NOT NULL,account_ref text NOT NULL,operation_ref text,
 amount_minor bazar.money_minor NOT NULL CHECK(amount_minor>0),currency bazar.currency_code NOT NULL DEFAULT 'UAH',
 state text NOT NULL CHECK(state IN ('initiated','pending','succeeded','declined','unknown','verification-required')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(user_id,request_key),FOREIGN KEY(parent_id,user_id) REFERENCES bazar.commerce_parent_orders(id,user_id)
);
CREATE UNIQUE INDEX commerce_unresolved_parent_idx ON bazar.commerce_payment_attempts(parent_id) WHERE state<>'declined';
-- Payment-exclusion claims are not warehouse/quantity reservations.
CREATE TABLE bazar.commerce_cart_claims (
 cart_id uuid NOT NULL,variant_id uuid NOT NULL,parent_id uuid NOT NULL REFERENCES bazar.commerce_parent_orders(id),PRIMARY KEY(cart_id,variant_id)
);
CREATE TABLE bazar.commerce_promo_claims (
 parent_id uuid PRIMARY KEY REFERENCES bazar.commerce_parent_orders(id),promotion_id uuid NOT NULL REFERENCES bazar.promotions(id),user_id uuid NOT NULL REFERENCES bazar.users(id),
 state text NOT NULL CHECK(state IN ('reserved','consumed','released'))
);
CREATE INDEX commerce_promo_usage_idx ON bazar.commerce_promo_claims(promotion_id,user_id) WHERE state<>'released';
CREATE TABLE bazar.commerce_payment_events (
 provider text NOT NULL,account_ref text NOT NULL,event_id text NOT NULL,attempt_id uuid NOT NULL REFERENCES bazar.commerce_payment_attempts(id),
 digest text NOT NULL,observation jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(provider,account_ref,event_id)
);
CREATE TABLE bazar.commerce_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),parent_id uuid NOT NULL REFERENCES bazar.commerce_parent_orders(id),attempt_id uuid REFERENCES bazar.commerce_payment_attempts(id),
 kind text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(parent_id,attempt_id,kind)
);
CREATE FUNCTION bazar.commerce_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable commerce snapshot/history';END $$;
CREATE TRIGGER commerce_checkout_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_checkouts FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE TRIGGER commerce_lines_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_order_lines FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE TRIGGER commerce_events_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_payment_events FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE TRIGGER commerce_history_immutable BEFORE UPDATE OR DELETE ON bazar.commerce_history FOR EACH ROW EXECUTE FUNCTION bazar.commerce_immutable();
CREATE FUNCTION bazar.commerce_seller_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id<>OLD.id OR NEW.parent_id<>OLD.parent_id OR NEW.seller_id<>OLD.seller_id OR NEW.financial<>OLD.financial OR NEW.delivery<>OLD.delivery THEN RAISE EXCEPTION 'Immutable seller snapshot';END IF;RETURN NEW;END $$;
CREATE TRIGGER commerce_seller_immutable BEFORE UPDATE ON bazar.commerce_seller_orders FOR EACH ROW EXECUTE FUNCTION bazar.commerce_seller_immutable();
ALTER TABLE bazar.promotions ADD CONSTRAINT commerce_promotion_code_fk UNIQUE(id,code);
ALTER TABLE bazar.commerce_promotions ADD COLUMN code text NOT NULL CHECK(code ~ '^BZ[0-9]{11}$');
ALTER TABLE bazar.commerce_promotions ADD CONSTRAINT commerce_promotion_code_match FOREIGN KEY(promotion_id,code) REFERENCES bazar.promotions(id,code);
CREATE OR REPLACE FUNCTION bazar.check_promotion_claim_limit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE campaign bazar.promotions%ROWTYPE; total_count bigint; owner_count bigint;
BEGIN
 SELECT * INTO STRICT campaign FROM bazar.promotions WHERE id=NEW.promotion_id FOR UPDATE;
 SELECT count(*),count(*) FILTER(WHERE user_id=NEW.user_id) INTO total_count,owner_count FROM bazar.promotion_usage_claims WHERE promotion_id=NEW.promotion_id;
 total_count:=total_count+(SELECT count(*) FROM bazar.commerce_promo_claims WHERE promotion_id=NEW.promotion_id AND state<>'released');
 owner_count:=owner_count+(SELECT count(*) FROM bazar.commerce_promo_claims WHERE promotion_id=NEW.promotion_id AND user_id=NEW.user_id AND state<>'released');
 IF NOT campaign.enabled OR clock_timestamp()<campaign.starts_at OR clock_timestamp()>=campaign.ends_at OR total_count>=campaign.max_uses OR owner_count>=campaign.per_user_limit THEN RAISE EXCEPTION 'Promotion claim rejected' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE FUNCTION bazar.commerce_promotion_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p bazar.promotions%ROWTYPE; total_count bigint; owner_count bigint;
BEGIN
 IF NEW.state='released' OR TG_OP='UPDATE' AND OLD.state<>'released' THEN RETURN NEW;END IF;
 SELECT * INTO STRICT p FROM bazar.promotions WHERE id=NEW.promotion_id FOR UPDATE;
 SELECT (SELECT count(*) FROM bazar.promotion_usage_claims WHERE promotion_id=p.id)+(SELECT count(*) FROM bazar.commerce_promo_claims WHERE promotion_id=p.id AND state<>'released' AND parent_id<>NEW.parent_id),
 (SELECT count(*) FROM bazar.promotion_usage_claims WHERE promotion_id=p.id AND user_id=NEW.user_id)+(SELECT count(*) FROM bazar.commerce_promo_claims WHERE promotion_id=p.id AND user_id=NEW.user_id AND state<>'released' AND parent_id<>NEW.parent_id) INTO total_count,owner_count;
 IF NOT p.enabled OR clock_timestamp()<p.starts_at OR clock_timestamp()>=p.ends_at OR total_count>=p.max_uses OR owner_count>=p.per_user_limit THEN RAISE EXCEPTION 'Promotion capacity rejected' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER commerce_promotion_capacity BEFORE INSERT OR UPDATE ON bazar.commerce_promo_claims FOR EACH ROW EXECUTE FUNCTION bazar.commerce_promotion_capacity();
CREATE FUNCTION bazar.commerce_reconcile() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE q jsonb; n integer; expected integer; gross numeric; discount numeric; net numeric; commission numeric; proceeds numeric;
BEGIN
 SELECT snapshot INTO STRICT q FROM bazar.commerce_checkouts WHERE id=NEW.checkout_id;
 SELECT count(*),coalesce(sum((financial->>'grossMinor')::numeric),0),coalesce(sum((financial->>'discountMinor')::numeric),0),coalesce(sum((financial->>'netMinor')::numeric),0),coalesce(sum((financial->>'commissionMinor')::numeric),0),coalesce(sum((financial->>'sellerMinor')::numeric),0) INTO n,gross,discount,net,commission,proceeds FROM bazar.commerce_seller_orders WHERE parent_id=NEW.id;
 expected:=jsonb_array_length(q->'financial'->'sellers');
 IF n<>expected OR n=0 OR gross<>(q->'financial'->>'grossMinor')::numeric OR discount<>(q->'financial'->>'discountMinor')::numeric OR net<>(q->'financial'->>'netMinor')::numeric OR gross-discount<>net OR commission+proceeds<>net OR commission<>(q->'financial'->>'commissionMinor')::numeric THEN RAISE EXCEPTION 'Commerce seller totals do not reconcile';END IF;
 SELECT count(*),sum((snapshot->>'grossMinor')::numeric),sum((snapshot->>'discountMinor')::numeric),sum((snapshot->>'netMinor')::numeric) INTO n,gross,discount,net FROM bazar.commerce_order_lines WHERE parent_id=NEW.id;
 IF n<>jsonb_array_length(q->'items') OR gross<>(q->'financial'->>'grossMinor')::numeric OR discount<>(q->'financial'->>'discountMinor')::numeric OR net<>(q->'financial'->>'netMinor')::numeric THEN RAISE EXCEPTION 'Commerce line totals do not reconcile';END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER commerce_reconcile AFTER INSERT OR UPDATE ON bazar.commerce_parent_orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.commerce_reconcile();
CREATE FUNCTION bazar.commerce_attempt_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.parent_id<>OLD.parent_id OR NEW.user_id<>OLD.user_id OR NEW.amount_minor<>OLD.amount_minor OR NEW.currency<>OLD.currency OR NEW.provider<>OLD.provider OR NEW.account_ref<>OLD.account_ref OR NEW.request_key<>OLD.request_key OR NEW.request_digest<>OLD.request_digest OR OLD.operation_ref IS NOT NULL AND NEW.operation_ref IS DISTINCT FROM OLD.operation_ref THEN RAISE EXCEPTION 'Immutable payment basis';END IF;
 IF OLD.state IN ('succeeded','declined') AND NEW.state<>OLD.state THEN RAISE EXCEPTION 'Terminal payment transition';END IF;RETURN NEW;END $$;
CREATE TRIGGER commerce_attempt_immutable BEFORE UPDATE ON bazar.commerce_payment_attempts FOR EACH ROW EXECUTE FUNCTION bazar.commerce_attempt_immutable();
CREATE FUNCTION bazar.commerce_parent_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id<>OLD.id OR NEW.checkout_id<>OLD.checkout_id OR NEW.user_id<>OLD.user_id OR NEW.currency<>OLD.currency OR NEW.created_at<>OLD.created_at OR OLD.status='confirmed' AND NEW.status<>'confirmed' THEN RAISE EXCEPTION 'Immutable parent order basis';END IF;RETURN NEW;END $$;
CREATE TRIGGER commerce_parent_immutable BEFORE UPDATE ON bazar.commerce_parent_orders FOR EACH ROW EXECUTE FUNCTION bazar.commerce_parent_immutable();
ALTER TABLE bazar.commerce_seller_orders ADD CONSTRAINT commerce_seller_amounts CHECK(
 financial->>'sellerId'=seller_id::text AND financial->>'currency'='UAH' AND (financial->>'commissionBasisPoints')::integer=500
 AND (financial->>'grossMinor')::numeric >=0 AND (financial->>'discountMinor')::numeric>=0 AND (financial->>'netMinor')::numeric>=0
 AND (financial->>'grossMinor')::numeric-(financial->>'discountMinor')::numeric=(financial->>'netMinor')::numeric
 AND (financial->>'commissionMinor')::numeric>=0 AND (financial->>'sellerMinor')::numeric>=0
 AND (financial->>'commissionMinor')::numeric+(financial->>'sellerMinor')::numeric=(financial->>'netMinor')::numeric);
ALTER TABLE bazar.commerce_order_lines ADD CONSTRAINT commerce_line_amounts CHECK(
 snapshot->>'sellerId'=seller_id::text AND snapshot->>'productId'=product_id::text AND snapshot->>'variantId'=variant_id::text
 AND (snapshot->>'quantity')::numeric>0 AND (snapshot->>'unitPriceMinor')::numeric>=0
 AND (snapshot->>'unitPriceMinor')::numeric*(snapshot->>'quantity')::numeric=(snapshot->>'grossMinor')::numeric
 AND (snapshot->>'grossMinor')::numeric-(snapshot->>'discountMinor')::numeric=(snapshot->>'netMinor')::numeric
 AND (snapshot->>'netMinor')::numeric>=0 AND (snapshot->>'discountMinor')::numeric>=0);
ALTER TABLE bazar.commerce_cart_claims ADD FOREIGN KEY(cart_id) REFERENCES bazar.carts(id), ADD FOREIGN KEY(variant_id) REFERENCES bazar.variants(id);
ALTER TABLE bazar.commerce_payment_attempts ADD COLUMN method text NOT NULL DEFAULT 'card' CHECK(method='card');
ALTER TABLE bazar.commerce_parent_orders ADD CONSTRAINT commerce_confirmed_payment CHECK(status<>'confirmed' OR payment_state='succeeded');
