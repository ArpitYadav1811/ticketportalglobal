# Import TD BM Categories (Simplified)

This guide is for importing categories with your specific Excel format:
- **Category**
- **Sub Category**
- **Input** (Description)
- **Estimated hrs**

## 🎯 Your Excel Format

| Category | Sub Category | Input | Estimated hrs |
|----------|--------------|-------|---------------|
| Hardware | Laptop | Laptop related issues | 2 |
| Hardware | Desktop | Desktop computer issues | 3 |
| Software | Email | Email application issues | 1 |
| Software | VPN | VPN connectivity issues | 2 |
| Network | WiFi | WiFi connectivity | 1.5 |

**Note**: No "Business Group" column needed! You'll select it when running the script.

---

## 🚀 Step-by-Step Process

### **Step 1: Run Migrations First** (One-time setup)

⚠️ **IMPORTANT**: You must run migrations before importing!

1. Go to https://console.neon.tech
2. Select your project → **SQL Editor**
3. Open `docs/RUN_MIGRATIONS_MANUALLY.md` in your IDE
4. Copy the **entire SQL block** (lines 21-173)
5. Paste into Neon SQL Editor
6. Click **Run**
7. ✅ Wait for success messages

---

### **Step 2: Prepare Your Excel File**

Your Excel file should have these columns:

#### **Required Columns:**
- **Category** - Category name (e.g., "Hardware", "Software")
- **Sub Category** - Subcategory name (e.g., "Laptop", "Desktop")

#### **Optional Columns:**
- **Input** - Description of the subcategory
- **Estimated hrs** - Estimated hours for resolution

#### **Example:**

| Category | Sub Category | Input | Estimated hrs |
|----------|--------------|-------|---------------|
| Hardware | Laptop | Laptop issues | 2 |
| Hardware | Desktop | Desktop issues | 3 |
| Hardware | Monitor | Monitor problems | 1 |
| Software | Email | Email app issues | 1 |
| Software | VPN | VPN connectivity | 2 |
| Software | Office Suite | MS Office issues | 1.5 |
| Network | WiFi | WiFi problems | 1 |
| Network | Ethernet | Wired connection | 1 |
| Network | Firewall | Firewall issues | 3 |

Save as `.xlsx` format (not `.csv`).

---

### **Step 3: Run Import Script**

In your terminal:

```bash
node scripts/import-td-bm-categories.js your-file.xlsx
```

**Examples:**
```bash
# If file is in project root
node scripts/import-td-bm-categories.js td-categories.xlsx

# If file is in Downloads
node scripts/import-td-bm-categories.js /home/arpit/Downloads/td-categories.xlsx

# If file is on Windows path (from WSL)
node scripts/import-td-bm-categories.js /mnt/c/Users/User/Downloads/td-categories.xlsx
```

---

### **Step 4: Select Business Group**

The script will show you available Business Groups:

```
📋 Available Business Groups:
  1. Tech Delivery (ID: 1)
  2. Finance (ID: 2)
  3. HR (ID: 3)
  4. Sales (ID: 4)

Select Business Group number (or press Enter for "Tech Delivery"):
```

**Options:**
- Press **Enter** - Defaults to "Tech Delivery"
- Type **1** - Select Tech Delivery
- Type **2** - Select Finance
- Type **3** - Select HR
- etc.

---

### **Step 5: Review & Confirm**

The script shows what will be imported:

```
✅ Selected Business Group: Tech Delivery (ID: 1)

📊 Data Summary:
  Total rows processed: 15
  Skipped rows: 0
  Unique categories: 3
  Business Group: Tech Delivery

📋 Categories to be imported:
  - Hardware (5 subcategories)
  - Software (6 subcategories)
  - Network (4 subcategories)

⚠️  This will ADD categories and subcategories to the selected Business Group.
⚠️  If categories already exist for this BG, they will be updated.

Press Ctrl+C to cancel, or wait 5 seconds to continue...
```

**Actions:**
- **Wait 5 seconds** - Proceed with import
- **Press Ctrl+C** - Cancel import

---

### **Step 6: Import Completes**

```
📥 Inserting categories for Business Group: Tech Delivery

  ✓ Created category: Hardware (ID: 10)
    ✓ Created subcategory: Laptop (ID: 45)
    ✓ Created subcategory: Desktop (ID: 46)
    ✓ Created subcategory: Monitor (ID: 47)

  ✓ Created category: Software (ID: 11)
    ✓ Created subcategory: Email (ID: 48)
    ✓ Created subcategory: VPN (ID: 49)
    ✓ Created subcategory: Office Suite (ID: 50)

  ✓ Created category: Network (ID: 12)
    ✓ Created subcategory: WiFi (ID: 51)
    ✓ Created subcategory: Ethernet (ID: 52)
    ✓ Created subcategory: Firewall (ID: 53)

✅ Import completed successfully!

📊 Summary:
  Business Group: Tech Delivery
  New categories created: 3
  New subcategories created: 9
  New mappings created: 9

🔄 Next steps:
  1. Clear cache: rm -rf .next
  2. Restart server: npm run dev
  3. Hard refresh browser: Ctrl + Shift + R
```

---

### **Step 7: Clear Cache & Restart**

```bash
rm -rf .next
npm run dev
```

Then in browser: **Ctrl + Shift + R**

---

## ✅ Verify Import Success

### **In Master Data Management:**

1. Go to **Master Data Management** → **Categories** tab
2. You should see:
   - Your categories with **Business Group** = "Tech Delivery" (or selected BG)
   - Each category shows which BG it belongs to

### **In Ticket Creation:**

1. Go to **Create Ticket**
2. Select **Business Group** = "Tech Delivery"
3. **Category dropdown** shows your imported categories
4. Select a **Category**
5. **Subcategory dropdown** shows subcategories for that category

---

## 🔄 Import Multiple Business Groups

If you have separate Excel files for different Business Groups:

```bash
# Import TD BM categories
node scripts/import-td-bm-categories.js td-categories.xlsx
# Select: 1 (Tech Delivery)

# Import Finance categories
node scripts/import-td-bm-categories.js finance-categories.xlsx
# Select: 2 (Finance)

# Import HR categories
node scripts/import-td-bm-categories.js hr-categories.xlsx
# Select: 3 (HR)
```

Each import **adds** to the selected Business Group without affecting other BGs!

---

## 💡 Key Features

### ✅ **Non-Destructive Import**
- Adds categories to selected Business Group
- Doesn't delete existing categories from other BGs
- Updates existing categories if they already exist for the selected BG

### ✅ **Flexible Column Names**
The script recognizes:
- **Category**: `Category`, `category`, `CATEGORY`
- **Sub Category**: `Sub Category`, `SubCategory`, `Subcategory`, `sub_category`
- **Input**: `Input`, `Description`, `input`, `description`, `Desc`
- **Estimated hrs**: `Estimated hrs`, `Estimated Hrs`, `EstimatedHrs`, `estimated_hrs`

### ✅ **Estimated Hours Handling**
If you include "Estimated hrs" column:
- It gets appended to the description
- Format: "Description | Est. 2 hrs"
- Visible in subcategory description

---

## 🔧 Troubleshooting

### **"Cannot find module 'xlsx'"**
Install the required package:
```bash
npm install xlsx
```

### **"No business groups found in database"**
Create Business Groups first:
1. Go to **Master Data Management** → **Business Groups** tab
2. Add "Tech Delivery" (or your BG name)
3. Then run import again

### **"Column 'business_unit_group_id' does not exist"**
Run migrations first (Step 1 above)!

### **"Categories not showing in UI"**
Clear cache and restart:
```bash
rm -rf .next
npm run dev
# Then Ctrl + Shift + R in browser
```

### **"Duplicate subcategory"**
If you see errors about duplicates:
- The subcategory already exists for that category
- The script will skip it (safe to ignore)
- Or it's a duplicate row in your Excel (remove it)

---

## 📊 What Gets Created

From this Excel row:
```
Category: Hardware
Sub Category: Laptop
Input: Laptop related issues
Estimated hrs: 2
```

When imported for "Tech Delivery", creates:

1. **Category**: "Hardware" (Business Group: Tech Delivery)
2. **Subcategory**: "Laptop" (under Hardware category)
   - Description: "Laptop related issues | Est. 2 hrs"
3. **Mapping**: Tech Delivery + Hardware + Laptop

---

## 🎯 Quick Reference

```bash
# Import your file
node scripts/import-td-bm-categories.js td-categories.xlsx

# Select Business Group when prompted (or press Enter for Tech Delivery)

# Wait 5 seconds or Ctrl+C to cancel

# After import completes:
rm -rf .next
npm run dev
```

---

## ✅ Success Checklist

After import:

- [ ] Script shows "✅ Import completed successfully!"
- [ ] Summary shows categories/subcategories created
- [ ] Cache cleared (`rm -rf .next`)
- [ ] Server restarted (`npm run dev`)
- [ ] Browser hard refreshed (Ctrl + Shift + R)
- [ ] Master Data → Categories shows your categories with correct BG
- [ ] Create Ticket → Categories filter by selected BG

---

## 📚 Related Documentation

- **`QUICK_START_GUIDE.md`** - Complete setup guide
- **`docs/RUN_MIGRATIONS_MANUALLY.md`** - SQL migrations to run first
- **`docs/HOW_TO_LOAD_CATEGORIES.md`** - Detailed loading guide
- **`docs/CATEGORY_STRUCTURE_EXPLAINED.md`** - How categories work

---

## 🎉 Ready to Import!

You have everything you need:

1. ✅ Your Excel file with TD BM categories
2. ✅ Import script ready: `scripts/import-td-bm-categories.js`
3. ✅ Documentation: `docs/IMPORT_TD_BM_CATEGORIES.md`

**Next**: Run migrations in Neon Console, then import your Excel file! 🚀

---

**Need help?** Share:
- Your Excel file name/path
- First few rows of your Excel data
- Any error messages you see
