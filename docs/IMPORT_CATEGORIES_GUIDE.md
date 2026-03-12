# Import Categories and Subcategories Guide

This guide explains how to import categories and subcategories for each business group from an Excel file.

## Excel File Format

### Option 1: Business Group First
```
| Business Group | Category    | Subcategory        | Description (Optional) | Functional Area | FA SPOC    |
|---------------|-------------|-------------------|------------------------|-----------------|------------|
| TD Apps       | Development | Bug Fix           | Fix application bugs   | IT Support      | John Doe   |
| TD Apps       | Development | New Feature       | Add new functionality  | IT Support      | John Doe   |
| TD Central    | Support     | User Training     | Train users            | IT Operations   | Jane Smith |
| TD Central    | Support     | Technical Support | Provide tech support   | IT Operations   | Jane Smith |
```

### Option 2: Category First
```
| Category    | Subcategory        | Business Group | Description (Optional) | Functional Area | FA SPOC    |
|-------------|-------------------|---------------|------------------------|-----------------|------------|
| Development | Bug Fix           | TD Apps       | Fix application bugs   | IT Support      | John Doe   |
| Development | New Feature       | TD Apps       | Add new functionality  | IT Support      | John Doe   |
| Support     | User Training     | TD Central    | Train users            | IT Operations   | Jane Smith |
| Support     | Technical Support | TD Central    | Provide tech support   | IT Operations   | Jane Smith |
```

## Column Names (Flexible)

The script recognizes various column name formats:

- **Business Group**: `Business Group`, `BusinessGroup`, `Group`, `business_group`, `Target Business Group`
- **Category**: `Category`, `category`, `Cat`
- **Subcategory**: `Subcategory`, `Sub Category`, `SubCategory`, `subcategory`, `sub_category`
- **Description**: `Description`, `description`, `Desc`
- **Functional Area**: `Functional Area`, `FunctionalArea`, `FA`, `functional_area`, `Organization`
- **FA SPOC**: `FA SPOC`, `SPOC`, `FA_SPOC`, `spoc`, `fa_spoc` (optional)

## Prerequisites

1. **Business Groups Must Exist**: All business groups mentioned in the Excel file must already exist in the database
2. **Excel File**: Prepare your Excel file (.xlsx format)
3. **Environment Variables**: Ensure `.env.local` has `DATABASE_URL` or `POSTGRES_URL`

## Steps to Import

### 1. Prepare Your Excel File

Save your Excel file in the project root or note its path. For example:
- `categories-data.xlsx` (in project root)
- `./data/categories.xlsx`
- `/path/to/your/file.xlsx`

### 2. Run the Import Script

```bash
# If file is in project root named 'categories-data.xlsx'
node scripts/import-categories-by-business-group.js

# Or specify the file path
node scripts/import-categories-by-business-group.js ./data/my-categories.xlsx

# Or with full path
node scripts/import-categories-by-business-group.js /home/user/downloads/categories.xlsx
```

### 3. Review the Output

The script will:
1. Show the first row to help identify columns
2. List all business groups found in the database
3. Show a summary of data to be imported
4. **Wait 5 seconds** before proceeding (giving you time to cancel with Ctrl+C)
5. Clear existing categories, subcategories, and mappings
6. Import new data
7. Show verification results

## What the Script Does

### ⚠️ WARNING
The script will **DELETE ALL** existing:
- Categories
- Subcategories
- Ticket classification mappings

It will also set `category_id` and `subcategory_id` to NULL in existing tickets.

### Import Process

1. **Reads Excel file** and parses data
2. **Validates business groups** against database
3. **Creates/Updates Functional Areas** with SPOCs (if provided)
4. **Clears existing data** (categories, subcategories, mappings)
5. **Inserts categories** (unique across all business groups)
6. **Inserts subcategories** (linked to categories)
7. **Creates mappings** (links business groups to category/subcategory pairs)

## Example Output

```
📄 Reading Excel file: categories-data.xlsx
✓ Found 150 rows of data in sheet: Sheet1

📋 First row columns: Business Group, Category, Subcategory, Description

✓ Found 5 business groups in database:
  - TD Apps (ID: 1)
  - TD Central (ID: 2)
  - TD Brand (ID: 3)
  - CS & Brand (ID: 4)
  - Others (ID: 5)

📊 Data Summary:
  Total rows processed: 150
  Skipped rows: 0
  Unique categories: 12
  Unique subcategories: 45
  Business groups with data: 5

⚠️  WARNING: This will DELETE all existing categories, subcategories, and mappings!
Press Ctrl+C to cancel, or wait 5 seconds to continue...

🗑️  Clearing existing data...
✓ Cleared existing data

📥 Inserting categories...
  ✓ Development (ID: 1)
  ✓ Support (ID: 2)
  ✓ Maintenance (ID: 3)
  ...

📥 Inserting subcategories...
  ✓ Inserted 45 subcategories

📥 Creating ticket classification mappings...
  Processing: TD Apps...
    ✓ Created 15 category mappings
  Processing: TD Central...
    ✓ Created 12 category mappings
  ...
  ✓ Total: 150 classification mappings created

✅ Transaction committed successfully

📊 Final Database State:
  Categories: 12
  Subcategories: 45
  Classification Mappings: 150

📋 Sample Mappings by Business Group:
  TD Apps → Development → Bug Fix
  TD Apps → Development → New Feature
  TD Central → Support → User Training
  ...

✅ Import completed successfully!
```

## Troubleshooting

### "Business group not found in database"
- Ensure the business group name in Excel exactly matches the name in the database
- Check for extra spaces or different capitalization
- Create the business group first in the Admin Dashboard

### "Excel file not found"
- Check the file path is correct
- Use absolute path if relative path doesn't work
- Ensure the file has `.xlsx` extension

### "Missing required fields"
- Ensure all rows have Business Group, Category, and Subcategory
- Check column names match the expected formats
- Remove empty rows from Excel

### Transaction Errors
- If the script fails mid-import, all changes are rolled back
- Fix the issue and run the script again
- Check database connection and permissions

## After Import

1. **Verify in Admin Dashboard**: Go to Master Data Management to see imported categories
2. **Test Ticket Creation**: Create a ticket and verify categories/subcategories appear correctly
3. **Check Mappings**: Ensure each business group has the correct categories assigned

## Tips

- **Backup First**: Export existing data before importing (if needed)
- **Test with Small Dataset**: Try with a few rows first to verify format
- **Use Consistent Names**: Keep business group names consistent with database
- **Add Descriptions**: Optional but helpful for users creating tickets
