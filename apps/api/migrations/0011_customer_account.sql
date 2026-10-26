-- Additive optimistic concurrency; no contact/recipient or payment-card fields.
ALTER TABLE bazar.users ADD COLUMN profile_version bigint NOT NULL DEFAULT 1 CHECK(profile_version BETWEEN 1 AND 9007199254740991);
ALTER TABLE bazar.addresses ADD COLUMN version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991);
-- Test-only irreversible purchase claim prevents re-creation even after an explicitly allowed test deletion.
CREATE TABLE bazar.review_foundation_claims (
 order_line_id uuid PRIMARY KEY,user_id uuid NOT NULL,product_id uuid NOT NULL,review_id uuid NOT NULL UNIQUE,
 mode text NOT NULL CHECK(mode='integration-test'),proof_digest bytea NOT NULL CHECK(octet_length(proof_digest)=32),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(order_line_id,user_id,product_id) REFERENCES bazar.order_lines(id,user_id,product_id)
);
CREATE INDEX review_foundation_owner_idx ON bazar.review_foundation_claims(user_id,review_id);
CREATE TRIGGER review_claim_immutable BEFORE UPDATE OR DELETE ON bazar.review_foundation_claims FOR EACH ROW EXECUTE FUNCTION bazar.immutable_checkout_history();
