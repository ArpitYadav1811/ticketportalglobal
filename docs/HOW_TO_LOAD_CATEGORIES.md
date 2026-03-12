# How to Load Categories and Subcategories

This guide shows you exactly how to load Categories and Subcategories for each Business Group from an Excel file.

## 📋 Prerequisites

### 1. Run the Migrations First!

Before importing data, you MUST run the database migrations:

**Go to Neon Console** (https://console.neon.tech) → **SQL Editor**

Copy and paste the SQL from: **`docs/RUN_MIGRATIONS_MANUALLY.md`**

This adds:
- ✅ `spoc_name` to Functional Areas
- ✅ `business_unit_group_id` to Categories

### 2. Prepare Your Excel File

Create an Excel file (`.xlsx` format) with these columns:

## 📊 Excel File Format

### Required Columns:
| Column | Name | Required | Description |
|--------|------|----------|-------------|
| A | **Business Group** | ✅ Yes | Must match existing BG in database |
| B | **Category** | ✅ Yes | Category name (e.g., "Hardware", "Software") |
| C | **Subcategory** | ✅ Yes | Subcategory name (e.g., "Laptop", "Desktop") |

### Optional Columns:
| Column | Name | Required | Description |
|--------|------|----------|-------------|
| D | **Description** | ❌ No | Description for the subcategory |
| E | **Functional Area** | ❌ No | FA name (will be created if doesn't exist) |
| F | **FA SPOC** | ❌ No | SPOC for the Functional Area |

### 📝 Example Excel File:

| Business Group | Category | Subcategory | Description | Functional Area | FA SPOC |
|----------------|----------|-------------|-------------|-----------------|---------|
| Tech Delivery | Hardware | Laptop | Laptop related issues | IT Support | John Doe |
| Tech Delivery | Hardware | Desktop | Desktop computer issues | IT Support | John Doe |
| Tech Delivery | Hardware | Monitor | Monitor issues | IT Support | John Doe |
| Tech Delivery | Software | Email | Email application issues | IT Support | John Doe |
| Tech Delivery | Software | VPN | VPN connectivity issues | IT Support | John Doe |
| Tech Delivery | Network | WiFi | WiFi connectivity | Network Ops | Jane Smith |
| Tech Delivery | Network | Firewall | Firewall issues | Network Ops | Jane Smith |
| Finance | Hardware | Laptop | Finance laptop issues | Finance IT | Bob Wilson |
| Finance | Hardware | Printer | Printer issues | Finance IT | Bob Wilson |
| Finance | Accounting | Invoice | Invoice processing | Finance Ops | Alice Brown |
| Finance | Accounting | Payment | Payment issues | Finance Ops | Alice Brown |
| Finance | Compliance | Audit | Audit requests | Compliance | Charlie Davis |
| HR | Recruitment | Interview | Interview scheduling | HR Operations | David Lee |
| HR | Recruitment | Onboarding | New hire onboarding | HR Operations | David Lee |
| HR | Payroll | Salary | Salary inquiries | HR Operations | David Lee |
| HR | Benefits | Insurance | Insurance questions | HR Operations | David Lee |

### 💡 Key Points:

1. **Business Group must exist** in your database before importing
2. **Same category name** in different Business Groups creates separate categories
3. **Functional Area** is optional - creates/updates FAs if provided
4. **FA SPOC** is optional - assigns SPOC to the FA if provided

## 🚀 Step-by-Step Loading Process

### Step 1: Save Your Excel File

Save your Excel file in the project root or note its path:
- `categories-data.xlsx` (in project root)
- `./data/my-categories.xlsx`
- `/home/user/downloads/categories.xlsx`

### Step 2: Run the Import Script

Open terminal in your project directory and run:

```bash
# If file is in project root
node scripts/import-categories-by-business-group.js categories-data.xlsx

# Or with full path
node scripts/import-categories-by-business-group.js /path/to/your/file.xlsx
```

### Step 3: Review the Preview

The script will show:

```
📄 Reading Excel file: categories-data.xlsx
✓ Found 16 rows of data

📋 First row columns: Business Group, Category, Subcategory, Description, Functional Area, FA SPOC

✓ Found 4 business groups in database:
  - Tech Delivery (ID: 1)
  - Finance (ID: 2)
  - HR (ID: 3)
  - Sales (ID: 4)

📊 Data Summary:
  Total rows processed: 16
  Skipped rows: 0
  Unique categories: 8
  Unique subcategories: 16
  Business groups with data: 3
  Functional areas found: 4

📋 Functional Areas to be created/updated:
  - IT Support (SPOC: John Doe)
  - Network Ops (SPOC: Jane Smith)
  - Finance IT (SPOC: Bob Wilson)
  - HR Operations (SPOC: David Lee)

⚠️  WARNING: This will DELETE all existing categories, subcategories, and mappings!
Press Ctrl+C to cancel, or wait 5 seconds to continue...
```

### Step 4: Wait or Cancel

- **Wait 5 seconds** to proceed with import
- **Press Ctrl+C** to cancel if something looks wrong

### Step 5: Import Completes

The script will:

```
📁 Creating/Updating Functional Areas...
  ✓ Created FA: IT Support (SPOC: John Doe)
  ✓ Created FA: Network Ops (SPOC: Jane Smith)
  ✓ Created FA: Finance IT (SPOC: Bob Wilson)
  ✓ Updated FA: HR Operations (SPOC: David Lee)
✓ Functional Areas processed

🗑️  Clearing existing data...
✓ Cleared existing data

📥 Inserting categories (business group specific)...

  Business Group: Tech Delivery (ID: 1)
    ✓ Hardware (ID: 10)
    ✓ Software (ID: 11)
    ✓ Network (ID: 12)

  Business Group: Finance (ID: 2)
    ✓ Hardware (ID: 13)
    ✓ Accounting (ID: 14)
    ✓ Compliance (ID: 15)

  Business Group: HR (ID: 3)
    ✓ Recruitment (ID: 16)
    ✓ Payroll (ID: 17)
    ✓ Benefits (ID: 18)

  ✓ Total categories created: 8

📥 Inserting subcategories...
  ✓ Inserted 16 subcategories

📥 Creating ticket classification mappings...
  Processing: Tech Delivery...
  Processing: Finance...
  Processing: HR...
  ✓ Created 16 mappings

✅ Import completed successfully!

📊 Summary:
  Categories: 8
  Subcategories: 16
  Mappings: 16
```

## 🔍 What Happens During Import

### 1. **Functional Areas** (Optional)
If your Excel has Functional Area columns:
- Creates new FAs if they don't exist
- Updates existing FAs with SPOC names
- Links FAs to their SPOCs

### 2. **Categories** (Per Business Group)
- Creates categories **for each Business Group**
- Same category name in different BGs = separate categories
- Example: "Hardware" for Tech Delivery + "Hardware" for Finance = 2 categories

### 3. **Subcategories**
- Creates subcategories under their categories
- Links to the correct BG-specific category
- Each subcategory belongs to one category

### 4. **Mappings**
- Creates `ticket_classification_mapping` entries
- Links Business Group + Category + Subcategory
- Enables ticket creation with these combinations

## ⚠️ Important Warnings

### Data Deletion
The import script will **DELETE**:
- ❌ All existing categories
- ❌ All existing subcategories
- ❌ All existing ticket classification mappings

**Existing tickets** are preserved but their `category_id` and `subcategory_id` are set to NULL.

### Backup Recommendation
Before importing, backup your data:

```sql
-- In Neon Console, run these queries and save the results:
SELECT * FROM categories;
SELECT * FROM subcategories;
SELECT * FROM ticket_classification_mapping;
```

Or export as JSON from Admin Dashboard (if available).

## 📋 Column Name Flexibility

The script recognizes various column name formats:

- **Business Group**: `Business Group`, `BusinessGroup`, `Group`, `business_group`, `Target Business Group`
- **Category**: `Category`, `category`, `Cat`
- **Subcategory**: `Subcategory`, `Sub Category`, `SubCategory`, `subcategory`, `sub_category`
- **Description**: `Description`, `description`, `Desc`
- **Functional Area**: `Functional Area`, `FunctionalArea`, `FA`, `functional_area`, `Organization`
- **FA SPOC**: `FA SPOC`, `SPOC`, `FA_SPOC`, `spoc`, `fa_spoc`

## 🎯 Real-World Example

### Your Excel File:

| Business Group | Category | Subcategory | Description | Functional Area | FA SPOC |
|----------------|----------|-------------|-------------|-----------------|---------|
| Tech Delivery | Hardware | Laptop | Laptop issues | IT Support | John Doe |
| Tech Delivery | Hardware | Desktop | Desktop issues | IT Support | John Doe |
| Finance | Hardware | Laptop | Finance laptops | Finance IT | Jane Smith |
| Finance | Accounting | Invoice | Invoice processing | Finance Ops | Jane Smith |

### What Gets Created:

#### Functional Areas:
- IT Support (SPOC: John Doe)
- Finance IT (SPOC: Jane Smith)
- Finance Ops (SPOC: Jane Smith)

#### Categories:
- Hardware (Business Group: Tech Delivery) → ID: 10
- Hardware (Business Group: Finance) → ID: 11
- Accounting (Business Group: Finance) → ID: 12

#### Subcategories:
- Laptop (Category ID: 10 - Tech Delivery Hardware)
- Desktop (Category ID: 10 - Tech Delivery Hardware)
- Laptop (Category ID: 11 - Finance Hardware)
- Invoice (Category ID: 12 - Finance Accounting)

#### Mappings:
- Tech Delivery + Hardware + Laptop
- Tech Delivery + Hardware + Desktop
- Finance + Hardware + Laptop
- Finance + Accounting + Invoice

### Result in UI:

**When creating a ticket**:
- Select "Tech Delivery" → See categories: Hardware
- Select "Finance" → See categories: Hardware, Accounting
- Each BG sees only its own categories!

## 🔧 Troubleshooting

### "Business group not found in database"
**Problem**: Excel has a Business Group name that doesn't exist in your database.

**Solution**: 
1. Check your Business Groups in Admin Dashboard → Master Data
2. Update Excel to match exact names (case-insensitive)
3. Or create the Business Group first in the UI

### "Missing required fields"
**Problem**: Some rows are missing Business Group, Category, or Subcategory.

**Solution**:
1. Check for empty cells in columns A, B, C
2. Fill in missing data
3. Remove or fix incomplete rows

### Script Hangs or Errors
**Problem**: Database connection or data issues.

**Solution**:
1. Check `.env.local` has correct `DATABASE_URL`
2. Verify database is active (not paused) in Neon Console
3. Check for special characters in your data
4. Try with a smaller sample file first

### Categories Not Showing After Import
**Problem**: UI cache not cleared.

**Solution**:
```bash
rm -rf .next
npm run dev
# Then Ctrl + Shift + R in browser
```

## 📊 Verify Import Success

### In Master Data Management:

1. Go to **Master Data Management** → **Categories** tab
2. You should see:
   - Categories with **Business Group** column
   - Each category shows which BG it belongs to
   - Multiple "Hardware" categories (one per BG)

### In Admin Dashboard:

1. Go to **Admin Dashboard** → **FA Mappings** tab
2. You should see:
   - Functional Areas with **SPOC** column
   - SPOCs assigned from your Excel file

### In Ticket Creation:

1. Go to **Create Ticket**
2. Select a **Business Group**
3. Category dropdown should show only categories for that BG
4. Select a **Category**
5. Subcategory dropdown should show subcategories for that category

## 🎨 Sample Excel Templates

### Minimal Template (Required Columns Only):

| Business Group | Category | Subcategory |
|----------------|----------|-------------|
| Tech Delivery | Hardware | Laptop |
| Tech Delivery | Hardware | Desktop |
| Tech Delivery | Software | Email |

### Full Template (All Columns):

| Business Group | Category | Subcategory | Description | Functional Area | FA SPOC |
|----------------|----------|-------------|-------------|-----------------|---------|
| Tech Delivery | Hardware | Laptop | Laptop related issues | IT Support | John Doe |
| Tech Delivery | Hardware | Desktop | Desktop computer issues | IT Support | John Doe |
| Tech Delivery | Software | Email | Email application issues | IT Support | John Doe |

### Download Sample Template:

Create a file named `categories-template.xlsx` with the structure above, or use this CSV format:

```csv
Business Group,Category,Subcategory,Description,Functional Area,FA SPOC
Tech Delivery,Hardware,Laptop,Laptop related issues,IT Support,John Doe
Tech Delivery,Hardware,Desktop,Desktop computer issues,IT Support,John Doe
Tech Delivery,Software,Email,Email application issues,IT Support,John Doe
Finance,Hardware,Laptop,Finance laptop issues,Finance IT,Jane Smith
Finance,Accounting,Invoice,Invoice processing,Finance Ops,Jane Smith
HR,Recruitment,Interview,Interview scheduling,HR Operations,Bob Wilson
HR,Payroll,Salary,Salary inquiries,HR Operations,Bob Wilson
```

Save as `.xlsx` (not `.csv`) for the import script.

## 🚀 Complete Workflow

### Step 1: Prepare Business Groups
Make sure all Business Groups exist in your database:
1. Go to **Master Data Management** → **Business Groups** tab
2. Create any missing Business Groups
3. Note the exact names (will be used in Excel)

### Step 2: Prepare Excel File
1. Create Excel file with required columns
2. Fill in your data (see examples above)
3. Save as `.xlsx` format
4. Place in project root or note the path

### Step 3: Run Migrations
1. Go to Neon Console → SQL Editor
2. Copy SQL from `docs/RUN_MIGRATIONS_MANUALLY.md`
3. Run it
4. Verify success messages

### Step 4: Import Data
```bash
node scripts/import-categories-by-business-group.js your-file.xlsx
```

### Step 5: Clear Cache & Restart
```bash
rm -rf .next
npm run dev
```

### Step 6: Verify in UI
1. **Master Data** → Categories: See Business Group column
2. **Admin Dashboard** → FA Mappings: See SPOC column
3. **Create Ticket**: Categories filter by Business Group

## 💡 Tips & Best Practices

### 1. Start Small
Test with a small Excel file first (5-10 rows) to verify format is correct.

### 2. Organize by Business Group
Group rows by Business Group in Excel for easier review:
```
All Tech Delivery rows
All Finance rows
All HR rows
```

### 3. Consistent Naming
Use consistent category/subcategory names:
- ✅ "Hardware" (not "hardware" or "HARDWARE")
- ✅ "Laptop" (not "laptop" or "Laptops")

### 4. Functional Areas
If you include FA columns:
- Same FA name across rows = one FA (updated with last SPOC)
- Different FA names = multiple FAs created

### 5. Backup Before Import
Since import deletes existing data:
- Export current data first (if you have any)
- Or test with a fresh database

## 🔄 Re-importing / Updating Data

### To Add More Data:
**Problem**: Import deletes existing data!

**Solution**: Include ALL your data in the Excel file (old + new), then import.

### To Update Existing Categories:
**Option 1**: Edit in UI (Master Data → Categories)  
**Option 2**: Re-import with updated Excel file (includes all data)

### To Add Categories to Existing Data:
Currently, the script deletes all existing data. To preserve existing data:
1. Export current data from UI
2. Merge with new data in Excel
3. Re-import the combined file

Or manually add in UI (Master Data → Categories → Add New).

## 📊 What Gets Created

From this Excel row:
```
Business Group: Tech Delivery
Category: Hardware
Subcategory: Laptop
Description: Laptop issues
Functional Area: IT Support
FA SPOC: John Doe
```

The script creates:

1. **Functional Area**: "IT Support" with SPOC "John Doe"
2. **Category**: "Hardware" for Business Group "Tech Delivery"
3. **Subcategory**: "Laptop" under that category
4. **Mapping**: Tech Delivery + Hardware + Laptop (for ticket creation)

## ✅ Verification After Import

### Check Functional Areas:
```sql
SELECT name, spoc_name FROM functional_areas ORDER BY name;
```

### Check Categories:
```sql
SELECT 
  c.name as category,
  bug.name as business_group
FROM categories c
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name, c.name;
```

### Check Subcategories:
```sql
SELECT 
  bug.name as business_group,
  c.name as category,
  s.name as subcategory
FROM subcategories s
JOIN categories c ON s.category_id = c.id
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name, c.name, s.name;
```

### Check Mappings:
```sql
SELECT 
  bug.name as business_group,
  c.name as category,
  s.name as subcategory
FROM ticket_classification_mapping tcm
JOIN business_unit_groups bug ON tcm.target_business_group_id = bug.id
JOIN categories c ON tcm.category_id = c.id
JOIN subcategories s ON tcm.subcategory_id = s.id
ORDER BY bug.name, c.name, s.name;
```

## 🎯 Quick Reference Commands

```bash
# Import from project root
node scripts/import-categories-by-business-group.js categories.xlsx

# Import with full path
node scripts/import-categories-by-business-group.js /home/user/data/categories.xlsx

# Clear cache after import
rm -rf .next

# Restart dev server
npm run dev
```

## 📚 Related Documentation

- **`docs/RUN_MIGRATIONS_MANUALLY.md`** - Run migrations first!
- **`docs/IMPORT_CATEGORIES_GUIDE.md`** - Detailed import guide
- **`docs/CATEGORY_STRUCTURE_EXPLAINED.md`** - How categories work
- **`docs/MIGRATION_036_GUIDE.md`** - Migration details

## 🆘 Common Issues

### Issue 1: "Business group not found"
**Fix**: Create the Business Group in UI first, or fix spelling in Excel

### Issue 2: "Failed to fetch business unit groups"
**Fix**: Run Migration 036 first (adds business_unit_group_id column)

### Issue 3: "Categories not showing in ticket creation"
**Fix**: Clear cache (`rm -rf .next`) and restart dev server

### Issue 4: "SPOC dropdown empty"
**Fix**: Run Migration 035 first (adds spoc_name column)

### Issue 5: "Duplicate key error"
**Fix**: Check for duplicate rows in Excel (same BG + Category + Subcategory)

## ✅ Success Checklist

After import, verify:

- [ ] Functional Areas created with SPOCs (Admin Dashboard → FA Mappings)
- [ ] Categories created per Business Group (Master Data → Categories)
- [ ] Subcategories linked to categories (Master Data → Subcategories)
- [ ] Mappings created (Master Data → Mappings)
- [ ] Ticket creation shows filtered categories (Create Ticket page)
- [ ] Cache cleared and server restarted
- [ ] Browser hard refreshed

## 🎉 You're Done!

Once import completes successfully:
1. ✅ All your categories are loaded per Business Group
2. ✅ All subcategories are linked correctly
3. ✅ Functional Areas have SPOCs assigned
4. ✅ Users can create tickets with BG-specific categories

**Your system is now fully configured!** 🚀

---

**Need help?** Share:
- Your Excel file structure (first few rows)
- Any error messages from the import script
- Output of verification queries
