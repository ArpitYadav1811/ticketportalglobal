# Ticket Creation - API & Query Documentation

## Overview
This document provides comprehensive documentation of all API endpoints, database queries, and functions used in the Ticket Creation process.

---

## Table of Contents
1. [Main Ticket Creation Function](#main-ticket-creation-function)
2. [Master Data Queries](#master-data-queries)
3. [API Endpoints](#api-endpoints)
4. [Supporting Functions](#supporting-functions)
5. [Database Schema](#database-schema)

---

## Main Ticket Creation Function

### `createTicket()` - Server Action
**Location:** `lib/actions/tickets.ts`

**Function Signature:**
```typescript
export async function createTicket(data: {
  ticketType: string
  parentTicketId?: number | null
  targetBusinessGroupId: number
  projectName?: string
  projectId?: number | null
  categoryId: number | null
  subcategoryId: number | null
  title: string
  description: string
  estimatedDuration: number // hours
  spocId: number
  productReleaseName?: string
  estimatedReleaseDate?: string | null
  isInternal?: boolean
  assignedTo?: number | null
})
```

**Database Queries Executed:**

#### 1. Get Creator's Business Unit Group ID
```sql
SELECT business_unit_group_id 
FROM users 
WHERE id = ${currentUser.id}
```
**Purpose:** Retrieves the creator's business unit group to set as `business_unit_group_id` (initiator group)

#### 2. Get Assignee's Business Unit Group ID (if assigned)
```sql
SELECT business_unit_group_id 
FROM users 
WHERE id = ${data.assignedTo}
```
**Purpose:** Retrieves assignee's group to set as `assignee_group_id`

#### 3. Get Next Ticket Number
```sql
SELECT COALESCE(MAX(ticket_number), 0) as max_num 
FROM tickets
```
**Purpose:** Gets the highest ticket number to generate the next sequential number

#### 4. Insert New Ticket
```sql
INSERT INTO tickets (
  ticket_id, ticket_number, title, description, ticket_type, priority,
  status, created_by, assigned_to, spoc_user_id,
  business_unit_group_id, target_business_group_id, assignee_group_id,
  project_name, project_id, category_id, subcategory_id,
  estimated_duration, product_release_name, estimated_release_date,
  is_internal
)
VALUES (
  ${ticketId},           -- Format: TKT-YYYYMM-#####
  ${nextTicketNumber},   -- Sequential number
  ${data.title},
  ${data.description},
  ${data.ticketType},    -- 'support' or 'requirement'
  'medium',              -- Default priority
  'open',                -- Default status
  ${currentUser.id},
  ${data.assignedTo || null},
  ${data.spocId},
  ${creatorBusinessUnitGroupId},  -- Initiator group
  ${data.targetBusinessGroupId},  -- Target group
  ${assigneeGroupId},             -- Assignee's group
  ${data.projectName || null},
  ${data.projectId || null},
  ${data.categoryId || null},
  ${data.subcategoryId || null},
  ${data.estimatedDuration || null},
  ${data.productReleaseName || null},
  ${data.estimatedReleaseDate || null},
  ${data.isInternal || false}
)
RETURNING *
```

#### 5. Get SPOC Details for Email Notification
```sql
SELECT u.email, u.full_name, bug.name as group_name
FROM users u
LEFT JOIN business_unit_groups bug ON u.business_unit_group_id = bug.id
WHERE u.id = ${data.spocId}
```
**Purpose:** Retrieves SPOC email and name to send notification email

**Post-Creation Actions:**
- Creates audit log entry via `addAuditLog()`
- Sends email notification to SPOC via `sendSpocNotificationEmail()`
- Revalidates Next.js cache paths: `/dashboard` and `/tickets`

---

## Master Data Queries

### 1. Get Target Business Groups
**Function:** `getTargetBusinessGroups(organizationId?: number)`  
**Location:** `lib/actions/master-data.ts`

**Query (with organization filter):**
```sql
SELECT DISTINCT 
  bug.id,
  bug.name,
  bug.description,
  COALESCE(pspoc.full_name, bug.spoc_name) as spoc_name,
  COALESCE(pspoc.full_name, bug.primary_spoc_name, bug.spoc_name) as primary_spoc_name,
  COALESCE(sspoc.full_name, bug.secondary_spoc_name) as secondary_spoc_name,
  bug.created_at,
  bug.updated_at
FROM business_unit_groups bug
INNER JOIN functional_area_business_group_mapping fabgm ON bug.id = fabgm.target_business_group_id
LEFT JOIN users pspoc ON LOWER(TRIM(pspoc.full_name)) = LOWER(TRIM(COALESCE(bug.primary_spoc_name, bug.spoc_name)))
LEFT JOIN users sspoc ON LOWER(TRIM(sspoc.full_name)) = LOWER(TRIM(bug.secondary_spoc_name))
WHERE fabgm.functional_area_id = ${organizationId}
ORDER BY bug.name ASC
```

**Query (all groups):**
```sql
SELECT 
  bug.id,
  bug.name,
  bug.description,
  COALESCE(pspoc.full_name, bug.spoc_name) as spoc_name,
  COALESCE(pspoc.full_name, bug.primary_spoc_name, bug.spoc_name) as primary_spoc_name,
  COALESCE(sspoc.full_name, bug.secondary_spoc_name) as secondary_spoc_name,
  bug.created_at,
  bug.updated_at
FROM business_unit_groups bug
LEFT JOIN users pspoc ON LOWER(TRIM(pspoc.full_name)) = LOWER(TRIM(COALESCE(bug.primary_spoc_name, bug.spoc_name)))
LEFT JOIN users sspoc ON LOWER(TRIM(sspoc.full_name)) = LOWER(TRIM(bug.secondary_spoc_name))
ORDER BY bug.name ASC
```

### 2. Get Target Business Groups by Organization
**Function:** `getTargetBusinessGroupsByOrganization(organizationId: number)`  
**Location:** `lib/actions/master-data.ts`

**Query:**
```sql
SELECT DISTINCT 
  bug.id,
  bug.name,
  bug.description,
  COALESCE(pspoc.full_name, bug.spoc_name) as spoc_name,
  COALESCE(pspoc.full_name, bug.primary_spoc_name, bug.spoc_name) as primary_spoc_name,
  COALESCE(sspoc.full_name, bug.secondary_spoc_name) as secondary_spoc_name,
  bug.created_at,
  bug.updated_at
FROM business_unit_groups bug
INNER JOIN functional_area_business_group_mapping fabgm ON bug.id = fabgm.target_business_group_id
LEFT JOIN users pspoc ON LOWER(TRIM(pspoc.full_name)) = LOWER(TRIM(COALESCE(bug.primary_spoc_name, bug.spoc_name)))
LEFT JOIN users sspoc ON LOWER(TRIM(sspoc.full_name)) = LOWER(TRIM(bug.secondary_spoc_name))
WHERE fabgm.functional_area_id = ${organizationId}
ORDER BY bug.name ASC
```

### 3. Get Organizations (Functional Areas)
**Function:** `getOrganizations()`  
**Location:** `lib/actions/master-data.ts`

**Query:**
```sql
SELECT * 
FROM functional_areas
ORDER BY name ASC
```

### 4. Get Categories
**Function:** `getCategories(businessGroupId?: number)`  
**Location:** `lib/actions/master-data.ts`

**Query (with business group filter):**
```sql
SELECT c.*, bug.name as business_group_name
FROM categories c
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
WHERE c.business_unit_group_id = ${businessGroupId}
ORDER BY c.name ASC
```

**Query (all categories):**
```sql
SELECT c.*, bug.name as business_group_name
FROM categories c
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name ASC, c.name ASC
```

### 5. Get Subcategories
**Function:** `getSubcategories(categoryId?: number)`  
**Location:** `lib/actions/master-data.ts`

**Query (with category filter):**
```sql
SELECT s.id, s.category_id, s.name, s.description,
       s.input_template, s.estimated_duration_minutes, s.closure_steps,
       c.name as category_name
FROM subcategories s
JOIN categories c ON s.category_id = c.id
WHERE s.category_id = ${categoryId}
ORDER BY s.name ASC
```

**Query (all subcategories):**
```sql
SELECT s.id, s.category_id, s.name, s.description,
       s.input_template, s.estimated_duration_minutes, s.closure_steps,
       c.name as category_name
FROM subcategories s
JOIN categories c ON s.category_id = c.id
ORDER BY c.name, s.name ASC
```

### 6. Get SPOC for Target Business Group
**Function:** `getSpocForTargetBusinessGroup(targetBusinessGroupId: number)`  
**Location:** `lib/actions/master-data.ts`

**Query:**
```sql
SELECT 
  COALESCE(pspoc.full_name, bug.spoc_name) as spoc_name,
  pspoc.id,
  pspoc.full_name,
  pspoc.email
FROM business_unit_groups bug
LEFT JOIN users pspoc ON LOWER(TRIM(pspoc.full_name)) = LOWER(TRIM(COALESCE(bug.primary_spoc_name, bug.spoc_name)))
WHERE bug.id = ${targetBusinessGroupId}
LIMIT 1
```

### 7. Get Classification Mapping
**Function:** `getClassificationMappingByTargetBusinessGroup(targetBusinessGroupId, categoryId, subcategoryId)`  
**Location:** `lib/actions/master-data.ts`

**Query (with subcategory):**
```sql
SELECT 
  tcm.*,
  tbg.name as target_business_group_name,
  c.name as category_name,
  s.name as subcategory_name,
  u.full_name as spoc_name
FROM ticket_classification_mapping tcm
JOIN business_unit_groups tbg ON tcm.target_business_group_id = tbg.id
JOIN categories c ON tcm.category_id = c.id
JOIN subcategories s ON tcm.subcategory_id = s.id
LEFT JOIN users u ON tcm.spoc_user_id = u.id
WHERE tcm.target_business_group_id = ${targetBusinessGroupId}
  AND tcm.category_id = ${categoryId}
  AND tcm.subcategory_id = ${subcategoryId}
```

**Query (without subcategory):**
```sql
SELECT 
  tcm.*,
  tbg.name as target_business_group_name,
  c.name as category_name,
  s.name as subcategory_name,
  u.full_name as spoc_name
FROM ticket_classification_mapping tcm
JOIN business_unit_groups tbg ON tcm.target_business_group_id = tbg.id
JOIN categories c ON tcm.category_id = c.id
JOIN subcategories s ON tcm.subcategory_id = s.id
LEFT JOIN users u ON tcm.spoc_user_id = u.id
WHERE tcm.target_business_group_id = ${targetBusinessGroupId}
  AND tcm.category_id = ${categoryId}
LIMIT 1
```

### 8. Get Business Unit Groups
**Function:** `getBusinessUnitGroups()`  
**Location:** `lib/actions/master-data.ts`

**Query:**
```sql
SELECT * 
FROM business_unit_groups 
ORDER BY name ASC
```

### 9. Get Users (for Assignee Selection)
**Function:** `getUsers()`  
**Location:** `lib/actions/tickets.ts`

**Query:**
```sql
SELECT id, full_name, email, role, business_unit_group_id
FROM users
WHERE is_active = true
ORDER BY full_name ASC
```

---

## API Endpoints

### 1. POST `/api/attachments`
**Location:** `app/api/attachments/route.ts`

**Purpose:** Upload file attachments for tickets

**Request Body (FormData):**
- `file`: File object (max 5MB)
- `ticketId`: string (ticket ID number)
- `uploadedBy`: string (user ID)

**Validation:**
- File size: Max 5MB
- Allowed extensions: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.csv`, `.rtf`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`, `.zip`, `.rar`, `.7z`, `.json`, `.xml`, `.md`
- Blocked extensions: `.exe`, `.bat`, `.cmd`, `.com`, `.msi`, `.dll`, `.scr`, `.js`, `.jsx`, `.ts`, `.tsx`, `.vbs`, `.vbe`, `.wsf`, `.wsh`, `.ps1`, `.psm1`, `.psd1`, `.sh`, `.bash`, `.zsh`, `.php`, `.phtml`, `.php3`, `.php4`, `.php5`, `.phps`, `.asp`, `.aspx`, `.cer`, `.csr`, `.jsp`, `.jspx`, `.py`, `.pyc`, `.pyo`, `.pl`, `.pm`, `.cgi`, `.jar`, `.class`, `.htaccess`, `.htpasswd`

**Database Queries:**

**Insert Attachment:**
```sql
INSERT INTO attachments (ticket_id, file_name, file_url, file_size, uploaded_by)
VALUES (${ticketIdNum}, ${file.name}, ${fileUrl}, ${file.size}, ${uploadedBy ? Number(uploadedBy) : null})
RETURNING *
```

**Update Ticket Has Attachments Flag:**
```sql
UPDATE tickets 
SET has_attachments = TRUE 
WHERE id = ${ticketIdNum}
```

**Get Uploader Name:**
```sql
SELECT full_name 
FROM users 
WHERE id = ${Number(uploadedBy)}
```

**Insert Audit Log:**
```sql
INSERT INTO ticket_audit_log (ticket_id, action_type, old_value, new_value, performed_by, performed_by_name, notes)
VALUES (${ticketIdNum}, 'attachment_added', ${null}, ${file.name}, ${uploadedBy ? Number(uploadedBy) : null}, ${uploaderName}, ${`File size: ${(file.size / 1024).toFixed(2)} KB`})
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": number,
    "ticket_id": number,
    "file_name": string,
    "file_url": string,
    "file_size": number,
    "uploaded_by": number,
    "created_at": timestamp
  }
}
```

### 2. DELETE `/api/attachments?id={attachmentId}`
**Location:** `app/api/attachments/route.ts`

**Purpose:** Delete file attachments

**Query Parameters:**
- `id`: attachment ID (number)

**Database Queries:**

**Get Attachment Info:**
```sql
SELECT a.*, u.full_name as uploader_name 
FROM attachments a
LEFT JOIN users u ON a.uploaded_by = u.id
WHERE a.id = ${attachmentIdNum}
```

**Delete Attachment:**
```sql
DELETE FROM attachments 
WHERE id = ${attachmentIdNum}
```

**Check Remaining Attachments:**
```sql
SELECT COUNT(*) as count 
FROM attachments 
WHERE ticket_id = ${ticketId}
```

**Update Ticket Has Attachments Flag (if none remaining):**
```sql
UPDATE tickets 
SET has_attachments = FALSE 
WHERE id = ${ticketId}
```

**Insert Audit Log:**
```sql
INSERT INTO ticket_audit_log (ticket_id, action_type, old_value, new_value, performed_by, performed_by_name, notes)
VALUES (${ticketId}, 'attachment_removed', ${fileName}, ${null}, ${uploadedBy}, ${uploaderName}, ${null})
```

**Response:**
```json
{
  "success": true
}
```

### 3. GET `/api/tickets/validate?ticketId={ticketId}`
**Location:** `app/api/tickets/validate/route.ts`

**Purpose:** Validate ticket ID for reference linking

**Query Parameters:**
- `ticketId`: string (ticket ID or ticket number)

**Database Queries:**

**Query by Ticket Number (if numeric):**
```sql
SELECT t.id, t.ticket_number, t.ticket_id, t.title, t.ticket_type, t.status
FROM tickets t
WHERE (t.ticket_number = ${Number(trimmed)} OR t.ticket_id LIKE ${"%" + trimmed})
  AND t.is_deleted = FALSE
LIMIT 1
```

**Query by Full Ticket ID (if not numeric):**
```sql
SELECT t.id, t.ticket_number, t.ticket_id, t.title, t.ticket_type, t.status
FROM tickets t
WHERE t.ticket_id = ${trimmed} 
  AND t.is_deleted = FALSE
LIMIT 1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": number,
    "ticket_number": number,
    "ticket_id": string,
    "title": string,
    "ticket_type": string,
    "status": string
  }
}
```

---

## Supporting Functions

### 1. `addTicketReferences()`
**Location:** `lib/actions/tickets.ts`

**Purpose:** Link tickets as references

**Function Signature:**
```typescript
export async function addTicketReferences(
  sourceTicketId: number, 
  referenceTicketIds: number[]
)
```

**Database Queries:**

**Insert Ticket References:**
```sql
INSERT INTO ticket_references (source_ticket_id, reference_ticket_id)
VALUES (${sourceTicketId}, ${refId})
ON CONFLICT (source_ticket_id, reference_ticket_id) DO NOTHING
```

**Insert Audit Log (for each reference):**
```sql
INSERT INTO ticket_audit_log (
  ticket_id, 
  action_type, 
  old_value, 
  new_value, 
  performed_by, 
  performed_by_name
)
VALUES (
  ${sourceTicketId}, 
  'reference_added', 
  ${null}, 
  ${`Ticket #${refTicketNumber} (${refTicketId})`}, 
  ${currentUser.id}, 
  ${currentUser.full_name || currentUser.email}
)
```

### 2. `addAuditLog()`
**Location:** `lib/actions/tickets.ts`

**Purpose:** Log ticket actions to audit trail

**Function Signature:**
```typescript
export async function addAuditLog({
  ticketId: number,
  actionType: string,
  oldValue: string | null,
  newValue: string | null,
  performedBy: number,
  performedByName: string,
  notes?: string
})
```

**Database Query:**
```sql
INSERT INTO ticket_audit_log (
  ticket_id, 
  action_type, 
  old_value, 
  new_value, 
  performed_by, 
  performed_by_name, 
  notes
)
VALUES (
  ${ticketId},
  ${actionType},
  ${oldValue},
  ${newValue},
  ${performedBy},
  ${performedByName},
  ${notes || null}
)
```

### 3. `sendSpocNotificationEmail()`
**Location:** `lib/actions/tickets.ts`

**Purpose:** Send email notification to SPOC when ticket is created

**Function Signature:**
```typescript
export async function sendSpocNotificationEmail({
  spocEmail: string,
  spocName: string,
  ticketId: string,
  ticketDbId: number,
  ticketTitle: string,
  description: string,
  creatorName: string,
  creatorGroup: string
})
```

---

## Database Schema

### Tickets Table
```sql
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(50) UNIQUE NOT NULL,           -- Format: TKT-YYYYMM-#####
  ticket_number INTEGER,                            -- Sequential number
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  ticket_type VARCHAR(50) NOT NULL DEFAULT 'support', -- 'support' or 'requirement'
  status VARCHAR(50) NOT NULL DEFAULT 'open',       -- 'open', 'on-hold', 'resolved', 'closed', 'returned', 'deleted'
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',   -- 'low', 'medium', 'high', 'urgent'
  
  -- Classification
  category_id INTEGER REFERENCES categories(id),
  subcategory_id INTEGER REFERENCES subcategories(id),
  
  -- Business Groups
  business_unit_group_id INTEGER REFERENCES business_unit_groups(id),  -- Initiator group
  target_business_group_id INTEGER REFERENCES business_unit_groups(id), -- Target group
  assignee_group_id INTEGER REFERENCES business_unit_groups(id),         -- Assignee's group
  
  -- User assignments
  created_by INTEGER NOT NULL REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  spoc_user_id INTEGER REFERENCES users(id),
  
  -- Project and release
  project_name VARCHAR(255),
  project_id INTEGER REFERENCES projects(id),
  product_release_name VARCHAR(255),
  estimated_release_date DATE,
  estimated_duration INTEGER,                      -- Hours
  
  -- Internal ticket flag
  is_internal BOOLEAN DEFAULT FALSE,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  
  -- Attachments flag
  has_attachments BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  hold_at TIMESTAMP
);
```

### Attachments Table
```sql
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ticket References Table
```sql
CREATE TABLE ticket_references (
  id SERIAL PRIMARY KEY,
  source_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  reference_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_ticket_id, reference_ticket_id)
);
```

### Ticket Audit Log Table
```sql
CREATE TABLE ticket_audit_log (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by INTEGER REFERENCES users(id),
  performed_by_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Ticket ID Generation

**Format:** `TKT-YYYYMM-#####`

**Algorithm:**
1. Get current date: `YYYY-MM` format
2. Remove hyphen: `YYYYMM`
3. Generate random 5-digit number (padded with zeros)
4. Combine: `TKT-{YYYYMM}-{#####}`

**Example:** `TKT-202403-04281`

**Ticket Number:**
- Sequential integer starting from 1
- Retrieved via: `SELECT COALESCE(MAX(ticket_number), 0) + 1 FROM tickets`

---

## Flow Diagram

```
User Fills Form
    ↓
Load Master Data (Organizations, Business Groups, Categories, etc.)
    ↓
Select Organization → Filter Target Business Groups
    ↓
Select Target Business Group → Auto-fetch SPOC
    ↓
Select Category → Load Subcategories
    ↓
Select Subcategory → Load Classification Mapping (auto-fill duration, template)
    ↓
Fill Title, Description, Attachments
    ↓
Validate Reference Tickets (if any)
    ↓
Submit Form → createTicket()
    ↓
Generate Ticket ID & Number
    ↓
Insert Ticket into Database
    ↓
Upload Attachments (if any) → /api/attachments
    ↓
Add Ticket References (if any) → addTicketReferences()
    ↓
Create Audit Log Entry
    ↓
Send SPOC Email Notification
    ↓
Show Success Dialog
```

---

## Error Handling

All functions return a consistent response format:
```typescript
{
  success: boolean,
  data?: any,
  error?: string
}
```

**Common Error Scenarios:**
- User not authenticated
- Invalid business group ID
- Invalid category/subcategory combination
- File upload size/type validation failures
- Database constraint violations
- Email notification failures (non-blocking)

---

## Security Considerations

1. **File Upload Security:**
   - Whitelist of allowed file extensions
   - Blocked dangerous file types (executables, scripts)
   - File size limits (5MB)
   - Filename sanitization
   - Path traversal prevention

2. **SQL Injection Prevention:**
   - All queries use parameterized statements via `sql` template tag
   - No string concatenation in SQL queries

3. **Input Validation:**
   - Ticket ID validation (numeric check)
   - User ID validation
   - File type validation

4. **Authentication:**
   - All server actions check for authenticated user via `getCurrentUser()`

---

## Notes

- Ticket creation is a server action (not a REST API endpoint)
- Attachments are uploaded separately after ticket creation
- Reference tickets are added after ticket creation
- Email notifications are sent asynchronously (failures don't block ticket creation)
- All actions are logged to `ticket_audit_log` for audit trail
