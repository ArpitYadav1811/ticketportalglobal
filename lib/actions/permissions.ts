"use server"

import { sql } from "@/lib/db"
import { getCurrentUser } from "./auth"

// ==================== PERMISSION MANAGEMENT ====================

/**
 * Get all permissions for a specific role
 */
export async function getRolePermissions(role: string) {
  try {
    const permissions = await sql`
      SELECT permission_key, permission_value, is_enabled
      FROM role_permissions
      WHERE role = ${role.toLowerCase()}
      ORDER BY permission_key
    `

    const result: Record<string, any> = {}
    for (const perm of permissions) {
      const key = perm.permission_key
      let value: any = perm.permission_value

      // Parse JSON values
      if (value && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          value = JSON.parse(value)
        } catch {
          // Keep as string if parsing fails
        }
      }
      // Parse boolean strings
      else if (value === 'true') {
        value = true
      } else if (value === 'false') {
        value = false
      }

      result[key] = value
    }

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching role permissions:", error)
    return { success: false, error: "Failed to fetch permissions", data: {} }
  }
}

/**
 * Update permissions for a role (Super Admin only)
 */
export async function updateRolePermissions(role: string, permissions: Record<string, any>) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage permissions" }
    }

    // Start transaction
    await sql`BEGIN`

    try {
      // Delete existing permissions for this role
      await sql`DELETE FROM role_permissions WHERE role = ${role.toLowerCase()}`

      // Insert new permissions
      for (const [key, value] of Object.entries(permissions)) {
        let permissionValue: string

        // Convert value to string
        if (Array.isArray(value)) {
          permissionValue = JSON.stringify(value)
        } else if (typeof value === 'object' && value !== null) {
          permissionValue = JSON.stringify(value)
        } else if (typeof value === 'boolean') {
          permissionValue = value.toString()
        } else {
          permissionValue = String(value)
        }

        await sql`
          INSERT INTO role_permissions (role, permission_key, permission_value, is_enabled, updated_at)
          VALUES (${role.toLowerCase()}, ${key}, ${permissionValue}, TRUE, CURRENT_TIMESTAMP)
        `
      }

      await sql`COMMIT`
      return { success: true, message: "Permissions updated successfully" }
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error updating role permissions:", error)
    return { success: false, error: "Failed to update permissions" }
  }
}

/**
 * Check if user has a specific permission
 */
export async function checkPermission(userId: number, permissionKey: string): Promise<boolean> {
  try {
    const user = await sql`
      SELECT role FROM users WHERE id = ${userId}
    `

    if (user.length === 0) return false

    const role = user[0].role?.toLowerCase()
    if (!role) return false

    // Super Admin always has all permissions
    if (role === "superadmin") return true

    const permission = await sql`
      SELECT permission_value, is_enabled
      FROM role_permissions
      WHERE role = ${role} AND permission_key = ${permissionKey} AND is_enabled = TRUE
    `

    if (permission.length === 0) return false

    const value = permission[0].permission_value
    if (value === 'true') return true
    if (value === 'false') return false

    return !!value
  } catch (error) {
    console.error("Error checking permission:", error)
    return false
  }
}

/**
 * Get default permissions for a role
 */
export async function getDefaultPermissions(role: string): Promise<Record<string, any>> {
  const roleLower = role.toLowerCase()

  if (roleLower === "superadmin") {
    return {
      "tickets.view_scope": "all",
      "tickets.view_all_tickets": true,
      "tickets.edit_all": true,
      "tickets.edit_title": true,
      "tickets.edit_description": true,
      "tickets.edit_category": true,
      "tickets.edit_project": true,
      "tickets.delete_all": true,
      "tickets.soft_delete": true,
      "tickets.hard_delete": true,
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
      "tickets.change_status": JSON.stringify(["open", "on-hold", "resolved", "closed", "deleted"]),
      "tickets.change_to_open": true,
      "tickets.change_to_on_hold": true,
      "tickets.change_to_resolved": true,
      "tickets.change_to_closed": true,
      "tickets.change_to_deleted": true,
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
      "features.admin_dashboard": true,
      "features.user_management": true,
      "features.master_data": true,
      "features.teams": true,
      "features.analytics": true,
      "features.settings": true,
      "features.audit_logs": true,
      "business_groups.view_all": true,
      "business_groups.manage_all": true,
      "master_data.create_categories": true,
      "master_data.edit_categories": true,
      "master_data.delete_categories": true,
      "master_data.create_subcategories": true,
      "master_data.edit_subcategories": true,
      "master_data.delete_subcategories": true,
      "master_data.manage_business_groups_scope": "all",
      "master_data.create_business_groups": true,
      "master_data.edit_business_groups": true,
      "master_data.delete_business_groups": true
    }
  } else if (roleLower === "admin") {
    return {
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
      "tickets.change_status": JSON.stringify(["open", "on-hold", "resolved", "closed"]),
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
      "business_groups.manage_all": true,
      "master_data.view_categories": true,
      "master_data.create_categories": true,
      "master_data.edit_categories": true,
      "master_data.delete_categories": true,
      "master_data.view_subcategories": true,
      "master_data.create_subcategories": true,
      "master_data.edit_subcategories": true,
      "master_data.delete_subcategories": true,
      "master_data.view_business_groups": true,
      "master_data.manage_business_groups_scope": "all",
      "master_data.create_business_groups": true,
      "master_data.edit_business_groups": true,
      "master_data.delete_business_groups": true,
      "master_data.filter_business_groups_scope": "all"
    }
  } else if (roleLower === "manager") {
    return {
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
      "tickets.change_status": JSON.stringify(["on-hold", "resolved"]),
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
      "business_groups.manage_own": false,
      "master_data.view_categories": false,
      "master_data.create_categories": false,
      "master_data.edit_categories": false,
      "master_data.delete_categories": false,
      "master_data.view_subcategories": false,
      "master_data.create_subcategories": false,
      "master_data.edit_subcategories": false,
      "master_data.delete_subcategories": false,
      "master_data.view_business_groups": false,
      "master_data.manage_business_groups_scope": "none",
      "master_data.create_business_groups": false,
      "master_data.edit_business_groups": false,
      "master_data.delete_business_groups": false,
      "master_data.filter_business_groups_scope": "own"
    }
  } else {
    // User role
    return {
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
      "tickets.change_status": JSON.stringify(["closed"]),
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
      "business_groups.manage_own": false,
      "master_data.view_categories": false,
      "master_data.create_categories": false,
      "master_data.edit_categories": false,
      "master_data.delete_categories": false,
      "master_data.view_subcategories": false,
      "master_data.create_subcategories": false,
      "master_data.edit_subcategories": false,
      "master_data.delete_subcategories": false,
      "master_data.view_business_groups": false,
      "master_data.manage_business_groups_scope": "none",
      "master_data.create_business_groups": false,
      "master_data.edit_business_groups": false,
      "master_data.delete_business_groups": false,
      "master_data.filter_business_groups_scope": "own"
    }
  }
}

/**
 * Initialize default permissions for all roles (run once)
 */
export async function initializeDefaultPermissions() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can initialize permissions" }
    }

    const roles = ["superadmin", "admin", "manager", "user"]
    
    for (const role of roles) {
      const defaultPerms = await getDefaultPermissions(role)
      await updateRolePermissions(role, defaultPerms)
    }

    return { success: true, message: "Default permissions initialized for all roles" }
  } catch (error) {
    console.error("Error initializing default permissions:", error)
    return { success: false, error: "Failed to initialize permissions" }
  }
}

// ==================== TICKET PERMISSION CHECKS ====================

/**
 * Check if user can assign a ticket
 */
export async function canAssignTicket(userId: number, ticketId: number, targetUserId: number): Promise<boolean> {
  const canAssign = await checkPermission(userId, "tickets.assign_tickets")
  if (!canAssign) return false

  // Check if user can assign to any group or only own group
  const canAssignAny = await checkPermission(userId, "tickets.assign_to_any_group")
  if (canAssignAny) return true

  const canAssignOwn = await checkPermission(userId, "tickets.assign_to_own_group")
  if (!canAssignOwn) return false

  // Get user's group and target user's group
  const [user, targetUser] = await Promise.all([
    sql`SELECT business_unit_group_id FROM users WHERE id = ${userId}`,
    sql`SELECT business_unit_group_id FROM users WHERE id = ${targetUserId}`
  ])

  if (user.length === 0 || targetUser.length === 0) return false

  return user[0].business_unit_group_id === targetUser[0].business_unit_group_id
}

/**
 * Check if user can redirect a ticket
 */
export async function canRedirectTicket(userId: number, ticketId: number, targetGroupId: number): Promise<boolean> {
  const canRedirect = await checkPermission(userId, "tickets.redirect_tickets")
  if (!canRedirect) return false

  // Get ticket's current group
  const ticket = await sql`
    SELECT target_business_group_id FROM tickets WHERE id = ${ticketId}
  `
  if (ticket.length === 0) return false

  const currentGroupId = ticket[0].target_business_group_id

  // Get user's group
  const user = await sql`
    SELECT business_unit_group_id FROM users WHERE id = ${userId}
  `
  if (user.length === 0) return false

  const userGroupId = user[0].business_unit_group_id

  // Check redirect from permissions
  const canRedirectFromAny = await checkPermission(userId, "tickets.redirect_from_any_group")
  if (!canRedirectFromAny) {
    const canRedirectFromOwn = await checkPermission(userId, "tickets.redirect_from_own_group")
    if (!canRedirectFromOwn || currentGroupId !== userGroupId) return false
  }

  // Check redirect to permissions
  const canRedirectToAny = await checkPermission(userId, "tickets.redirect_to_any_group")
  if (canRedirectToAny) return true

  const canRedirectToOwn = await checkPermission(userId, "tickets.redirect_to_own_group")
  return canRedirectToOwn && targetGroupId === userGroupId
}

/**
 * Check if user can change ticket status
 */
export async function canChangeTicketStatus(userId: number, ticketId: number, newStatus: string): Promise<boolean> {
  // Check specific status permission
  const statusKey = `tickets.change_to_${newStatus.toLowerCase().replace('-', '_')}`
  const canChange = await checkPermission(userId, statusKey)
  
  if (canChange) return true

  // Check general change_status array
  const user = await sql`SELECT role FROM users WHERE id = ${userId}`
  if (user.length === 0) return false

  const role = user[0].role?.toLowerCase()
  if (role === "superadmin") return true

  const permissions = await getRolePermissions(role)
  if (!permissions.success || !permissions.data) return false

  const permsData = permissions.data as Record<string, any>
  const allowedStatuses = permsData["tickets.change_status"]
  if (Array.isArray(allowedStatuses)) {
    return allowedStatuses.includes(newStatus)
  }

  return false
}

// ==================== ANALYTICS PERMISSION CHECKS ====================

/**
 * Get all group IDs user can view analytics for
 */
export async function getAnalyticsAllowedGroupIds(userId: number): Promise<number[]> {
  try {
    const user = await sql`
      SELECT role, business_unit_group_id FROM users WHERE id = ${userId}
    `
    if (user.length === 0) return []

    const role = user[0].role?.toLowerCase()
    const userGroupId = user[0].business_unit_group_id

    // Super Admin can view all
    if (role === "superadmin") {
      const allGroups = await sql`SELECT id FROM business_unit_groups`
      return allGroups.map((g: any) => g.id)
    }

    const permissions = await getRolePermissions(role)
    if (!permissions.success || !permissions.data) return []

    const permsData = permissions.data as Record<string, any>
    const viewScope = permsData["analytics.view_scope"]
    const groupIds: number[] = []

    // Own group
    if (permsData["analytics.view_own_group"] && userGroupId) {
      groupIds.push(userGroupId)
    }

    // SPOC groups
    if (permsData["analytics.view_spoc_groups"]) {
      const spocGroups = await sql`
        SELECT DISTINCT target_business_group_id 
        FROM tickets 
        WHERE spoc_user_id = ${userId} 
          AND target_business_group_id IS NOT NULL
          AND (is_deleted IS NULL OR is_deleted = FALSE)
      `
      groupIds.push(...spocGroups.map((g: any) => g.target_business_group_id))
    }

    // Initiator groups
    if (permsData["analytics.view_initiator_groups"]) {
      const initiatorGroups = await sql`
        SELECT DISTINCT t.target_business_group_id
        FROM tickets t
        WHERE t.created_by = ${userId}
          AND t.target_business_group_id IS NOT NULL
          AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
      `
      groupIds.push(...initiatorGroups.map((g: any) => g.target_business_group_id))
    }

    // Team member groups
    if (permsData["analytics.view_team_member_groups"]) {
      const teamGroups = await sql`
        SELECT DISTINCT u.business_unit_group_id
        FROM my_team_members mtm
        JOIN users u ON mtm.member_user_id = u.id
        WHERE mtm.lead_user_id = ${userId}
          AND u.business_unit_group_id IS NOT NULL
      `
      groupIds.push(...teamGroups.map((g: any) => g.business_unit_group_id))
    }

    // Team SPOC groups
    if (permsData["analytics.view_team_spoc_groups"]) {
      const teamSpocGroups = await sql`
        SELECT DISTINCT t.target_business_group_id
        FROM tickets t
        JOIN my_team_members mtm ON t.spoc_user_id = mtm.member_user_id
        WHERE mtm.lead_user_id = ${userId}
          AND t.target_business_group_id IS NOT NULL
          AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
      `
      groupIds.push(...teamSpocGroups.map((g: any) => g.target_business_group_id))
    }

    // All groups
    if (permsData["analytics.view_all_groups"]) {
      const allGroups = await sql`SELECT id FROM business_unit_groups`
      return allGroups.map((g: any) => g.id)
    }

    // Return unique group IDs
    return [...new Set(groupIds.filter(id => id !== null))]
  } catch (error) {
    console.error("Error getting analytics allowed group IDs:", error)
    return []
  }
}

// ==================== MASTER DATA PERMISSION CHECKS ====================

/**
 * Check if user can view categories
 */
export async function canViewCategory(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.view_categories")
}

/**
 * Check if user can create categories
 */
export async function canCreateCategory(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.create_categories")
}

/**
 * Check if user can edit categories
 */
export async function canEditCategory(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.edit_categories")
}

/**
 * Check if user can delete categories
 */
export async function canDeleteCategory(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.delete_categories")
}

/**
 * Check if user can view subcategories
 */
export async function canViewSubcategory(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.view_subcategories")
}

/**
 * Check if user can create subcategories
 */
export async function canCreateSubcategory(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.create_subcategories")
}

/**
 * Check if user can edit subcategories
 */
export async function canEditSubcategory(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.edit_subcategories")
}

/**
 * Check if user can delete subcategories
 */
export async function canDeleteSubcategory(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.delete_subcategories")
}

/**
 * Check if user can manage a specific business group
 * Returns true if user can manage all groups, or if scope is "own" and it's their group
 */
export async function canManageBusinessGroup(userId: number, groupId: number | null): Promise<boolean> {
  const user = await sql`
    SELECT role, business_unit_group_id FROM users WHERE id = ${userId}
  `
  if (user.length === 0) return false

  const role = user[0].role?.toLowerCase()
  if (role === "superadmin") return true

  const permissions = await getRolePermissions(role)
  if (!permissions.success || !permissions.data) return false

  const permsData = permissions.data as Record<string, any>
  const scope = permsData["master_data.manage_business_groups_scope"]

  // Can manage all groups
  if (scope === "all") return true

  // Can only manage own group
  if (scope === "own") {
    const userGroupId = user[0].business_unit_group_id
    return userGroupId === groupId
  }

  return false
}

/**
 * Check if user can create business groups
 */
export async function canCreateBusinessGroup(userId: number): Promise<boolean> {
  return await checkPermission(userId, "master_data.create_business_groups")
}

/**
 * Check if user can edit business groups
 */
export async function canEditBusinessGroup(userId: number, groupId: number | null): Promise<boolean> {
  const canEdit = await checkPermission(userId, "master_data.edit_business_groups")
  if (!canEdit) return false

  // Check scope
  return await canManageBusinessGroup(userId, groupId)
}

/**
 * Check if user can delete business groups
 */
export async function canDeleteBusinessGroup(userId: number, groupId: number | null): Promise<boolean> {
  const canDelete = await checkPermission(userId, "master_data.delete_business_groups")
  if (!canDelete) return false

  // Check scope
  return await canManageBusinessGroup(userId, groupId)
}

/**
 * Get all master data permissions for the current user
 */
export async function getMasterDataPermissions(userId: number) {
  try {
    const [
      canViewCat,
      canCreateCat,
      canEditCat,
      canDeleteCat,
      canViewSubcat,
      canCreateSubcat,
      canEditSubcat,
      canDeleteSubcat,
      canViewBG,
      canCreateBG,
      canEditBG,
      canDeleteBG,
      manageScope,
      filterScope
    ] = await Promise.all([
      canViewCategory(userId),
      canCreateCategory(userId),
      canEditCategory(userId),
      canDeleteCategory(userId),
      canViewSubcategory(userId),
      canCreateSubcategory(userId),
      canEditSubcategory(userId),
      canDeleteSubcategory(userId),
      checkPermission(userId, "master_data.view_business_groups"),
      canCreateBusinessGroup(userId),
      checkPermission(userId, "master_data.edit_business_groups"),
      checkPermission(userId, "master_data.delete_business_groups"),
      (async () => {
        const user = await sql`SELECT role FROM users WHERE id = ${userId}`
        if (user.length === 0) return "none"
        const role = user[0].role?.toLowerCase()
        if (role === "superadmin") return "all"
        const permissions = await getRolePermissions(role)
        if (!permissions.success || !permissions.data) return "none"
        const permsData = permissions.data as Record<string, any>
        return permsData["master_data.manage_business_groups_scope"] || "none"
      })(),
      (async () => {
        const user = await sql`SELECT role FROM users WHERE id = ${userId}`
        if (user.length === 0) return "own"
        const role = user[0].role?.toLowerCase()
        if (role === "superadmin") return "all"
        const permissions = await getRolePermissions(role)
        if (!permissions.success || !permissions.data) return "own"
        const permsData = permissions.data as Record<string, any>
        return permsData["master_data.filter_business_groups_scope"] || "own"
      })()
    ])

    return {
      success: true,
      data: {
        categories: {
          view: canViewCat,
          create: canCreateCat,
          edit: canEditCat,
          delete: canDeleteCat
        },
        subcategories: {
          view: canViewSubcat,
          create: canCreateSubcat,
          edit: canEditSubcat,
          delete: canDeleteSubcat
        },
        businessGroups: {
          view: canViewBG,
          create: canCreateBG,
          edit: canEditBG,
          delete: canDeleteBG,
          manageScope: manageScope,
          filterScope: filterScope
        }
      }
    }
  } catch (error) {
    console.error("Error getting master data permissions:", error)
    return { success: false, error: "Failed to get permissions", data: null }
  }
}
