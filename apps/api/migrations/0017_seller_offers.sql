-- Offer identity is the existing globally stable variant UUID; no product cloning/backfill.
ALTER TABLE bazar.catalog_variants ADD COLUMN attributes jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(attributes)='object');
CREATE TABLE bazar.offer_wishlist_items (
 user_id uuid NOT NULL REFERENCES bazar.users(id),variant_id uuid NOT NULL,product_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(user_id,variant_id),
 FOREIGN KEY(variant_id,product_id) REFERENCES bazar.catalog_variants(variant_id,product_id)
);
CREATE INDEX offer_wishlist_variant_idx ON bazar.offer_wishlist_items(variant_id,user_id);
CREATE VIEW bazar.seller_offers AS
 SELECT v.id,p.id AS product_id,cp.seller_id,s.name AS seller_name,p.handle,p.title,p.description,p.category_id,
 cv.title AS variant_title,v.sku,v.price_minor,v.currency,cp.attributes||cv.attributes AS attributes,
 cp.status,s.active AS seller_active,cv.purchasable,cp.published_at,
 bazar.catalog_available(p.id,v.id) AS available,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'variantId',m.variant_id,'src',m.path,'alt',m.alt,'width',m.width,'height',m.height,'position',m.position) ORDER BY m.position,m.id) FROM bazar.catalog_media m WHERE m.product_id=p.id AND (m.variant_id IS NULL OR m.variant_id=v.id)),'[]'::jsonb) AS media
 FROM bazar.products p JOIN bazar.catalog_products cp ON cp.product_id=p.id JOIN bazar.sellers s ON s.id=cp.seller_id
 JOIN bazar.variants v ON v.product_id=p.id JOIN bazar.catalog_variants cv ON cv.variant_id=v.id AND cv.product_id=p.id;
