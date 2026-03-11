# Roles and Permissions Guide

## 📋 Table of Contents

1. [Role System Overview](#role-system-overview)
2. [How to Check Database Roles](#how-to-check-database-roles)
3. [Role Hierarchy](#role-hierarchy)
4. [System Roles](#system-roles)
5. [Contextual Roles](#contextual-roles)
6. [Feature Access Matrix](#feature-access-matrix)
7. [Detailed Permissions by Role](#detailed-permissions-by-role)
8. [Permission Decision Tree](#permission-decision-tree)

---

## 🔍 Role System Overview

### Current System Roles (4 Roles)

The system currently uses **4 roles**:

1. **Super Admin** 🔴
   - Only **one user** overall
   - Full system access
   - Role management
   - System audit logs
   - FA Mappings

2. **Admin** 🟠
   - Administrative access
   - User management
   - Master data
   - Analytics
   - Teams

3. **Manager** 🟡 (SPOC - Single Point of Contact)
   - Managers serve as SPOCs when assigned to Business Groups
   - Ticket assignment and redirection
   - Status management
   - Business Group SPOC responsibilities

4. **User** ⚪
   - Base role for all users
   - Create and view tickets
   - Basic operations

---

### How Roles Work

**Important:** This system uses **database-driven roles**. The `users.role` column is `VARCHAR(50)`, meaning:
- ✅ Roles are **not hardcoded** - they come from the database
- ✅ New roles can be added by simply assigning them to users
- ✅ The system fetches distinct roles from the database using `getUserRoles()`
- ✅ Only roles that exist in the database are shown in role selection dropdowns

1. **Role Storage:** Roles are stored as strings in the `users.role` column
2. **Role Fetching:** The system queries `SELECT DISTINCT role FROM users` to get available roles
3. **Role Assignment:** Only Super Admins can change user roles
4. **Dynamic Display:** Role dropdowns show only roles that exist in the database

---

## 🔎 How to Check Database Roles

To see what roles actually exist in your database, run:

```bash
node scripts/check-db-roles.js
```

This script will:
- ✅ List all distinct roles in the database
- ✅ Show user count for each role
- ✅ Display all users grouped by role
- ✅ Show database schema information

**Alternative:** You can also query directly:
```sql
SELECT DISTINCT role, COUNT(*) as user_count
FROM users
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role ASC;
```

---

## 🏗️ Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐                                      │
│  │   SUPERADMIN      │  ← Highest Privileges                 │
│  │   (Only One)      │     • All System Access               │
│  │                   │     • Role Management                 │
│  │                   │     • System Audit Logs               │
│  │                   │     • FA Mappings                     │
│  └──────────────────┘                                      │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────┐                                      │
│  │      ADMIN       │  ← Administrative Access               │
│  │                  │     • User Management                 │
│  │                  │     • Master Data                     │
│  │                  │     • Analytics                       │
│  │                  │     • Teams                           │
│  └──────────────────┘                                      │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────┐                                      │
│  │     MANAGER      │  ← SPOC Role                          │
│  │     (SPOC)       │     • Ticket Assignment               │
│  │                  │     • Ticket Redirection              │
│  │                  │     • Status Management                │
│  │                  │     • Business Group Management       │
│  └──────────────────┘                                      │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────┐                                      │
│  │      USER        │  ← Base Role                         │
│  │                  │     • Create Tickets                  │
│  │                  │     • View Tickets                   │
│  │                  │     • Basic Operations                │
│  └──────────────────┘                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 System Roles

> **Current System Roles:** The system currently has **4 roles**:
> 1. **Super Admin** (only one overall) - Full system access
> 2. **Admin** - Administrative access
> 3. **Manager** (SPOC - Single Point of Contact) - Managers serve as SPOCs when assigned to Business Groups
> 4. **User** - Base role for all users

### 1. **SUPERADMIN** 🔴

**Description:** Highest level of system access. Can manage everything including system configuration, roles, and audit logs.

#### ✅ **CAN DO:**

**System Management:**
- ✅ Access Admin Dashboard (`/admin`)
- ✅ View System Audit Logs
- ✅ Manage Functional Area Mappings
- ✅ Update any user's role (except own role)
- ✅ Update any user's Business Group
- ✅ Update Primary SPOC for any Business Group
- ✅ Update Secondary SPOC for any Business Group
- ✅ Create/Update/Delete Functional Areas
- ✅ Create/Update/Delete FA → Business Group Mappings

**User Management:**
- ✅ View all users
- ✅ Create users
- ✅ Edit users
- ✅ Delete users
- ✅ Activate/Deactivate users
- ✅ Reset user passwords
- ✅ Change any user's role (except own)
- ✅ Change any user's Business Group

**Ticket Operations:**
- ✅ View all tickets
- ✅ Edit all tickets
- ✅ Delete tickets
- ✅ Assign tickets to anyone
- ✅ Change ticket status to any status
- ✅ Redirect tickets
- ✅ Override any permission

**Master Data:**
- ✅ Manage Business Groups
- ✅ Manage Categories
- ✅ Manage Subcategories
- ✅ Manage Projects
- ✅ Manage Teams

**Analytics:**
- ✅ View Analytics Dashboard
- ✅ Access all reports

#### ❌ **CANNOT DO:**
- ❌ Change own role
- ❌ Delete own account

---

### 2. **ADMIN** 🟠

**Description:** Administrative access to manage users, master data, and tickets. Cannot access high-risk system functions.

#### ✅ **CAN DO:**

**User Management:**
- ✅ View all users
- ✅ Create users
- ✅ Edit users
- ✅ Delete users (with restrictions)
- ✅ Activate/Deactivate users
- ✅ Reset user passwords
- ✅ Change user Business Groups
- ✅ Update Primary SPOC for Business Groups
- ✅ Update Secondary SPOC for Business Groups

**Ticket Operations:**
- ✅ View all tickets
- ✅ Edit all tickets
- ✅ Delete tickets
- ✅ Assign tickets to anyone
- ✅ Change ticket status to any status
- ✅ Redirect tickets
- ✅ Override ticket permissions

**Master Data:**
- ✅ Manage Business Groups
- ✅ Manage Categories
- ✅ Manage Subcategories
- ✅ Manage Projects
- ✅ Manage Teams

**Analytics:**
- ✅ View Analytics Dashboard
- ✅ Access all reports

**Pages:**
- ✅ Access Analytics (`/analytics`)
- ✅ Access Master Settings (`/master-data`)

#### ❌ **CANNOT DO:**
- ❌ Access Admin Dashboard (`/admin`)
- ❌ View System Audit Logs
- ❌ Manage Functional Area Mappings
- ❌ Change user roles
- ❌ Create/Update/Delete Functional Areas
- ❌ Access FA Mappings tab

---

### 3. **MANAGER** (SPOC) 🟡

**Description:** Manager role that serves as SPOC (Single Point of Contact) for Business Groups. Managers assigned as SPOC have special permissions for ticket management.

#### ✅ **CAN DO:**

**Ticket Operations (as SPOC):**
- ✅ View all tickets
- ✅ Create tickets
- ✅ Assign tickets to users in their target business group
- ✅ Redirect tickets (with remarks)
- ✅ Change ticket status to "On-Hold"
- ✅ Change ticket status to "Resolved"
- ✅ Reopen resolved tickets
- ✅ Select project for tickets
- ✅ View ticket history
- ✅ Add comments
- ✅ Upload attachments

**SPOC-Specific:**
- ✅ **Primary SPOC:** Can update Secondary SPOC for their Business Group
- ✅ View tickets assigned to their Business Group
- ✅ Manage tickets for their Business Group

**Dashboard:**
- ✅ View Dashboard
- ✅ View Tickets page

#### ❌ **CANNOT DO:**
- ❌ Access Admin Dashboard
- ❌ Access Analytics
- ❌ Access Master Settings
- ❌ Manage users
- ❌ Edit ticket title/description (unless Initiator)
- ❌ Close tickets (unless Initiator)
- ❌ Delete tickets (unless Initiator)
- ❌ **Secondary SPOC:** Cannot update Primary SPOC

---

### 4. **USER** ⚪

**Description:** Base role with minimal permissions.

#### ✅ **CAN DO:**

**Ticket Operations:**
- ✅ View all tickets
- ✅ Create tickets
- ✅ Edit own tickets (limited)
- ✅ View ticket history
- ✅ Add comments
- ✅ Upload attachments

**Dashboard:**
- ✅ View Dashboard
- ✅ View Tickets page

#### ❌ **CANNOT DO:**
- ❌ Access Admin Dashboard
- ❌ Access Analytics
- ❌ Access Master Settings
- ❌ Manage users
- ❌ Change ticket status (unless Initiator/SPOC/Assignee)
- ❌ Assign tickets (unless SPOC)
- ❌ Delete tickets (unless Initiator)

---

## 📝 Important Notes About Roles

### Role System Characteristics

1. **Database-Driven:** Roles are stored in the database, not hardcoded in the application
2. **Dynamic:** New roles can be added by assigning them to users (no code changes needed)
3. **Permission-Based:** Permissions are determined by:
   - System role (superadmin, admin, user, etc.)
   - Contextual role (Initiator, SPOC, Assignee)
   - Feature-specific checks

### Current System Roles

The system currently uses **4 roles**:

1. **`superadmin`** - Highest privileges (only one user overall)
   - Full system access
   - Role management
   - System audit logs
   - FA Mappings

2. **`admin`** - Administrative access
   - User management
   - Master data
   - Analytics
   - Teams

3. **`manager`** - SPOC (Single Point of Contact) role
   - Ticket assignment
   - Ticket redirection
   - Status management
   - Business Group SPOC responsibilities

4. **`user`** - Base role
   - Create tickets
   - View tickets
   - Basic operations

**Note:** Managers serve as SPOCs when assigned to Business Groups. They have special permissions for tickets in their Business Group.

---

## 🎭 Contextual Roles

These roles are assigned based on a user's relationship to a specific ticket, not their system role.

### **INITIATOR** (Ticket Creator)

**Description:** The user who created the ticket.

#### ✅ **CAN DO:**
- ✅ View ticket
- ✅ Edit ticket title and description
- ✅ Close ticket (with reason/remarks)
- ✅ Delete ticket (with reason/remarks)
- ✅ Reopen resolved/closed tickets
- ✅ Add comments
- ✅ Upload attachments
- ✅ View ticket history

#### ❌ **CANNOT DO:**
- ❌ Change status to "On-Hold"
- ❌ Change status to "Resolved"
- ❌ Assign assignee
- ❌ Select project
- ❌ Redirect ticket

---

### **PRIMARY SPOC** (Single Point of Contact - Primary)

**Description:** The primary SPOC assigned to the ticket's target business group. **Managers** are typically assigned as SPOCs for Business Groups.

#### ✅ **CAN DO:**
- ✅ View ticket
- ✅ Assign assignee (from target business group)
- ✅ Select project
- ✅ Redirect ticket (with remarks)
- ✅ Change status to "On-Hold"
- ✅ Change status to "Resolved"
- ✅ Reopen resolved tickets
- ✅ Add comments
- ✅ Upload attachments
- ✅ View ticket history
- ✅ **Update Secondary SPOC** for their Business Group

#### ❌ **CANNOT DO:**
- ❌ Edit ticket title/description
- ❌ Close ticket
- ❌ Delete ticket
- ❌ **Update Primary SPOC** (only Admin/Super Admin can)

---

### **SECONDARY SPOC** (Single Point of Contact - Secondary)

**Description:** The secondary SPOC assigned to the ticket's target business group. **Managers** can be assigned as Secondary SPOCs for Business Groups.

#### ✅ **CAN DO:**
- ✅ View ticket
- ✅ Assign assignee (from target business group)
- ✅ Select project
- ✅ Redirect ticket (with remarks)
- ✅ Change status to "On-Hold"
- ✅ Change status to "Resolved"
- ✅ Reopen resolved tickets
- ✅ Add comments
- ✅ Upload attachments
- ✅ View ticket history

#### ❌ **CANNOT DO:**
- ❌ Edit ticket title/description
- ❌ Close ticket
- ❌ Delete ticket
- ❌ **Update Primary SPOC**
- ❌ **Update Secondary SPOC** (only Primary SPOC, Admin, or Super Admin can)

---

### **ASSIGNEE** (Ticket Assignee)

**Description:** The user assigned to work on the ticket.

#### ✅ **CAN DO:**
- ✅ View ticket
- ✅ Change status to "Resolved" (with reason/remarks)
- ✅ Reopen resolved/closed tickets
- ✅ Add comments
- ✅ Upload attachments
- ✅ View ticket history

#### ❌ **CANNOT DO:**
- ❌ Edit ticket title/description
- ❌ Change status to "On-Hold"
- ❌ Close ticket
- ❌ Delete ticket
- ❌ Assign assignee
- ❌ Select project
- ❌ Redirect ticket

---

## 📊 Feature Access Matrix

| Feature | Super Admin | Admin | Manager (SPOC) | User |
|---------|:----------:|:-----:|:-------------:|:----:|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Create Ticket** | ✅ | ✅ | ✅ | ✅ |
| **View All Tickets** | ✅ | ✅ | ✅ | ✅ |
| **Edit Any Ticket** | ✅ | ✅ | ⚠️ | ⚠️ |
| **Delete Tickets** | ✅ | ✅ | ⚠️ | ⚠️ |
| **Assign Tickets** | ✅ | ✅ | ⚠️ (as SPOC) | ❌ |
| **Change Status** | ✅ | ✅ | ⚠️ (as SPOC) | ⚠️ |
| **Redirect Tickets** | ✅ | ✅ | ✅ (as SPOC) | ❌ |
| **Select Project** | ✅ | ✅ | ✅ (as SPOC) | ❌ |
| **Analytics** | ✅ | ✅ | ❌ | ❌ |
| **Master Settings** | ✅ | ✅ | ❌ | ❌ |
| **Admin Dashboard** | ✅ | ❌ | ❌ | ❌ |
| **User Management** | ✅ | ✅ | ❌ | ❌ |
| **Role Management** | ✅ | ❌ | ❌ | ❌ |
| **FA Mappings** | ✅ | ❌ | ❌ | ❌ |
| **System Audit Logs** | ✅ | ❌ | ❌ | ❌ |
| **Teams Management** | ✅ | ✅ | ❌ | ❌ |
| **Update Primary SPOC** | ✅ | ✅ | ❌ | ❌ |
| **Update Secondary SPOC** | ✅ | ✅ | ✅ (Primary SPOC only) | ❌ |

**Legend:**
- ✅ = Full Access
- ⚠️ = Contextual Access (depends on ticket relationship)
- ❌ = No Access

---

## 🔍 Detailed Permissions by Role

### Ticket Status Change Permissions

| Current Status | Super Admin | Admin | Initiator | Manager (SPOC) | Assignee |
|----------------|:-----------:|:-----:|:---------:|:--------------:|:--------:|
| **Open** | All | All | Closed, Deleted | On-Hold, Resolved | Resolved |
| **On-Hold** | All | All | Closed, Deleted | Open, Resolved | Resolved |
| **Resolved** | All | All | Open, Closed, Deleted | Open | Open |
| **Closed** | All | All | Open, Deleted | - | - |
| **Deleted** | All | All | - | - | - |

---

### SPOC Management Permissions

| Action | Super Admin | Admin | Primary SPOC | Secondary SPOC |
|--------|:-----------:|:-----:|:------------:|:--------------:|
| **Update Primary SPOC** | ✅ | ✅ | ❌ | ❌ |
| **Update Secondary SPOC** | ✅ | ✅ | ✅ | ❌ |

---

### User Management Permissions

| Action | Super Admin | Admin | Others |
|--------|:-----------:|:-----:|:------:|
| **View All Users** | ✅ | ✅ | ❌ |
| **Create Users** | ✅ | ✅ | ❌ |
| **Edit Users** | ✅ | ✅ | ❌ |
| **Delete Users** | ✅ | ✅ | ❌ |
| **Change User Role** | ✅ | ❌ | ❌ |
| **Change User Business Group** | ✅ | ✅ | ❌ |
| **Activate/Deactivate Users** | ✅ | ✅ | ❌ |
| **Reset Passwords** | ✅ | ✅ | ❌ |

---

### Business Group SPOC Assignment

| Action | Super Admin | Admin | Primary SPOC | Secondary SPOC |
|--------|:-----------:|:-----:|:------------:|:--------------:|
| **View SPOC Assignment** | ✅ | ✅ | ✅ (own BG) | ✅ (own BG) |
| **Update Primary SPOC** | ✅ | ✅ | ❌ | ❌ |
| **Update Secondary SPOC** | ✅ | ✅ | ✅ (own BG) | ❌ |

---

## 🌳 Permission Decision Tree

### Ticket Edit Permission

```
User wants to edit ticket
    │
    ├─ Is Admin or Super Admin?
    │   └─ YES → ✅ Allow all edits
    │
    ├─ Is User the Initiator?
    │   └─ YES → ✅ Allow title/description edit
    │
    ├─ Is User the SPOC?
    │   └─ YES → ❌ Cannot edit title/description
    │
    └─ Is User the Assignee?
        └─ YES → ❌ Cannot edit title/description
```

### Ticket Status Change Permission

```
User wants to change ticket status
    │
    ├─ Is Admin or Super Admin?
    │   └─ YES → ✅ Allow any status change
    │
    ├─ Status = "On-Hold"?
    │   └─ Is User SPOC? → ✅ Allow
    │   └─ Otherwise → ❌ Deny
    │
    ├─ Status = "Resolved"?
    │   └─ Is User Assignee? → ✅ Allow
    │   └─ Otherwise → ❌ Deny
    │
    ├─ Status = "Closed" or "Deleted"?
    │   └─ Is User Initiator? → ✅ Allow
    │   └─ Otherwise → ❌ Deny
    │
    └─ Status = "Open"?
        ├─ Was ticket Resolved/Closed?
        │   └─ Is User Initiator or Assignee? → ✅ Allow
        └─ Otherwise → Check role permissions
```

### Assignee Selection Permission

```
User wants to assign ticket
    │
    ├─ Is Admin or Super Admin?
    │   └─ YES → ✅ Can assign to anyone
    │
    ├─ Is User SPOC?
    │   └─ YES → ✅ Can assign to users in target business group
    │
    └─ Otherwise → ❌ Cannot assign
```

### Secondary SPOC Update Permission

```
User wants to update Secondary SPOC
    │
    ├─ Is Super Admin?
    │   └─ YES → ✅ Allow
    │
    ├─ Is Admin?
    │   └─ YES → ✅ Allow
    │
    ├─ Is User Primary SPOC for the Business Group?
    │   └─ YES → ✅ Allow
    │
    └─ Otherwise → ❌ Deny
```

---

## 📝 Notes

1. **Admin vs Super Admin:** The main difference is that Super Admins can:
   - Access Admin Dashboard
   - Manage Functional Area Mappings
   - View System Audit Logs
   - Change user roles

2. **Contextual Permissions:** Many permissions depend on the user's relationship to a specific ticket (Initiator, SPOC, Assignee), not just their system role.

3. **SPOC Hierarchy:**
   - Primary SPOC is the default and can update Secondary SPOC
   - Secondary SPOC cannot update Primary SPOC
   - Both Primary and Secondary SPOC have the same ticket permissions

4. **Email Domain Restriction:** All user signups and creations are restricted to `@mfilterit.com` domain only.

5. **Role Assignment:** Only Super Admins can change user roles. Users cannot change their own role.

6. **Database-Driven Roles:** Roles are stored in the database as VARCHAR(50), not as an enum. This means:
   - Any role can be assigned to users
   - New roles can be added without code changes
   - The system fetches roles dynamically from the database
   - Only roles that exist in the database are shown in dropdowns

---

## 🔐 Security Notes

- All permission checks are enforced on both frontend and backend
- Backend validation is the source of truth
- Frontend restrictions are for UX only
- All actions are logged in audit trails
- System audit logs are only accessible to Super Admins

---

## 🛠️ Checking Your Actual Database Roles

Since roles are **database-driven**, you should verify what roles actually exist in your database:

### Method 1: Using the Script (Recommended)

```bash
node scripts/check-db-roles.js
```

This will show:
- All distinct roles in the database
- User count for each role
- All users grouped by role
- Database schema information

### Method 2: Direct SQL Query

```sql
-- Get all distinct roles with user counts
SELECT DISTINCT role, COUNT(*) as user_count
FROM users
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role ASC;

-- Get all users by role
SELECT role, id, email, full_name
FROM users
WHERE role IS NOT NULL
ORDER BY role, full_name;
```

### Method 3: Via Admin Dashboard

1. Log in as Super Admin
2. Go to **Admin Dashboard → Users** tab
3. Click on any user's role dropdown
4. The dropdown will show **only roles that exist in the database**

---

## 📌 Key Points

- ✅ **Roles are stored in the database** (`users.role` column as VARCHAR(50))
- ✅ **Only Super Admins can change roles**
- ✅ **Role dropdowns show only database roles** (fetched via `getUserRoles()`)
- ✅ **Permissions are based on role + contextual relationship to tickets**
- ✅ **Current system has 4 roles:** Super Admin, Admin, Manager (SPOC), User
- ✅ **Managers serve as SPOCs** when assigned to Business Groups
- ✅ **Check your actual database roles** using the provided script

---

**Last Updated:** 2026-02-27  
**Version:** 1.2  
**Current System Roles:** Super Admin (1), Admin, Manager (SPOC), User
