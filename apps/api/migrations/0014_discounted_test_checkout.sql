-- Synthetic financial evidence only; legal payable and delivery columns remain NULL.
ALTER TABLE bazar.order_checkout_snapshots DROP CONSTRAINT order_checkout_snapshots_discount_minor_check;
ALTER TABLE bazar.order_checkout_snapshots ADD CONSTRAINT test_discount_bounds CHECK(discount_minor<=subtotal_minor);
CREATE TABLE bazar.order_test_financials (
 order_id uuid PRIMARY KEY,user_id uuid NOT NULL,payment_operation_id uuid NOT NULL UNIQUE,
 shipping_quote_id uuid NOT NULL REFERENCES bazar.shipping_quotes(id),
 promotion_claim_id uuid UNIQUE REFERENCES bazar.promotion_usage_claims(id),promo_code text,
 subtotal_minor bazar.money_minor NOT NULL,discount_minor bazar.money_minor NOT NULL,
 shipping_minor bazar.money_minor NOT NULL,total_minor bazar.money_minor NOT NULL,
 currency bazar.currency_code NOT NULL CHECK(currency='UAH'),scope text NOT NULL CHECK(scope='isolated-test-plan'),
 CHECK(discount_minor<=subtotal_minor),CHECK(total_minor::numeric=subtotal_minor::numeric-discount_minor::numeric+shipping_minor::numeric),
 CHECK((discount_minor=0 AND promotion_claim_id IS NULL AND promo_code IS NULL) OR (discount_minor>0 AND promotion_claim_id IS NOT NULL AND promo_code IS NOT NULL AND length(promo_code) BETWEEN 1 AND 64)),
 FOREIGN KEY(order_id,user_id) REFERENCES bazar.orders(id,user_id),
 FOREIGN KEY(payment_operation_id,user_id) REFERENCES bazar.payment_operations(id,user_id)
);
CREATE INDEX test_financials_owner_idx ON bazar.order_test_financials(user_id,order_id);
CREATE TRIGGER test_financials_immutable BEFORE UPDATE OR DELETE ON bazar.order_test_financials FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
CREATE FUNCTION bazar.check_discounted_test_order() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; s record; f record;
BEGIN
 target=NEW.order_id;
 SELECT * INTO s FROM bazar.order_checkout_snapshots WHERE order_id=target;
 SELECT * INTO f FROM bazar.order_test_financials WHERE order_id=target;
 IF s.discount_minor>0 AND f.order_id IS NULL THEN RAISE EXCEPTION 'Discount requires linked test evidence' USING ERRCODE='23514'; END IF;
 IF f.order_id IS NOT NULL THEN
  IF f.user_id<>s.user_id OR f.subtotal_minor<>s.subtotal_minor OR f.discount_minor<>s.discount_minor OR NOT EXISTS(
   SELECT 1 FROM bazar.checkout_completion_links l JOIN bazar.payment_operations p ON p.id=l.payment_operation_id AND p.user_id=l.user_id
   JOIN bazar.shipping_quotes q ON q.id=f.shipping_quote_id AND q.user_id=l.user_id
   WHERE l.order_id=target AND l.user_id=f.user_id AND p.id=f.payment_operation_id AND p.status='succeeded'
   AND p.amount_minor=f.total_minor AND p.currency=f.currency AND q.amount_minor=f.shipping_minor AND q.currency=f.currency AND q.checkout_id=s.checkout_id
  ) THEN RAISE EXCEPTION 'Invalid test financial proof' USING ERRCODE='23514'; END IF;
  IF f.promotion_claim_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM bazar.promotion_usage_claims c JOIN bazar.promotions p ON p.id=c.promotion_id WHERE c.id=f.promotion_claim_id AND c.user_id=f.user_id AND c.cart_id=s.cart_id AND c.cart_version=s.cart_version AND c.subtotal_minor=f.subtotal_minor AND c.discount_minor=f.discount_minor AND c.merchandise_total_minor=s.merchandise_total_minor AND p.code=f.promo_code) THEN RAISE EXCEPTION 'Invalid test promotion claim' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER discounted_snapshot_proof AFTER INSERT ON bazar.order_checkout_snapshots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.check_discounted_test_order();
CREATE CONSTRAINT TRIGGER discounted_financial_proof AFTER INSERT ON bazar.order_test_financials DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bazar.check_discounted_test_order();
