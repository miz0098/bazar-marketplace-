-- Additive second migration provides a real supported-prior-version upgrade test.
CREATE INDEX variants_available_idx ON bazar.variants(product_id, id) WHERE stock > 0;
CREATE INDEX support_tickets_status_idx ON bazar.support_tickets(status, created_at, id);
