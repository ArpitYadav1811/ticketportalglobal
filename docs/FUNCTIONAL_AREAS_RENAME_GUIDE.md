# Functional Areas Table Rename Guide

## Overview
This guide documents the renaming of the `organizations` table to `functional_areas` for better clarity and to avoid confusion.

## What Changed

### Database Tables
1. **`organizations`** → **`functional_areas`**
   - Main table storing functional area definitions
   - All columns remain the same (id, name, description, created_at, updated_at)

2. **`organization_target_business_group_mapping`** → **`functional_area_business_group_mapping`**
   - Mapping table linking functional areas to business unit groups
   - Column renamed: `organization_id` → `functional_area_id`
   - Other column remains: `target_business_group_id` (references `business_unit_groups`)

### Indexes
- **`idx_org_tbg_mapping_org`** → **`idx_functional_area_bg_mapping_fa`**
- **`idx_org_tbg_mapping_tbg`** → **`idx_functional_area_bg_mapping_bg`**

## Migration Scripts

### 1. Rename Tables (Script 028)
**File**: `scripts/028-rename-organizations-to-functional-areas.sql`

This script:
- Renames `organizations` to `functional_areas`
- Renames `organization_target_business_group_mapping` to `functional_area_business_group_mapping`
- Renames the `organization_id` column to `functional_area_id`
- Updates all index names
- Adds helpful comments
- Provides verification output

**How to run**:
```bash
psql 'YOUR_DATABASE_CONNECTION_STRING' -f scripts/028-rename-organizations-to-functional-areas.sql
```

### 2. Seed Functional Areas (Script 027 - Updated)
**File**: `scripts/027-seed-functional-areas-updated.sql`

This script has been updated to:
- Create `functional_areas` table if it doesn't exist
- Create `functional_area_business_group_mapping` table if it doesn't exist
- Insert all 12 functional areas
- Create mappings to business unit groups

**How to run**:
```bash
psql 'YOUR_DATABASE_CONNECTION_STRING' -f scripts/027-seed-functional-areas-updated.sql
```

## Code Changes

### Backend Changes
**File**: `lib/actions/master-data.ts`

Updated functions:
- `getOrganizations()` - Now queries `functional_areas` table
- `getTargetBusinessGroupsByOrganization()` - Now uses `functional_area_business_group_mapping`
- `getTargetBusinessGroups()` - Now uses `functional_area_business_group_mapping`

All function names remain the same for backward compatibility, but internally use the new table names.

### Frontend Changes
**No frontend changes required!**

The UI already displays "Functional Area" as the label. The backend functions maintain their original names (`getOrganizations()`) so no frontend code needs to be updated.

## Execution Order

### Option 1: If you already have `organizations` table with data
```bash
# Step 1: Rename existing tables
psql 'YOUR_CONNECTION_STRING' -f scripts/028-rename-organizations-to-functional-areas.sql

# Step 2: Verify data is intact
# The script will show a sample of your existing mappings
```

### Option 2: If you don't have `organizations` table yet
```bash
# Step 1: Run the updated seeding script (it creates functional_areas directly)
psql 'YOUR_CONNECTION_STRING' -f scripts/027-seed-functional-areas-updated.sql
```

### Option 3: Fresh database setup
```bash
# Run all migration scripts in order:
psql 'YOUR_CONNECTION_STRING' -f scripts/022-pre-sync-business-groups.sql
psql 'YOUR_CONNECTION_STRING' -f scripts/022-merge-business-groups.sql
psql 'YOUR_CONNECTION_STRING' -f scripts/023-remove-subticket-columns.sql
psql 'YOUR_CONNECTION_STRING' -f scripts/024-convert-estimated-duration.sql
psql 'YOUR_CONNECTION_STRING' -f scripts/025-add-project-to-releases.sql
psql 'YOUR_CONNECTION_STRING' -f scripts/026-add-role-to-my-team.sql
psql 'YOUR_CONNECTION_STRING' -f scripts/027-seed-functional-areas-updated.sql
```

## Verification

After running the migration, verify the changes:

```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('functional_areas', 'functional_area_business_group_mapping');

-- Check data count
SELECT COUNT(*) FROM functional_areas;
SELECT COUNT(*) FROM functional_area_business_group_mapping;

-- View sample mappings
SELECT 
  fa.name as functional_area,
  bug.name as business_unit_group
FROM functional_area_business_group_mapping fabgm
JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
ORDER BY fa.name, bug.name
LIMIT 10;
```

Expected results:
- 12 functional areas
- 11 mappings (11 functional areas map to specific groups, 1 "Others" has no pre-mapping)

## Functional Area Mappings

| Functional Area | Business Unit Group |
|----------------|---------------------|
| MFBuddy support | TD Central |
| Customer Portal support | TD Central |
| Ticket Portal support | TD GUI |
| Billing Portal support | TD Central |
| Customer Integrations support | TD Integrations |
| GUI Development support | TD GUI |
| IT Administration support | TD IS |
| IT Security support | TD IS |
| IT DevOps support | TD IS |
| Customer Solutions support | TD Product |
| Competitive Research support | TD Product |
| Others | *(no pre-selection)* |

## Rollback Plan

If you need to rollback (rename back to `organizations`):

```sql
-- Rename tables back
ALTER TABLE functional_areas RENAME TO organizations;
ALTER TABLE functional_area_business_group_mapping RENAME TO organization_target_business_group_mapping;

-- Rename column back
ALTER TABLE organization_target_business_group_mapping 
RENAME COLUMN functional_area_id TO organization_id;

-- Rename indexes back
ALTER INDEX idx_functional_area_bg_mapping_fa RENAME TO idx_org_tbg_mapping_org;
ALTER INDEX idx_functional_area_bg_mapping_bg RENAME TO idx_org_tbg_mapping_tbg;
```

## Notes

- **Function names unchanged**: Backend functions like `getOrganizations()` keep their names for backward compatibility
- **UI labels unchanged**: Frontend already displays "Functional Area" correctly
- **Type definitions unchanged**: TypeScript types can keep using `Organization` interface name
- **Zero downtime**: The rename operation is fast and doesn't require application restart
- **Data preserved**: All existing data and relationships are maintained

## Troubleshooting

### Error: "relation 'organizations' does not exist"
**Solution**: Run script 028 to rename the table, or run script 027 to create it fresh.

### Error: "relation 'functional_areas' does not exist"
**Solution**: You may have run the old seeding script. Run script 028 to rename, or drop and recreate with script 027.

### No data in functional areas
**Solution**: Run script 027 to seed the data.

### Mappings not working
**Solution**: Verify `business_unit_groups` table has the correct groups. Run script 022 if needed.

## Summary

This rename improves code clarity by using a more descriptive table name that matches the UI terminology. The migration is safe, preserves all data, and requires no frontend changes.

✅ **Status**: Ready to execute
🎯 **Impact**: Database schema only
⚡ **Downtime**: None required
🔄 **Rollback**: Simple (see Rollback Plan above)
