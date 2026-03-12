# Role-Based Permission Management System - Proposal

## 🎯 Overview

This document outlines a comprehensive **Role-Based Access Control (RBAC)** system that allows Super Admins to configure granular permissions for each role, controlling:
- **Ticket Visibility**: Who can see tickets (own group, other groups, all tickets)
- **Analytics Access**: Who can view analytics (own group, other groups, all groups)
- **Feature Access**: Fine-grained control over all system features

## 📊 Current System vs. Proposed System

### Current System (Hardcoded Permissions)
- ✅ 4 roles: Super Admin, Admin, Manager (SPOC), User
- ❌ Permissions are hardcoded in code
- ❌ Cannot customize permissions per role
- ❌ Changes require code modifications

### Proposed System (Database-Driven Permissions)
- ✅ 4 roles: Super Admin, Admin, Manager (SPOC), User
- ✅ Permissions stored in database
- ✅ Configurable via Admin Dashboard UI
- ✅ No code changes needed to update permissions
- ✅ Granular control at feature level

---

## 🗄️ Database Schema

### New Table: `role_permissions`

```sql
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  permission_value TEXT, -- JSON string for complex permissions
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission_key)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_key ON role_permissions(permission_key);
```

### Permission Keys Structure

#### Ticket Visibility Permissions
- `tickets.view_scope` - Values: `"own"`, `"own_group"`, `"all_groups"`, `"all"`
- `tickets.view_own_created` - Boolean
- `tickets.view_own_assigned` - Boolean
- `tickets.view_group_tickets` - Boolean
- `tickets.view_all_tickets` - Boolean

#### Ticket Edit Permissions
- `tickets.edit_own` - Boolean (Edit tickets created by user)
- `tickets.edit_group` - Boolean (Edit tickets in user's group)
- `tickets.edit_all` - Boolean (Edit all tickets)
- `tickets.edit_title` - Boolean (Can edit ticket title)
- `tickets.edit_description` - Boolean (Can edit ticket description)
- `tickets.edit_category` - Boolean (Can change category/subcategory)
- `tickets.edit_project` - Boolean (Can assign/change project)

#### Ticket Delete Permissions
- `tickets.delete_own` - Boolean (Delete own created tickets)
- `tickets.delete_group` - Boolean (Delete tickets in user's group)
- `tickets.delete_all` - Boolean (Delete any ticket)
- `tickets.soft_delete` - Boolean (Mark as deleted, can restore)
- `tickets.hard_delete` - Boolean (Permanent deletion, Super Admin only)

#### Ticket Assignment Permissions
- `tickets.assign_tickets` - Boolean (Can assign tickets to users)
- `tickets.assign_to_own_group` - Boolean (Can assign only within own group)
- `tickets.assign_to_any_group` - Boolean (Can assign to any group)
- `tickets.assign_to_self` - Boolean (Can assign tickets to self)
- `tickets.reassign_tickets` - Boolean (Can reassign already assigned tickets)
- `tickets.unassign_tickets` - Boolean (Can remove assignment)

#### Ticket Redirection Permissions
- `tickets.redirect_tickets` - Boolean (Can redirect tickets to other groups)
- `tickets.redirect_to_own_group` - Boolean (Can redirect only to own group)
- `tickets.redirect_to_any_group` - Boolean (Can redirect to any group)
- `tickets.redirect_from_own_group` - Boolean (Can redirect tickets from own group)
- `tickets.redirect_from_any_group` - Boolean (Can redirect tickets from any group)

#### Ticket Status Change Permissions
- `tickets.change_status` - JSON array of allowed statuses: `["open", "on-hold", "resolved", "closed", "deleted"]`
- `tickets.change_to_open` - Boolean
- `tickets.change_to_on_hold` - Boolean
- `tickets.change_to_resolved` - Boolean
- `tickets.change_to_closed` - Boolean
- `tickets.change_to_deleted` - Boolean
- `tickets.reopen_tickets` - Boolean (Can reopen closed/resolved tickets)

#### Ticket Comment & Attachment Permissions
- `tickets.add_comments` - Boolean (Can add comments)
- `tickets.edit_comments` - Boolean (Can edit own comments)
- `tickets.delete_comments` - Boolean (Can delete own comments)
- `tickets.delete_any_comment` - Boolean (Can delete any comment)
- `tickets.upload_attachments` - Boolean (Can upload attachments)
- `tickets.delete_attachments` - Boolean (Can delete attachments)
- `tickets.delete_any_attachment` - Boolean (Can delete any attachment)

#### Ticket Creation & Management Permissions
- `tickets.create_tickets` - Boolean (Can create new tickets)
- `tickets.create_internal_tickets` - Boolean (Can create internal tickets)
- `tickets.create_customer_tickets` - Boolean (Can create customer tickets)
- `tickets.view_audit_log` - Boolean (Can view ticket audit/history)
- `tickets.export_tickets` - Boolean (Can export ticket data)

#### Analytics Permissions
- `analytics.view_scope` - Values: `"own_group"`, `"selected_groups"`, `"all_groups"`, `"spoc_groups"`, `"initiator_groups"`, `"spoc_or_initiator"`, `"team_member_groups"`, `"team_spoc_groups"`, `"combined"`
- `analytics.view_own_group` - Boolean
- `analytics.view_spoc_groups` - Boolean (Groups where user is SPOC)
- `analytics.view_initiator_groups` - Boolean (Groups where user created tickets)
- `analytics.view_spoc_or_initiator` - Boolean (Groups where user is SPOC OR Initiator)
- `analytics.view_team_member_groups` - Boolean (Groups of team members)
- `analytics.view_team_spoc_groups` - Boolean (Groups where team members are SPOC)
- `analytics.view_combined` - Boolean (Combination: own + SPOC + Initiator + team member groups)
- `analytics.view_other_groups` - Boolean
- `analytics.view_all_groups` - Boolean
- `analytics.export_data` - Boolean
- `analytics.group_selector_enabled` - Boolean (Allow Super Admin to select groups)

#### Feature Access Permissions
- `features.admin_dashboard` - Boolean
- `features.user_management` - Boolean
- `features.master_data` - Boolean
- `features.teams` - Boolean
- `features.analytics` - Boolean
- `features.settings` - Boolean
- `features.audit_logs` - Boolean

#### Business Group Permissions
- `business_groups.view_own` - Boolean
- `business_groups.view_all` - Boolean
- `business_groups.manage_own` - Boolean
- `business_groups.manage_all` - Boolean

---

## 🎨 Admin Dashboard UI Design

### New Tab: "Role Permissions"

Location: `/admin` → New Tab: "Role Permissions"

#### Layout:
```
┌─────────────────────────────────────────────────────────┐
│  Role Permissions Management                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Select Role: ▼] [Super Admin]                         │
│                                                          │
│  ┌─ Ticket Visibility ────────────────────────────┐  │
│  │ ☑ View Own Created Tickets                        │  │
│  │ ☑ View Own Assigned Tickets                       │  │
│  │ ☑ View Group Tickets                              │  │
│  │ ☐ View All Tickets                                │  │
│  │                                                     │  │
│  │ View Scope: [Own Group ▼]                         │  │
│  │   Options: Own | Own Group | All Groups | All      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Ticket Edit Permissions ────────────────────────┐  │
│  │ ☑ Edit Own Tickets                                │  │
│  │ ☑ Edit Group Tickets                               │  │
│  │ ☐ Edit All Tickets                                 │  │
│  │                                                     │  │
│  │ Detailed Edit Permissions:                          │  │
│  │   ☑ Edit Title                                     │  │
│  │   ☑ Edit Description                               │  │
│  │   ☑ Edit Category/Subcategory                      │  │
│  │   ☑ Edit Project                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Ticket Delete Permissions ──────────────────────┐  │
│  │ ☑ Delete Own Tickets                               │  │
│  │ ☐ Delete Group Tickets                             │  │
│  │ ☐ Delete All Tickets                               │  │
│  │                                                     │  │
│  │ Delete Type:                                        │  │
│  │   ☑ Soft Delete (can restore)                      │  │
│  │   ☐ Hard Delete (permanent, Super Admin only)      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Ticket Assignment Permissions ───────────────────┐  │
│  │ ☑ Assign Tickets                                   │  │
│  │                                                     │  │
│  │ Assignment Scope:                                  │  │
│  │   ☑ Assign to Own Group                            │  │
│  │   ☐ Assign to Any Group                            │  │
│  │   ☑ Assign to Self                                 │  │
│  │                                                     │  │
│  │ ☑ Reassign Tickets                                 │  │
│  │ ☑ Unassign Tickets                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Ticket Redirection Permissions ─────────────────┐  │
│  │ ☑ Redirect Tickets                                 │  │
│  │                                                     │  │
│  │ Redirection Scope:                                 │  │
│  │   ☑ Redirect to Own Group                          │  │
│  │   ☐ Redirect to Any Group                          │  │
│  │   ☑ Redirect from Own Group                        │  │
│  │   ☐ Redirect from Any Group                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Ticket Status Change Permissions ────────────────┐  │
│  │ Allowed Status Changes:                            │  │
│  │   ☑ Open                                           │  │
│  │   ☑ On-Hold                                        │  │
│  │   ☑ Resolved                                       │  │
│  │   ☑ Closed                                         │  │
│  │   ☐ Deleted                                        │  │
│  │                                                     │  │
│  │ ☑ Reopen Tickets (from closed/resolved)            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Ticket Comments & Attachments ──────────────────┐  │
│  │ ☑ Add Comments                                     │  │
│  │ ☑ Edit Own Comments                                │  │
│  │ ☑ Delete Own Comments                              │  │
│  │ ☐ Delete Any Comment                               │  │
│  │                                                     │  │
│  │ ☑ Upload Attachments                               │  │
│  │ ☑ Delete Own Attachments                           │  │
│  │ ☐ Delete Any Attachment                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Ticket Creation & Other ────────────────────────┐  │
│  │ ☑ Create Tickets                                   │  │
│  │   ☑ Create Internal Tickets                        │  │
│  │   ☑ Create Customer Tickets                        │  │
│  │                                                     │  │
│  │ ☑ View Audit Log                                   │  │
│  │ ☑ Export Tickets                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Analytics Access ───────────────────────────────┐  │
│  │                                                     │  │
│  │ View Scope: [Combined ▼]                           │  │
│  │   Options:                                          │  │
│  │     • Own Group                                     │  │
│  │     • SPOC Groups (where I'm SPOC)                 │  │
│  │     • Initiator Groups (where I created tickets)    │  │
│  │     • SPOC or Initiator (either relationship)      │  │
│  │     • Team Member Groups                            │  │
│  │     • Team SPOC Groups (where team members SPOC)  │  │
│  │     • Combined (Own + SPOC + Initiator + Team)    │  │
│  │     • Selected Groups (manual selection)           │  │
│  │     • All Groups                                    │  │
│  │                                                     │  │
│  │ Individual Permissions:                             │  │
│  │   ☑ View Own Group Analytics                       │  │
│  │   ☑ View SPOC Groups Analytics                     │  │
│  │   ☑ View Initiator Groups Analytics                │  │
│  │   ☑ View SPOC or Initiator Analytics               │  │
│  │   ☑ View Team Member Groups Analytics              │  │
│  │   ☑ View Team SPOC Groups Analytics                │  │
│  │   ☐ View Combined Analytics                        │  │
│  │   ☐ View Other Groups Analytics                    │  │
│  │   ☐ View All Groups Analytics                      │  │
│  │                                                     │  │
│  │ ☑ Export Analytics Data                            │  │
│  │ ☑ Enable Group Selector (for Super Admin)         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Feature Access ──────────────────────────────────┐  │
│  │ ☑ Admin Dashboard                                  │  │
│  │ ☑ User Management                                  │  │
│  │ ☑ Master Data                                      │  │
│  │ ☑ Teams                                            │  │
│  │ ☑ Analytics                                        │  │
│  │ ☑ Settings                                         │  │
│  │ ☑ Audit Logs                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Business Group Access ───────────────────────────┐  │
│  │ ☑ View Own Business Group                          │  │
│  │ ☐ View All Business Groups                         │  │
│  │ ☑ Manage Own Business Group                        │  │
│  │ ☐ Manage All Business Groups                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  [Save Permissions] [Reset to Default] [Export Config] │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Database & Backend (Week 1)

1. **Create Database Schema**
   - Create `role_permissions` table
   - Create migration script
   - Add default permissions for existing roles

2. **Backend Functions** (`lib/actions/permissions.ts`)
   ```typescript
   - getRolePermissions(role: string)
   - updateRolePermissions(role: string, permissions: object)
   - checkPermission(userId: number, permissionKey: string): boolean
   - hasTicketViewAccess(userId: number, ticketId: number): boolean
   - hasAnalyticsAccess(userId: number, groupId?: number): boolean
   - getDefaultPermissions(role: string)
   ```

3. **Update Existing Functions**
   - Modify `getTickets()` to check permissions
   - Modify `getAnalyticsData()` to check permissions
   - Add permission checks to all ticket operations

### Phase 2: Admin Dashboard UI (Week 2)

1. **Create Permission Management Component**
   - `components/admin/role-permissions-manager.tsx`
   - Form with all permission checkboxes
   - Role selector dropdown
   - Save/Reset functionality

2. **Add to Admin Dashboard**
   - New tab in `/app/admin/page.tsx`
   - Integrate permission manager component

### Phase 3: Integration (Week 3)

1. **Update Ticket Views**
   - Filter tickets based on permissions
   - Hide/show actions based on permissions

2. **Update Analytics Views**
   - Filter analytics based on permissions
   - Show/hide group selector based on permissions

3. **Update Navigation**
   - Hide menu items based on permissions
   - Show/hide features based on permissions

---

## 📋 Default Permissions Matrix

### Super Admin (Default)
```json
{
  "tickets.view_scope": "all",
  "tickets.view_all_tickets": true,
  "tickets.edit_all": true,
  "tickets.delete_all": true,
  "tickets.assign_tickets": true,
  "tickets.change_status": ["open", "on-hold", "resolved", "closed", "deleted"],
  "analytics.view_scope": "all_groups",
  "analytics.view_all_groups": true,
  "analytics.export_data": true,
  "features.admin_dashboard": true,
  "features.user_management": true,
  "features.master_data": true,
  "features.teams": true,
  "features.analytics": true,
  "features.settings": true,
  "features.audit_logs": true,
  "business_groups.view_all": true,
  "business_groups.manage_all": true
}
```

### Admin (Default)
```json
{
  "tickets.view_scope": "all_groups",
  "tickets.view_all_tickets": true,
  "tickets.edit_all": true,
  "tickets.edit_title": true,
  "tickets.edit_description": true,
  "tickets.edit_category": true,
  "tickets.edit_project": true,
  "tickets.delete_all": false,
  "tickets.soft_delete": true,
  "tickets.hard_delete": false,
  "tickets.assign_tickets": true,
  "tickets.assign_to_own_group": true,
  "tickets.assign_to_any_group": true,
  "tickets.assign_to_self": true,
  "tickets.reassign_tickets": true,
  "tickets.unassign_tickets": true,
  "tickets.redirect_tickets": true,
  "tickets.redirect_to_own_group": true,
  "tickets.redirect_to_any_group": true,
  "tickets.redirect_from_own_group": true,
  "tickets.redirect_from_any_group": true,
  "tickets.change_status": ["open", "on-hold", "resolved", "closed"],
  "tickets.change_to_open": true,
  "tickets.change_to_on_hold": true,
  "tickets.change_to_resolved": true,
  "tickets.change_to_closed": true,
  "tickets.change_to_deleted": false,
  "tickets.reopen_tickets": true,
  "tickets.add_comments": true,
  "tickets.edit_comments": true,
  "tickets.delete_comments": true,
  "tickets.delete_any_comment": true,
  "tickets.upload_attachments": true,
  "tickets.delete_attachments": true,
  "tickets.delete_any_attachment": true,
  "tickets.create_tickets": true,
  "tickets.create_internal_tickets": true,
  "tickets.create_customer_tickets": true,
  "tickets.view_audit_log": true,
  "tickets.export_tickets": true,
  "analytics.view_scope": "all_groups",
  "analytics.view_own_group": true,
  "analytics.view_spoc_groups": true,
  "analytics.view_initiator_groups": true,
  "analytics.view_spoc_or_initiator": true,
  "analytics.view_team_member_groups": true,
  "analytics.view_team_spoc_groups": true,
  "analytics.view_combined": true,
  "analytics.view_all_groups": true,
  "analytics.export_data": true,
  "analytics.group_selector_enabled": true,
  "features.admin_dashboard": false,
  "features.user_management": true,
  "features.master_data": true,
  "features.teams": true,
  "features.analytics": true,
  "features.settings": true,
  "features.audit_logs": false,
  "business_groups.view_all": true,
  "business_groups.manage_all": true
}
```

### Manager/SPOC (Default)
```json
{
  "tickets.view_scope": "own_group",
  "tickets.view_own_created": true,
  "tickets.view_own_assigned": true,
  "tickets.view_group_tickets": true,
  "tickets.edit_group": true,
  "tickets.edit_title": false,
  "tickets.edit_description": false,
  "tickets.edit_category": true,
  "tickets.edit_project": true,
  "tickets.delete_own": true,
  "tickets.soft_delete": true,
  "tickets.hard_delete": false,
  "tickets.assign_tickets": true,
  "tickets.assign_to_own_group": true,
  "tickets.assign_to_any_group": false,
  "tickets.assign_to_self": true,
  "tickets.reassign_tickets": true,
  "tickets.unassign_tickets": true,
  "tickets.redirect_tickets": true,
  "tickets.redirect_to_own_group": true,
  "tickets.redirect_to_any_group": false,
  "tickets.redirect_from_own_group": true,
  "tickets.redirect_from_any_group": false,
  "tickets.change_status": ["on-hold", "resolved"],
  "tickets.change_to_open": false,
  "tickets.change_to_on_hold": true,
  "tickets.change_to_resolved": true,
  "tickets.change_to_closed": false,
  "tickets.change_to_deleted": false,
  "tickets.reopen_tickets": false,
  "tickets.add_comments": true,
  "tickets.edit_comments": true,
  "tickets.delete_comments": true,
  "tickets.delete_any_comment": false,
  "tickets.upload_attachments": true,
  "tickets.delete_attachments": true,
  "tickets.delete_any_attachment": false,
  "tickets.create_tickets": true,
  "tickets.create_internal_tickets": true,
  "tickets.create_customer_tickets": true,
  "tickets.view_audit_log": true,
  "tickets.export_tickets": false,
  "analytics.view_scope": "combined",
  "analytics.view_own_group": true,
  "analytics.view_spoc_groups": true,
  "analytics.view_initiator_groups": true,
  "analytics.view_spoc_or_initiator": true,
  "analytics.view_team_member_groups": false,
  "analytics.view_team_spoc_groups": false,
  "analytics.view_combined": true,
  "analytics.view_other_groups": false,
  "analytics.view_all_groups": false,
  "analytics.export_data": false,
  "analytics.group_selector_enabled": false,
  "features.admin_dashboard": false,
  "features.user_management": false,
  "features.master_data": false,
  "features.teams": false,
  "features.analytics": true,
  "features.settings": false,
  "features.audit_logs": false,
  "business_groups.view_own": true,
  "business_groups.manage_own": false
}
```

### User (Default)
```json
{
  "tickets.view_scope": "own",
  "tickets.view_own_created": true,
  "tickets.view_own_assigned": true,
  "tickets.edit_own": true,
  "tickets.edit_title": true,
  "tickets.edit_description": true,
  "tickets.edit_category": false,
  "tickets.edit_project": false,
  "tickets.delete_own": true,
  "tickets.soft_delete": true,
  "tickets.hard_delete": false,
  "tickets.assign_tickets": false,
  "tickets.assign_to_own_group": false,
  "tickets.assign_to_any_group": false,
  "tickets.assign_to_self": false,
  "tickets.reassign_tickets": false,
  "tickets.unassign_tickets": false,
  "tickets.redirect_tickets": false,
  "tickets.redirect_to_own_group": false,
  "tickets.redirect_to_any_group": false,
  "tickets.redirect_from_own_group": false,
  "tickets.redirect_from_any_group": false,
  "tickets.change_status": ["closed"],
  "tickets.change_to_open": false,
  "tickets.change_to_on_hold": false,
  "tickets.change_to_resolved": false,
  "tickets.change_to_closed": true,
  "tickets.change_to_deleted": false,
  "tickets.reopen_tickets": false,
  "tickets.add_comments": true,
  "tickets.edit_comments": true,
  "tickets.delete_comments": true,
  "tickets.delete_any_comment": false,
  "tickets.upload_attachments": true,
  "tickets.delete_attachments": true,
  "tickets.delete_any_attachment": false,
  "tickets.create_tickets": true,
  "tickets.create_internal_tickets": true,
  "tickets.create_customer_tickets": true,
  "tickets.view_audit_log": true,
  "tickets.export_tickets": false,
  "analytics.view_scope": "spoc_or_initiator",
  "analytics.view_own_group": true,
  "analytics.view_spoc_groups": false,
  "analytics.view_initiator_groups": true,
  "analytics.view_spoc_or_initiator": true,
  "analytics.view_team_member_groups": false,
  "analytics.view_team_spoc_groups": false,
  "analytics.view_combined": false,
  "analytics.view_other_groups": false,
  "analytics.view_all_groups": false,
  "analytics.export_data": false,
  "analytics.group_selector_enabled": false,
  "features.admin_dashboard": false,
  "features.user_management": false,
  "features.master_data": false,
  "features.teams": false,
  "features.analytics": true,
  "features.settings": false,
  "features.audit_logs": false,
  "business_groups.view_own": true,
  "business_groups.manage_own": false
}
```

---

## 🔐 Permission Checking Flow

### Ticket View Permission Check
```
User requests ticket
    ↓
Check user role
    ↓
Load role permissions from DB
    ↓
Check tickets.view_scope:
    - "own" → Show only user's created/assigned tickets
    - "own_group" → Show tickets from user's business group
    - "all_groups" → Show tickets from all groups
    - "all" → Show all tickets (no filter)
    ↓
Apply additional filters:
    - tickets.view_own_created
    - tickets.view_own_assigned
    - tickets.view_group_tickets
    - tickets.view_all_tickets
    ↓
Return filtered tickets
```

### Analytics View Permission Check
```
User requests analytics
    ↓
Check user role
    ↓
Load role permissions from DB
    ↓
Check analytics.view_scope:
    - "own_group" → Show only user's business group analytics
    - "spoc_groups" → Show groups where user is SPOC
    - "initiator_groups" → Show groups where user created tickets
    - "spoc_or_initiator" → Show groups where user is SPOC OR Initiator
    - "team_member_groups" → Show groups of team members
    - "team_spoc_groups" → Show groups where team members are SPOC
    - "combined" → Show: own + SPOC + Initiator + team member groups
    - "selected_groups" → Show selected groups (if allowed)
    - "all_groups" → Show all groups analytics
    ↓
Apply individual permission checks:
    - analytics.view_own_group
    - analytics.view_spoc_groups
    - analytics.view_initiator_groups
    - analytics.view_spoc_or_initiator
    - analytics.view_team_member_groups
    - analytics.view_team_spoc_groups
    - analytics.view_combined
    - analytics.view_other_groups
    - analytics.view_all_groups
    ↓
Collect all allowed group IDs:
    1. User's own business_group_id (if view_own_group)
    2. Groups where user is SPOC (if view_spoc_groups)
    3. Groups where user created tickets (if view_initiator_groups)
    4. Team members' groups (if view_team_member_groups)
    5. Groups where team members are SPOC (if view_team_spoc_groups)
    ↓
Query analytics data for allowed group IDs
    ↓
Return filtered analytics data
```

---

## 🚀 Benefits

1. **Flexibility**: Change permissions without code changes
2. **Granular Control**: Control access at feature level
3. **Scalability**: Easy to add new permissions
4. **Audit Trail**: Track permission changes
5. **User-Friendly**: Visual UI for permission management
6. **Backward Compatible**: Default permissions match current behavior

---

## 📝 Next Steps

1. **Review this proposal** - Confirm requirements
2. **Create database migration** - Set up `role_permissions` table
3. **Implement backend functions** - Permission checking logic
4. **Build Admin UI** - Permission management interface
5. **Integrate with existing views** - Apply permissions to tickets/analytics
6. **Test thoroughly** - Ensure all permissions work correctly
7. **Documentation** - Update user guides

---

## 🔍 Analytics Permission Examples

### Example 1: SPOC Only
User can view analytics for groups where they are SPOC:
```json
{
  "analytics.view_scope": "spoc_groups",
  "analytics.view_spoc_groups": true
}
```
**Result:** Shows analytics for all business groups where user is assigned as SPOC.

### Example 2: Initiator Only
User can view analytics for groups where they created tickets:
```json
{
  "analytics.view_scope": "initiator_groups",
  "analytics.view_initiator_groups": true
}
```
**Result:** Shows analytics for groups where user has created at least one ticket.

### Example 3: SPOC OR Initiator
User can view analytics for groups where they are SPOC OR created tickets:
```json
{
  "analytics.view_scope": "spoc_or_initiator",
  "analytics.view_spoc_groups": true,
  "analytics.view_initiator_groups": true,
  "analytics.view_spoc_or_initiator": true
}
```
**Result:** Shows analytics for groups where user is SPOC OR has created tickets (union of both).

### Example 4: Team Member Groups
User can view analytics for groups of their team members:
```json
{
  "analytics.view_scope": "team_member_groups",
  "analytics.view_team_member_groups": true
}
```
**Result:** Shows analytics for all business groups that team members belong to.

### Example 5: Team SPOC Groups
User can view analytics for groups where team members are SPOC:
```json
{
  "analytics.view_scope": "team_spoc_groups",
  "analytics.view_team_spoc_groups": true
}
```
**Result:** Shows analytics for all business groups where any team member is assigned as SPOC.

### Example 6: Combined View (Most Common)
User can view analytics for: own group + SPOC groups + Initiator groups + Team member groups:
```json
{
  "analytics.view_scope": "combined",
  "analytics.view_own_group": true,
  "analytics.view_spoc_groups": true,
  "analytics.view_initiator_groups": true,
  "analytics.view_team_member_groups": true,
  "analytics.view_combined": true
}
```
**Result:** Shows analytics for all groups where user has any relationship (own, SPOC, Initiator, or team member).

### Example 7: SPOC AND Initiator (Both Required)
User can view analytics only for groups where they are BOTH SPOC AND Initiator:
```json
{
  "analytics.view_scope": "combined",
  "analytics.view_spoc_groups": true,
  "analytics.view_initiator_groups": true,
  "analytics.view_combined": true
}
```
**Implementation Note:** This would require intersection logic (groups where user is SPOC AND has created tickets).

---

## 🎯 Implementation Details

### Analytics Group ID Collection Logic

When a user requests analytics, the system will:

1. **Get User's Own Group**
   ```sql
   SELECT business_unit_group_id FROM users WHERE id = ${userId}
   ```

2. **Get SPOC Groups**
   ```sql
   SELECT DISTINCT target_business_group_id 
   FROM tickets 
   WHERE spoc_user_id = ${userId}
   ```

3. **Get Initiator Groups**
   ```sql
   SELECT DISTINCT t.target_business_group_id
   FROM tickets t
   JOIN users u ON t.created_by = u.id
   WHERE t.created_by = ${userId}
   ```

4. **Get Team Member Groups**
   ```sql
   SELECT DISTINCT u.business_unit_group_id
   FROM my_team_members mtm
   JOIN users u ON mtm.member_user_id = u.id
   WHERE mtm.lead_user_id = ${userId}
   ```

5. **Get Team SPOC Groups**
   ```sql
   SELECT DISTINCT t.target_business_group_id
   FROM tickets t
   JOIN my_team_members mtm ON t.spoc_user_id = mtm.member_user_id
   WHERE mtm.lead_user_id = ${userId}
   ```

6. **Combine All Based on Permissions**
   - Union all allowed group IDs
   - Pass to `getAnalyticsData()` as `businessGroupIds` array

---

**Would you like me to start implementing this system?** I can begin with:
1. Database schema creation
2. Backend permission functions (including analytics group ID collection)
3. Admin Dashboard UI
4. Integration with existing analytics views

Let me know which phase you'd like to start with!
