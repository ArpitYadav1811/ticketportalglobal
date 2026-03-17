# Analytics Feature Documentation

## Overview

The Analytics feature provides comprehensive ticket insights through a dual-tab interface that allows users to view tickets from two perspectives: **Initiator Group** and **Target Group**.

---

## User Roles & Access

### 1. **Super Admin**
- Can view analytics for **all groups** or select a specific group from dropdown
- Has access to all charts including "Tickets by Business Unit"
- Can switch between any business group to view their analytics

### 2. **SPOC Manager** (e.g., Dev Group SPOC)
- Views analytics for **all groups they manage**
- If managing multiple groups, sees combined data from all managed groups
- Same two-tab interface as regular users

### 3. **Regular User**
- Views analytics for **their assigned business group only**
- Same two-tab interface with group-specific data

---

## Two-Tab Analytics Interface

### **Tab 1: Tickets By Initiator Group**

Shows tickets where the **creator's group** matches your group.

**Filter Logic:** `WHERE business_unit_group_id = Your_Group`

**What it means:**
- Tickets **created BY** users who belong to your group
- Regardless of which group the ticket was raised to
- Example: If you're in Dev group, shows all tickets created by Dev team members

**Use Case:**
- Track what tickets your group is creating
- Monitor your group's ticket creation patterns
- See which categories your group raises tickets for

---

### **Tab 2: Tickets By Target Group**

Shows tickets where the **target group** matches your group.

**Filter Logic:** `WHERE target_business_group_id = Your_Group`

**What it means:**
- Tickets **raised TO** your group
- Regardless of who created them
- Example: If you're in Dev group, shows all tickets that other groups raised for Dev to handle

**Use Case:**
- Track incoming tickets to your group
- Monitor workload assigned to your group
- See which SPOCs and assignees are handling your group's tickets

---

## Chart Breakdown

All charts use the same base filter (initiator or target group based on active tab), but group the data differently.

### **1. Unified Ticket Overview Card**

**Location:** Top of page

**Shows:**
- Total ticket count
- Status breakdown: Open, Resolved, Closed, On-Hold
- Visual progress bar showing status distribution
- Business Units count (Admin only)

**Filter:**
- **Initiator Tab:** Tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Tickets where `target_business_group_id = Your_Group`

---

### **2. Tickets by Initiator Category**

**Shows:** Distribution of tickets across different categories

**Filter:**
- **Initiator Tab:** Categories for tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Categories for tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By category name

**Note:** Categories belong to the initiator's business group

---

### **3. Ticket By Initiators**

**Shows:** Top 10 users who created the most tickets

**Filter:**
- **Initiator Tab:** Users who created tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Users who created tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By creator's full name

**Insight:** Identifies most active ticket creators

---

### **4. Tickets By Assignee**

**Shows:** Top 10 users who got assigned the most tickets

**Filter:**
- **Initiator Tab:** Assignees for tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Assignees for tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By assignee's full name

**Insight:** Shows workload distribution among team members

---

### **5. Tickets by SPOC**

**Shows:** Distribution of tickets across SPOCs

**Filter:**
- **Initiator Tab:** SPOCs handling tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** SPOCs handling tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By SPOC's full name

**Insight:** Shows which SPOCs are managing the most tickets

---

### **6. Tickets by Business Unit** (Admin Only)

**Shows:** Distribution across business units

**Filter:**
- **Initiator Tab:** Business units where `business_unit_group_id = Your_Group`
- **Target Tab:** Business units where `target_business_group_id = Your_Group`

**Data Grouping:** By business unit name

**Note:** Only visible to Admin and Super Admin users

---

### **7. Tickets by Target Group Category**

**Shows:** Categories that belong to the target business group

**Filter:**
- **Initiator Tab:** Target group categories where `business_unit_group_id = Your_Group`
- **Target Tab:** Target group categories where `target_business_group_id = Your_Group`

**Data Grouping:** By category name

**Note:** Categories are matched with the target business group

---

### **8. Ticket Trend**

**Shows:** Daily ticket creation trend (based on selected duration filter)

**Filter:**
- **Initiator Tab:** Daily counts where `business_unit_group_id = Your_Group`
- **Target Tab:** Daily counts where `target_business_group_id = Your_Group`

**Data Grouping:** By date (YYYY-MM-DD format)

**Duration Options:** Last Day, 1 Week, 1 Month, 3 Months, All

---

### **9. Monthly Ticket Trend (Last 12 Months)**

**Shows:** Monthly ticket creation trend for the last 12 months

**Filter:**
- **Initiator Tab:** Monthly counts where `business_unit_group_id = Your_Group`
- **Target Tab:** Monthly counts where `target_business_group_id = Your_Group`

**Data Grouping:** By month (Mon YYYY format)

**Time Range:** Fixed at 12 months

---

### **10. Tickets by Initiators** (Detailed)

**Shows:** Top 20 ticket creators with total count

**Filter:**
- **Initiator Tab:** Creators of tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Creators of tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By creator's full name

**Metrics:** Total tickets per initiator

---

### **11. Tickets by Initiators (Open)**

**Shows:** Top 20 ticket creators with open ticket count

**Filter:**
- **Initiator Tab:** Open tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Open tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By creator's full name

**Metrics:** Open tickets per initiator

---

### **12. Tickets by Initiators (Resolved)**

**Shows:** Top 20 ticket creators with resolved ticket count

**Filter:**
- **Initiator Tab:** Resolved tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Resolved tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By creator's full name

**Metrics:** Resolved tickets per initiator

---

### **13. Tickets by SPOC** (Detailed)

**Shows:** Top 20 SPOCs with total ticket count

**Filter:**
- **Initiator Tab:** SPOCs for tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** SPOCs for tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By SPOC's full name

**Metrics:** Total tickets per SPOC

---

### **14. Tickets by SPOC (Open)**

**Shows:** Top 20 SPOCs with open ticket count

**Filter:**
- **Initiator Tab:** Open tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Open tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By SPOC's full name

**Metrics:** Open tickets per SPOC

---

### **15. Tickets by SPOC (On-Hold)**

**Shows:** Top 20 SPOCs with on-hold ticket count

**Filter:**
- **Initiator Tab:** On-hold tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** On-hold tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By SPOC's full name

**Metrics:** On-hold tickets per SPOC

---

### **16. Tickets by SPOC (Resolved)**

**Shows:** Top 20 SPOCs with resolved ticket count

**Filter:**
- **Initiator Tab:** Resolved tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Resolved tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By SPOC's full name

**Metrics:** Resolved tickets per SPOC

---

### **17. Tickets by Assignee** (Detailed)

**Shows:** Top 20 assignees with total ticket count

**Filter:**
- **Initiator Tab:** Assignees for tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Assignees for tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By assignee's full name

**Metrics:** Total tickets per assignee

---

### **18. Tickets by Assignee (Open)**

**Shows:** Top 20 assignees with open ticket count

**Filter:**
- **Initiator Tab:** Open tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Open tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By assignee's full name

**Metrics:** Open tickets per assignee

---

### **19. Tickets by Assignee (On-Hold)**

**Shows:** Top 20 assignees with on-hold ticket count

**Filter:**
- **Initiator Tab:** On-hold tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** On-hold tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By assignee's full name

**Metrics:** On-hold tickets per assignee

---

### **20. Tickets by Assignee (Resolved)**

**Shows:** Top 20 assignees with resolved ticket count

**Filter:**
- **Initiator Tab:** Resolved tickets where `business_unit_group_id = Your_Group`
- **Target Tab:** Resolved tickets where `target_business_group_id = Your_Group`

**Data Grouping:** By assignee's full name

**Metrics:** Resolved tickets per assignee

---

### **21. Annual Ticket Trend (Last 12 Months)**

**Shows:** 12-month trend with status breakdown (Total, Open, Resolved, On-Hold, Closed)

**Filter:**
- **Initiator Tab:** Monthly trends where `business_unit_group_id = Your_Group`
- **Target Tab:** Monthly trends where `target_business_group_id = Your_Group`

**Data Grouping:** By month

**Time Range:** Fixed at 12 months

**Metrics:** All status counts per month

---

## Database Schema Reference

### Key Fields Used:

1. **`tickets.business_unit_group_id`**
   - The business group of the user who **created** the ticket
   - Represents the **Initiator Group**
   - Used in Tab 1 filtering

2. **`tickets.target_business_group_id`**
   - The business group to which the ticket is **raised/assigned**
   - Represents the **Target Group**
   - Used in Tab 2 filtering

3. **`users.business_unit_group_id`**
   - The business group to which a user belongs
   - Used to determine which group's analytics a user can see

---

## Mapping Table Reference

The system uses `ticket_classification_mapping` table to define:
- Which categories/subcategories belong to which target business groups
- Estimated duration for each classification
- Example mappings like CS → TD (Customer Service to Technical Development)

**Note:** The mapping can be configured differently per deployment and is not hardcoded to CS-TD.

---

## Example Scenario

**User:** John (SPOC Manager for Dev Group)

### **Tab 1 - Tickets By Initiator Group**
Shows tickets where:
- Creator belongs to Dev group
- John can see: All tickets created by Dev team members
- Includes tickets raised to any group (TD, QA, Design, etc.)

**Example Tickets:**
- Ticket #001: Created by Dev member → Raised to TD group ✅
- Ticket #002: Created by Dev member → Raised to QA group ✅
- Ticket #003: Created by QA member → Raised to Dev group ❌

---

### **Tab 2 - Tickets By Target Group**
Shows tickets where:
- Target group is Dev
- John can see: All tickets raised to Dev group
- Includes tickets created by any group

**Example Tickets:**
- Ticket #001: Created by Dev member → Raised to TD group ❌
- Ticket #002: Created by Dev member → Raised to QA group ❌
- Ticket #003: Created by QA member → Raised to Dev group ✅
- Ticket #004: Created by CS member → Raised to Dev group ✅

---

## Duration Filters

All charts (except Monthly/Annual trends) respect the duration filter:

- **Last Day:** Tickets created in the last 24 hours
- **1 Week:** Tickets created in the last 7 days
- **1 Month:** Tickets created in the last 30 days
- **3 Months:** Tickets created in the last 90 days
- **All:** All tickets (no time restriction)

**Note:** Monthly and Annual trend charts have fixed time ranges (12 months) and ignore the duration filter.

---

## Technical Implementation

### Frontend Components:
- `app/analytics/page.tsx` - Main analytics page with tab interface
- `components/analytics/analytics-header.tsx` - Header with group selector
- `components/analytics/analytics-charts.tsx` - All chart components

### Backend:
- `lib/actions/stats.ts` - `getAnalyticsData()` function with filterType parameter

### Key Parameters:
- `filterType: 'initiator' | 'target'` - Determines which group field to filter by
- `businessGroupIds: number[]` - Array of group IDs to filter
- `daysFilter: number` - Number of days for time-based filtering

---

## Data Exclusions

All analytics queries **exclude**:
- Deleted tickets (`is_deleted = TRUE`)
- Tickets outside the selected time range (based on `created_at`)

---

## Auto-Refresh

Analytics data automatically refreshes every **60 seconds** to show near real-time insights.

---

## Chart Limits

To maintain performance and readability:
- Top/detailed charts show **Top 10** or **Top 20** results
- Sorted by ticket count (descending)
- Most active users/SPOCs/assignees appear first

---

## Business Rules

1. **Group Assignment:**
   - User's group is determined by `users.business_unit_group_id`
   - SPOC can manage multiple groups (defined in `business_group_spoc_mapping`)

2. **Ticket Classification:**
   - Categories are linked to business groups
   - Mapping table defines which categories are available for each target group

3. **SPOC Assignment:**
   - Each ticket has a SPOC (`tickets.spoc_user_id`)
   - SPOC is typically from the target business group

4. **Ticket Assignment:**
   - Tickets can be assigned to specific users (`tickets.assigned_to`)
   - Assignee can be from any group

---

## Use Cases by Tab

### **Initiator Tab Use Cases:**

1. **Outbound Ticket Analysis**
   - How many tickets is my group creating?
   - Which categories does my group raise tickets for?
   - Who in my group creates the most tickets?

2. **Dependency Tracking**
   - Which other groups are we raising tickets to?
   - What types of support does my group need from others?

3. **Workload Origination**
   - Is my group creating too many tickets?
   - Are certain team members creating more tickets than others?

---

### **Target Tab Use Cases:**

1. **Inbound Ticket Analysis**
   - How many tickets are coming to my group?
   - Which groups are raising tickets to us?
   - What categories are we being asked to handle?

2. **Workload Management**
   - How is work distributed among my team?
   - Which SPOCs are handling the most tickets?
   - Which assignees have the most open tickets?

3. **Performance Tracking**
   - How many tickets are we resolving?
   - What's our resolution rate?
   - Are tickets piling up in on-hold status?

---

## Example Workflow

### Scenario: Dev Group SPOC Manager

**Morning Check (Initiator Tab):**
1. Check total tickets created by Dev team
2. Review which categories Dev is raising tickets for
3. Identify if any Dev member is creating excessive tickets
4. Monitor trend - are we creating more tickets than usual?

**Afternoon Check (Target Tab):**
1. Check incoming tickets to Dev group
2. Review workload distribution among Dev team members
3. Identify bottlenecks (assignees with too many open tickets)
4. Check SPOC performance (resolution rates)
5. Monitor on-hold tickets that need attention

---



