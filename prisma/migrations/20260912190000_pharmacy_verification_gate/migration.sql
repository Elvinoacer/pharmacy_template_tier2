-- Defense-in-depth gates for pharmacy regulatory approval.
-- The application performs the same checks with friendly UI errors; these
-- triggers make trust-sensitive changes invalidate earlier reviewer evidence
-- and prevent approval/activation without a current verification dossier.

CREATE OR REPLACE FUNCTION record_pharmacy_verification_input_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."name" IS DISTINCT FROM NEW."name"
     OR OLD."legal_name" IS DISTINCT FROM NEW."legal_name"
     OR OLD."license_number" IS DISTINCT FROM NEW."license_number"
     OR OLD."license_document_url" IS DISTINCT FROM NEW."license_document_url"
     OR OLD."ppb_premises_number" IS DISTINCT FROM NEW."ppb_premises_number"
     OR OLD."kra_pin" IS DISTINCT FROM NEW."kra_pin"
     OR OLD."owner_user_id" IS DISTINCT FROM NEW."owner_user_id"
     OR OLD."email" IS DISTINCT FROM NEW."email"
     OR OLD."phone" IS DISTINCT FROM NEW."phone"
     OR OLD."city" IS DISTINCT FROM NEW."city"
     OR OLD."county" IS DISTINCT FROM NEW."county"
     OR OLD."latitude" IS DISTINCT FROM NEW."latitude"
     OR OLD."longitude" IS DISTINCT FROM NEW."longitude" THEN
    INSERT INTO "pharmacy_onboarding_events"
      ("id", "pharmacy_id", "actor_id", "type", "message", "meta", "created_at")
    VALUES
      (
        gen_random_uuid(),
        NEW."id",
        NULL,
        'verification_input_changed',
        'Verification-sensitive pharmacy details changed; prior reviewer checks may be stale',
        jsonb_build_object('source', 'database_trigger'),
        CURRENT_TIMESTAMP
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pharmacy_verification_input_change_audit ON "pharmacies";

CREATE TRIGGER pharmacy_verification_input_change_audit
AFTER UPDATE OF
  "name", "legal_name", "license_number", "license_document_url",
  "ppb_premises_number", "kra_pin", "owner_user_id", "email", "phone",
  "city", "county", "latitude", "longitude"
ON "pharmacies"
FOR EACH ROW
EXECUTE FUNCTION record_pharmacy_verification_input_change();

CREATE OR REPLACE FUNCTION enforce_pharmacy_verification_before_trust()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  profile_meta jsonb;
  checklist_meta jsonb;
  owner_email_verified boolean := false;
  expiry_text text;
  expected_license_prefix text;
  expected_business_prefix text;
  profile_created_at timestamp;
  checklist_created_at timestamp;
  input_changed_at timestamp;
  latest_input_at timestamp;
BEGIN
  -- Only re-evaluate when the trust-bearing status actually changes.
  IF NEW."status" IS NOT DISTINCT FROM OLD."status" THEN
    RETURN NEW;
  END IF;

  IF NEW."status"::text NOT IN ('approved', 'active') THEN
    RETURN NEW;
  END IF;

  expected_license_prefix := 'r2-private://pharmacy-verification/' || NEW."id"::text || '/license/%';
  expected_business_prefix := 'r2-private://pharmacy-verification/' || NEW."id"::text || '/business/%';

  IF NEW."license_number" IS NULL OR btrim(NEW."license_number") = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: PPB licence number missing';
  END IF;
  IF NEW."ppb_premises_number" IS NULL OR btrim(NEW."ppb_premises_number") = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: PPB premises/facility number missing';
  END IF;
  IF NEW."license_document_url" IS NULL OR NEW."license_document_url" NOT LIKE expected_license_prefix THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: secure PPB licence evidence missing';
  END IF;
  IF NEW."city" IS NULL OR btrim(NEW."city") = '' OR NEW."phone" IS NULL OR btrim(NEW."phone") = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: premises contact information missing';
  END IF;
  IF NEW."latitude" IS NULL OR NEW."longitude" IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: precise premises pin missing';
  END IF;
  IF NEW."owner_user_id" IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: pharmacy owner account missing';
  END IF;

  SELECT u."email_verified"
    INTO owner_email_verified
    FROM "users" u
   WHERE u."id" = NEW."owner_user_id";

  IF owner_email_verified IS DISTINCT FROM true THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: owner email is not verified';
  END IF;

  SELECT e."meta", e."created_at"
    INTO profile_meta, profile_created_at
    FROM "pharmacy_onboarding_events" e
   WHERE e."pharmacy_id" = NEW."id"
     AND e."type" = 'verification_profile_saved'
   ORDER BY e."created_at" DESC
   LIMIT 1;

  IF profile_meta IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: regulatory verification dossier missing';
  END IF;

  IF COALESCE(btrim(profile_meta->>'facilityType'), '') = ''
     OR COALESCE(btrim(profile_meta->>'physicalAddress'), '') = ''
     OR COALESCE(btrim(profile_meta->>'superintendentName'), '') = ''
     OR COALESCE(btrim(profile_meta->>'superintendentRegistrationNumber'), '') = ''
     OR COALESCE(btrim(profile_meta->>'superintendentPracticeLicenseNumber'), '') = ''
     OR COALESCE(btrim(profile_meta->>'ownershipType'), '') = ''
     OR COALESCE(btrim(profile_meta->>'businessRegistrationNumber'), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: regulatory dossier has missing identity fields';
  END IF;

  IF COALESCE(profile_meta->>'applicantAuthorityConfirmed', 'false') <> 'true' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: applicant authority is not declared';
  END IF;

  IF COALESCE(profile_meta->>'businessDocumentUrl', '') NOT LIKE expected_business_prefix THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: secure business-registration evidence missing';
  END IF;

  expiry_text := COALESCE(profile_meta->>'licenseExpiryDate', '');
  IF expiry_text !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: invalid licence expiry date';
  END IF;
  IF expiry_text::date < CURRENT_DATE THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: PPB premises licence has expired';
  END IF;

  SELECT e."meta", e."created_at"
    INTO checklist_meta, checklist_created_at
    FROM "pharmacy_onboarding_events" e
   WHERE e."pharmacy_id" = NEW."id"
     AND e."type" = 'verification_checklist_saved'
   ORDER BY e."created_at" DESC
   LIMIT 1;

  IF checklist_meta IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: reviewer verification checklist missing';
  END IF;

  SELECT max(e."created_at")
    INTO input_changed_at
    FROM "pharmacy_onboarding_events" e
   WHERE e."pharmacy_id" = NEW."id"
     AND e."type" = 'verification_input_changed';

  latest_input_at := profile_created_at;
  IF input_changed_at IS NOT NULL AND (latest_input_at IS NULL OR input_changed_at > latest_input_at) THEN
    latest_input_at := input_changed_at;
  END IF;

  IF latest_input_at IS NOT NULL AND checklist_created_at < latest_input_at THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: reviewer checklist is stale after pharmacy evidence changed';
  END IF;

  IF COALESCE(checklist_meta->>'ppbRegistryMatched', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'licenceActive', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'licenceDocumentMatched', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'practitionerMatched', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'locationMatched', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'ownershipVerified', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'applicantAuthorityVerified', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'contactVerified', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'noCriticalMismatch', 'false') <> 'true' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: one or more mandatory reviewer checks have not passed';
  END IF;

  IF COALESCE(btrim(checklist_meta->>'ppbRegistrySource'), '') = ''
     OR COALESCE(btrim(checklist_meta->>'practitionerRegistrySource'), '') = ''
     OR COALESCE(btrim(checklist_meta->>'checkedAt'), '') = ''
     OR COALESCE(btrim(checklist_meta->>'notes'), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: reviewer evidence source, timestamp, or notes missing';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pharmacy_verification_trust_gate ON "pharmacies";

CREATE TRIGGER pharmacy_verification_trust_gate
BEFORE UPDATE OF "status" ON "pharmacies"
FOR EACH ROW
EXECUTE FUNCTION enforce_pharmacy_verification_before_trust();
