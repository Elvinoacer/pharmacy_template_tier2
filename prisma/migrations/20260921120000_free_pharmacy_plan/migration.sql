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
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE pharmacy_id = NEW.pharmacy_id
      AND current_period_end > now()
      AND (
        (status = 'active' AND current_period_start <= now())
        OR (status = 'trialing' AND (trial_ends_at IS NULL OR trial_ends_at > now()))
      )
  ) INTO premium;
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
