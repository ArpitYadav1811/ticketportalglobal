# Entity Server Actions

## Overview

This folder contains server actions for the new, clean entity structure. Each file corresponds to a specific entity or domain concern.

## File Structure

```
lib/actions/entities/
├── ticket-audit.ts           # Ticket audit events and timeline
├── ticket-projects.ts         # Ticket-project associations
├── ticket-redirections.ts     # Ticket redirection history
├── ticket-hierarchy.ts        # Parent-child ticket relationships
├── business-group-spocs.ts    # SPOC management
├── master-data.ts             # Statuses, priorities, types, roles
└── README.md                  # This file
```

## Usage Examples

### Ticket Audit Events

```typescript
import { 
  createTicketAuditEvent, 
  getTicketAuditEvents 
} from '@/lib/actions/entities/ticket-audit'

// Log a ticket event
await createTicketAuditEvent(
  ticketId,
  'status_changed',
  userId,
  'open',
  'resolved',
  'Ticket resolved by developer'
)

// Get complete audit timeline
const timeline = await getTicketAuditEvents(ticketId)
```

### Business Group SPOCs

```typescript
import { 
  getPrimarySpoc,
  getAllSpocs,
  isUserPrimarySpoc,
  assignPrimarySpoc 
} from '@/lib/actions/entities/business-group-spocs'

// Get primary SPOC
const primarySpoc = await getPrimarySpoc(businessGroupId)

// Check if user is primary SPOC
const isPrimary = await isUserPrimarySpoc(userId, businessGroupId)

// Assign new primary SPOC
await assignPrimarySpoc(businessGroupId, newSpocUserId, adminUserId)
```

### Ticket Projects

```typescript
import { 
  linkTicketToProject,
  getTicketProject,
  getTicketsForProject 
} from '@/lib/actions/entities/ticket-projects'

// Link ticket to project
await linkTicketToProject(ticketId, projectId, releaseId, releaseDate, userId)

// Get project details for ticket
const project = await getTicketProject(ticketId)

// Get all tickets for a project
const tickets = await getTicketsForProject(projectId)
```

### Ticket Hierarchy

```typescript
import { 
  linkTickets,
  getTicketChildren,
  getTicketTree 
} from '@/lib/actions/entities/ticket-hierarchy'

// Create parent-child relationship
await linkTickets(parentId, childId, 'subtask', userId)

// Get all children
const children = await getTicketChildren(parentId)

// Get complete ticket tree
const tree = await getTicketTree(rootTicketId)
```

### Ticket Redirections

```typescript
import { 
  createTicketRedirection,
  getTicketRedirections,
  getRedirectionStatistics 
} from '@/lib/actions/entities/ticket-redirections'

// Record a redirection
await createTicketRedirection(
  ticketId,
  fromGroupId,
  toGroupId,
  'Redirected to correct team',
  userId,
  fromSpocId,
  toSpocId
)

// Get redirection history
const history = await getTicketRedirections(ticketId)

// Get redirection stats
const stats = await getRedirectionStatistics(businessGroupId, startDate, endDate)
```

### Master Data

```typescript
import { 
  getAllTicketStatuses,
  getAllTicketPriorities,
  getTicketStatusByCode,
  getMasterDataForTicketForm 
} from '@/lib/actions/entities/master-data'

// Get all statuses
const statuses = await getAllTicketStatuses()

// Get status by code
const openStatus = await getTicketStatusByCode('open')

// Get all master data at once (for forms)
const { statuses, priorities, types } = await getMasterDataForTicketForm()
```

## Migration Path

### Phase 1: Dual-Read (Current)

Application reads from BOTH old and new structures:

```typescript
// Read from both old and new
const status = ticket.status_id 
  ? await getTicketStatusById(ticket.status_id)
  : ticket.status // Fallback to VARCHAR
```

### Phase 2: Dual-Write

Application writes to BOTH old and new structures:

```typescript
// Update both old and new columns
await sql`
  UPDATE tickets 
  SET 
    status = ${statusCode},
    status_id = ${statusId}
  WHERE id = ${ticketId}
`

// Also create audit event
await createTicketAuditEvent(ticketId, 'status_changed', userId, oldStatus, newStatus)
```

### Phase 3: New-Only (After Migration)

Application uses ONLY new entity structure:

```typescript
// Only update new column
await sql`
  UPDATE tickets 
  SET status_id = ${statusId}
  WHERE id = ${ticketId}
`

// Audit event created automatically by trigger
```

## Benefits

### 1. Separation of Concerns

Each file handles a specific domain:
- Audit events separate from ticket data
- Project associations separate from ticket core
- SPOC management independent of business groups

### 2. Type Safety

All functions use TypeScript types from `types/entities.ts`:

```typescript
function createTicketAuditEvent(
  ticketId: number,
  eventType: TicketEventType, // Type-safe enum
  performedBy: number,
  ...
): Promise<TicketAuditEvent> // Type-safe return
```

### 3. Reusability

Functions are modular and reusable:

```typescript
// Reuse in multiple places
const isPrimary = await isUserPrimarySpoc(userId, groupId)
if (isPrimary) {
  // Allow primary SPOC actions
}
```

### 4. Testability

Each function can be unit tested independently:

```typescript
describe('createTicketAuditEvent', () => {
  it('should create audit event with correct data', async () => {
    const event = await createTicketAuditEvent(1, 'created', 5)
    expect(event.event_type).toBe('created')
    expect(event.performed_by).toBe(5)
  })
})
```

## Best Practices

### 1. Always Use Transactions for Related Operations

```typescript
// Good: Use transaction for related operations
await sql.begin(async (sql) => {
  await sql`UPDATE tickets SET status_id = ${newStatusId} WHERE id = ${ticketId}`
  await createTicketAuditEvent(ticketId, 'status_changed', userId, oldStatus, newStatus)
})
```

### 2. Validate Foreign Keys

```typescript
// Good: Validate before insert
const status = await getTicketStatusById(statusId)
if (!status) {
  throw new Error(`Invalid status ID: ${statusId}`)
}
```

### 3. Use Proper Error Handling

```typescript
// Good: Handle errors gracefully
try {
  await linkTickets(parentId, childId, 'subtask', userId)
} catch (error) {
  if (error.message.includes('Circular relationship')) {
    // Handle circular relationship error
  }
  throw error
}
```

### 4. Leverage Database Functions

```typescript
// Good: Use database functions for complex queries
const result = await sql`SELECT * FROM get_ticket_audit_timeline(${ticketId})`
```

## Integration with Existing Code

### Updating Existing Server Actions

When updating existing server actions (e.g., `lib/actions/tickets.ts`):

1. **Import new entity functions**:
```typescript
import { createTicketAuditEvent } from './entities/ticket-audit'
import { linkTicketToProject } from './entities/ticket-projects'
```

2. **Replace inline operations with entity functions**:
```typescript
// Old: Inline audit
await sql`UPDATE tickets SET closed_by = ${userId}, closed_at = NOW() WHERE id = ${ticketId}`

// New: Use entity function
await createTicketAuditEvent(ticketId, 'closed', userId, null, 'closed', 'Ticket closed')
```

3. **Use proper FK columns**:
```typescript
// Old: VARCHAR
await sql`SELECT * FROM tickets WHERE status = 'open'`

// New: FK with join
await sql`
  SELECT t.*, ts.name as status_name
  FROM tickets t
  JOIN ticket_statuses ts ON ts.id = t.status_id
  WHERE ts.code = 'open'
`
```

## Next Steps

1. Update `lib/actions/tickets.ts` to use entity functions
2. Update `lib/actions/stats.ts` for analytics queries
3. Update `lib/actions/permissions.ts` to use new SPOC functions
4. Update frontend components to use new types
5. Add comprehensive tests for each entity function
6. Deploy and monitor for issues
