# Troubleshooting: SPOC Field Not Showing in FA Edit Dialog

## Problem
When editing a Functional Area, only **Name** and **Description** fields appear. The **SPOC** field is missing.

## Root Cause
The browser has cached the old version of the page before the SPOC field was added.

## ✅ Solution: Clear Cache and Restart

### Step 1: Stop the Dev Server
Press `Ctrl+C` in your terminal where Next.js is running

### Step 2: Clear Next.js Cache
```bash
rm -rf .next
```

### Step 3: Restart the Dev Server
```bash
npm run dev
```

### Step 4: Hard Refresh Browser
- **Windows/Linux**: Press `Ctrl + Shift + R`
- **Mac**: Press `Cmd + Shift + R`
- Or open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### Step 5: Verify
1. Go to Admin Dashboard → FA Mappings tab
2. Click **Edit** on any Functional Area
3. You should now see **3 fields**:
   - Name *
   - Description
   - **SPOC (Single Point of Contact)** ← This should now appear!

## Alternative: Force Browser Cache Clear

If hard refresh doesn't work:

### Chrome/Edge
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. Click **Clear storage** (left sidebar)
4. Check "Cache storage" and "Cached images and files"
5. Click **Clear site data**
6. Close DevTools and refresh

### Firefox
1. Press `Ctrl + Shift + Delete`
2. Select "Cache" only
3. Click "Clear Now"
4. Refresh the page

## Verification Checklist

After clearing cache, verify these are working:

✅ **FA Table Shows SPOC Column**
- Go to FA Mappings tab
- Table should have: Name | Description | **SPOC** | Mappings | Actions

✅ **Edit Dialog Has SPOC Field**
- Click Edit on any FA
- Dialog should show 3 fields (Name, Description, SPOC)

✅ **SPOC Can Be Saved**
- Enter a SPOC name
- Click Update
- SPOC should appear in the table

## Still Not Working?

### Check 1: Verify File Was Saved
```bash
# Check if the file has the SPOC field
grep -A 5 "SPOC (Single Point of Contact)" app/admin/page.tsx
```

Should return:
```
<label className="block text-sm font-medium mb-1">SPOC (Single Point of Contact)</label>
<input 
  type="text" 
  value={faForm.spocName} 
  ...
```

### Check 2: Check Browser Console
1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Look for any errors (red text)
4. Share any errors you see

### Check 3: Check Network Tab
1. Press `F12` → **Network** tab
2. Click Edit on an FA
3. Check if the request is going through
4. Look at the response data

### Check 4: Verify Backend is Updated
The backend functions should accept the SPOC parameter. Check:
```bash
grep -A 3 "createFunctionalArea" lib/actions/admin.ts | head -10
```

Should show:
```typescript
export async function createFunctionalArea(
  name: string, 
  description?: string,
  spocName?: string
)
```

## Quick Fix Commands

Run these in order:

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Clear Next.js cache
rm -rf .next

# 3. Clear node modules cache (if needed)
rm -rf node_modules/.cache

# 4. Restart dev server
npm run dev
```

Then hard refresh your browser (`Ctrl + Shift + R`).

## Expected Behavior

### Before Migration:
- ❌ SPOC field won't save (column doesn't exist in database)
- ✅ SPOC field should still appear in the form

### After Migration:
- ✅ SPOC field appears in form
- ✅ SPOC can be saved
- ✅ SPOC appears in table
- ✅ SPOC is included in exports

## Need More Help?

If the SPOC field still doesn't appear after:
1. Clearing cache
2. Restarting dev server
3. Hard refreshing browser

Then share:
- Screenshot of the Edit FA dialog
- Browser console errors (F12 → Console)
- Output of: `grep "spocName" app/admin/page.tsx | wc -l` (should be > 5)
