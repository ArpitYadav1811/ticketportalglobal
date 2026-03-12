# Functional Area SPOCs Implementation

This document explains how to add SPOC (Single Point of Contact) support to Functional Areas.

## Overview

Functional Areas now support a SPOC (Single Point of Contact). This allows each Functional Area to have a designated contact for coordination and management.

## Database Changes

### New Column Added to `functional_areas` Table:
- `spoc_name` (VARCHAR(255), nullable)

### Migration Files Created:
1. **`scripts/035-add-functional-area-spocs.sql`** - SQL migration script
2. **`scripts/run-035-functional-area-spocs.js`** - Node.js runner script

## Running the Migration

### Step 1: Run the Migration Script

```bash
node scripts/run-035-functional-area-spocs.js
```

This will:
- Add `spoc_name` column to `functional_areas`
- Create index for better performance
- Add documentation comments
- Show verification results

### Step 2: Verify the Migration

The script will output:
```
✅ SUCCESS: SPOC column added to functional_areas table
   - spoc_name (VARCHAR(255), nullable)
```

## Backend Updates

### Updated Functions in `lib/actions/admin.ts`:

#### 1. `getFunctionalAreas()`
Now returns SPOC information:
```typescript
{
  id: number,
  name: string,
  description: string,
  spoc_name: string | null,
  created_at: Date,
  updated_at: Date
}
```

#### 2. `createFunctionalArea()`
Updated signature:
```typescript
createFunctionalArea(
  name: string,
  description?: string,
  spocName?: string
)
```

#### 3. `updateFunctionalArea()`
Updated signature:
```typescript
updateFunctionalArea(
  id: number,
  name: string,
  description?: string,
  spocName?: string
)
```

## Frontend Updates Needed

### Admin Dashboard (`app/admin/page.tsx`)

#### 1. Update Functional Areas Table

The table now shows:
- Name
- Description
- **SPOC** (new)
- Mappings count
- Actions

#### 2. Update FA Form State

```typescript
const [faForm, setFaForm] = useState({ 
  name: "", 
  description: "",
  spocName: ""    // NEW
})
```

#### 3. Add SPOC Field to Add/Edit FA Modal

Add this field to the FA creation/edit form:

```tsx
<div>
  <label className="block text-sm font-medium mb-1">
    SPOC
  </label>
  <input
    type="text"
    value={faForm.spocName}
    onChange={(e) => setFaForm({ ...faForm, spocName: e.target.value })}
    placeholder="Enter SPOC name"
    className="w-full px-3 py-2 border rounded-lg text-sm"
  />
</div>
```

#### 4. Update Form Submission

Update the create/update handlers to pass SPOC value:

```typescript
// For create
const result = await createFunctionalArea(
  faForm.name,
  faForm.description,
  faForm.spocName
)

// For update
const result = await updateFunctionalArea(
  editFA.id,
  faForm.name,
  faForm.description,
  faForm.spocName
)
```

#### 5. Update Edit Button Click Handler

```typescript
onClick={() => { 
  setEditFA(fa); 
  setFaForm({ 
    name: fa.name, 
    description: fa.description || "",
    spocName: fa.spoc_name || ""
  }); 
  setShowAddFA(true) 
}}
```

## Usage

### Assigning SPOCs to Functional Areas

1. Go to **Admin Dashboard** → **FA Mappings** tab
2. In the Functional Areas table, click **Edit** on any functional area
3. Enter the SPOC name (the single point of contact)
4. Click **Save**

### SPOC Name Format

- Use full names as they appear in the users table
- Example: "John Doe", "Jane Smith"
- Names are case-insensitive when matching
- SPOCs don't need to be existing users (flexible for external contacts)

## Benefits

1. **Clear Ownership**: Each Functional Area has a designated contact
2. **Better Coordination**: Easy to identify who manages each Functional Area
3. **Simplified Management**: Single point of contact for each Functional Area
4. **Flexible Assignment**: SPOC can be any name, not limited to existing users

## Export Functionality

The JSON export for Functional Areas now includes SPOC information:

```json
[
  {
    "id": 1,
    "name": "Tech Delivery",
    "description": "Technology delivery and development",
    "spoc_name": "John Doe",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "mappings": [...]
  }
]
```

## Future Enhancements

Potential improvements:
1. **User Dropdown**: Link SPOCs to actual user accounts with dropdown selection
2. **SPOC Notifications**: Send notifications to Functional Area SPOCs
3. **SPOC Dashboard**: Special view for SPOCs to see their Functional Areas
4. **Access Control**: Grant special permissions to Functional Area SPOCs

## Troubleshooting

### Migration Fails
- Check database connection in `.env.local`
- Ensure `DATABASE_URL` or `POSTGRES_URL` is set
- Verify you have write permissions on the database

### Columns Not Showing in UI
- Clear browser cache
- Restart the development server
- Check that frontend code is updated with new fields

### SPOC Names Not Saving
- Verify backend functions are updated with new parameters
- Check browser console for API errors
- Ensure form state includes SPOC fields

## Summary

✅ Database migration adds SPOC column to `functional_areas`  
✅ Backend functions updated to handle SPOC data  
✅ Frontend table displays SPOC information  
✅ Form updated to allow SPOC input  
✅ Export includes SPOC data  

The Functional Area SPOC feature is now ready to use! Each Functional Area can have one designated SPOC for streamlined management.
