# Database Refactoring Guide

## Overview

This guide documents the comprehensive database refactoring to transform the "messy" schema into a clean, normalized entity-relationship model with proper separation of concerns.

---

## Table of Contents

1. [Problems with Current Schema](#problems-with-current-schema)
2. [Refactoring Strategy](#refactoring-strategy)
3. [New Entity Structure](#new-entity-structure)
4. [Migration Execution Order](#migration-execution-order)
5. [Benefits of Refactoring](#benefits-of-refactoring)
6. [Backward Compatibility](#backward-compatibility)
7. [Testing Strategy](#testing-strategy)

---

## Problems with Current Schema

### Critical Issues

#### 1. Bloated `tickets` Table (40+ columns)

The `tickets` table contains mixed concerns:
- **Core ticket data**: title, description, ticket_id
- **Audit fields**: closed_by, closed_at, hold_by, hold_at, deleted_at
- **Project data**: project_name, product_release_name, project_id, estimated_release_date
- **Redirection tracking**: redirected_from_*, redirection_remarks, redirected_at
- **Hierarchy**: parent_ticket_id
- **Denormalized data**: category, subcategory, initiator_group (VARCHAR) alongside category_id, subcategory_id, business_unit_group_id (FK)

**Impact**: Difficult to maintain, poor query performance, data integrity issues.

#### 2. Inconsistent SPOC Management

`business_unit_groups` table has THREE string-based SPOC columns:
- `spoc_name` (VARCHAR)
- `primary_spoc_name` (VARCHAR)
- `secondary_spoc_name` (VARCHAR)

**Problems**:
- No referential integrity (can't enforce FK constraints)
- Difficult to query (string matching instead of joins)
- Can't track SPOC assignment history
- Inconsistent with `ticket_classification_mapping.spoc_user_id` (which uses proper FK)

#### 3. VARCHAR-Based Master Data

Ticket properties stored as VARCHAR strings:
- `status` VARCHAR(50) - values like 'open', 'closed', 'on-hold'
- `priority` VARCHAR(50) - values like 'low', 'medium', 'high'
- `ticket_type` VARCHAR(50) - values like 'support', 'requirement'
- `users.role` VARCHAR(50) - values like 'user', 'admin', 'superadmin'

**Problems**:
- No data validation (typos possible)
- Can't add metadata (colors, icons, descriptions)
- Difficult to extend or modify
- Inconsistent casing

#### 4. Redundant Columns After Merges

`ticket_classification_mapping` has BOTH:
- `business_unit_group_id`
- `target_business_group_id`

After migration 022 merged `target_business_groups` into `business_unit_groups`, these became redundant.

#### 5. Legacy Unused Tables

- `teams` table appears unused (replaced by `my_team_members`)
- `team_members` table appears unused

---

## Refactoring Strategy

### Phase 1: Create New Entity Tables

Create separate, focused tables for each concern:

1. **`ticket_audit_events`** - Consolidate all audit tracking
2. **`ticket_projects`** - Separate project/release planning
3. **`ticket_redirections`** - Track redirection history
4. **`ticket_hierarchy`** - Manage parent-child relationships
5. **`business_group_spocs`** - Proper SPOC management with FKs
6. **`ticket_statuses`** - Master data for statuses
7. **`ticket_priorities`** - Master data for priorities
8. **`ticket_types`** - Master data for ticket types
9. **`user_roles`** - Master data for user roles
10. **`user_role_assignments`** - Many-to-many user-role mapping

### Phase 2: Migrate Existing Data

Move data from old columns to new tables:
- Audit events from inline columns
- Project data from tickets
- Redirection history
- Parent-child relationships
- SPOC assignments from strings to FKs
- Master data references from VARCHAR to FK

### Phase 3: Update Application Code

Update TypeScript types and server actions to use new structure.

### Phase 4: Drop Legacy Columns

After verifying data migration, drop redundant columns from `tickets` and `business_unit_groups`.

---

## New Entity Structure

### Entity Relationship Diagram (Conceptual)

```
┌─────────────────┐
│  user_roles     │
│  - id           │
│  - code         │
│  - name         │
│  - level        │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐         ┌──────────────────────┐
│ user_role_          │    N:M  │  users               │
│ assignments         │◄────────┤  - id                │
│  - user_id          │         │  - email             │
│  - role_id          │         │  - full_name         │
└─────────────────────┘         │  - business_group_id │
                                └──────────┬───────────┘
                                           │
                                           │ N:1
                                           ▼
                                ┌──────────────────────┐
                                │ business_unit_groups │
                                │  - id                │
                                │  - name              │
                                └──────────┬───────────┘
                                           │
                                           │ 1:N
                                           ▼
                                ┌──────────────────────┐
                                │ business_group_spocs │
                                │  - business_group_id │
                                │  - user_id           │
                                │  - spoc_type         │
                                └──────────────────────┘

┌─────────────────┐
│ ticket_types    │
│  - id           │
│  - code         │
└────────┬────────┘
         │
         │ N:1
         ▼
┌─────────────────────────────────────────┐
│  tickets (CLEANED)                      │
│  - id, ticket_id, ticket_number         │
│  - title, description                   │
│  - type_id, status_id, priority_id      │◄──── ticket_statuses
│  - business_unit_group_id               │
│  - target_business_group_id             │◄──── ticket_priorities
│  - category_id, subcategory_id          │
│  - assigned_to, created_by, spoc_user_id│
│  - estimated_duration                   │
│  - is_internal, is_deleted              │
└────────┬────────────────────────────────┘
         │
         │ 1:N
         ├──────────────────────────────────────────┐
         │                                          │
         ▼                                          ▼
┌─────────────────────┐              ┌─────────────────────┐
│ ticket_audit_events │              │ ticket_projects     │
│  - ticket_id        │              │  - ticket_id        │
│  - event_type       │              │  - project_id       │
│  - performed_by     │              │  - release_id       │
│  - old/new_value    │              └─────────────────────┘
└─────────────────────┘
         │
         │ 1:N
         ├──────────────────────────────────────────┐
         │                                          │
         ▼                                          ▼
┌─────────────────────┐              ┌─────────────────────┐
│ ticket_redirections │              │ ticket_hierarchy    │
│  - ticket_id        │              │  - parent_ticket_id │
│  - from_group_id    │              │  - child_ticket_id  │
│  - to_group_id      │              │  - relationship_type│
│  - remarks          │              └─────────────────────┘
└─────────────────────┘
```

### Table Descriptions

#### Core Entities

| Table | Purpose | Key Columns | Replaces |
|-------|---------|-------------|----------|
| `tickets` | Core ticket data (cleaned) | id, title, description, type_id, status_id, priority_id | Bloated tickets table |
| `users` | User accounts | id, email, full_name, business_group_id | (unchanged) |
| `business_unit_groups` | Business units/departments | id, name, description | (cleaned - SPOC columns removed) |

#### Master Data Entities

| Table | Purpose | Key Columns | Replaces |
|-------|---------|-------------|----------|
| `ticket_statuses` | Ticket status definitions | id, code, name, color, is_closed_state | tickets.status (VARCHAR) |
| `ticket_priorities` | Priority levels with SLAs | id, code, name, sla_hours, sort_order | tickets.priority (VARCHAR) |
| `ticket_types` | Ticket type classifications | id, code, name, icon | tickets.ticket_type (VARCHAR) |
| `user_roles` | User role definitions | id, code, name, level | users.role (VARCHAR) |

#### Relationship/Mapping Entities

| Table | Purpose | Key Columns | Replaces |
|-------|---------|-------------|----------|
| `business_group_spocs` | SPOC assignments | business_group_id, user_id, spoc_type | business_unit_groups.spoc_name, primary_spoc_name, secondary_spoc_name |
| `user_role_assignments` | User-role many-to-many | user_id, role_id, is_active | (new - enables multiple roles) |
| `ticket_hierarchy` | Parent-child ticket relationships | parent_ticket_id, child_ticket_id, relationship_type | tickets.parent_ticket_id |

#### Separated Concern Entities

| Table | Purpose | Key Columns | Replaces |
|-------|---------|-------------|----------|
| `ticket_audit_events` | Centralized audit trail | ticket_id, event_type, performed_by, old/new_value | tickets.closed_by, hold_by, deleted_at, etc. |
| `ticket_projects` | Project/release planning | ticket_id, project_id, product_release_id | tickets.project_name, product_release_name, etc. |
| `ticket_redirections` | Redirection history | ticket_id, from_group_id, to_group_id, remarks | tickets.redirected_from_*, redirection_remarks |

---

## Migration Execution Order

### Prerequisites

1. **Backup your database** before running any migrations
2. **Test on a staging environment** first
3. **Verify data integrity** after each step

### Execution Steps

Run the scripts in this exact order:

#### Step 1: Create New Entity Tables

```bash
# Create separated entity tables
psql -d your_database -f scripts/refactoring/001-create-ticket-audit-events.sql
psql -d your_database -f scripts/refactoring/002-create-ticket-projects.sql
psql -d your_database -f scripts/refactoring/003-create-ticket-redirections.sql
psql -d your_database -f scripts/refactoring/004-create-ticket-hierarchy.sql
psql -d your_database -f scripts/refactoring/005-create-business-group-spocs.sql
psql -d your_database -f scripts/refactoring/006-create-master-data-entities.sql
```

**Verification**: Check that all new tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'ticket_audit_events', 'ticket_projects', 'ticket_redirections', 
  'ticket_hierarchy', 'business_group_spocs', 'ticket_statuses', 
  'ticket_priorities', 'ticket_types', 'user_roles', 'user_role_assignments'
);
```

#### Step 2: Add New FK Columns to Tickets

```bash
psql -d your_database -f scripts/refactoring/007-refactor-tickets-table.sql
```

**Verification**: Check new columns exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND column_name IN ('status_id', 'priority_id', 'type_id');
```

#### Step 3: Migrate Data to New Tables

```bash
# Migrate audit events
psql -d your_database -f scripts/refactoring/008-migrate-ticket-audit-data.sql

# Migrate project data
psql -d your_database -f scripts/refactoring/009-migrate-ticket-projects-data.sql

# Migrate redirection history
psql -d your_database -f scripts/refactoring/010-migrate-ticket-redirections-data.sql

# Migrate ticket hierarchy
psql -d your_database -f scripts/refactoring/011-migrate-ticket-hierarchy-data.sql

# Migrate SPOC assignments
psql -d your_database -f scripts/refactoring/012-migrate-business-group-spocs-data.sql

# Migrate master data references
psql -d your_database -f scripts/refactoring/013-migrate-master-data-references.sql
```

**Verification After Each Script**: 
- Check row counts in new tables
- Verify no NULL values where they shouldn't be
- Check for orphaned records

#### Step 4: Update Application Code

1. Update TypeScript types to use new entity structure (`types/entities.ts`)
2. Update server actions to query new tables
3. Update frontend components to use new types
4. Update API endpoints

**Files to Update**:
- `lib/actions/stats.ts` - Analytics queries
- `lib/actions/master-data.ts` - SPOC functions
- `lib/actions/tickets.ts` - Ticket CRUD operations
- `lib/actions/permissions.ts` - Permission checks
- All components that display ticket data

#### Step 5: Drop Legacy Columns (AFTER testing)

**CRITICAL**: Only run this after:
1. All data is migrated
2. Application code is updated
3. Testing is complete
4. No errors in production

Uncomment the DROP statements in `007-refactor-tickets-table.sql` and run:

```sql
-- From tickets table, drop:
ALTER TABLE tickets DROP COLUMN category CASCADE;
ALTER TABLE tickets DROP COLUMN subcategory CASCADE;
ALTER TABLE tickets DROP COLUMN initiator_group CASCADE;
ALTER TABLE tickets DROP COLUMN status CASCADE;
ALTER TABLE tickets DROP COLUMN priority CASCADE;
ALTER TABLE tickets DROP COLUMN ticket_type CASCADE;
ALTER TABLE tickets DROP COLUMN closed_by CASCADE;
ALTER TABLE tickets DROP COLUMN closed_at CASCADE;
ALTER TABLE tickets DROP COLUMN hold_by CASCADE;
ALTER TABLE tickets DROP COLUMN hold_at CASCADE;
ALTER TABLE tickets DROP COLUMN deleted_at CASCADE;
ALTER TABLE tickets DROP COLUMN redirected_from_business_unit_group_id CASCADE;
ALTER TABLE tickets DROP COLUMN redirected_from_spoc_user_id CASCADE;
ALTER TABLE tickets DROP COLUMN redirection_remarks CASCADE;
ALTER TABLE tickets DROP COLUMN redirected_at CASCADE;
ALTER TABLE tickets DROP COLUMN project_name CASCADE;
ALTER TABLE tickets DROP COLUMN product_release_name CASCADE;
ALTER TABLE tickets DROP COLUMN project_id CASCADE;
ALTER TABLE tickets DROP COLUMN estimated_release_date CASCADE;
ALTER TABLE tickets DROP COLUMN parent_ticket_id CASCADE;
ALTER TABLE tickets DROP COLUMN assignee_group_id CASCADE;

-- From business_unit_groups table, drop:
ALTER TABLE business_unit_groups DROP COLUMN spoc_name CASCADE;
ALTER TABLE business_unit_groups DROP COLUMN primary_spoc_name CASCADE;
ALTER TABLE business_unit_groups DROP COLUMN secondary_spoc_name CASCADE;

-- From functional_areas table, drop:
ALTER TABLE functional_areas DROP COLUMN spoc_name CASCADE;
```

---

## New Entity Structure

### 1. Ticket Audit Events

**Purpose**: Centralized audit trail for all ticket events.

**Schema**:
```sql
CREATE TABLE ticket_audit_events (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  event_type ticket_event_type NOT NULL,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);
```

**Event Types**:
- `created`, `assigned`, `reassigned`
- `status_changed`, `priority_changed`
- `held`, `unheld`, `closed`, `reopened`
- `redirected`, `updated`, `deleted`, `restored`

**Benefits**:
- Complete audit history in one place
- Easy to query ticket timeline
- Supports future event types without schema changes

### 2. Ticket Projects

**Purpose**: Link tickets to projects and product releases.

**Schema**:
```sql
CREATE TABLE ticket_projects (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  project_id INTEGER REFERENCES projects(id),
  product_release_id INTEGER REFERENCES product_releases(id),
  estimated_release_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**Benefits**:
- Proper FK relationships to projects and releases
- No string-based project names
- Easy to query tickets by project or release

### 3. Ticket Redirections

**Purpose**: Track complete history of ticket redirections.

**Schema**:
```sql
CREATE TABLE ticket_redirections (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  from_business_group_id INTEGER NOT NULL REFERENCES business_unit_groups(id),
  from_spoc_user_id INTEGER REFERENCES users(id),
  to_business_group_id INTEGER NOT NULL REFERENCES business_unit_groups(id),
  to_spoc_user_id INTEGER REFERENCES users(id),
  remarks TEXT NOT NULL,
  redirected_by INTEGER NOT NULL REFERENCES users(id),
  redirected_at TIMESTAMP WITH TIME ZONE
);
```

**Benefits**:
- Complete redirection chain history
- Easy to query redirection patterns
- Proper FK relationships

### 4. Ticket Hierarchy

**Purpose**: Manage parent-child and related ticket relationships.

**Schema**:
```sql
CREATE TABLE ticket_hierarchy (
  id SERIAL PRIMARY KEY,
  parent_ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  child_ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  relationship_type VARCHAR(50) DEFAULT 'subtask',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE
);
```

**Relationship Types**:
- `subtask` - Child is a subtask of parent
- `related` - Tickets are related
- `blocks` - Parent blocks child
- `blocked_by` - Parent is blocked by child
- `duplicates` - Tickets are duplicates

**Benefits**:
- Supports multiple parents (unlike single parent_ticket_id column)
- Supports different relationship types
- Easy to query ticket trees

### 5. Business Group SPOCs

**Purpose**: Proper SPOC management with foreign keys.

**Schema**:
```sql
CREATE TABLE business_group_spocs (
  id SERIAL PRIMARY KEY,
  business_group_id INTEGER NOT NULL REFERENCES business_unit_groups(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  spoc_type spoc_type NOT NULL, -- 'primary', 'secondary', 'functional_area'
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT true
);
```

**Benefits**:
- Proper FK relationships (referential integrity)
- Can track SPOC assignment history
- Easy to query SPOCs by group or user
- Supports multiple secondary SPOCs
- Constraint ensures only one active primary SPOC per group

### 6. Master Data Entities

**Purpose**: Centralized management of ticket statuses, priorities, types, and user roles.

**Tables**:
- `ticket_statuses` - Status definitions with colors, icons, sort order
- `ticket_priorities` - Priority levels with SLA hours
- `ticket_types` - Ticket type classifications
- `user_roles` - Role definitions with hierarchy levels

**Benefits**:
- Data validation (can't use invalid status/priority/type)
- Rich metadata (colors, icons, descriptions)
- Easy to extend (add new statuses without code changes)
- Consistent casing and naming

---

## Migration Execution Order

### Script Execution Sequence

| Order | Script | Purpose | Duration Estimate |
|-------|--------|---------|-------------------|
| 1 | `001-create-ticket-audit-events.sql` | Create audit events table | < 1 second |
| 2 | `002-create-ticket-projects.sql` | Create projects table | < 1 second |
| 3 | `003-create-ticket-redirections.sql` | Create redirections table | < 1 second |
| 4 | `004-create-ticket-hierarchy.sql` | Create hierarchy table | < 1 second |
| 5 | `005-create-business-group-spocs.sql` | Create SPOC table | < 1 second |
| 6 | `006-create-master-data-entities.sql` | Create master data tables | < 1 second |
| 7 | `007-refactor-tickets-table.sql` | Add new FK columns to tickets | < 1 second |
| 8 | `008-migrate-ticket-audit-data.sql` | Migrate audit events | 1-5 seconds |
| 9 | `009-migrate-ticket-projects-data.sql` | Migrate project data | 1-5 seconds |
| 10 | `010-migrate-ticket-redirections-data.sql` | Migrate redirection history | 1-5 seconds |
| 11 | `011-migrate-ticket-hierarchy-data.sql` | Migrate parent-child relationships | 1-5 seconds |
| 12 | `012-migrate-business-group-spocs-data.sql` | Migrate SPOC assignments | 1-5 seconds |
| 13 | `013-migrate-master-data-references.sql` | Migrate status/priority/type FKs | 1-5 seconds |

**Total Estimated Time**: < 1 minute for typical database size (< 10,000 tickets)

### Rollback Strategy

Each migration script should have a corresponding rollback script:

```sql
-- Example: rollback-008-ticket-audit-data.sql
DELETE FROM ticket_audit_events;
```

Store rollback scripts in `scripts/refactoring/rollback/` folder.

---

## Benefits of Refactoring

### 1. Data Integrity

- **Referential integrity**: All relationships enforced by FK constraints
- **Data validation**: Master data tables prevent invalid values
- **No orphaned records**: CASCADE deletes handle cleanup

### 2. Query Performance

- **Focused indexes**: Each table has targeted indexes
- **Smaller table scans**: Tickets table reduced from 40+ to ~20 columns
- **Efficient joins**: Proper FK relationships enable optimized joins

### 3. Maintainability

- **Separation of concerns**: Each table has a single, clear purpose
- **Easy to extend**: Add new statuses/priorities without schema changes
- **Clear relationships**: Entity diagram is easy to understand

### 4. Flexibility

- **Multiple SPOCs**: Can assign multiple secondary SPOCs
- **Multiple roles**: Users can have multiple roles
- **Rich metadata**: Master data tables support colors, icons, descriptions
- **Audit history**: Complete timeline of all ticket events

### 5. Code Quality

- **Type safety**: TypeScript types match database schema
- **Reduced complexity**: Server actions query focused tables
- **Better testing**: Each entity can be tested independently

---

## Backward Compatibility

### During Migration

The refactoring maintains backward compatibility during migration:

1. **Legacy columns remain** until migration is complete
2. **Application code continues to work** with old columns
3. **New columns are added** alongside old ones
4. **Data is duplicated** in both old and new structures

### After Migration

Once migration is complete and application code is updated:

1. **Legacy columns are dropped** (Step 5)
2. **Application uses new entity structure** exclusively
3. **No backward compatibility** with old column names

### Gradual Migration Strategy

For large production systems, consider:

1. **Dual-write approach**: Write to both old and new structures
2. **Feature flags**: Toggle between old and new queries
3. **Gradual rollout**: Migrate one feature at a time
4. **Monitoring**: Track errors and performance metrics

---

## Testing Strategy

### Unit Tests

Test each new entity table:

```typescript
// Example: Test ticket_audit_events
describe('TicketAuditEvents', () => {
  it('should create audit event when ticket is created', async () => {
    const ticket = await createTicket(...)
    const events = await getTicketAuditEvents(ticket.id)
    expect(events).toHaveLength(1)
    expect(events[0].event_type).toBe('created')
  })
})
```

### Integration Tests

Test relationships between entities:

```typescript
// Example: Test ticket with project
describe('TicketProjects', () => {
  it('should link ticket to project and release', async () => {
    const ticket = await createTicket(...)
    const project = await linkTicketToProject(ticket.id, projectId, releaseId)
    expect(project.ticket_id).toBe(ticket.id)
    expect(project.project_id).toBe(projectId)
  })
})
```

### Data Integrity Tests

Verify migration results:

```sql
-- Test 1: All tickets have status_id
SELECT COUNT(*) FROM tickets WHERE status_id IS NULL;
-- Expected: 0

-- Test 2: All audit events have valid ticket_id
SELECT COUNT(*) FROM ticket_audit_events tae
LEFT JOIN tickets t ON t.id = tae.ticket_id
WHERE t.id IS NULL;
-- Expected: 0

-- Test 3: All SPOCs have valid user_id
SELECT COUNT(*) FROM business_group_spocs bgs
LEFT JOIN users u ON u.id = bgs.user_id
WHERE u.id IS NULL;
-- Expected: 0
```

### Performance Tests

Compare query performance before and after:

```sql
-- Before: Query tickets with status filter
EXPLAIN ANALYZE
SELECT * FROM tickets WHERE status = 'open';

-- After: Query tickets with status_id filter
EXPLAIN ANALYZE
SELECT t.*, ts.name as status_name
FROM tickets t
JOIN ticket_statuses ts ON ts.id = t.status_id
WHERE ts.code = 'open';
```

---

## Common Issues and Solutions

### Issue 1: SPOC Name Mismatch

**Problem**: SPOC name in `business_unit_groups` doesn't match any user's `full_name`.

**Solution**:
```sql
-- Find mismatches
SELECT bg.id, bg.name, bg.primary_spoc_name
FROM business_unit_groups bg
LEFT JOIN users u ON u.full_name = bg.primary_spoc_name
WHERE bg.primary_spoc_name IS NOT NULL AND u.id IS NULL;

-- Manual fix: Update user's full_name or create missing user
```

### Issue 2: Invalid Status/Priority/Type Values

**Problem**: Tickets have status/priority/type values not in master data tables.

**Solution**:
```sql
-- Find invalid statuses
SELECT DISTINCT status FROM tickets
WHERE status NOT IN (SELECT code FROM ticket_statuses);

-- Add missing master data or fix ticket values
INSERT INTO ticket_statuses (code, name, description) 
VALUES ('custom_status', 'Custom Status', 'Description');
```

### Issue 3: Circular Parent-Child Relationships

**Problem**: Ticket A is parent of B, and B is parent of A.

**Solution**:
```sql
-- Find circular relationships
WITH RECURSIVE ticket_tree AS (
  SELECT parent_ticket_id, child_ticket_id, 1 as depth
  FROM ticket_hierarchy
  UNION ALL
  SELECT th.parent_ticket_id, tt.child_ticket_id, tt.depth + 1
  FROM ticket_hierarchy th
  JOIN ticket_tree tt ON th.child_ticket_id = tt.parent_ticket_id
  WHERE tt.depth < 10
)
SELECT * FROM ticket_tree
WHERE parent_ticket_id = child_ticket_id;

-- Fix: Remove circular relationships
DELETE FROM ticket_hierarchy WHERE id IN (...);
```

---

## API Changes

### Before Refactoring

```typescript
// Old: Query tickets with VARCHAR filters
const tickets = await sql`
  SELECT * FROM tickets 
  WHERE status = 'open' 
  AND priority = 'high'
`;
```

### After Refactoring

```typescript
// New: Query tickets with FK joins
const tickets = await sql`
  SELECT 
    t.*,
    ts.code as status_code,
    ts.name as status_name,
    tp.code as priority_code,
    tp.name as priority_name
  FROM tickets t
  JOIN ticket_statuses ts ON ts.id = t.status_id
  JOIN ticket_priorities tp ON tp.id = t.priority_id
  WHERE ts.code = 'open' 
  AND tp.code = 'high'
`;
```

### New Query Patterns

#### Get Ticket with Complete Audit History

```typescript
const ticketWithAudit = await sql`
  SELECT 
    t.*,
    json_agg(
      json_build_object(
        'event_type', tae.event_type,
        'performed_by', u.full_name,
        'created_at', tae.created_at,
        'notes', tae.notes
      ) ORDER BY tae.created_at DESC
    ) as audit_events
  FROM tickets t
  LEFT JOIN ticket_audit_events tae ON tae.ticket_id = t.id
  LEFT JOIN users u ON u.id = tae.performed_by
  WHERE t.id = ${ticketId}
  GROUP BY t.id
`;
```

#### Get Business Group with All SPOCs

```typescript
const groupWithSpocs = await sql`
  SELECT 
    bg.*,
    json_agg(
      json_build_object(
        'user_id', u.id,
        'full_name', u.full_name,
        'email', u.email,
        'spoc_type', bgs.spoc_type
      )
    ) FILTER (WHERE bgs.id IS NOT NULL) as spocs
  FROM business_unit_groups bg
  LEFT JOIN business_group_spocs bgs ON bgs.business_group_id = bg.id AND bgs.is_active = true
  LEFT JOIN users u ON u.id = bgs.user_id
  WHERE bg.id = ${groupId}
  GROUP BY bg.id
`;
```

#### Get Ticket Redirection Chain

```typescript
const redirectionChain = await sql`
  SELECT 
    tr.*,
    bg_from.name as from_group_name,
    bg_to.name as to_group_name,
    u_from.full_name as from_spoc_name,
    u_to.full_name as to_spoc_name,
    u_by.full_name as redirected_by_name
  FROM ticket_redirections tr
  JOIN business_unit_groups bg_from ON bg_from.id = tr.from_business_group_id
  JOIN business_unit_groups bg_to ON bg_to.id = tr.to_business_group_id
  LEFT JOIN users u_from ON u_from.id = tr.from_spoc_user_id
  LEFT JOIN users u_to ON u_to.id = tr.to_spoc_user_id
  JOIN users u_by ON u_by.id = tr.redirected_by
  WHERE tr.ticket_id = ${ticketId}
  ORDER BY tr.redirected_at ASC
`;
```

---

## Performance Considerations

### Index Strategy

All new tables include optimized indexes:

1. **Single-column indexes**: For FK columns and frequently filtered columns
2. **Composite indexes**: For common query patterns
3. **Partial indexes**: For filtered queries (e.g., `WHERE is_active = true`)

### Query Optimization

**Before** (40+ column table scan):
```sql
SELECT * FROM tickets WHERE status = 'open';
-- Scans 40+ columns, string comparison
```

**After** (focused table, integer comparison):
```sql
SELECT t.* FROM tickets t
JOIN ticket_statuses ts ON ts.id = t.status_id
WHERE ts.code = 'open';
-- Scans ~20 columns, integer comparison, indexed
```

### Storage Optimization

**Estimated Storage Reduction**:
- Tickets table: ~40% reduction (40+ columns → ~20 columns)
- Eliminated VARCHAR duplicates: ~10-15% reduction
- Normalized master data: Minimal overhead (small tables)

**Net Result**: ~35% storage reduction for tickets table.

---

## Next Steps

### Immediate Actions

1. ✅ Review all migration scripts
2. ✅ Test on local development database
3. ⏳ Update application code to use new entity structure
4. ⏳ Run integration tests
5. ⏳ Deploy to staging environment
6. ⏳ Verify data integrity
7. ⏳ Deploy to production
8. ⏳ Drop legacy columns

### Future Enhancements

1. **Add more event types**: Support custom audit events
2. **Extend hierarchy**: Support more relationship types
3. **SPOC rotation**: Track SPOC assignment history
4. **Role-based permissions**: Link `user_roles` to `role_permissions` table
5. **Soft delete for all tables**: Implement consistent soft delete strategy

---

## Summary

This refactoring transforms a messy, denormalized schema into a clean, maintainable entity-relationship model:

**Before**:
- 1 bloated `tickets` table with 40+ mixed-concern columns
- String-based SPOC management
- VARCHAR-based master data
- Inline audit fields

**After**:
- 10 focused entity tables with single responsibilities
- Proper FK relationships throughout
- Master data tables with rich metadata
- Centralized audit trail
- Separated concerns (projects, redirections, hierarchy)

**Result**: Better data integrity, improved performance, easier maintenance, and cleaner code.
