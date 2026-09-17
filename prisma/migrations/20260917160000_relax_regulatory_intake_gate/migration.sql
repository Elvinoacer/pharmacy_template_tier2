-- Keep final platform-admin verification mandatory while allowing pharmacy
-- applicants to enter review without every PPB/licensing document available.
-- This replaces the strict trust-gate function created by the earlier
-- pharmacy_verification_gate migration. The existing trigger continues to call
-- this function, so deployed databases pick up the new rules when this
-- migration runs.

CREATE OR REPLACE FUNCTION enforce_pharmacy_verification_before_trust()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  profile_meta jsonb;
  checklist_meta jsonb;
  owner_email_verified boolean := false;
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

  -- Core premises/contact identity is still mandatory before approval.
  IF NEW."city" IS NULL OR btrim(NEW."city") = ''
     OR NEW."phone" IS NULL OR btrim(NEW."phone") = '' THEN
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

  -- The applicant must have completed the verification-intake step and must
  -- explicitly declare authority to represent the pharmacy. Regulatory fields
  -- inside this profile may be blank and are assessed by the reviewer.
  SELECT e."meta", e."created_at"
    INTO profile_meta, profile_created_at
    FROM "pharmacy_onboarding_events" e
   WHERE e."pharmacy_id" = NEW."id"
     AND e."type" = 'verification_profile_saved'
   ORDER BY e."created_at" DESC
   LIMIT 1;

  IF profile_meta IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: verification intake details missing';
  END IF;

  IF COALESCE(profile_meta->>'applicantAuthorityConfirmed', 'false') <> 'true' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: applicant authority is not declared';
  END IF;

  -- A fresh human reviewer checklist is always mandatory. PPB/licence-specific
  -- checks may remain false when evidence is unavailable; the five core checks
  -- below are the approval boundary.
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

  IF COALESCE(checklist_meta->>'locationMatched', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'ownershipVerified', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'applicantAuthorityVerified', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'contactVerified', 'false') <> 'true'
     OR COALESCE(checklist_meta->>'noCriticalMismatch', 'false') <> 'true' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: one or more mandatory reviewer checks have not passed';
  END IF;

  IF COALESCE(btrim(checklist_meta->>'checkedAt'), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: reviewer timestamp missing';
  END IF;

  IF length(COALESCE(btrim(checklist_meta->>'notes'), '')) < 20 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: meaningful reviewer evidence notes missing';
  END IF;

  -- If the reviewer positively asserts a PPB match, keep the evidence source
  -- mandatory for that assertion. Leaving the PPB check false is allowed.
  IF COALESCE(checklist_meta->>'ppbRegistryMatched', 'false') = 'true'
     AND COALESCE(btrim(checklist_meta->>'ppbRegistrySource'), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: PPB facility-register source missing for confirmed match';
  END IF;

  IF COALESCE(checklist_meta->>'practitionerMatched', 'false') = 'true'
     AND COALESCE(btrim(checklist_meta->>'practitionerRegistrySource'), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'pharmacy_verification_incomplete: PPB practitioner-register source missing for confirmed match';
  END IF;

  RETURN NEW;
END;
$$;
