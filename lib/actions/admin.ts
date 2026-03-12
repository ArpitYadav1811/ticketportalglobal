"use server"

import { sql } from "@/lib/db"
import { getCurrentUser } from "./auth"
import { revalidatePath } from "next/cache"

// ==================== SYSTEM AUDIT LOG ====================

export async function addSystemAuditLog(params: {
  actionType: string
  entityType?: string
  entityId?: number
  oldValue?: string
  newValue?: string
  performedBy: number
  performedByName: string
  notes?: string
}) {
  try {
    await sql`
      INSERT INTO system_audit_log (action_type, entity_type, entity_id, old_value, new_value, performed_by, performed_by_name, notes)
      VALUES (${params.actionType}, ${params.entityType || null}, ${params.entityId || null}, ${params.oldValue || null}, ${params.newValue || null}, ${params.performedBy}, ${params.performedByName}, ${params.notes || null})
    `
  } catch (error) {
    console.error("Error adding system audit log:", error)
  }
}

export async function getSystemAuditLogs(filters?: {
  entityType?: string
  actionType?: string
  limit?: number
  offset?: number
}) {
  try {
    const limit = filters?.limit || 100
    const offset = filters?.offset || 0

    let logs
    if (filters?.entityType && filters?.actionType) {
      logs = await sql`
        SELECT sal.*, u.email as performer_email
        FROM system_audit_log sal
        LEFT JOIN users u ON sal.performed_by = u.id
        WHERE sal.entity_type = ${filters.entityType}
          AND sal.action_type = ${filters.actionType}
        ORDER BY sal.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters?.entityType) {
      logs = await sql`
        SELECT sal.*, u.email as performer_email
        FROM system_audit_log sal
        LEFT JOIN users u ON sal.performed_by = u.id
        WHERE sal.entity_type = ${filters.entityType}
        ORDER BY sal.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters?.actionType) {
      logs = await sql`
        SELECT sal.*, u.email as performer_email
        FROM system_audit_log sal
        LEFT JOIN users u ON sal.performed_by = u.id
        WHERE sal.action_type = ${filters.actionType}
        ORDER BY sal.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      logs = await sql`
        SELECT sal.*, u.email as performer_email
        FROM system_audit_log sal
        LEFT JOIN users u ON sal.performed_by = u.id
        ORDER BY sal.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // Get total count
    const countResult = await sql`SELECT COUNT(*) as total FROM system_audit_log`
    const total = countResult[0]?.total || 0

    return { success: true, data: logs, total }
  } catch (error: any) {
    // Auto-create table if it doesn't exist
    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      await sql`
        CREATE TABLE IF NOT EXISTS system_audit_log (
          id SERIAL PRIMARY KEY,
          action_type VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id INTEGER,
          old_value TEXT,
          new_value TEXT,
          performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          performed_by_name VARCHAR(255),
          notes TEXT,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      return { success: true, data: [], total: 0 }
    }
    console.error("Error fetching system audit logs:", error)
    return { success: false, error: "Failed to fetch audit logs", data: [], total: 0 }
  }
}

// ==================== FUNCTIONAL AREA MAPPINGS ====================

export async function getFunctionalAreas() {
  try {
    const result = await sql`
      SELECT fa.*, 
        (SELECT COUNT(*) FROM functional_area_business_group_mapping fabgm WHERE fabgm.functional_area_id = fa.id) as mapping_count
      FROM functional_areas fa
      ORDER BY fa.name ASC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching functional areas:", error)
    return { success: false, error: "Failed to fetch functional areas", data: [] }
  }
}

export async function getFunctionalAreaMappings() {
  try {
    const result = await sql`
      SELECT 
        fabgm.id,
        fabgm.functional_area_id,
        fa.name as functional_area_name,
        fabgm.target_business_group_id,
        bug.name as business_group_name,
        bug.spoc_name,
        bug.primary_spoc_name,
        bug.secondary_spoc_name
      FROM functional_area_business_group_mapping fabgm
      JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
      JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
      ORDER BY fa.name ASC, bug.name ASC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching FA mappings:", error)
    return { success: false, error: "Failed to fetch FA mappings", data: [] }
  }
}

export async function createFunctionalArea(name: string, description?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage functional areas" }
    }

    const result = await sql`
      INSERT INTO functional_areas (name, description)
      VALUES (${name}, ${description || null})
      RETURNING *
    `

    await addSystemAuditLog({
      actionType: "create",
      entityType: "functional_area",
      entityId: result[0]?.id,
      newValue: name,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Created functional area: ${name}`,
    })

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error creating functional area:", error)
    return { success: false, error: "Failed to create functional area" }
  }
}

export async function updateFunctionalArea(id: number, name: string, description?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage functional areas" }
    }

    const old = await sql`SELECT name FROM functional_areas WHERE id = ${id}`
    
    const result = await sql`
      UPDATE functional_areas SET name = ${name}, description = ${description || null}
      WHERE id = ${id} RETURNING *
    `

    await addSystemAuditLog({
      actionType: "update",
      entityType: "functional_area",
      entityId: id,
      oldValue: old[0]?.name,
      newValue: name,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
    })

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating functional area:", error)
    return { success: false, error: "Failed to update functional area" }
  }
}

export async function deleteFunctionalArea(id: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage functional areas" }
    }

    const old = await sql`SELECT name FROM functional_areas WHERE id = ${id}`

    // Delete mappings first
    await sql`DELETE FROM functional_area_business_group_mapping WHERE functional_area_id = ${id}`
    await sql`DELETE FROM functional_areas WHERE id = ${id}`

    await addSystemAuditLog({
      actionType: "delete",
      entityType: "functional_area",
      entityId: id,
      oldValue: old[0]?.name,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting functional area:", error)
    return { success: false, error: "Failed to delete functional area" }
  }
}

export async function addFunctionalAreaMapping(functionalAreaId: number, targetBusinessGroupId: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage FA mappings" }
    }

    const result = await sql`
      INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
      VALUES (${functionalAreaId}, ${targetBusinessGroupId})
      ON CONFLICT DO NOTHING
      RETURNING *
    `

    // Get names for audit
    const fa = await sql`SELECT name FROM functional_areas WHERE id = ${functionalAreaId}`
    const bg = await sql`SELECT name FROM business_unit_groups WHERE id = ${targetBusinessGroupId}`

    await addSystemAuditLog({
      actionType: "create",
      entityType: "fa_mapping",
      newValue: `${fa[0]?.name} → ${bg[0]?.name}`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
    })

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error adding FA mapping:", error)
    return { success: false, error: "Failed to add FA mapping" }
  }
}

export async function removeFunctionalAreaMapping(id: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage FA mappings" }
    }

    // Get mapping info for audit
    const mapping = await sql`
      SELECT fa.name as fa_name, bug.name as bg_name
      FROM functional_area_business_group_mapping fabgm
      JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
      JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
      WHERE fabgm.id = ${id}
    `

    await sql`DELETE FROM functional_area_business_group_mapping WHERE id = ${id}`

    await addSystemAuditLog({
      actionType: "delete",
      entityType: "fa_mapping",
      entityId: id,
      oldValue: mapping[0] ? `${mapping[0].fa_name} → ${mapping[0].bg_name}` : "Unknown",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
    })

    return { success: true }
  } catch (error) {
    console.error("Error removing FA mapping:", error)
    return { success: false, error: "Failed to remove FA mapping" }
  }
}

export async function updateFunctionalAreaMapping(id: number, newFunctionalAreaId: number, newTargetBusinessGroupId: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage FA mappings" }
    }

    // Get old mapping info for audit
    const oldMapping = await sql`
      SELECT fa.name as fa_name, bug.name as bg_name, fabgm.functional_area_id, fabgm.target_business_group_id
      FROM functional_area_business_group_mapping fabgm
      JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
      JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
      WHERE fabgm.id = ${id}
    `
    if (!oldMapping.length) return { success: false, error: "Mapping not found" }

    // Get new names for audit
    const newFA = await sql`SELECT name FROM functional_areas WHERE id = ${newFunctionalAreaId}`
    const newBG = await sql`SELECT name FROM business_unit_groups WHERE id = ${newTargetBusinessGroupId}`

    await sql`
      UPDATE functional_area_business_group_mapping
      SET functional_area_id = ${newFunctionalAreaId}, target_business_group_id = ${newTargetBusinessGroupId}
      WHERE id = ${id}
    `

    await addSystemAuditLog({
      actionType: "update",
      entityType: "fa_mapping",
      entityId: id,
      oldValue: `${oldMapping[0].fa_name} → ${oldMapping[0].bg_name}`,
      newValue: `${newFA[0]?.name || newFunctionalAreaId} → ${newBG[0]?.name || newTargetBusinessGroupId}`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Updated FA mapping`,
    })

    return { success: true }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.message?.includes("unique")) {
      return { success: false, error: "This mapping already exists" }
    }
    console.error("Error updating FA mapping:", error)
    return { success: false, error: "Failed to update FA mapping" }
  }
}

// ==================== ROLE MANAGEMENT ====================

export async function updateUserRole(userId: number, newRole: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can change user roles" }
    }

    // Prevent changing own role
    if (currentUser.id === userId) {
      return { success: false, error: "Cannot change your own role" }
    }

    const oldUser = await sql`SELECT full_name, role FROM users WHERE id = ${userId}`
    if (oldUser.length === 0) return { success: false, error: "User not found" }

    // Only superadmin can assign superadmin role
    if (newRole === "superadmin" && currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can assign Super Admin role" }
    }

    await sql`UPDATE users SET role = ${newRole}, updated_at = CURRENT_TIMESTAMP WHERE id = ${userId}`

    await addSystemAuditLog({
      actionType: "role_change",
      entityType: "user",
      entityId: userId,
      oldValue: oldUser[0].role,
      newValue: newRole,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Changed role of ${oldUser[0].full_name} from ${oldUser[0].role} to ${newRole}`,
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating user role:", error)
    return { success: false, error: "Failed to update user role" }
  }
}

// ==================== USER BUSINESS GROUP MANAGEMENT ====================

export async function updateUserBusinessGroup(userId: number, businessGroupId: number | null) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "Not authenticated" }
    }

    const role = currentUser.role?.toLowerCase()
    // Allow both superadmin and admin to change a user's business group
    if (role !== "superadmin" && role !== "admin") {
      return { success: false, error: "Only Admin or Super Admin can change user business group" }
    }

    const oldUser = await sql`
      SELECT full_name, business_unit_group_id
      FROM users
      WHERE id = ${userId}
    `
    if (oldUser.length === 0) {
      return { success: false, error: "User not found" }
    }

    const oldBg = oldUser[0].business_unit_group_id

    await sql`
      UPDATE users
      SET business_unit_group_id = ${businessGroupId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `

    // Get names for audit log
    const oldBgRow = oldBg
      ? await sql`SELECT name FROM business_unit_groups WHERE id = ${oldBg}`
      : []
    const newBgRow = businessGroupId
      ? await sql`SELECT name FROM business_unit_groups WHERE id = ${businessGroupId}`
      : []

    const oldValue = oldBgRow[0]?.name || (oldBg ? String(oldBg) : "None")
    const newValue = newBgRow[0]?.name || (businessGroupId ? String(businessGroupId) : "None")

    await addSystemAuditLog({
      actionType: "update",
      entityType: "user_business_group",
      entityId: userId,
      oldValue,
      newValue,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Updated business group for ${oldUser[0].full_name}`,
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating user business group:", error)
    return { success: false, error: "Failed to update user business group" }
  }
}

// ==================== BUSINESS GROUP SPOC MANAGEMENT ====================

export async function updateBusinessGroupSpoc(
  businessGroupId: number,
  spocName: string,
  spocType: "primary" | "secondary" = "primary"
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return { success: false, error: "Not authenticated" }

    const role = currentUser.role?.toLowerCase()
    const isSuperAdmin = role === "superadmin"
    const isAdmin = role === "admin"

    // Get business group info
    const bgInfo = await sql`
      SELECT name, spoc_name, primary_spoc_name, secondary_spoc_name
      FROM business_unit_groups
      WHERE id = ${businessGroupId}
    `
    if (bgInfo.length === 0) {
      return { success: false, error: "Business group not found" }
    }

    const bg = bgInfo[0]

    // Check permissions
    if (spocType === "primary") {
      // Only Super Admin or Admin can update Primary SPOC
      if (!isSuperAdmin && !isAdmin) {
        return { success: false, error: "Only Admin or Super Admin can update Primary SPOC" }
      }
    } else if (spocType === "secondary") {
      // Secondary SPOC can be updated by:
      // 1. Super Admin
      // 2. Admin
      // 3. Primary SPOC (if current user is the primary SPOC)
      
      if (!isSuperAdmin && !isAdmin) {
        // Check if current user is the Primary SPOC
        const primarySpocName = bg.primary_spoc_name || bg.spoc_name
        if (!primarySpocName) {
          return { success: false, error: "No Primary SPOC assigned. Cannot update Secondary SPOC." }
        }
        
        // Check if current user matches primary SPOC
        const userMatchesPrimary = await sql`
          SELECT id FROM users
          WHERE id = ${currentUser.id}
          AND LOWER(TRIM(full_name)) = LOWER(TRIM(${primarySpocName}))
        `
        
        if (userMatchesPrimary.length === 0) {
          return { success: false, error: "Only Primary SPOC can update Secondary SPOC" }
        }
      }
    }

    // Update the appropriate SPOC field
    if (spocType === "primary") {
      // Update both spoc_name (for backward compatibility) and primary_spoc_name
      await sql`
        UPDATE business_unit_groups
        SET spoc_name = ${spocName}, 
            primary_spoc_name = ${spocName}, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${businessGroupId}
      `
    } else {
      // Only update secondary_spoc_name
      await sql`
        UPDATE business_unit_groups
        SET secondary_spoc_name = ${spocName}, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${businessGroupId}
      `
    }

    const oldValue = spocType === "primary" 
      ? (bg.primary_spoc_name || bg.spoc_name || "None")
      : (bg.secondary_spoc_name || "None")

    await addSystemAuditLog({
      actionType: "spoc_update",
      entityType: "business_group",
      entityId: businessGroupId,
      oldValue: `${spocType === "primary" ? "Primary" : "Secondary"}: ${oldValue}`,
      newValue: `${spocType === "primary" ? "Primary" : "Secondary"}: ${spocName || "None"}`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Updated ${spocType === "primary" ? "Primary" : "Secondary"} SPOC for ${bg.name} to ${spocName || "None"}`,
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating BG SPOC:", error)
    return { success: false, error: "Failed to update SPOC" }
  }
}

export async function getBusinessGroupSpocs(businessGroupId: number) {
  try {
    const result = await sql`
      SELECT 
        bug.id,
        bug.name,
        bug.spoc_name,
        bug.primary_spoc_name,
        bug.secondary_spoc_name,
        pspoc.id as primary_spoc_user_id,
        pspoc.full_name as primary_spoc_full_name,
        pspoc.email as primary_spoc_email,
        sspoc.id as secondary_spoc_user_id,
        sspoc.full_name as secondary_spoc_full_name,
        sspoc.email as secondary_spoc_email
      FROM business_unit_groups bug
      LEFT JOIN users pspoc ON LOWER(TRIM(pspoc.full_name)) = LOWER(TRIM(COALESCE(bug.primary_spoc_name, bug.spoc_name)))
      LEFT JOIN users sspoc ON LOWER(TRIM(sspoc.full_name)) = LOWER(TRIM(bug.secondary_spoc_name))
      WHERE bug.id = ${businessGroupId}
      LIMIT 1
    `
    
    if (result.length === 0) {
      return { success: false, error: "Business group not found", data: null }
    }
    
    return {
      success: true,
      data: {
        business_group_id: result[0].id,
        business_group_name: result[0].name,
        primary_spoc: result[0].primary_spoc_user_id ? {
          id: result[0].primary_spoc_user_id,
          full_name: result[0].primary_spoc_full_name,
          email: result[0].primary_spoc_email,
        } : null,
        secondary_spoc: result[0].secondary_spoc_user_id ? {
          id: result[0].secondary_spoc_user_id,
          full_name: result[0].secondary_spoc_full_name,
          email: result[0].secondary_spoc_email,
        } : null,
      },
    }
  } catch (error) {
    console.error("Error fetching business group SPOCs:", error)
    return { success: false, error: "Failed to fetch SPOCs", data: null }
  }
}

// ==================== BULK DELETE OPERATIONS (SUPER ADMIN ONLY) ====================

export async function bulkDeleteAllUsers() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    // Delete all users except the current super admin
    const result = await sql`
      DELETE FROM users 
      WHERE id != ${currentUser.id}
      RETURNING id, email, full_name
    `

    await addSystemAuditLog({
      actionType: "BULK_DELETE",
      entityType: "users",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Deleted ${result.length} users (excluding self)`,
    })

    revalidatePath("/admin")
    revalidatePath("/dashboard")

    return { 
      success: true, 
      message: `Successfully deleted ${result.length} users`,
      deletedCount: result.length 
    }
  } catch (error) {
    console.error("Error bulk deleting users:", error)
    return { success: false, error: "Failed to delete users" }
  }
}

export async function bulkDeleteAllTickets() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    // Delete all tickets (cascades to comments, attachments, audit logs)
    const result = await sql`
      DELETE FROM tickets
      RETURNING id, ticket_number
    `

    await addSystemAuditLog({
      actionType: "BULK_DELETE",
      entityType: "tickets",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Deleted ${result.length} tickets and all related data`,
    })

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    revalidatePath("/tickets")

    return { 
      success: true, 
      message: `Successfully deleted ${result.length} tickets`,
      deletedCount: result.length 
    }
  } catch (error) {
    console.error("Error bulk deleting tickets:", error)
    return { success: false, error: "Failed to delete tickets" }
  }
}

export async function bulkDeleteAllBusinessGroups() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    // First, set all user business_unit_group_id to NULL
    await sql`UPDATE users SET business_unit_group_id = NULL`

    // Set all ticket business group references to NULL
    await sql`UPDATE tickets SET business_unit_group_id = NULL, target_business_group_id = NULL, assignee_group_id = NULL`

    // Delete related mappings
    await sql`DELETE FROM ticket_classification_mapping`
    await sql`DELETE FROM functional_area_business_group_mapping`

    // Delete all business groups
    const result = await sql`
      DELETE FROM business_unit_groups
      RETURNING id, name
    `

    await addSystemAuditLog({
      actionType: "BULK_DELETE",
      entityType: "business_unit_groups",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Deleted ${result.length} business groups and all related mappings`,
    })

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    revalidatePath("/master-data")

    return { 
      success: true, 
      message: `Successfully deleted ${result.length} business groups`,
      deletedCount: result.length 
    }
  } catch (error) {
    console.error("Error bulk deleting business groups:", error)
    return { success: false, error: "Failed to delete business groups" }
  }
}

export async function bulkDeleteAllFunctionalAreas() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    // Delete all functional area mappings first
    await sql`DELETE FROM functional_area_business_group_mapping`

    // Delete all functional areas
    const result = await sql`
      DELETE FROM organizations
      RETURNING id, name
    `

    await addSystemAuditLog({
      actionType: "BULK_DELETE",
      entityType: "functional_areas",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Deleted ${result.length} functional areas and all related mappings`,
    })

    revalidatePath("/admin")
    revalidatePath("/dashboard")

    return { 
      success: true, 
      message: `Successfully deleted ${result.length} functional areas`,
      deletedCount: result.length 
    }
  } catch (error) {
    console.error("Error bulk deleting functional areas:", error)
    return { success: false, error: "Failed to delete functional areas" }
  }
}

export async function bulkDeleteAllMasterData() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    // Delete all mappings first
    await sql`DELETE FROM ticket_classification_mapping`
    
    // Delete subcategories (cascades handled by FK)
    const subcatResult = await sql`DELETE FROM subcategories RETURNING id`
    
    // Delete categories
    const catResult = await sql`DELETE FROM categories RETURNING id`

    await addSystemAuditLog({
      actionType: "BULK_DELETE",
      entityType: "master_data",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Deleted ${catResult.length} categories, ${subcatResult.length} subcategories, and all classification mappings`,
    })

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    revalidatePath("/master-data")

    return { 
      success: true, 
      message: `Successfully deleted ${catResult.length} categories and ${subcatResult.length} subcategories`,
      deletedCount: {
        categories: catResult.length,
        subcategories: subcatResult.length
      }
    }
  } catch (error) {
    console.error("Error bulk deleting master data:", error)
    return { success: false, error: "Failed to delete master data" }
  }
}
