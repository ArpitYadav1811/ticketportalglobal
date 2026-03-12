# Migration 036: Categories Based on Business Groups

## 🎯 What Changed

**BEFORE**: Categories were global (shared across all business groups)  
**AFTER**: Categories belong to specific Business Groups (each BG has its own categories)

## 📊 Database Changes

### New Column in `categories` Table:
- `business_unit_group_id` (INTEGER, NOT NULL, FK to business_unit_groups)

### Updated Constraints:
- **Old**: `UNIQUE(name)` - Category names were globally unique
- **New**: `UNIQUE(name, business_unit_group_id)` - Category names are unique per business group

### What This Means:
- ✅ "Hardware" can exist in multiple business groups
- ✅ Each business group manages its own categories
- ✅ No category name conflicts between business groups

## 🚀 Running the Migration

### Option 1: Automated Script (Recommended if connection works)

```bash
node scripts/run-036-categories-per-bg.js
```

The script will:
1. Add `business_unit_group_id` column to categories
2. Duplicate existing categories for each business group that uses them
3. Update all mappings to point to the new BG-specific categories
4. Remove old global categories
5. Make `business_unit_group_id` required
6. Update unique constraint

### Option 2: Manual SQL (If connection times out)

Go to **Neon Console** → **SQL Editor** and run `scripts/036-categories-per-business-group.sql`

## ⚠️ Important Notes

### Data Migration Strategy

The migration automatically handles existing data:

**Example**: If category "Hardware" is used by 3 business groups:
- Tech Delivery
- Finance
- HR

**Before Migration**:
```
categories:
  id=1, name="Hardware" (global)

mappings:
  BG=Tech Delivery, category_id=1
  BG=Finance, category_id=1
  BG=HR, category_id=1
```

**After Migration**:
```
categories:
  id=10, name="Hardware", business_unit_group_id=1 (Tech Delivery)
  id=11, name="Hardware", business_unit_group_id=2 (Finance)
  id=12, name="Hardware", business_unit_group_id=3 (HR)

mappings:
  BG=Tech Delivery, category_id=10
  BG=Finance, category_id=11
  BG=HR, category_id=12
```

### No Data Loss
- ✅ All existing categories are preserved
- ✅ All existing subcategories remain linked correctly
- ✅ All existing mappings continue to work
- ✅ All existing tickets keep their category references

## 🎨 UI Changes

### Master Data Management

**Categories Tab** now shows:
| Name | **Business Group** | Description | Actions |
|------|-------------------|-------------|---------|
| Hardware | Tech Delivery | Hardware issues | Edit/Delete |
| Hardware | Finance | Hardware issues | Edit/Delete |
| Software | Tech Delivery | Software issues | Edit/Delete |

**Add/Edit Category Dialog** now requires:
1. **Name** (required)
2. **Business Group** (required) ← **NEW DROPDOWN**
3. **Description** (optional)

### Ticket Creation

When creating a ticket:
1. Select **Business Group** first
2. **Categories dropdown** now shows only categories for that Business Group
3. Select **Category**
4. **Subcategories dropdown** shows subcategories for that category

## 📥 Import Changes

### Excel Format (Same, but behavior changes)

| Business Group | Category | Subcategory | Description | Functional Area | FA SPOC |
|----------------|----------|-------------|-------------|-----------------|---------|
| Tech Delivery | Hardware | Laptop | Laptop issues | IT Support | John Doe |
| Finance | Hardware | Laptop | Laptop issues | Finance IT | Jane Smith |

**Before**: Would create 1 "Hardware" category (global)  
**After**: Creates 2 "Hardware" categories (one per business group)

### Import Script Updated

`scripts/import-categories-by-business-group.js` now:
- ✅ Creates categories per business group (not global)
- ✅ Handles duplicate category names across business groups
- ✅ Links subcategories to correct BG-specific categories
- ✅ Creates proper mappings

## 🔍 Verification

After running the migration, verify:

### 1. Check Categories Have Business Groups
```sql
SELECT 
  c.name,
  bug.name as business_group,
  (SELECT COUNT(*) FROM subcategories WHERE category_id = c.id) as subcategory_count
FROM categories c
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name, c.name;
```

### 2. Check All Categories Have business_unit_group_id
```sql
SELECT COUNT(*) as total_categories,
       COUNT(business_unit_group_id) as categories_with_bg
FROM categories;
-- Both counts should be equal
```

### 3. Check Mappings Still Work
```sql
SELECT 
  bug.name as business_group,
  c.name as category,
  s.name as subcategory
FROM ticket_classification_mapping tcm
JOIN business_unit_groups bug ON tcm.target_business_group_id = bug.id
JOIN categories c ON tcm.category_id = c.id
JOIN subcategories s ON tcm.subcategory_id = s.id
LIMIT 20;
```

## 🎯 Benefits

### 1. **Isolation**
Each business group manages its own categories independently

### 2. **Flexibility**
- Tech Delivery can have "Deployment" category
- Finance can have "Deployment" category with different meaning
- No naming conflicts!

### 3. **Cleaner UI**
Users only see categories relevant to their business group

### 4. **Better Organization**
Categories are organized by business group in Master Data

## 📋 Updated Files

### Database:
- ✅ `scripts/036-categories-per-business-group.sql` - Migration SQL
- ✅ `scripts/run-036-categories-per-bg.js` - Migration runner

### Backend:
- ✅ `lib/actions/master-data.ts`:
  - `getCategories(businessGroupId?)` - Now filters by BG
  - `createCategory(name, desc, businessGroupId)` - Requires BG
  - `updateCategory(id, name, desc, businessGroupId?)` - Can update BG

### Frontend:
- ✅ `components/master-data/categories-tab.tsx`:
  - Shows Business Group column
  - Business Group dropdown in Add/Edit dialog
- ✅ `components/tickets/create-ticket-form.tsx`:
  - Loads categories based on selected Business Group
  - Categories update when Business Group changes

### Scripts:
- ✅ `scripts/import-categories-by-business-group.js`:
  - Creates BG-specific categories
  - Handles duplicate names across BGs

## 🚦 Migration Steps

### Step 1: Backup (Recommended)
```bash
# Export current data
pg_dump YOUR_DATABASE_URL > backup-before-036.sql
```

### Step 2: Run Migration
```bash
node scripts/run-036-categories-per-bg.js
```

### Step 3: Verify
Check the output shows:
```
✅ SUCCESS: Categories are now business group specific
   - business_unit_group_id column added (NOT NULL)
   - Unique constraint: (name, business_unit_group_id)
```

### Step 4: Clear Cache & Restart
```bash
rm -rf .next
npm run dev
```

### Step 5: Test in UI
1. Go to **Master Data Management** → **Categories** tab
2. Verify categories show Business Group column
3. Click **Add New** - verify Business Group dropdown appears
4. Create a test category for a specific business group
5. Go to **Create Ticket** - verify categories filter by selected BG

## ❓ FAQ

### Q: Will this break existing tickets?
**A:** No! All existing ticket references are preserved. The migration updates mappings automatically.

### Q: Can I have the same category name in different business groups?
**A:** Yes! That's the whole point. "Hardware" in Tech Delivery is separate from "Hardware" in Finance.

### Q: What happens to tickets with old category references?
**A:** They continue to work. The migration updates the mappings to point to the new BG-specific categories.

### Q: Do I need to re-import my data?
**A:** No, the migration handles existing data. But future imports will create BG-specific categories.

### Q: Can I move a category to a different business group?
**A:** Yes, edit the category and change the Business Group dropdown.

## 🔄 Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Restore from backup
psql YOUR_DATABASE_URL < backup-before-036.sql
```

Or manually:
```sql
-- Remove business_unit_group_id column
ALTER TABLE categories DROP COLUMN business_unit_group_id;

-- Restore unique constraint
ALTER TABLE categories DROP CONSTRAINT categories_name_business_group_unique;
ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);
```

## ✅ Summary

This migration transforms categories from **global entities** to **business group-specific entities**, providing:
- ✅ Better isolation between business groups
- ✅ No naming conflicts
- ✅ Cleaner, more relevant category lists
- ✅ Easier management per business group

**All existing data is preserved and automatically migrated!** 🚀
