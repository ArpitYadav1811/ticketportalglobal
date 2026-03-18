# Secondary SPOC Permissions Documentation

## Overview

The system supports **Primary SPOC** and **Secondary SPOC** roles for each Business Group. Both have identical permissions **except** Secondary SPOC cannot update the Primary SPOC field.

---

## SPOC Types

### 1. **Primary SPOC**
- Main point of contact for the business group
- Stored in `business_unit_groups.spoc_name` (or `primary_spoc_name`)
- Has **full permissions** for their group's tickets
- Can update both Primary and Secondary SPOC assignments

### 2. **Secondary SPOC**
- Backup/support SPOC for the business group
- Stored in `business_unit_groups.secondary_spoc_name`
- Has **same permissions as Primary SPOC** with one exception:
  - ❌ **Cannot update Primary SPOC** field
  - ✅ Can update Secondary SPOC field (themselves)

---

## Permission Matrix

| Permission | Primary SPOC | Secondary SPOC | Notes |
|------------|--------------|----------------|-------|
| **Ticket Viewing** | ✅ | ✅ | View all tickets for their group(s) |
| **Ticket Assignment** | ✅ | ✅ | Assign tickets to group members |
| **Ticket Reassignment** | ✅ | ✅ | Reassign tickets within group |
| **Change Status** | ✅ | ✅ | Change to on-hold, resolved |
| **Add Comments** | ✅ | ✅ | Add comments to tickets |
| **Upload Attachments** | ✅ | ✅ | Upload files to tickets |
| **Redirect Tickets** | ✅ | ✅ | Redirect tickets to other groups |
| **Edit Ticket Category** | ✅ | ✅ | Change ticket category |
| **Edit Ticket Project** | ✅ | ✅ | Change ticket project |
| **Update Primary SPOC** | ✅ | ❌ | **Only Primary SPOC can change Primary SPOC** |
| **Update Secondary SPOC** | ✅ | ✅ | Both can update Secondary SPOC |
| **View Analytics** | ✅ | ✅ | Same analytics view for their group(s) |
| **Export Data** | ❌ | ❌ | Neither can export (Manager role limitation) |

---

## Database Schema

### Business Unit Groups Table:
```sql
business_unit_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  spoc_name VARCHAR(255),           -- Primary SPOC (source of truth)
  primary_spoc_name VARCHAR(255),   -- Alias for spoc_name
  secondary_spoc_name VARCHAR(255)  -- Secondary SPOC
)
```

### Tickets Table:
```sql
tickets (
  id SERIAL PRIMARY KEY,
  spoc_user_id INTEGER,  -- Currently only stores Primary SPOC
  -- Note: No secondary_spoc_user_id field yet
  ...
)
```

---

## Permission Implementation

### Current Implementation:

**Manager Role Permissions** (applies to both Primary and Secondary SPOC):
```javascript
{
  "tickets.view_scope": "own_group",
  "tickets.assign_tickets": true,
  "tickets.assign_to_own_group": true,
  "tickets.reassign_tickets": true,
  "tickets.redirect_tickets": true,
  "tickets.redirect_to_own_group": true,
  "tickets.change_status": ["on-hold", "resolved"],
  "tickets.change_to_on_hold": true,
  "tickets.change_to_resolved": true,
  "tickets.add_comments": true,
  "tickets.edit_comments": true,
  "tickets.upload_attachments": true,
  "tickets.delete_attachments": true,
  "tickets.create_tickets": true,
  "analytics.view_scope": "combined",
  "analytics.view_own_group": true,
  "analytics.view_spoc_groups": true,
  ...
}
```

---

## Permission Checks Required

### 1. **Check if User is Primary SPOC**

```typescript
export async function isUserPrimarySpoc(userId: number, businessGroupId: number): Promise<boolean> {
  const user = await sql`SELECT full_name FROM users WHERE id = ${userId}`
  if (user.length === 0) return false
  
  const userName = user[0].full_name
  const bg = await sql`
    SELECT spoc_name, primary_spoc_name
    FROM business_unit_groups
    WHERE id = ${businessGroupId}
  `
  if (bg.length === 0) return false
  
  const primarySpocName = bg[0].primary_spoc_name || bg[0].spoc_name
  return userName.trim().toLowerCase() === primarySpocName.trim().toLowerCase()
}
```

### 2. **Check if User is Secondary SPOC** (NEW)

```typescript
export async function isUserSecondarySpoc(userId: number, businessGroupId: number): Promise<boolean> {
  try {
    const user = await sql`SELECT full_name FROM users WHERE id = ${userId}`
    if (user.length === 0) return false
    
    const userName = user[0].full_name
    const bg = await sql`
      SELECT secondary_spoc_name
      FROM business_unit_groups
      WHERE id = ${businessGroupId}
    `
    if (bg.length === 0) return false
    
    const secondarySpocName = bg[0].secondary_spoc_name
    if (!secondarySpocName) return false
    
    return userName.trim().toLowerCase() === secondarySpocName.trim().toLowerCase()
  } catch (error) {
    console.error("Error checking if user is Secondary SPOC:", error)
    return false
  }
}
```

### 3. **Check if User Can Update Primary SPOC** (NEW)

```typescript
export async function canUpdatePrimarySpoc(userId: number, businessGroupId: number): Promise<boolean> {
  try {
    const user = await sql`SELECT role FROM users WHERE id = ${userId}`
    if (user.length === 0) return false
    
    const role = user[0].role?.toLowerCase()
    
    // Super Admin and Admin can always update
    if (role === "superadmin" || role === "admin") return true
    
    // Check if user is Primary SPOC
    const isPrimary = await isUserPrimarySpoc(userId, businessGroupId)
    if (isPrimary) return true
    
    // Secondary SPOC cannot update Primary SPOC
    const isSecondary = await isUserSecondarySpoc(userId, businessGroupId)
    if (isSecondary) return false
    
    return false
  } catch (error) {
    console.error("Error checking if user can update Primary SPOC:", error)
    return false
  }
}
```

### 4. **Check if User is Any SPOC (Primary or Secondary)**

```typescript
export async function isUserAnySpoc(userId: number, businessGroupId: number): Promise<boolean> {
  const isPrimary = await isUserPrimarySpoc(userId, businessGroupId)
  if (isPrimary) return true
  
  const isSecondary = await isUserSecondarySpoc(userId, businessGroupId)
  return isSecondary
}
```

---

## Implementation Requirements

### 1. **Ticket Detail Page**

When displaying ticket details, check:
- If user is Primary SPOC → Show editable Primary SPOC field
- If user is Secondary SPOC → Show **read-only** Primary SPOC field, editable Secondary SPOC field
- If user is Admin/Super Admin → Show both fields as editable

### 2. **Ticket Update Actions**

```typescript
// In updateTicketSPOC or similar function
export async function updateTicketPrimarySpoc(ticketId: number, newSpocId: number) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { success: false, error: "Not authenticated" }
  }
  
  // Get ticket's business group
  const ticket = await sql`
    SELECT target_business_group_id 
    FROM tickets 
    WHERE id = ${ticketId}
  `
  if (ticket.length === 0) {
    return { success: false, error: "Ticket not found" }
  }
  
  const businessGroupId = ticket[0].target_business_group_id
  
  // Check if user can update Primary SPOC
  const canUpdate = await canUpdatePrimarySpoc(currentUser.id, businessGroupId)
  if (!canUpdate) {
    return { 
      success: false, 
      error: "You don't have permission to update Primary SPOC. Only Primary SPOC, Admin, or Super Admin can update this field." 
    }
  }
  
  // Proceed with update
  await sql`
    UPDATE tickets
    SET spoc_user_id = ${newSpocId}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${ticketId}
  `
  
  return { success: true }
}
```

### 3. **Master Data Management**

When editing Business Groups:
- If user is Primary SPOC → Can edit Primary SPOC and Secondary SPOC fields
- If user is Secondary SPOC → Can only edit Secondary SPOC field (Primary SPOC field is disabled)
- If user is Admin/Super Admin → Can edit both fields

---

## UI Implementation

### Ticket Edit Form:

```tsx
// In ticket edit component
const [isPrimarySpoc, setIsPrimarySpoc] = useState(false)
const [isSecondarySpoc, setIsSecondarySpoc] = useState(false)

useEffect(() => {
  const checkSpocStatus = async () => {
    if (!user?.id || !ticket?.target_business_group_id) return
    
    const primary = await isUserPrimarySpoc(user.id, ticket.target_business_group_id)
    const secondary = await isUserSecondarySpoc(user.id, ticket.target_business_group_id)
    
    setIsPrimarySpoc(primary)
    setIsSecondarySpoc(secondary)
  }
  checkSpocStatus()
}, [user, ticket])

// In the SPOC field
<Select
  value={ticket.spoc_user_id}
  onValueChange={handleSpocChange}
  disabled={isSecondarySpoc && !isAdmin} // Disable for Secondary SPOC
>
  <SelectTrigger>
    <SelectValue placeholder="Select Primary SPOC" />
  </SelectTrigger>
  <SelectContent>
    {spocUsers.map(spoc => (
      <SelectItem key={spoc.id} value={spoc.id}>
        {spoc.full_name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

{isSecondarySpoc && !isAdmin && (
  <p className="text-xs text-amber-600 mt-1">
    ⚠️ As Secondary SPOC, you cannot update the Primary SPOC field
  </p>
)}
```

---

## Analytics Access

Both Primary and Secondary SPOC have **identical analytics access**:

### Tab 1 - Tickets By Initiator Group:
- Shows tickets where `business_unit_group_id` = their group(s)

### Tab 2 - Tickets By Target Group:
- Shows tickets where `target_business_group_id` = their group(s)

**No difference** in analytics view between Primary and Secondary SPOC.

---

## Business Rules

### 1. **SPOC Detection**

The system checks if a user is a SPOC by:
1. Checking if user's role is "manager"
2. OR checking if user's name matches `spoc_name`, `primary_spoc_name`, or `secondary_spoc_name` in any business group

### 2. **Group Assignment**

- A user can be Primary SPOC for multiple groups
- A user can be Secondary SPOC for multiple groups
- A user can be Primary SPOC for some groups and Secondary SPOC for others

### 3. **Permission Hierarchy**

```
Super Admin > Admin > Primary SPOC > Secondary SPOC > Regular User
```

For Primary SPOC field updates:
- Super Admin: ✅ Can update
- Admin: ✅ Can update
- Primary SPOC: ✅ Can update
- Secondary SPOC: ❌ Cannot update
- Regular User: ❌ Cannot update

---

## Implementation Checklist

### Backend Functions to Add:

- [x] `isUserPrimarySpoc(userId, businessGroupId)` - Already exists
- [ ] `isUserSecondarySpoc(userId, businessGroupId)` - **Need to add**
- [ ] `canUpdatePrimarySpoc(userId, businessGroupId)` - **Need to add**
- [ ] `isUserAnySpoc(userId, businessGroupId)` - **Need to add**

### Frontend Components to Update:

- [ ] Ticket detail page - Disable Primary SPOC field for Secondary SPOC
- [ ] Ticket edit form - Add permission check before allowing Primary SPOC update
- [ ] Master data page - Disable Primary SPOC field for Secondary SPOC
- [ ] Show warning message when Secondary SPOC tries to edit Primary SPOC

### Permission Checks to Add:

- [ ] In `updateTicketSPOC()` - Check if user can update Primary SPOC
- [ ] In `updateBusinessUnitGroup()` - Check if user can update Primary SPOC field
- [ ] In ticket edit API - Validate Primary SPOC update permission

---

## Error Messages

### When Secondary SPOC tries to update Primary SPOC:

**Ticket Update:**
```
"You don't have permission to update Primary SPOC. Only Primary SPOC, Admin, or Super Admin can update this field."
```

**Master Data Update:**
```
"As Secondary SPOC, you can only update the Secondary SPOC field. Contact Primary SPOC or Admin to update Primary SPOC."
```

---

## Testing Scenarios

### Test Case 1: Secondary SPOC tries to update Primary SPOC
- **Expected:** Error message, update blocked
- **Actual:** Should show permission denied

### Test Case 2: Secondary SPOC updates Secondary SPOC
- **Expected:** Update successful
- **Actual:** Should work

### Test Case 3: Primary SPOC updates Primary SPOC
- **Expected:** Update successful
- **Actual:** Should work

### Test Case 4: Primary SPOC updates Secondary SPOC
- **Expected:** Update successful
- **Actual:** Should work

### Test Case 5: Secondary SPOC views analytics
- **Expected:** Same view as Primary SPOC
- **Actual:** Should show identical data

### Test Case 6: Secondary SPOC assigns tickets
- **Expected:** Can assign tickets to group members
- **Actual:** Should work

### Test Case 7: Secondary SPOC changes ticket status
- **Expected:** Can change to on-hold, resolved
- **Actual:** Should work

---

## Future Enhancements

### 1. **Add secondary_spoc_user_id to tickets table**

Currently, tickets only have `spoc_user_id` (Primary SPOC). Consider adding:

```sql
ALTER TABLE tickets
ADD COLUMN secondary_spoc_user_id INTEGER REFERENCES users(id);
```

This would allow:
- Tracking which SPOC (Primary or Secondary) handled the ticket
- Better analytics on SPOC workload distribution
- Separate assignment of Primary vs Secondary SPOC per ticket

### 2. **SPOC Role Indicator**

Add UI indicator showing whether user is Primary or Secondary SPOC:
- Badge: "Primary SPOC" (blue)
- Badge: "Secondary SPOC" (purple)

### 3. **SPOC Activity Log**

Track which SPOC performed which actions:
- "Primary SPOC John assigned ticket to Sarah"
- "Secondary SPOC Mike changed status to resolved"

### 4. **SPOC Delegation**

Allow Primary SPOC to temporarily delegate full permissions to Secondary SPOC:
- Delegation period (start/end date)
- During delegation, Secondary SPOC gets Primary SPOC permissions

---

## Code Locations

### Permission Checks:
- `lib/actions/permissions.ts` - Role-based permissions
- `lib/actions/master-data.ts` - SPOC detection functions

### SPOC Functions:
- `isUserPrimarySpoc()` - Check if user is Primary SPOC (exists)
- `isUserSecondarySpoc()` - Check if user is Secondary SPOC (need to add)
- `canUpdatePrimarySpoc()` - Check update permission (need to add)

### Database:
- `business_unit_groups.spoc_name` - Primary SPOC name
- `business_unit_groups.secondary_spoc_name` - Secondary SPOC name
- `tickets.spoc_user_id` - Primary SPOC ID on ticket

---

## Migration Notes

### Already Completed:
- ✅ Added `secondary_spoc_name` column to `business_unit_groups`
- ✅ Added `primary_spoc_name` column (alias for `spoc_name`)
- ✅ Migration script: `034-add-secondary-spoc.sql`

### Pending:
- [ ] Add `secondary_spoc_user_id` to tickets table (optional)
- [ ] Add permission check functions
- [ ] Update UI components to disable Primary SPOC field for Secondary SPOC
- [ ] Add validation in backend APIs

---

## Summary

**Key Rule:** Secondary SPOC = Primary SPOC permissions **MINUS** ability to update Primary SPOC field.

This ensures:
- Secondary SPOC can handle all ticket operations
- Secondary SPOC can manage their group effectively
- Primary SPOC maintains control over primary SPOC assignment
- Clear hierarchy and accountability

---

**Last Updated:** March 17, 2026
