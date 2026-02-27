# Migration Execution Guide - UPDATED

## ⚠️ IMPORTANT: Data Sync Required First

The error you encountered is a **safety feature** to prevent data loss. Here's how to proceed:

---

## 🔍 **What Happened**

Script `022-merge-business-groups.sql` detected that 8 target business groups don't exist in business_unit_groups yet. This is expected if:
- The tables were created at different times
- Some groups were added to target_business_groups but not business_unit_groups
- Previous migrations didn't sync the data

---

## ✅ **CORRECTED EXECUTION ORDER**

### **Step 0: Backup** (REQUIRED)
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **Step 1: Diagnostic Check** (Optional but recommended)
```bash
psql $DATABASE_URL -f scripts/022-diagnostic-check.sql
```

This will show you:
- All groups in both tables
- Which 8 groups are missing
- Why they're missing

### **Step 2: Pre-Sync Data** (REQUIRED)
```bash
psql $DATABASE_URL -f scripts/022-pre-sync-business-groups.sql
```

**Expected Output**:
```
============================================================================
CURRENT STATE
============================================================================
business_unit_groups count: X
target_business_groups count: Y
Missing in business_unit_groups: 8
============================================================================

Groups that will be added to business_unit_groups:
------------------------------------------------------------
1: TD Central (ID: 1)
2: TD GUI (ID: 2)
3: TD Integrations (ID: 3)
... (and 5 more)
------------------------------------------------------------

============================================================================
SYNC COMPLETE
============================================================================
Records inserted into business_unit_groups: 8
Total business_unit_groups now: Y
Total target_business_groups: Y
Still missing: 0

✅ SUCCESS: All target_business_groups now exist in business_unit_groups
✅ You can now run script 022-merge-business-groups.sql
============================================================================
```

### **Step 3: Run Main Migration** (After sync succeeds)
```bash
psql $DATABASE_URL -f scripts/022-merge-business-groups.sql
```

This should now succeed without errors!

### **Step 4: Continue with Remaining Scripts**
```bash
psql $DATABASE_URL -f scripts/023-remove-subticket-columns.sql
psql $DATABASE_URL -f scripts/024-convert-estimated-duration.sql
psql $DATABASE_URL -f scripts/025-add-project-to-releases.sql
psql $DATABASE_URL -f scripts/026-add-role-to-my-team.sql
```

---

## 📋 **COMPLETE EXECUTION SEQUENCE**

```bash
# 1. Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Connect to database
psql $DATABASE_URL

# 3. Optional: See what's missing
\i scripts/022-diagnostic-check.sql

# 4. REQUIRED: Sync data first
\i scripts/022-pre-sync-business-groups.sql
-- Wait for "✅ SUCCESS" message

# 5. Now run the main merger
\i scripts/022-merge-business-groups.sql
-- Should succeed now!

# 6. Continue with remaining scripts
\i scripts/023-remove-subticket-columns.sql
\i scripts/024-convert-estimated-duration.sql
\i scripts/025-add-project-to-releases.sql
\i scripts/026-add-role-to-my-team.sql
```

---

## 🔍 **Understanding the Issue**

### Why This Happened:
The original migration script `017-add-target-business-groups.sql` had this code:

```sql
-- Copy all existing business_unit_groups to target_business_groups
INSERT INTO target_business_groups (name, description)
SELECT name, description
FROM business_unit_groups
ON CONFLICT (name) DO NOTHING;
```

This copied FROM business_unit_groups TO target_business_groups.

**But later**, someone added 8 new groups to `target_business_groups` directly, without adding them to `business_unit_groups`. This created the mismatch.

### The 8 Missing Groups Are Likely:
1. TD Central
2. TD GUI
3. TD Integrations
4. TD IS
5. TD Product
6. TD Other
7. (Plus 2 more)

These were probably added when you ran the functional area seeding scripts.

---

## 🛡️ **Safety Features**

The pre-sync script is **completely safe** because:
1. ✅ It only **inserts** missing records (no updates or deletes)
2. ✅ It uses the same data (name, description) from target_business_groups
3. ✅ It preserves timestamps from the original records
4. ✅ It shows you exactly what will be added before doing it
5. ✅ It verifies success after completion

---

## 🚨 **If Pre-Sync Fails**

If the pre-sync script shows "Still missing: X" after running, it means there are name mismatches. To fix:

### Option A: Manual Investigation
```sql
-- Find groups with similar names
SELECT 
  tbg.name as target_name,
  bug.name as business_name,
  similarity(tbg.name, bug.name) as similarity_score
FROM target_business_groups tbg
CROSS JOIN business_unit_groups bug
WHERE NOT EXISTS (
  SELECT 1 FROM business_unit_groups b WHERE b.name = tbg.name
)
ORDER BY similarity_score DESC
LIMIT 20;
```

### Option B: Force Insert (if you're sure)
```sql
-- Manually insert the specific missing groups
INSERT INTO business_unit_groups (name, description)
VALUES 
  ('TD Central', 'Central team'),
  ('TD GUI', 'GUI team'),
  ('TD Integrations', 'Integrations team')
  -- Add the other 5 as needed
ON CONFLICT (name) DO NOTHING;
```

---

## ✅ **Verification After Pre-Sync**

After running the pre-sync script, verify:

```sql
-- Should return 0
SELECT COUNT(*) as missing_count
FROM target_business_groups tbg
WHERE NOT EXISTS (
  SELECT 1 FROM business_unit_groups bug
  WHERE bug.name = tbg.name
);

-- Should return same count for both
SELECT 
  (SELECT COUNT(*) FROM business_unit_groups) as bug_count,
  (SELECT COUNT(*) FROM target_business_groups) as tbg_count;
```

---

## 📊 **Expected Timeline**

| Step | Duration | Notes |
|------|----------|-------|
| Backup | 30 sec | Depends on database size |
| Diagnostic | 10 sec | Optional |
| Pre-sync | 30 sec | Inserts 8 records |
| Script 022 | 2-3 min | Main merger |
| Script 023 | 30 sec | Remove columns |
| Script 024 | 1-2 min | Duration conversion |
| Script 025 | 30 sec | Add project FK |
| Script 026 | 30 sec | Add role column |
| **Total** | **5-7 min** | With pre-sync |

---

## 🎯 **Success Criteria**

After completing all steps, verify:

```sql
-- 1. target_business_groups should be dropped
SELECT * FROM target_business_groups;
-- Expected: ERROR: relation "target_business_groups" does not exist ✅

-- 2. All tickets should have valid business group references
SELECT COUNT(*) 
FROM tickets t
LEFT JOIN business_unit_groups bug ON t.target_business_group_id = bug.id
WHERE t.target_business_group_id IS NOT NULL 
AND bug.id IS NULL;
-- Expected: 0 ✅

-- 3. Estimated duration should be integer
SELECT pg_typeof(estimated_duration) FROM tickets LIMIT 1;
-- Expected: integer ✅
```

---

## 📝 **Summary**

**The Error Is Expected** - It's a safety check working correctly!

**Solution**: Run the pre-sync script first, then proceed with the main migration.

**Why It's Safe**: The pre-sync only adds missing records, doesn't modify existing data.

**Next Steps**:
1. ✅ Run `022-pre-sync-business-groups.sql`
2. ✅ Verify success message
3. ✅ Run `022-merge-business-groups.sql`
4. ✅ Continue with remaining scripts

---

**Questions?** The pre-sync script is designed to be idempotent (safe to run multiple times) and will show you exactly what it's doing at each step.
