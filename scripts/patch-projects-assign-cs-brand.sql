

DO $$
DECLARE
  v_group_id INTEGER;
BEGIN
  -- Find the CS Brand business group
  SELECT id INTO v_group_id
  FROM business_unit_groups
  WHERE name = 'CS Brand'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Business group "CS Brand" not found. Please create it first in Master Settings > Groups.';
  END IF;

  -- Update all projects that don’t have a group yet
  UPDATE projects
  SET business_unit_group_id = v_group_id
  WHERE business_unit_group_id IS NULL;

  RAISE NOTICE '✅ All projects without a group have been assigned to "CS Brand" (ID=%).', v_group_id;
END $$;

