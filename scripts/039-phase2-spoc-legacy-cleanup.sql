-- Phase 2 cleanup checks for FK-only SPOC model.
-- Run only after app deployment uses primary_spoc_user_id / secondary_spoc_user_id exclusively.

-- 1) Sanity checks (should return 0 rows before dropping legacy columns)
-- Legacy names still present while FK is null
SELECT id, name, spoc_name, primary_spoc_name
FROM business_unit_groups
WHERE primary_spoc_user_id IS NULL
  AND (spoc_name IS NOT NULL OR primary_spoc_name IS NOT NULL);

SELECT id, name, secondary_spoc_name
FROM business_unit_groups
WHERE secondary_spoc_user_id IS NULL
  AND secondary_spoc_name IS NOT NULL;

-- 2) Optional one-time normalization (uncomment if needed)
-- UPDATE business_unit_groups SET spoc_name = NULL, primary_spoc_name = NULL WHERE primary_spoc_user_id IS NULL;
-- UPDATE business_unit_groups SET secondary_spoc_name = NULL WHERE secondary_spoc_user_id IS NULL;

-- 3) Drop legacy text SPOC columns once checks are clean
-- ALTER TABLE business_unit_groups
--   DROP COLUMN IF EXISTS spoc_name,
--   DROP COLUMN IF EXISTS primary_spoc_name,
--   DROP COLUMN IF EXISTS secondary_spoc_name;
