# 🚀 Quick Start: Load Categories & Subcategories

Follow these steps in order to load your Categories and Subcategories from Excel.

## ✅ Step-by-Step Checklist

### 📝 Step 1: Prepare Your Excel File

Create an Excel file (`.xlsx`) with these columns:

| Business Group | Category | Subcategory | Description | Functional Area | FA SPOC |
|----------------|----------|-------------|-------------|-----------------|---------|
| Tech Delivery | Hardware | Laptop | Laptop issues | IT Support | John Doe |
| Tech Delivery | Hardware | Desktop | Desktop issues | IT Support | John Doe |
| Finance | Hardware | Laptop | Finance laptops | Finance IT | Jane Smith |
| Finance | Accounting | Invoice | Invoice processing | Finance Ops | Jane Smith |

**Required columns**: Business Group, Category, Subcategory  
**Optional columns**: Description, Functional Area, FA SPOC

Save as `categories.xlsx` in your project root.

---

### 🗄️ Step 2: Run Database Migrations

**Open Neon Console**: https://console.neon.tech

1. Select your project
2. Click **SQL Editor**
3. Open the file: **`docs/RUN_MIGRATIONS_MANUALLY.md`**
4. Copy the **entire SQL block** from that file
5. Paste into Neon SQL Editor
6. Click **Run**
7. Wait for success messages ✅

**Expected output**:
```
✅ MIGRATION 035 COMPLETE: Functional Area SPOCs
✅ MIGRATION 036 COMPLETE: Categories Based on Business Groups
```

---

### 📥 Step 3: Import Your Excel Data

In your terminal, run:

```bash
node scripts/import-categories-by-business-group.js categories.xlsx
```

**The script will**:
1. Show you a preview of what will be imported
2. Wait 5 seconds (you can press Ctrl+C to cancel)
3. Import all data
4. Show success summary

**Expected output**:
```
✅ Import completed successfully!
📊 Summary:
  Categories: 8
  Subcategories: 16
  Mappings: 16
```

---

### 🔄 Step 4: Clear Cache & Restart

```bash
rm -rf .next
npm run dev
```

Then in your browser: **Ctrl + Shift + R** (hard refresh)

---

### ✅ Step 5: Verify Everything Works

#### Check 1: Functional Area SPOCs
1. Go to **Admin Dashboard** → **FA Mappings** tab
2. Click **Edit** on any Functional Area
3. ✅ You should see **SPOC dropdown** with users

#### Check 2: Categories by Business Group
1. Go to **Master Data Management** → **Categories** tab
2. ✅ Table shows **Business Group** column
3. Click **Add New**
4. ✅ Form requires **Business Group** selection

#### Check 3: Ticket Creation Filters
1. Go to **Create Ticket**
2. Select a **Business Group** (e.g., "Tech Delivery")
3. ✅ **Category dropdown** shows only categories for that BG
4. Select a **Category**
5. ✅ **Subcategory dropdown** shows subcategories for that category

---

## 🎯 Quick Command Reference

```bash
# 1. Import data
node scripts/import-categories-by-business-group.js your-file.xlsx

# 2. Clear cache
rm -rf .next

# 3. Restart server
npm run dev
```

---

## 📚 Detailed Documentation

Need more details? Check these files:

| Task | Documentation File |
|------|-------------------|
| **Run migrations** | `docs/RUN_MIGRATIONS_MANUALLY.md` |
| **Load categories** | `docs/HOW_TO_LOAD_CATEGORIES.md` |
| **Excel format** | `docs/IMPORT_CATEGORIES_GUIDE.md` |
| **How categories work** | `docs/CATEGORY_STRUCTURE_EXPLAINED.md` |
| **Assign FA SPOCs** | `docs/HOW_TO_ASSIGN_FA_SPOCS.md` |

---

## ⚠️ Important Notes

### Data Deletion Warning
The import script **deletes existing**:
- ❌ Categories
- ❌ Subcategories  
- ❌ Mappings

**Backup first** if you have existing data!

### Business Groups Must Exist
Create all Business Groups in the UI **before** importing:
- Go to **Master Data Management** → **Business Groups**
- Add any missing Business Groups
- Note exact names for your Excel file

---

## 🆘 Troubleshooting

### Problem: "Business group not found in database"
**Fix**: Create the Business Group in UI first, or fix spelling in Excel

### Problem: "Column 'business_unit_group_id' does not exist"
**Fix**: Run migrations first (Step 2 above)

### Problem: "Categories not showing in UI"
**Fix**: Clear cache and restart (Step 4 above)

### Problem: "SPOC dropdown empty"
**Fix**: Make sure you have users in the database

---

## 🎉 That's It!

Follow these 5 steps and you're done:

1. ✅ Prepare Excel file
2. ✅ Run migrations in Neon Console
3. ✅ Import data with script
4. ✅ Clear cache & restart
5. ✅ Verify in UI

**Your Categories and Subcategories are now loaded!** 🚀

---

**Questions?** Check the detailed documentation files listed above or share your error message for help.
