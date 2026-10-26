-- Additive, no plaintext phone/OTP/cookie columns and no production policy defaults.
CREATE TABLE bazar.auth_phone_identities (
  user_id uuid PRIMARY KEY REFERENCES bazar.users(id),
  phone_digest bytea NOT NULL UNIQUE CHECK (octet_length(phone_digest)=32),
  verified_at timestamptz NOT NULL DEFAULT now(), consent_at timestamptz NOT NULL
);
ALTER TABLE bazar.otp_challenges
  ADD COLUMN intent text CHECK (intent IN ('login','register')),
  ADD COLUMN flow_digest bytea CHECK (octet_length(flow_digest)=32),
  ADD COLUMN delivery_state text CHECK (delivery_state IN ('pending','test-only','failed')),
  ADD CONSTRAINT otp_auth_metadata CHECK (
    (intent IS NULL AND flow_digest IS NULL AND delivery_state IS NULL) OR
    (intent IS NOT NULL AND flow_digest IS NOT NULL AND delivery_state IS NOT NULL)
  );
ALTER TABLE bazar.sessions ADD COLUMN csrf_digest bytea CHECK (octet_length(csrf_digest)=32);
CREATE TABLE bazar.auth_rate_limits (
  scope text NOT NULL CHECK (scope IN ('challenge-global','challenge-client','challenge-phone','verify-global','verify-client')),
  key_digest bytea NOT NULL CHECK (octet_length(key_digest)=32),
  window_started_at timestamptz NOT NULL, hits integer NOT NULL CHECK (hits>=0),
  next_allowed_at timestamptz NOT NULL, PRIMARY KEY(scope,key_digest)
);
CREATE INDEX auth_limits_window_idx ON bazar.auth_rate_limits(window_started_at);
CREATE INDEX otp_active_subject_idx ON bazar.otp_challenges(subject_digest) WHERE consumed_at IS NULL;
CREATE INDEX sessions_active_user_idx ON bazar.sessions(user_id) WHERE revoked_at IS NULL;
