-- MedicationMaster is the network-wide canonical medicine library.
-- Tenant users may remove their PharmacyInventory row, but must never delete the
-- shared master as a side effect. Existing legacy delete code catches the raised
-- FK-style error after removing tenant inventory, leaving the shared record intact.
-- Platform-bypass sessions remain able to perform deliberate library cleanup/merge.

CREATE OR REPLACE FUNCTION protect_shared_medication_master_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.platform_bypass', true), 'false') <> 'true' THEN
    RAISE EXCEPTION 'shared medication masters are platform-managed and cannot be deleted by a pharmacy'
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_shared_medication_master_delete ON medication_masters;

CREATE TRIGGER trg_protect_shared_medication_master_delete
BEFORE DELETE ON medication_masters
FOR EACH ROW
EXECUTE FUNCTION protect_shared_medication_master_delete();
