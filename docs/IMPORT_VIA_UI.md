# Import Categories via UI (Easiest Method!)

Since command-line scripts are timing out, use the **web-based import** instead!

## 🎯 Why Use UI Import?

- ✅ No connection timeout issues
- ✅ Works directly in your browser
- ✅ Visual feedback and progress
- ✅ No command-line needed
- ✅ Uses your existing authenticated session

---

## 🚀 Step-by-Step Process

### **Step 1: Run Migrations** (One-time setup)

⚠️ **MUST DO THIS FIRST!**

1. Go to https://console.neon.tech
2. Select your project → **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Add SPOC to Functional Areas
ALTER TABLE functional_areas
ADD COLUMN IF NOT EXISTS spoc_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_functional_areas_spoc 
ON functional_areas(spoc_name) 
WHERE spoc_name IS NOT NULL;

-- Make Categories belong to Business Groups
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS business_unit_group_id INTEGER REFERENCES business_unit_groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_business_group 
ON categories(business_unit_group_id);

-- Migrate existing data
DO $$
DECLARE
  mapping_record RECORD;
  new_cat_id INTEGER;
BEGIN
  FOR mapping_record IN 
    SELECT DISTINCT 
      tcm.business_unit_group_id,
      tcm.category_id,
      c.name as category_name,
      c.description as category_description
    FROM ticket_classification_mapping tcm
    JOIN categories c ON tcm.category_id = c.id
    JOIN business_unit_groups bug ON tcm.business_unit_group_id = bug.id
  LOOP
    SELECT id INTO new_cat_id
    FROM categories 
    WHERE name = mapping_record.category_name 
    AND business_unit_group_id = mapping_record.business_unit_group_id;
    
    IF new_cat_id IS NULL THEN
      INSERT INTO categories (name, description, business_unit_group_id)
      VALUES (
        mapping_record.category_name,
        mapping_record.category_description,
        mapping_record.business_unit_group_id
      )
      RETURNING id INTO new_cat_id;
    END IF;
    
    UPDATE ticket_classification_mapping
    SET category_id = new_cat_id
    WHERE business_unit_group_id = mapping_record.business_unit_group_id
    AND category_id = mapping_record.category_id;
  END LOOP;
END $$;

DELETE FROM categories WHERE business_unit_group_id IS NULL;

ALTER TABLE categories
ALTER COLUMN business_unit_group_id SET NOT NULL;

ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_name_key;

ALTER TABLE categories
ADD CONSTRAINT categories_name_business_group_unique 
UNIQUE (name, business_unit_group_id);
```

4. Click **Run** and wait for completion ✅

---

### **Step 2: Clear Cache & Restart Server**

In your terminal:

```bash
rm -rf .next
npm run dev
```

---

### **Step 3: Open Admin Dashboard**

1. Go to your app in browser
2. Login as **Super Admin**
3. Go to **Admin Dashboard**
4. Click on **System Management** tab

---

### **Step 4: Import Your Excel Files**

You'll see an **"Import Categories from Excel"** section at the top.

#### **For BM Categories:**

1. **Select Business Group**: Choose "BM" or "Tech Delivery" from dropdown
2. **Select Excel File**: Click "Choose File" → Select `mf_category_BM Mar11.xlsx`
3. **Click "Import Categories"**
4. ✅ Wait for success message

#### **For RMN Categories:**

1. **Select Business Group**: Choose "RMN" from dropdown
2. **Select Excel File**: Click "Choose File" → Select `mf_category_RMN Mar11.xlsx`
3. **Click "Import Categories"**
4. ✅ Wait for success message

---

### **Step 5: Verify Import**

1. Go to **Master Data Management** → **Categories** tab
2. You should see:
   - Categories with **Business Group** column
   - BM categories showing "BM" or "Tech Delivery"
   - RMN categories showing "RMN"

3. Go to **Create Ticket**
4. Select **Business Group** = "BM"
5. **Category dropdown** shows only BM categories
6. Select **Business Group** = "RMN"
7. **Category dropdown** shows only RMN categories

---

## 📊 Your Excel Format

Your files should have these columns:

| Category | Sub Category | Input | Estimated hrs |
|----------|--------------|-------|---------------|
| Hardware | Laptop | Laptop issues | 2 |
| Hardware | Desktop | Desktop issues | 3 |
| Software | Email | Email app issues | 1 |

**Required**: Category, Sub Category  
**Optional**: Input (Description), Estimated hrs

---

## 💡 Benefits of UI Import

### **vs Command-Line Scripts:**
- ✅ No connection timeouts (uses Next.js API routes)
- ✅ Visual progress feedback
- ✅ Easier to use (point and click)
- ✅ Works from Windows or WSL
- ✅ No path conversion needed

### **Features:**
- ✅ Select Business Group from dropdown
- ✅ Upload Excel file directly
- ✅ See success/error messages instantly
- ✅ Import multiple files (one at a time)
- ✅ Non-destructive (adds to selected BG only)

---

## 🔍 What Gets Imported

From your Excel file:

```
Category: Hardware
Sub Category: Laptop
Input: Laptop related issues
Estimated hrs: 2
```

Creates:
1. **Category**: "Hardware" (for selected Business Group)
2. **Subcategory**: "Laptop" (under Hardware)
   - Description: "Laptop related issues | Est. 2 hrs"
3. **Mapping**: BG + Hardware + Laptop (estimated duration: 2 hrs)

---

## ⚠️ Important Notes

### **Business Groups Must Exist:**
Before importing, make sure your Business Groups exist:
- Go to **Master Data Management** → **Business Groups**
- Create "BM", "RMN", or whatever BGs you need
- Then import categories for each

### **Multiple Imports:**
You can import multiple times:
- Each import adds to the selected Business Group
- Existing categories/subcategories are updated (not duplicated)
- Safe to run multiple times

### **Estimated Hours:**
- If provided, stored in `estimated_duration` field
- Used for ticket SLA calculations
- Defaults to 1 hour if not provided

---

## 🆘 Troubleshooting

### **"Import Categories" button not visible**
**Fix**: 
1. Make sure you're logged in as **Super Admin**
2. Clear cache: `rm -rf .next`
3. Restart: `npm run dev`
4. Hard refresh: Ctrl + Shift + R

### **"Column 'business_unit_group_id' does not exist"**
**Fix**: Run migrations first (Step 1 above)

### **"No business groups in dropdown"**
**Fix**: Create Business Groups in Master Data Management first

### **"Import failed" error**
**Fix**: 
1. Check Excel file format (see example above)
2. Make sure columns are named correctly
3. Check browser console for detailed error

---

## ✅ Complete Workflow

```
1. Run migrations in Neon Console (one time)
   ↓
2. Clear cache & restart server
   ↓
3. Login as Super Admin
   ↓
4. Go to Admin Dashboard → System Management
   ↓
5. Import BM categories (select BG, upload file, click import)
   ↓
6. Import RMN categories (select BG, upload file, click import)
   ↓
7. Verify in Master Data → Categories
   ↓
8. Test in Create Ticket (categories filter by BG)
   ↓
9. Done! 🎉
```

---

## 📚 Related Documentation

- **`docs/RUN_MIGRATIONS_MANUALLY.md`** - SQL migrations
- **`docs/IMPORT_TD_BM_CATEGORIES.md`** - Excel format details
- **`docs/HOW_TO_LOAD_CATEGORIES.md`** - General loading guide
- **`QUICK_START_GUIDE.md`** - Quick reference

---

## 🎉 You're Ready!

1. ✅ Run migrations in Neon Console
2. ✅ Clear cache & restart
3. ✅ Use UI import in Admin Dashboard
4. ✅ No more connection timeouts!

**This is the easiest way to import your categories!** 🚀
