-- Explicit current-cart policy: legacy rows remain unselected; no arbitrary legacy/guest merge.
ALTER TABLE bazar.carts ADD COLUMN lifecycle text NOT NULL DEFAULT 'unselected' CHECK(lifecycle IN ('unselected','active'));
CREATE UNIQUE INDEX one_active_cart_per_user_idx ON bazar.carts(user_id) WHERE lifecycle='active';
CREATE TABLE bazar.cart_mutation_receipts (
 user_id uuid NOT NULL,request_key uuid NOT NULL,cart_id uuid NOT NULL,
 request_digest bytea NOT NULL CHECK(octet_length(request_digest)=32),
 before_version bigint NOT NULL CHECK(before_version BETWEEN 1 AND 9007199254740990),
 after_version bigint NOT NULL CHECK(after_version=before_version+1),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,request_key),FOREIGN KEY(cart_id,user_id) REFERENCES bazar.carts(id,user_id)
);
CREATE INDEX cart_receipts_cart_idx ON bazar.cart_mutation_receipts(cart_id,user_id);
CREATE TRIGGER cart_receipt_immutable BEFORE UPDATE OR DELETE ON bazar.cart_mutation_receipts FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
ALTER TABLE bazar.payment_operations ADD CONSTRAINT payment_operation_owner_link UNIQUE(id,user_id);
CREATE TABLE bazar.checkout_completion_links (
 order_id uuid PRIMARY KEY,checkout_id uuid NOT NULL UNIQUE,user_id uuid NOT NULL,payment_operation_id uuid NOT NULL UNIQUE,
 mode text NOT NULL CHECK(mode='integration-test'),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(order_id,user_id) REFERENCES bazar.orders(id,user_id),
 FOREIGN KEY(checkout_id,user_id) REFERENCES bazar.checkout_sessions(id,user_id),
 FOREIGN KEY(payment_operation_id,user_id) REFERENCES bazar.payment_operations(id,user_id)
);
CREATE INDEX completion_owner_idx ON bazar.checkout_completion_links(user_id,order_id);
CREATE TRIGGER completion_immutable BEFORE UPDATE OR DELETE ON bazar.checkout_completion_links FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE FUNCTION bazar.validate_test_completion_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM bazar.checkout_sessions c JOIN bazar.orders o ON o.id=c.order_id AND o.user_id=c.user_id
  JOIN bazar.payment_intents i ON i.checkout_id=c.id AND i.user_id=c.user_id
  JOIN bazar.payment_operations p ON p.intent_id=i.id AND p.user_id=i.user_id
  WHERE c.id=NEW.checkout_id AND c.user_id=NEW.user_id AND c.order_id=NEW.order_id
  AND o.foundation_mode='integration-test' AND p.id=NEW.payment_operation_id AND p.status='succeeded') THEN
  RAISE EXCEPTION 'Completion requires matching verified test records' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER test_completion_link BEFORE INSERT ON bazar.checkout_completion_links FOR EACH ROW EXECUTE FUNCTION bazar.validate_test_completion_link();
