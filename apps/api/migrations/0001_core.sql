CREATE SCHEMA bazar;
REVOKE ALL ON SCHEMA bazar FROM PUBLIC;
CREATE DOMAIN bazar.money_minor AS bigint CHECK (VALUE BETWEEN 0 AND 9007199254740991);
CREATE DOMAIN bazar.currency_code AS text CHECK (VALUE = 'UAH');

CREATE TABLE bazar.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (length(first_name) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (length(last_name) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- No plaintext phone, OTP, bearer token or payment-card columns.
-- Contact encryption/lookup policy is explicitly deferred; this is not authentication.
CREATE TABLE bazar.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES bazar.users(id),
  token_digest bytea NOT NULL UNIQUE CHECK (octet_length(token_digest) BETWEEN 32 AND 128),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  revoked_at timestamptz, CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user_idx ON bazar.sessions(user_id);
CREATE INDEX sessions_expiry_idx ON bazar.sessions(expires_at);
CREATE TABLE bazar.otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject_digest bytea NOT NULL CHECK (octet_length(subject_digest) BETWEEN 32 AND 128),
  code_digest bytea NOT NULL CHECK (octet_length(code_digest) BETWEEN 32 AND 128),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL CHECK (max_attempts > 0),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, consumed_at timestamptz,
  CHECK (expires_at > created_at), CHECK (attempts <= max_attempts)
);
CREATE INDEX otp_subject_expiry_idx ON bazar.otp_challenges(subject_digest, expires_at);

CREATE TABLE bazar.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_id uuid REFERENCES bazar.categories(id),
  handle text NOT NULL UNIQUE CHECK (length(btrim(handle)) BETWEEN 1 AND 200 AND handle = btrim(handle)),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200), CHECK (id <> parent_id)
);
CREATE INDEX categories_parent_idx ON bazar.categories(parent_id);
CREATE TABLE bazar.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid NOT NULL REFERENCES bazar.categories(id),
  handle text NOT NULL UNIQUE CHECK (length(btrim(handle)) BETWEEN 1 AND 200 AND handle = btrim(handle)),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 300), description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON bazar.products(category_id, id);
CREATE TABLE bazar.variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES bazar.products(id),
  sku text NOT NULL UNIQUE CHECK (length(sku) BETWEEN 1 AND 100),
  price_minor bazar.money_minor NOT NULL, currency bazar.currency_code NOT NULL DEFAULT 'UAH',
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0), version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (id, product_id)
);
CREATE INDEX variants_product_idx ON bazar.variants(product_id);
CREATE TABLE bazar.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES bazar.users(id),
  carrier text NOT NULL CHECK (carrier IN ('nova-poshta','meest')),
  city_ref text NOT NULL CHECK (length(city_ref) BETWEEN 1 AND 200),
  location_ref text NOT NULL CHECK (length(location_ref) BETWEEN 1 AND 200),
  is_default boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (id, user_id)
);
CREATE UNIQUE INDEX addresses_one_default_idx ON bazar.addresses(user_id) WHERE is_default;
CREATE INDEX addresses_user_idx ON bazar.addresses(user_id);
CREATE TABLE bazar.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES bazar.users(id),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (id, user_id)
);
CREATE INDEX carts_user_idx ON bazar.carts(user_id);
CREATE TABLE bazar.cart_lines (
  cart_id uuid NOT NULL REFERENCES bazar.carts(id), variant_id uuid NOT NULL REFERENCES bazar.variants(id),
  quantity integer NOT NULL CHECK (quantity > 0), PRIMARY KEY (cart_id, variant_id)
);
CREATE INDEX cart_lines_variant_idx ON bazar.cart_lines(variant_id);
CREATE TABLE bazar.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES bazar.users(id),
  address_id uuid, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','fulfilled','cancelled')),
  total_minor bazar.money_minor NOT NULL, currency bazar.currency_code NOT NULL DEFAULT 'UAH',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (id, user_id),
  FOREIGN KEY (address_id, user_id) REFERENCES bazar.addresses(id, user_id)
);
CREATE INDEX orders_user_page_idx ON bazar.orders(user_id, created_at, id);
CREATE INDEX orders_address_idx ON bazar.orders(address_id, user_id);
CREATE TABLE bazar.order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL, user_id uuid NOT NULL,
  product_id uuid NOT NULL, variant_id uuid NOT NULL, title_snapshot text NOT NULL CHECK (length(title_snapshot) BETWEEN 1 AND 300),
  quantity integer NOT NULL CHECK (quantity > 0), unit_price_minor bazar.money_minor NOT NULL,
  line_total_minor bazar.money_minor NOT NULL, currency bazar.currency_code NOT NULL DEFAULT 'UAH',
  CHECK (line_total_minor::numeric = unit_price_minor::numeric * quantity),
  FOREIGN KEY (order_id, user_id) REFERENCES bazar.orders(id, user_id),
  FOREIGN KEY (variant_id, product_id) REFERENCES bazar.variants(id, product_id),
  UNIQUE (id, user_id, product_id)
);
CREATE INDEX order_lines_order_idx ON bazar.order_lines(order_id, user_id);
CREATE INDEX order_lines_variant_idx ON bazar.order_lines(variant_id, product_id);
CREATE TABLE bazar.wishlist_items (
  user_id uuid NOT NULL REFERENCES bazar.users(id), product_id uuid NOT NULL REFERENCES bazar.products(id),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, product_id)
);
CREATE INDEX wishlist_product_idx ON bazar.wishlist_items(product_id);
CREATE TABLE bazar.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, product_id uuid NOT NULL,
  order_line_id uuid NOT NULL UNIQUE, rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (order_line_id, user_id, product_id) REFERENCES bazar.order_lines(id, user_id, product_id)
);
CREATE INDEX reviews_product_page_idx ON bazar.reviews(product_id, created_at, id);
CREATE INDEX reviews_user_idx ON bazar.reviews(user_id);

CREATE TABLE bazar.conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE bazar.conversation_members (
  conversation_id uuid NOT NULL REFERENCES bazar.conversations(id), user_id uuid NOT NULL REFERENCES bazar.users(id),
  pinned boolean NOT NULL DEFAULT false, last_read_message_id uuid, PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX conversation_members_user_idx ON bazar.conversation_members(user_id, conversation_id);
CREATE TABLE bazar.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL, sender_id uuid NOT NULL,
  client_message_id uuid NOT NULL, body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (conversation_id, sender_id) REFERENCES bazar.conversation_members(conversation_id, user_id),
  UNIQUE (conversation_id, id), UNIQUE (conversation_id, sender_id, client_message_id)
);
CREATE INDEX messages_history_idx ON bazar.messages(conversation_id, created_at, id);
CREATE INDEX messages_sender_idx ON bazar.messages(sender_id);
ALTER TABLE bazar.conversation_members ADD CONSTRAINT member_read_cursor_fk
  FOREIGN KEY (conversation_id, last_read_message_id) REFERENCES bazar.messages(conversation_id, id);
CREATE INDEX members_read_cursor_idx ON bazar.conversation_members(conversation_id, last_read_message_id);
CREATE TABLE bazar.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES bazar.users(id),
  subject text NOT NULL CHECK (length(btrim(subject)) BETWEEN 5 AND 120),
  category text NOT NULL CHECK (category IN ('delivery','payment','other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting','closed')),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (id, user_id)
);
CREATE INDEX support_tickets_user_page_idx ON bazar.support_tickets(user_id, created_at, id);
CREATE TABLE bazar.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL, user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (ticket_id, user_id) REFERENCES bazar.support_tickets(id, user_id)
);
CREATE INDEX support_messages_history_idx ON bazar.support_messages(ticket_id, created_at, id);
CREATE INDEX support_messages_user_idx ON bazar.support_messages(user_id);
CREATE TABLE bazar.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL, user_id uuid NOT NULL,
  provider text NOT NULL CHECK (length(provider) BETWEEN 1 AND 64), provider_ref text,
  amount_minor bazar.money_minor NOT NULL, currency bazar.currency_code NOT NULL DEFAULT 'UAH',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','authorized','settled','failed','unknown')),
  created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY (order_id, user_id) REFERENCES bazar.orders(id, user_id),
  UNIQUE (provider, provider_ref)
);
CREATE INDEX payment_attempts_order_idx ON bazar.payment_attempts(order_id, user_id);
CREATE TABLE bazar.provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, event_ref text NOT NULL,
  payload_digest bytea NOT NULL CHECK (octet_length(payload_digest) BETWEEN 32 AND 128),
  received_at timestamptz NOT NULL DEFAULT now(), verified_at timestamptz, UNIQUE (provider, event_ref)
);
CREATE TABLE bazar.delivery_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, cart_id uuid NOT NULL, address_id uuid NOT NULL,
  carrier text NOT NULL CHECK (carrier IN ('nova-poshta','meest')),
  cost_minor bazar.money_minor, currency bazar.currency_code NOT NULL DEFAULT 'UAH',
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, CHECK (expires_at > created_at),
  FOREIGN KEY (cart_id, user_id) REFERENCES bazar.carts(id, user_id), FOREIGN KEY (address_id, user_id) REFERENCES bazar.addresses(id, user_id)
);
CREATE INDEX delivery_quotes_cart_idx ON bazar.delivery_quotes(cart_id, user_id);
CREATE INDEX delivery_quotes_address_idx ON bazar.delivery_quotes(address_id, user_id);
CREATE INDEX delivery_quotes_expiry_idx ON bazar.delivery_quotes(expires_at);
CREATE TABLE bazar.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL, user_id uuid NOT NULL,
  carrier text NOT NULL CHECK (carrier IN ('nova-poshta','meest')), tracking_ref text,
  created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY (order_id, user_id) REFERENCES bazar.orders(id, user_id)
);
CREATE INDEX shipments_order_idx ON bazar.shipments(order_id, user_id);
CREATE TABLE bazar.idempotency_records (
  actor_id uuid NOT NULL REFERENCES bazar.users(id), operation text NOT NULL CHECK (length(operation) BETWEEN 1 AND 100),
  key uuid NOT NULL, request_digest bytea NOT NULL CHECK (octet_length(request_digest) BETWEEN 32 AND 128),
  resource_id uuid, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  PRIMARY KEY (actor_id, operation, key), CHECK (expires_at > created_at)
);
CREATE INDEX idempotency_expiry_idx ON bazar.idempotency_records(expires_at);
