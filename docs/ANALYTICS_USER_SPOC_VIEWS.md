# Analytics - User and SPOC Views

## Overview
Comprehensive analytics views for tracking tickets by Initiators, SPOCs, and Assignees with status breakdowns. The analytics automatically filter based on the selected tab (Initiator vs Target group).

## Implemented Analytics

### 1. **Tickets by Initiators** (Total)
- Shows all tickets created by users in the group
- Displays top 20 initiators by total ticket count
- Horizontal bar chart for easy comparison
- **Filter Context**: When "Ticket By Initiator" tab is selected, shows only tickets where the user's group is the initiator

### 2. **Tickets by Initiators (Open Status)**
- Shows only open tickets by initiators
- Helps identify who has the most pending tickets
- Red color coding for open status

### 3. **Tickets by Initiators (Resolved Status)**
- Shows resolved tickets by initiators
- Green color coding for resolved status
- Useful for tracking resolution rates per initiator

### 4. **Tickets by Target Group**
- Shows tickets assigned to the target group
- **Filter Context**: When "Ticket Target Group" tab is selected, shows only tickets where the user's group is the target

### 5. **Tickets by SPOC** (Total)
- Shows all tickets handled by each SPOC
- Top 20 SPOCs by total ticket count
- Indigo color for total counts

### 6. **Tickets by SPOC (Open Status)**
- Open tickets per SPOC
- Helps identify SPOC workload
- Red color coding

### 7. **Tickets by SPOC (On-Hold Status)**
- Tickets on hold per SPOC
- Amber color coding
- Useful for tracking blocked tickets

### 8. **Tickets by SPOC (Resolved Status)**
- Resolved tickets per SPOC
- Green color coding
- Performance tracking metric

### 9. **Tickets by Assignee** (Total)
- Shows all tickets assigned to each user
- Top 20 assignees by total ticket count
- Helps distribute workload

### 10. **Tickets by Assignee (Open Status)**
- Open tickets per assignee
- Red color coding
- Workload monitoring

### 11. **Tickets by Assignee (On-Hold Status)**
- On-hold tickets per assignee
- Amber color coding
- Identifies blocked work

### 12. **Tickets by Assignee (Resolved Status)**
- Resolved tickets per assignee
- Green color coding
- Performance metric

### 13. **Tickets Trend (by period selection)**
- Existing trend chart
- Respects the duration filter (Last Day, 1 Week, 1 Month, 3 Months, All)
- Shows ticket volume over time

### 14. **Annual Ticket Trend (Last 12 Months)**
- Multi-line chart showing all statuses
- Monthly breakdown for the past year
- Lines for: Total, Open, Resolved, On-Hold, Closed
- Helps identify seasonal patterns

## Tab-Based Filtering

### Initiator Tab ("Ticket By Initiator")
When this tab is selected:
- **Initiator charts**: Show tickets where the logged-in user's group created the ticket
- **Target charts** (SPOC/Assignee): Show all tickets (no additional filtering)
- Chart titles include "(Your Group)" indicator

### Target Tab ("Ticket Target Group")
When this tab is selected:
- **Initiator charts**: Show all tickets (no additional filtering)
- **Target charts** (SPOC/Assignee): Show tickets where the logged-in user's group is the target
- Chart titles include "(Your Group)" indicator

## Color Coding

| Status | Color | Hex Code |
|--------|-------|----------|
| Total | Indigo | #6366f1 |
| Open | Red | #ef4444 |
| Resolved | Green | #10b981 |
| On-Hold | Amber | #f59e0b |
| Closed | Slate | #64748b |

## Database Queries

### New Queries Added to `lib/actions/stats.ts`:

#### 1. `ticketsByInitiators`
```sql
SELECT 
  u.full_name as initiator,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE t.status = 'open') as open,
  COUNT(*) FILTER (WHERE t.status = 'resolved') as resolved,
  COUNT(*) FILTER (WHERE t.status = 'on-hold') as on_hold,
  COUNT(*) FILTER (WHERE t.status = 'closed') as closed
FROM tickets t
LEFT JOIN users u ON t.created_by = u.id
WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
  AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
  AND t.business_unit_group_id = ANY(${businessGroupIds})
  AND u.full_name IS NOT NULL
GROUP BY u.full_name
ORDER BY total DESC
LIMIT 20
```

#### 2. `ticketsBySpocDetailed`
```sql
SELECT 
  u.full_name as spoc,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE t.status = 'open') as open,
  COUNT(*) FILTER (WHERE t.status = 'resolved') as resolved,
  COUNT(*) FILTER (WHERE t.status = 'on-hold') as on_hold,
  COUNT(*) FILTER (WHERE t.status = 'closed') as closed
FROM tickets t
LEFT JOIN users u ON t.spoc_user_id = u.id
WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
  AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
  AND ${groupFilterCondition}
  AND u.full_name IS NOT NULL
GROUP BY u.full_name
ORDER BY total DESC
LIMIT 20
```

#### 3. `ticketsByAssignee`
```sql
SELECT 
  u.full_name as assignee,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE t.status = 'open') as open,
  COUNT(*) FILTER (WHERE t.status = 'resolved') as resolved,
  COUNT(*) FILTER (WHERE t.status = 'on-hold') as on_hold,
  COUNT(*) FILTER (WHERE t.status = 'closed') as closed
FROM tickets t
LEFT JOIN users u ON t.assigned_to = u.id
WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
  AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
  AND ${groupFilterCondition}
  AND u.full_name IS NOT NULL
GROUP BY u.full_name
ORDER BY total DESC
LIMIT 20
```

#### 4. `annualTrend`
```sql
SELECT 
  TO_CHAR(DATE_TRUNC('month', t.created_at), 'Mon YYYY') as month,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE t.status = 'open') as open,
  COUNT(*) FILTER (WHERE t.status = 'resolved') as resolved,
  COUNT(*) FILTER (WHERE t.status = 'on-hold') as on_hold,
  COUNT(*) FILTER (WHERE t.status = 'closed') as closed
FROM tickets t
WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
  AND t.created_at >= CURRENT_DATE - INTERVAL '12 months'
  AND ${groupFilterCondition}
GROUP BY DATE_TRUNC('month', t.created_at)
ORDER BY DATE_TRUNC('month', t.created_at) ASC
```

## Chart Specifications

### Layout
- All charts use horizontal bar charts for user/SPOC/assignee views
- Left margin: 100px for names
- Height: 300px per chart
- Width: 100% responsive

### Styling
- Rounded bar corners: `radius={[0, 4, 4, 0]}`
- Grid: Dashed lines with opacity 0.6
- Axis: No lines, only ticks
- Font sizes: 11px for axis, 10px for small text

### Interactivity
- Hover tooltips showing exact counts
- Legend at bottom of each chart
- Custom tooltip with color indicators

## Usage

### For Super Admins
- Can select any business group from dropdown
- See analytics for selected group or all groups

### For Regular Users
- Automatically filtered to their business group
- Tab selection determines initiator vs target filtering

### For SPOCs
- See tickets for all groups they manage
- Tab selection applies to all managed groups

## Performance Considerations

1. **Limit to Top 20**: All user-based queries limited to top 20 to prevent overwhelming charts
2. **Date Filtering**: All queries respect the duration filter for performance
3. **Indexed Columns**: Queries use indexed columns (created_at, status, user IDs)
4. **Efficient Aggregation**: Uses PostgreSQL's FILTER clause for efficient status counting

## Future Enhancements

Potential additions:
- Export functionality for each chart
- Drill-down to see individual tickets
- Comparison between time periods
- Average resolution time per user
- SLA compliance per SPOC/Assignee
- Custom date range selection
