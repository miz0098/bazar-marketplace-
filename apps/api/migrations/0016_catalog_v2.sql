-- Opt-in catalog v2: no stock backfill, no fabricated seller, no legacy ID replacement.
CREATE TABLE bazar.sellers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200), active boolean NOT NULL DEFAULT true
);
CREATE TABLE bazar.seller_owners (
 seller_id uuid NOT NULL REFERENCES bazar.sellers(id), user_id uuid NOT NULL REFERENCES bazar.users(id), PRIMARY KEY(seller_id,user_id)
);
CREATE TABLE bazar.catalog_products (
 product_id uuid PRIMARY KEY REFERENCES bazar.products(id), seller_id uuid NOT NULL REFERENCES bazar.sellers(id),
 selectable boolean NOT NULL, available boolean NOT NULL, status text NOT NULL CHECK(status IN ('draft','published')),
 attributes jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(attributes)='object'),
 published_at timestamptz, version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 CHECK(status <> 'published' OR published_at IS NOT NULL), UNIQUE(product_id,seller_id)
);
CREATE INDEX catalog_seller_idx ON bazar.catalog_products(seller_id,product_id);
CREATE TABLE bazar.catalog_variants (
 variant_id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES bazar.catalog_products(product_id), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
 available boolean NOT NULL, purchasable boolean NOT NULL DEFAULT true, position integer NOT NULL CHECK(position>=0),
 FOREIGN KEY(variant_id,product_id) REFERENCES bazar.variants(id,product_id), UNIQUE(product_id,position), UNIQUE(variant_id,product_id)
);
CREATE TABLE bazar.catalog_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES bazar.catalog_products(product_id), variant_id uuid,
 path text NOT NULL CHECK(path ~ '^/catalog-media/[a-zA-Z0-9_-]+\.(webp|png|jpg|avif)$'),
 alt text NOT NULL CHECK(length(alt) BETWEEN 1 AND 300), position integer NOT NULL CHECK(position>=0),
 width integer NOT NULL CHECK(width BETWEEN 1 AND 10000), height integer NOT NULL CHECK(height BETWEEN 1 AND 10000),
 FOREIGN KEY(variant_id,product_id) REFERENCES bazar.catalog_variants(variant_id,product_id), UNIQUE(product_id,position)
);
CREATE TABLE bazar.catalog_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES bazar.catalog_products(product_id), variant_id uuid,
 seller_id uuid NOT NULL REFERENCES bazar.sellers(id), actor_id uuid NOT NULL REFERENCES bazar.users(id), revision bigint NOT NULL,
 before_data jsonb NOT NULL, after_data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(product_id,revision), FOREIGN KEY(product_id,seller_id) REFERENCES bazar.catalog_products(product_id,seller_id), FOREIGN KEY(variant_id,product_id) REFERENCES bazar.catalog_variants(variant_id,product_id)
);
CREATE TABLE bazar.catalog_commands (
 actor_id uuid NOT NULL REFERENCES bazar.users(id), key uuid NOT NULL, digest text NOT NULL, audit_id uuid NOT NULL REFERENCES bazar.catalog_audit(id),
 PRIMARY KEY(actor_id,key)
);
CREATE TABLE bazar.availability_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), audit_id uuid NOT NULL REFERENCES bazar.catalog_audit(id), product_id uuid NOT NULL REFERENCES bazar.catalog_products(product_id),
 variant_id uuid REFERENCES bazar.variants(id), kind text NOT NULL CHECK(kind IN ('product','variant')), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(audit_id,kind), FOREIGN KEY(variant_id,product_id) REFERENCES bazar.catalog_variants(variant_id,product_id)
);
CREATE FUNCTION bazar.catalog_available(pid uuid, vid uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT cp.status='published' AND s.active AND CASE WHEN cp.selectable THEN
 EXISTS(SELECT 1 FROM bazar.catalog_variants cv WHERE cv.product_id=pid AND (vid IS NULL OR cv.variant_id=vid) AND cv.purchasable AND cv.available)
 ELSE cp.available AND EXISTS(SELECT 1 FROM bazar.catalog_variants cv WHERE cv.product_id=pid AND (vid IS NULL OR cv.variant_id=vid) AND cv.purchasable) END
 FROM bazar.catalog_products cp JOIN bazar.sellers s ON s.id=cp.seller_id WHERE cp.product_id=pid
$$;
CREATE FUNCTION bazar.catalog_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable catalog history'; END $$;
CREATE TRIGGER catalog_audit_immutable BEFORE UPDATE OR DELETE ON bazar.catalog_audit FOR EACH ROW EXECUTE FUNCTION bazar.catalog_immutable();
CREATE TRIGGER catalog_commands_immutable BEFORE UPDATE OR DELETE ON bazar.catalog_commands FOR EACH ROW EXECUTE FUNCTION bazar.catalog_immutable();
CREATE TRIGGER catalog_events_immutable BEFORE UPDATE OR DELETE ON bazar.availability_events FOR EACH ROW EXECUTE FUNCTION bazar.catalog_immutable();
ALTER TABLE bazar.notification_events DROP CONSTRAINT notification_events_kind_check;
ALTER TABLE bazar.notification_events ADD CONSTRAINT notification_events_kind_check CHECK(kind IN ('order.created','order.status_changed','message.created','support.replied','order.cancelled','refund.completed','return.requested','return.status_changed','product.availability_restored'));
CREATE FUNCTION bazar.catalog_shape() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pid uuid; cp record; n integer;
BEGIN
 pid:=CASE WHEN TG_TABLE_NAME='catalog_products' THEN coalesce(NEW.product_id,OLD.product_id) ELSE coalesce(NEW.product_id,OLD.product_id) END;
 SELECT * INTO cp FROM bazar.catalog_products WHERE product_id=pid;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT count(*) INTO n FROM bazar.catalog_variants WHERE product_id=pid AND purchasable;
 IF cp.status='published' AND (n=0 OR (NOT cp.selectable AND n<>1)) THEN RAISE EXCEPTION 'Invalid purchasable variant shape' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM bazar.products WHERE id=pid AND length(description)>10000) THEN RAISE EXCEPTION 'Catalog description exceeds bound' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER catalog_product_shape AFTER INSERT OR UPDATE ON bazar.catalog_products DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.catalog_shape();
CREATE CONSTRAINT TRIGGER catalog_variant_shape AFTER INSERT OR UPDATE OR DELETE ON bazar.catalog_variants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.catalog_shape();
