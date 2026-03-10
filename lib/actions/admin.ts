"use server"

import { sql } from "@/lib/db"
import { getCurrentUser } from "./auth"

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
        bug.spoc_name
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

// ==================== BUSINESS GROUP SPOC MANAGEMENT ====================

export async function updateBusinessGroupSpoc(businessGroupId: number, spocName: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return { success: false, error: "Not authenticated" }

    const role = currentUser.role?.toLowerCase()
    if (role !== "superadmin" && role !== "admin") {
      return { success: false, error: "Only Admin or Super Admin can update SPOC" }
    }

    const old = await sql`SELECT name, spoc_name FROM business_unit_groups WHERE id = ${businessGroupId}`

    await sql`UPDATE business_unit_groups SET spoc_name = ${spocName} WHERE id = ${businessGroupId}`

    await addSystemAuditLog({
      actionType: "spoc_update",
      entityType: "business_group",
      entityId: businessGroupId,
      oldValue: old[0]?.spoc_name || "None",
      newValue: spocName,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Updated SPOC for ${old[0]?.name} to ${spocName}`,
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating BG SPOC:", error)
    return { success: false, error: "Failed to update SPOC" }
  }
}
