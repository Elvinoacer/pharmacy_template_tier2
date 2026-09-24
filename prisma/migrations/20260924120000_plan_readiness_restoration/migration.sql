ALTER TABLE pharmacy_inventory ADD COLUMN plan_paused boolean NOT NULL DEFAULT false;
ALTER TABLE pharmacy_services ADD COLUMN plan_paused boolean NOT NULL DEFAULT false;
ALTER TABLE pharmacy_services ADD COLUMN plan_was_bookable boolean NOT NULL DEFAULT false;

-- Database counterpart of resolvePharmacyPlanState, used by atomic capacity guards.
CREATE OR REPLACE FUNCTION app.pharmacy_premium_ready(pid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
 SELECT EXISTS (SELECT 1 FROM pharmacies p JOIN subscriptions s ON s.pharmacy_id=p.id
 WHERE p.id=pid AND p.status IN ('approved','active') AND p.verified_at IS NOT NULL
 AND p.setup_completed_at IS NOT NULL
 AND p.lifecycle_status NOT IN ('suspended','regulatory_hold','archived','pending_deletion','deleted')
 AND s.status IN ('active','trialing') AND s.current_period_start <= now() AND s.current_period_end > now()
 AND (s.cancel_at IS NULL OR s.cancel_at > now())
 AND (s.status <> 'trialing' OR s.trial_ends_at IS NULL OR s.trial_ends_at > now()));
$$;

-- Enforce listing limits at the database boundary, including imports and bulk updates.
-- The inventory table is pharmacy_inventory (singular). Writes for one pharmacy are serialized
-- so concurrent creates cannot pass the free cap.
CREATE OR REPLACE FUNCTION app.enforce_free_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  listing_count integer;
  premium boolean;
BEGIN
  IF TG_TABLE_NAME = 'pharmacy_inventory' THEN
    IF NOT (NEW.active AND NEW.public_listing) THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD.active AND OLD.public_listing AND OLD.pharmacy_id = NEW.pharmacy_id THEN RETURN NEW; END IF;
    END IF;
  ELSE
    IF NOT NEW.active THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD.active AND OLD.pharmacy_id = NEW.pharmacy_id THEN RETURN NEW; END IF;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.pharmacy_id::text));
  SELECT app.pharmacy_premium_ready(NEW.pharmacy_id) INTO premium;
  IF premium THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'pharmacy_inventory' THEN
    SELECT count(*) INTO listing_count FROM pharmacy_inventory
    WHERE pharmacy_id = NEW.pharmacy_id AND active AND public_listing AND id <> NEW.id;
    IF listing_count >= 5 THEN RAISE EXCEPTION 'FREE_MEDICINE_LIMIT' USING ERRCODE = 'P0001'; END IF;
  ELSE
    SELECT count(*) INTO listing_count FROM pharmacy_services
    WHERE pharmacy_id = NEW.pharmacy_id AND active AND id <> NEW.id;
    IF listing_count >= 2 THEN RAISE EXCEPTION 'FREE_SERVICE_LIMIT' USING ERRCODE = 'P0001'; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS free_medicine_listing_limit ON pharmacy_inventory;
CREATE TRIGGER free_medicine_listing_limit BEFORE INSERT OR UPDATE ON pharmacy_inventory
FOR EACH ROW EXECUTE FUNCTION app.enforce_free_listing_limit();

DROP TRIGGER IF EXISTS free_service_listing_limit ON pharmacy_services;
CREATE TRIGGER free_service_listing_limit BEFORE INSERT OR UPDATE ON pharmacy_services
FOR EACH ROW EXECUTE FUNCTION app.enforce_free_listing_limit();

-- Protect concurrent launches, including direct service calls and scheduled jobs.
CREATE OR REPLACE FUNCTION app.enforce_free_campaign_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app AS $$
DECLARE launched integer;
BEGIN
 IF NEW.status NOT IN ('sending','sent') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.status IN ('sending','sent') THEN RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext(NEW.pharmacy_id::text));
 IF app.pharmacy_premium_ready(NEW.pharmacy_id) THEN RETURN NEW; END IF;
 IF NEW.scheduled_for IS NOT NULL THEN RAISE EXCEPTION 'PREMIUM_REQUIRED:campaign_scheduling'; END IF;
 IF NEW.channel='multi' THEN RAISE EXCEPTION 'PREMIUM_REQUIRED:multi_channel_campaigns'; END IF;
 IF NEW.segment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM segments WHERE id=NEW.segment_id AND pharmacy_id=NEW.pharmacy_id AND is_system) THEN RAISE EXCEPTION 'PREMIUM_REQUIRED:custom_segments'; END IF;
 SELECT count(*) INTO launched FROM campaigns WHERE pharmacy_id=NEW.pharmacy_id AND id<>NEW.id
 AND ((sent_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AND sent_at < date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month')
 OR (status='sending' AND updated_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AND updated_at < date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'));
 IF launched >= 1 THEN RAISE EXCEPTION 'FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER free_campaign_launch_limit BEFORE INSERT OR UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION app.enforce_free_campaign_limit();
