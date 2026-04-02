-- FK-based SPOC model rollout (backward compatible with legacy name columns)

ALTER TABLE business_unit_groups
  ADD COLUMN IF NOT EXISTS primary_spoc_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS secondary_spoc_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Backfill primary SPOC FK from existing text columns.
UPDATE business_unit_groups bug
SET primary_spoc_user_id = u.id
FROM users u
WHERE bug.primary_spoc_user_id IS NULL
  AND LOWER(TRIM(u.full_name)) = LOWER(TRIM(COALESCE(bug.primary_spoc_name, bug.spoc_name)));

-- Backfill secondary SPOC FK from existing text column.
UPDATE business_unit_groups bug
SET secondary_spoc_user_id = u.id
FROM users u
WHERE bug.secondary_spoc_user_id IS NULL
  AND bug.secondary_spoc_name IS NOT NULL
  AND LOWER(TRIM(u.full_name)) = LOWER(TRIM(bug.secondary_spoc_name));

-- Guardrails.
ALTER TABLE business_unit_groups
  DROP CONSTRAINT IF EXISTS business_unit_groups_distinct_spocs_chk;

ALTER TABLE business_unit_groups
  ADD CONSTRAINT business_unit_groups_distinct_spocs_chk
  CHECK (
    primary_spoc_user_id IS NULL
    OR secondary_spoc_user_id IS NULL
    OR primary_spoc_user_id <> secondary_spoc_user_id
  );

-- One user cannot be active Secondary SPOC for multiple groups.
DROP INDEX IF EXISTS idx_bug_unique_secondary_spoc_user;
CREATE UNIQUE INDEX idx_bug_unique_secondary_spoc_user
  ON business_unit_groups(secondary_spoc_user_id)
  WHERE secondary_spoc_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bug_primary_spoc_user_id ON business_unit_groups(primary_spoc_user_id);
CREATE INDEX IF NOT EXISTS idx_bug_secondary_spoc_user_id ON business_unit_groups(secondary_spoc_user_id);
