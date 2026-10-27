-- Extend the existing F13 inbox. No new dispatcher or production event ingestion.
CREATE INDEX notification_unread_owner_idx ON bazar.notification_events(user_id,sequence) WHERE read_at IS NULL;
CREATE FUNCTION bazar.serialize_notification_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('notification-owner:'||NEW.user_id::text,0));
 -- Identity defaults are allocated before BEFORE triggers. Allocate the effective cursor after the owner lock.
 NEW.sequence=nextval(pg_get_serial_sequence('bazar.notification_events','sequence'));
 NEW.created_at=greatest(clock_timestamp(),coalesce((SELECT max(created_at) FROM bazar.notification_events WHERE user_id=NEW.user_id),'-infinity'::timestamptz));
 RETURN NEW;
END $$;
CREATE TRIGGER notification_owner_sequence BEFORE INSERT ON bazar.notification_events FOR EACH ROW EXECUTE FUNCTION bazar.serialize_notification_event();
CREATE FUNCTION bazar.protect_notification_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-'read_at') IS DISTINCT FROM (to_jsonb(OLD)-'read_at') OR (OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at) THEN
  RAISE EXCEPTION 'Notification metadata and read state are monotonic' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_event_monotonic BEFORE UPDATE ON bazar.notification_events FOR EACH ROW EXECUTE FUNCTION bazar.protect_notification_event();
CREATE FUNCTION bazar.notify_verified_test_refund() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.state='confirmed-for-test' AND NEW.source='verified-test-event' AND OLD.state IS DISTINCT FROM NEW.state THEN
  INSERT INTO bazar.notification_events(user_id,kind,source_id,scope_id) VALUES(NEW.user_id,'refund.completed',NEW.id,NEW.order_id) ON CONFLICT(user_id,kind,source_id) DO NOTHING;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER verified_test_refund_notice AFTER UPDATE ON bazar.order_refund_attempts FOR EACH ROW EXECUTE FUNCTION bazar.notify_verified_test_refund();
