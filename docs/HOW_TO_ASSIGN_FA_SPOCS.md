# How to Assign SPOCs to Functional Areas

This guide shows you exactly where and how to assign SPOCs (Single Point of Contact) to Functional Areas.

## 📍 Location: Admin Dashboard → FA Mappings Tab

### Step-by-Step Instructions

#### 1. Navigate to Admin Dashboard
- Log in as **Super Admin**
- Go to **Admin Dashboard** (from the sidebar)

#### 2. Go to FA Mappings Tab
- Click on the **"FA Mappings"** tab (it has a 🔗 Link icon and a 🔒 Lock icon)
- This tab is **only visible to Super Admin**

#### 3. Find the Functional Areas Section
You'll see a table with these columns:
- **Name** - The functional area name
- **Description** - What the FA is for
- **SPOC** - The person responsible (this is what you'll assign!)
- **Mappings** - How many business groups are mapped
- **Actions** - Edit and Delete buttons

#### 4. Assign a SPOC

**Option A: Edit Existing Functional Area**
1. Click the **Edit** button (✏️ pencil icon) next to any functional area
2. A dialog will open with three fields:
   - **Name** (required)
   - **Description** (optional)
   - **SPOC** (dropdown) ← Select the SPOC from the dropdown!
3. Select a user from the **SPOC dropdown** (shows all users with their emails)
4. Click **Update**
5. ✅ The SPOC will now appear in the table!

**Option B: Create New Functional Area with SPOC**
1. Click the **"Add FA"** button (top right of Functional Areas section)
2. Fill in:
   - **Name** (required) - e.g., "IT Support"
   - **Description** (optional) - e.g., "Technology support services"
   - **SPOC** (dropdown) - Select from available users
3. Click **Create**
4. ✅ Your new FA with SPOC is created!

## 📋 Example Workflow

### Scenario: Assign "John Doe" as SPOC for "IT Support" FA

1. Go to **Admin Dashboard** → **FA Mappings** tab
2. Find "IT Support" in the Functional Areas table
3. Click the **Edit** button (✏️)
4. In the dialog:
   - Name: `IT Support` (already filled)
   - Description: `Technology support and infrastructure` (already filled)
   - **SPOC**: Select `John Doe (john.doe@example.com)` from dropdown ← **SELECT THIS**
5. Click **Update**
6. ✅ Done! The table now shows "John Doe" in the SPOC column

## 🎯 What You Can Do

### View SPOCs
- The **SPOC column** in the Functional Areas table shows who's responsible
- Empty cells show "—" (no SPOC assigned yet)

### Edit SPOCs
- Click **Edit** on any functional area
- Update the SPOC field
- Click **Update** to save

### Remove SPOCs
- Click **Edit** on the functional area
- Clear the SPOC field (delete the name)
- Click **Update**
- The SPOC will be removed

### Export with SPOCs
- Click **"Export JSON"** button (top of Functional Areas section)
- Downloads a JSON file with all FAs including their SPOCs

## 💡 Tips

### SPOC Selection from Dropdown
- SPOCs are selected from existing users in the system
- Dropdown format: `Full Name (email@example.com)`
- Only users with full names are shown
- Sorted alphabetically for easy finding
- Select "-- Select SPOC --" to clear the SPOC

### When to Assign SPOCs
- **New FA**: Assign SPOC when creating the functional area
- **Existing FA**: Edit anytime to add/update SPOC
- **Bulk Import**: Include SPOC in your Excel file (see Import Guide)

### Best Practices
1. **Assign SPOCs early** - Makes it clear who owns each FA
2. **Keep names updated** - Update if SPOC changes roles
3. **Use consistent naming** - "First Last" format recommended
4. **Document in description** - Add contact info in description if needed

## 🔄 Import SPOCs from Excel

If you have many Functional Areas, you can import them with SPOCs from Excel:

### Excel Format:
| Business Group | Category | Subcategory | Description | Functional Area | FA SPOC |
|----------------|----------|-------------|-------------|-----------------|---------|
| Tech Delivery | Hardware | Laptop | Laptop issues | IT Support | John Doe |
| Finance | Accounting | Invoice | Invoice processing | Finance Ops | Jane Smith |

### Import Command:
```bash
node scripts/import-categories-by-business-group.js your-file.xlsx
```

The script will:
- ✅ Create Functional Areas if they don't exist
- ✅ Assign SPOCs from the "FA SPOC" column
- ✅ Update existing FAs with new SPOC names

See `docs/IMPORT_CATEGORIES_GUIDE.md` for full details.

## 📊 Where SPOCs Appear

Once assigned, SPOCs appear in:
1. **Admin Dashboard** → FA Mappings tab → Functional Areas table
2. **JSON Export** - Downloaded file includes `spoc_name` field
3. **Database** - Stored in `functional_areas.spoc_name` column

## ❓ FAQ

### Q: Do SPOCs need to be existing users?
**A:** No! SPOCs are just text names. They can be anyone (users, external contacts, etc.)

### Q: Can I assign multiple SPOCs?
**A:** Each Functional Area has ONE SPOC (Single Point of Contact). For multiple contacts, use the description field.

### Q: What if I don't assign a SPOC?
**A:** That's fine! SPOC is optional. The field will show "—" in the table.

### Q: Can I change a SPOC later?
**A:** Yes! Just click Edit and update the SPOC field anytime.

### Q: Where else can I manage FAs?
**A:** Currently, FA management is only in Admin Dashboard → FA Mappings tab (Super Admin only).

## 🚀 Quick Reference

| Action | Location | Steps |
|--------|----------|-------|
| **View SPOCs** | Admin Dashboard → FA Mappings | See SPOC column in table |
| **Add SPOC** | Click Edit on FA | Enter name in SPOC field |
| **Update SPOC** | Click Edit on FA | Change name in SPOC field |
| **Remove SPOC** | Click Edit on FA | Clear SPOC field |
| **Export SPOCs** | Click Export JSON | Downloads with SPOC data |
| **Import SPOCs** | Run import script | Include FA SPOC column in Excel |

---

**Need help?** Check `docs/FUNCTIONAL_AREA_SPOCS.md` for technical details or `docs/IMPORT_CATEGORIES_GUIDE.md` for bulk import instructions.
