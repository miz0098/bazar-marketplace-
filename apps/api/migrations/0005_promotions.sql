-- Technical foundation only. No published campaigns, real redemption lifecycle or monetary defaults.
CREATE TABLE bazar.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text COLLATE "C" NOT NULL UNIQUE CHECK (length(code) BETWEEN 1 AND 64 AND code=btrim(code) AND code !~ '[[:cntrl:]]'),
  kind text NOT NULL CHECK (kind IN ('percentage','fixed')),
  percentage_basis_points integer,
  fixed_minor bazar.money_minor,
  currency bazar.currency_code NOT NULL,
  min_subtotal_minor bazar.money_minor NOT NULL,
  starts_at timestamptz NOT NULL CHECK (isfinite(starts_at)),
  ends_at timestamptz NOT NULL CHECK (isfinite(ends_at)),
  enabled boolean NOT NULL DEFAULT false,
  max_uses bigint NOT NULL CHECK (max_uses BETWEEN 1 AND 9007199254740991),
  per_user_limit bigint NOT NULL CHECK (per_user_limit BETWEEN 1 AND max_uses),
  version bigint NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 9007199254740991),
  CHECK (ends_at>starts_at),
  CHECK ((kind='percentage' AND percentage_basis_points IS NOT NULL AND percentage_basis_points BETWEEN 1 AND 10000 AND fixed_minor IS NULL)
      OR (kind='fixed' AND fixed_minor IS NOT NULL AND fixed_minor>0 AND percentage_basis_points IS NULL))
);
CREATE INDEX promotions_window_idx ON bazar.promotions(ends_at) WHERE enabled;
CREATE TABLE bazar.promotion_products (
  promotion_id uuid NOT NULL REFERENCES bazar.promotions(id),
  product_id uuid NOT NULL REFERENCES bazar.products(id),
  PRIMARY KEY(promotion_id,product_id)
);
CREATE INDEX promotion_products_product_idx ON bazar.promotion_products(product_id);
-- These immutable usage events exercise limits/concurrency ONLY in isolated integration composition.
-- No order/payment/real-redemption state is manufactured. A reviewed order lifecycle must add its own contract.
CREATE TABLE bazar.promotion_usage_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES bazar.promotions(id),
  user_id uuid NOT NULL REFERENCES bazar.users(id),
  cart_id uuid NOT NULL,
  cart_version bigint NOT NULL CHECK (cart_version BETWEEN 1 AND 9007199254740991),
  idempotency_key uuid NOT NULL,
  request_digest bytea NOT NULL CHECK (octet_length(request_digest)=32),
  pricing_fingerprint text NOT NULL CHECK (pricing_fingerprint ~ '^[0-9a-f]{64}$'),
  subtotal_minor bazar.money_minor NOT NULL,
  discount_minor bazar.money_minor NOT NULL CHECK (discount_minor>0),
  merchandise_total_minor bazar.money_minor NOT NULL,
  currency bazar.currency_code NOT NULL,
  mode text NOT NULL CHECK (mode='integration-test'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(cart_id,user_id) REFERENCES bazar.carts(id,user_id),
  UNIQUE(user_id,idempotency_key), UNIQUE(cart_id,cart_version),
  CHECK (discount_minor<=subtotal_minor AND merchandise_total_minor=subtotal_minor-discount_minor)
);
CREATE INDEX promotion_claims_usage_idx ON bazar.promotion_usage_claims(promotion_id,user_id);
CREATE INDEX promotion_claims_owner_idx ON bazar.promotion_usage_claims(user_id,created_at,id);
CREATE FUNCTION bazar.check_promotion_claim_limit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE campaign bazar.promotions%ROWTYPE; total_count bigint; owner_count bigint;
BEGIN
  SELECT * INTO STRICT campaign FROM bazar.promotions WHERE id=NEW.promotion_id FOR UPDATE;
  SELECT count(*),count(*) FILTER(WHERE user_id=NEW.user_id) INTO total_count,owner_count
    FROM bazar.promotion_usage_claims WHERE promotion_id=NEW.promotion_id;
  IF NOT campaign.enabled OR clock_timestamp()<campaign.starts_at OR clock_timestamp()>=campaign.ends_at
     OR total_count>=campaign.max_uses OR owner_count>=campaign.per_user_limit THEN
    RAISE EXCEPTION 'Promotion claim limit or window rejected' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER promotion_claim_limit BEFORE INSERT ON bazar.promotion_usage_claims
  FOR EACH ROW EXECUTE FUNCTION bazar.check_promotion_claim_limit();
CREATE FUNCTION bazar.prevent_promotion_claim_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Promotion usage history is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER promotion_claim_immutable BEFORE UPDATE OR DELETE ON bazar.promotion_usage_claims
  FOR EACH ROW EXECUTE FUNCTION bazar.prevent_promotion_claim_change();
