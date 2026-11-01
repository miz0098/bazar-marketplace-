-- F26 isolated staff CRM authority. No default staff grants and no production route composition.
CREATE TABLE bazar.staff_memberships (
 user_id uuid PRIMARY KEY REFERENCES bazar.users(id),
 active boolean NOT NULL DEFAULT true,
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740990),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE FUNCTION bazar.staff_membership_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Staff membership history is retained'; END IF;
 IF (NEW.user_id,NEW.created_at) IS DISTINCT FROM (OLD.user_id,OLD.created_at) OR OLD.active=false OR NEW.active=true OR NEW.version<>OLD.version+1 THEN
   RAISE EXCEPTION 'Staff membership may only be monotonically suspended';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_membership_guard BEFORE UPDATE OR DELETE ON bazar.staff_memberships FOR EACH ROW EXECUTE FUNCTION bazar.staff_membership_guard();

CREATE TABLE bazar.staff_capability_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 staff_user_id uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 capability text NOT NULL CHECK(capability IN (
  'support.read','support.reply','support.assign','support.note',
  'moderation.read','moderation.review','moderation.question','moderation.answer','moderation.assign',
  'dispatch.read','dispatch.note'
 )),
 scope_kind text NOT NULL CHECK(scope_kind IN ('global','resource')),
 scope_id uuid,
 granted_by uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 reason_code text NOT NULL CHECK(reason_code IN ('initial-test-fixture','least-privilege-review','temporary-task')),
 granted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(staff_user_id<>granted_by),
 CHECK((scope_kind='global' AND scope_id IS NULL) OR (scope_kind='resource' AND scope_id IS NOT NULL))
);
CREATE INDEX staff_active_grants_idx ON bazar.staff_capability_grants(staff_user_id,capability,scope_kind,scope_id);
CREATE TABLE bazar.staff_capability_revocations (
 grant_id uuid PRIMARY KEY REFERENCES bazar.staff_capability_grants(id),
 revoked_by uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 reason_code text NOT NULL CHECK(reason_code IN ('access-ended','scope-changed','security-review')),
 revoked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE bazar.staff_case_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_kind text NOT NULL CHECK(case_kind IN ('support','review','question','answer')),
 case_id uuid NOT NULL,
 staff_user_id uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 assigned_by uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740990),
 assigned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 unassigned_at timestamptz,
 CHECK(unassigned_at IS NULL OR unassigned_at>=assigned_at)
);
CREATE UNIQUE INDEX staff_one_current_assignment_idx ON bazar.staff_case_assignments(case_kind,case_id) WHERE unassigned_at IS NULL;
CREATE INDEX staff_case_queue_idx ON bazar.staff_case_assignments(staff_user_id,case_kind,assigned_at DESC,case_id) WHERE unassigned_at IS NULL;

CREATE FUNCTION bazar.staff_assignment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Staff assignment history is retained'; END IF;
 IF TG_OP='UPDATE' AND ((NEW.id,NEW.case_kind,NEW.case_id,NEW.staff_user_id,NEW.assigned_by,NEW.assigned_at) IS DISTINCT FROM (OLD.id,OLD.case_kind,OLD.case_id,OLD.staff_user_id,OLD.assigned_by,OLD.assigned_at) OR NEW.version<>OLD.version+1 OR OLD.unassigned_at IS NOT NULL OR NEW.unassigned_at IS NULL) THEN
   RAISE EXCEPTION 'Staff assignment must advance version and cannot be silently restored';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM bazar.staff_memberships WHERE user_id=NEW.staff_user_id AND active)
  OR NOT EXISTS(SELECT 1 FROM bazar.staff_memberships WHERE user_id=NEW.assigned_by AND active) THEN
   RAISE EXCEPTION 'Active staff membership required';
 END IF;
 IF NEW.case_kind='support' AND NOT EXISTS(SELECT 1 FROM bazar.support_tickets WHERE id=NEW.case_id)
  OR NEW.case_kind='review' AND NOT EXISTS(SELECT 1 FROM bazar.commerce_reviews WHERE id=NEW.case_id)
  OR NEW.case_kind='question' AND NOT EXISTS(SELECT 1 FROM bazar.product_questions WHERE id=NEW.case_id)
  OR NEW.case_kind='answer' AND NOT EXISTS(SELECT 1 FROM bazar.product_questions WHERE id=NEW.case_id AND answer IS NOT NULL) THEN
   RAISE EXCEPTION 'Unknown staff case';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_assignment_guard BEFORE INSERT OR UPDATE OR DELETE ON bazar.staff_case_assignments FOR EACH ROW EXECUTE FUNCTION bazar.staff_assignment_guard();

CREATE TABLE bazar.staff_assignment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_kind text NOT NULL,
 case_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 from_staff_id uuid REFERENCES bazar.staff_memberships(user_id),
 to_staff_id uuid REFERENCES bazar.staff_memberships(user_id),
 reason_code text NOT NULL CHECK(reason_code IN ('coverage','specialist-routing','reassignment','withdrawal')),
 version bigint NOT NULL CHECK(version BETWEEN 1 AND 9007199254740990),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(from_staff_id IS DISTINCT FROM to_staff_id),
 CHECK(case_kind IN ('support','review','question','answer'))
);
CREATE INDEX staff_assignment_events_resource_idx ON bazar.staff_assignment_events(case_kind,case_id,created_at,id);

CREATE TABLE bazar.staff_case_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_kind text NOT NULL CHECK(case_kind IN ('support','dispatch')),
 case_id uuid NOT NULL,
 staff_user_id uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 request_id uuid NOT NULL,
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(staff_user_id,request_id)
);
CREATE INDEX staff_case_notes_resource_idx ON bazar.staff_case_notes(case_kind,case_id,created_at,id);

CREATE TABLE bazar.staff_command_receipts (
 actor_id uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 request_id uuid NOT NULL,
 digest bytea NOT NULL CHECK(octet_length(digest)=32),
 action text NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_id,request_id)
);

CREATE TABLE bazar.staff_action_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL REFERENCES bazar.staff_memberships(user_id),
 action text NOT NULL CHECK(action IN ('case.assigned','case.unassigned','support.replied','case.note-added','moderation.review','moderation.question','moderation.answer')),
 case_kind text NOT NULL CHECK(case_kind IN ('support','review','question','answer','dispatch')),
 case_id uuid NOT NULL,
 reason_code text NOT NULL CHECK(length(btrim(reason_code)) BETWEEN 1 AND 80),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX staff_action_audit_resource_idx ON bazar.staff_action_audit(case_kind,case_id,created_at,id);
CREATE INDEX staff_action_audit_actor_idx ON bazar.staff_action_audit(actor_id,created_at DESC,id);

CREATE FUNCTION bazar.staff_immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Staff audit history is immutable'; END $$;
CREATE TRIGGER staff_assignment_event_immutable BEFORE UPDATE OR DELETE ON bazar.staff_assignment_events FOR EACH ROW EXECUTE FUNCTION bazar.staff_immutable_history();
CREATE TRIGGER staff_case_note_immutable BEFORE UPDATE OR DELETE ON bazar.staff_case_notes FOR EACH ROW EXECUTE FUNCTION bazar.staff_immutable_history();
CREATE TRIGGER staff_action_audit_immutable BEFORE UPDATE OR DELETE ON bazar.staff_action_audit FOR EACH ROW EXECUTE FUNCTION bazar.staff_immutable_history();
CREATE TRIGGER staff_capability_grant_immutable BEFORE UPDATE OR DELETE ON bazar.staff_capability_grants FOR EACH ROW EXECUTE FUNCTION bazar.staff_immutable_history();
CREATE TRIGGER staff_capability_revocation_immutable BEFORE UPDATE OR DELETE ON bazar.staff_capability_revocations FOR EACH ROW EXECUTE FUNCTION bazar.staff_immutable_history();
CREATE TRIGGER staff_command_receipt_immutable BEFORE UPDATE OR DELETE ON bazar.staff_command_receipts FOR EACH ROW EXECUTE FUNCTION bazar.staff_immutable_history();
