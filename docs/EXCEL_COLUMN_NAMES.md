# Excel Import Column Names Guide

This document lists the **exact column names** you should use in your Excel file for importing categories and subcategories.

## 📋 Required Columns

### 1. **Category** (Required)
**Exact Column Name (Recommended):**
- `Category`

**Also Accepted:**
- `category`
- `Cat`
- `cat`

**Description:** The category name (e.g., "Hardware", "Software", "Network")

---

### 2. **Sub Category** (Required)
**Exact Column Name (Recommended):**
- `Sub Category` (with space)

**Also Accepted:**
- `Subcategory`
- `SubCategory`
- `subcategory`
- `sub-category`
- `subcat`
- `Sub Cat`

**Description:** The subcategory name (e.g., "Laptop", "Desktop", "Email")

---

## 📋 Optional Columns

### 3. **Input (Description)** (Recommended - for ticket auto-fill)
**Exact Column Name (Recommended):**
- `Input (Description)` (with parentheses)

**Also Accepted:**
- `Input`
- `Input Template`
- `input_template`
- `Template`
- `Ticket Description`
- `Ticket Template`

**Description:** This text will be auto-filled in the ticket description field when creating a ticket. This is what users see when they select this subcategory.

**Example:** "Please provide details about the laptop issue including model, symptoms, and when it started."

**⚠️ Important:** The "Input (Description)" column serves as both the input template (for ticket auto-fill) and the subcategory description. If you use a different column name, the system will use it for input_template only.

---

### 4. **Description** (Optional - for subcategory metadata)
**Accepted Column Names:**
- `Description`
- `description`
- `Desc`
- `desc`
- `Subcategory Description`

**Description:** General description/metadata about the subcategory. This is stored separately from the Input Template.

**Note:** If "Input (Description)" is provided, it will be used for both input_template and description. If you have a separate "Description" column, it will be used as additional metadata.

---

### 5. **Estimated hrs** (Optional)
**Exact Column Name (Recommended):**
- `Estimated hrs` (lowercase "hrs", with space)

**Also Accepted:**
- `Estimated Hrs`
- `Estimated Time`
- `estimated_time`
- `estimated_hrs`
- `EstimatedTime`
- `Est Time`
- `Est. Time`
- `estimated time`
- `estimated hrs`

**Description:** Estimated time in hours (e.g., "2", "4.5", "8"). This will be converted to minutes and stored in the classification mapping.

**Example Values:**
- `2` = 2 hours
- `4.5` = 4.5 hours
- `8` = 8 hours

---

## 📊 Example Excel File

### Standard Format (Recommended)
| Category | Sub Category | Input (Description) | Estimated hrs |
|----------|-------------|---------------------|---------------|
| Hardware | Laptop | Please provide details about the laptop issue including model, symptoms, and when it started. | 2 |
| Hardware | Desktop | Please provide details about the desktop computer issue. | 1.5 |
| Software | Email | Please describe the email issue you are experiencing. | 1 |
| Software | VPN | Please provide details about VPN connectivity issues. | 2 |
| Network | WiFi | Please describe your WiFi connectivity problem. | 1.5 |

### Alternative Format (with separate Description)
| Category | Sub Category | Input (Description) | Description | Estimated hrs |
|----------|-------------|---------------------|-------------|---------------|
| Hardware | Laptop | Please provide details about the laptop issue... | Laptop related issues | 2 |
| Hardware | Desktop | Please provide details about the desktop... | Desktop computer issues | 1.5 |

---

## 🔍 Column Detection Logic

The import system uses **flexible matching** (case-insensitive):

1. **First**, it tries to match column names exactly (case-insensitive)
2. **Then**, it tries to match with trimmed whitespace
3. **Finally**, if columns are not found by name, it uses position-based fallback:
   - Column 1 = Category
   - Column 2 = Subcategory
   - Column 3 = Input Template / Description
   - Column 4 = Estimated Time

---

## ⚠️ Common Issues and Solutions

### Issue 1: Description not auto-filling in tickets
**Problem:** The "Input Template" column is missing or has a different name.

**Solution:** 
- Use column name `Input` or `Input Template`
- Or use `Description` column (will be used for both description and input_template)

### Issue 2: Estimated time not being saved
**Problem:** Column name doesn't match expected names.

**Solution:**
- Use `Estimated Time` or `Estimated Hrs`
- Make sure the value is a number (e.g., "2" not "2 hours")

### Issue 3: Categories/Subcategories not importing
**Problem:** Column names don't match or are misspelled.

**Solution:**
- Use exact column names: `Category` and `Subcategory` (or `Sub Category`)
- Check for extra spaces or special characters

---

## 📝 Best Practices

1. **Use the exact column names** listed above for best compatibility
2. **Always include "Input Template"** column for proper ticket auto-fill
3. **Use "Estimated Time"** in hours (numbers only, e.g., "2", "4.5")
4. **Keep column names in the first row** of your Excel file
5. **Remove empty rows** before importing

---

## 🔄 What Gets Updated

When you import:

1. **Categories** - Created/updated for the selected Business Group
2. **Subcategories** - Created/updated with:
   - `name` - from Subcategory column
   - `description` - from Description column (or Input Template if Description not provided)
   - `input_template` - from Input Template column (or Description if Input Template not provided)
3. **Classification Mappings** - Created/updated with:
   - `estimated_duration` - from Estimated Time column (converted to minutes)

---

## ✅ Quick Reference

| Purpose | Exact Column Name | Required |
|---------|------------------|----------|
| Category name | `Category` | ✅ Yes |
| Subcategory name | `Sub Category` (with space) | ✅ Yes |
| Ticket auto-fill text | `Input (Description)` (with parentheses) | ⚠️ Recommended |
| Subcategory metadata | `Description` | ❌ No |
| Estimated hours | `Estimated hrs` (lowercase) | ❌ No |

## 🎯 Exact Column Names (As You Will Use)

Use these **exact** column names in your Excel file:

1. **Category**
2. **Sub Category** (with space between "Sub" and "Category")
3. **Input (Description)** (with parentheses around "Description")
4. **Estimated hrs** (lowercase "hrs", with space)

These exact names are now fully supported and will work perfectly with the import system.

---

**Last Updated:** 2024-01-XX
