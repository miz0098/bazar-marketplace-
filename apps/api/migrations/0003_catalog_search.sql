-- Literal Ukrainian tokens using PostgreSQL simple configuration; no unapproved stemmer.
CREATE INDEX products_search_idx ON bazar.products USING gin (to_tsvector('simple', title || ' ' || description));
