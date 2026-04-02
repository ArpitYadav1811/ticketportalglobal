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
  userId?: number
  dateFrom?: string
  dateTo?: string
  search?: string
}) {
  try {
    const limit = filters?.limit || 100
    const offset = filters?.offset || 0

    // Build WHERE conditions array
    const conditions: string[] = []
    const params: any[] = []

    if (filters?.entityType) {
      conditions.push(`sal.entity_type = $${params.length + 1}`)
      params.push(filters.entityType)
    }

    if (filters?.actionType) {
      conditions.push(`sal.action_type = $${params.length + 1}`)
      params.push(filters.actionType)
    }

    if (filters?.userId) {
      conditions.push(`sal.performed_by = $${params.length + 1}`)
      params.push(filters.userId)
    }

    if (filters?.dateFrom) {
      conditions.push(`sal.created_at >= $${params.length + 1}::timestamp`)
      params.push(filters.dateFrom)
    }

    if (filters?.dateTo) {
      conditions.push(`sal.created_at <= $${params.length + 1}::timestamp`)
      params.push(filters.dateTo)
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`
      conditions.push(`(sal.notes ILIKE $${params.length + 1} OR sal.old_value ILIKE $${params.length + 1} OR sal.new_value ILIKE $${params.length + 1} OR sal.performed_by_name ILIKE $${params.length + 1})`)
      params.push(searchPattern)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Build the query with proper parameterization
    // Since we can't use sql`` with dynamic WHERE clauses easily, we'll fetch all and filter in JS
    // OR use a simpler approach: fetch all logs and apply filters in JavaScript
    let logs = await sql`
        SELECT sal.*, u.email as performer_email
        FROM system_audit_log sal
        LEFT JOIN users u ON sal.performed_by = u.id
        ORDER BY sal.created_at DESC
    `

    // Apply filters in JavaScript (similar to getTickets approach)
    let filteredLogs = [...logs]

    if (filters?.entityType) {
      filteredLogs = filteredLogs.filter((log) => log.entity_type === filters.entityType)
    }

    if (filters?.actionType) {
      filteredLogs = filteredLogs.filter((log) => log.action_type === filters.actionType)
    }

    if (filters?.userId) {
      filteredLogs = filteredLogs.filter((log) => log.performed_by === filters.userId)
    }

    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filteredLogs = filteredLogs.filter((log) => new Date(log.created_at) >= fromDate)
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo)
      // Add one day to include the entire day
      toDate.setHours(23, 59, 59, 999)
      filteredLogs = filteredLogs.filter((log) => new Date(log.created_at) <= toDate)
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.notes?.toLowerCase().includes(searchLower) ||
          log.old_value?.toLowerCase().includes(searchLower) ||
          log.new_value?.toLowerCase().includes(searchLower) ||
          log.performed_by_name?.toLowerCase().includes(searchLower)
      )
    }

    // Get total before pagination
    const total = filteredLogs.length

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit)

    return { success: true, data: paginatedLogs, total }
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
      SELECT 
        fa.id,
        fa.name,
        fa.description,
        fa.spoc_name,
        fa.created_at,
        fa.updated_at,
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

export async function createFunctionalArea(
  name: string, 
  description?: string,
  spocName?: string
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage functional areas" }
    }

    const result = await sql`
      INSERT INTO functional_areas (name, description, spoc_name)
      VALUES (${name}, ${description || null}, ${spocName || null})
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

export async function updateFunctionalArea(
  id: number, 
  name: string, 
  description?: string,
  spocName?: string
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can manage functional areas" }
    }

    const old = await sql`SELECT name FROM functional_areas WHERE id = ${id}`
    
    const result = await sql`
      UPDATE functional_areas 
      SET 
        name = ${name}, 
        description = ${description || null},
        spoc_name = ${spocName || null}
      WHERE id = ${id} 
      RETURNING *
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

export async function getUserSpocBusinessGroups(userId: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "Not authenticated", data: [] as number[] }
    }

    const role = currentUser.role?.toLowerCase()
    if (role !== "superadmin" && role !== "admin") {
      return { success: false, error: "Only Admin or Super Admin can view SPOC groups", data: [] as number[] }
    }

    const rows = await sql`
      SELECT business_group_id
      FROM business_group_spocs
      WHERE user_id = ${userId}
        AND is_active = true
      ORDER BY business_group_id
    `

    return { success: true, data: rows.map((r: any) => Number(r.business_group_id)) }
  } catch (error) {
    console.error("Error fetching user SPOC groups:", error)
    return { success: false, error: "Failed to fetch user SPOC groups", data: [] as number[] }
  }
}

export async function updateUserSpocBusinessGroups(userId: number, businessGroupIds: number[]) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Only Super Admin can update SPOC business groups" }
    }

    const targetUser = await sql`
      SELECT id, full_name, role
      FROM users
      WHERE id = ${userId}
    `
    if (targetUser.length === 0) {
      return { success: false, error: "User not found" }
    }

    const targetRole = String(targetUser[0].role || "").toLowerCase()
    if (targetRole !== "manager") {
      return { success: false, error: "Multiple business groups can be assigned only for SPOC users" }
    }

    // Validate all incoming group IDs
    const uniqueGroupIds = Array.from(new Set((businessGroupIds || []).filter((id) => Number.isInteger(id) && id > 0)))
    if (uniqueGroupIds.length > 0) {
      const validGroups = await sql`
        SELECT id
        FROM business_unit_groups
        WHERE id = ANY(${uniqueGroupIds})
      `
      const validIdSet = new Set(validGroups.map((g: any) => Number(g.id)))
      const invalid = uniqueGroupIds.filter((id) => !validIdSet.has(id))
      if (invalid.length > 0) {
        return { success: false, error: `Invalid business group IDs: ${invalid.join(", ")}` }
      }
    }

    // Deactivate existing SPOC assignments for this user, then re-activate selected ones.
    await sql`
      UPDATE business_group_spocs
      SET is_active = false
      WHERE user_id = ${userId}
    `

    for (const groupId of uniqueGroupIds) {
      await sql`
        INSERT INTO business_group_spocs (business_group_id, user_id, spoc_type, assigned_by, is_active)
        VALUES (${groupId}, ${userId}, 'secondary', ${currentUser.id}, true)
        ON CONFLICT (business_group_id, user_id, spoc_type)
        DO UPDATE SET is_active = true, assigned_by = ${currentUser.id}
      `
    }

    await addSystemAuditLog({
      actionType: "update",
      entityType: "spoc_business_groups",
      entityId: userId,
      oldValue: "Updated",
      newValue: uniqueGroupIds.join(", "),
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Updated SPOC business groups for ${targetUser[0].full_name}`,
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating user SPOC business groups:", error)
    return { success: false, error: "Failed to update SPOC business groups" }
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
      // - Super Admin / Admin, OR
      // - the group's Primary SPOC.
      const primarySpocName = bg.primary_spoc_name || bg.spoc_name
      const canBypassPrimaryCheck = isSuperAdmin || isAdmin
      if (!canBypassPrimaryCheck) {
        if (!primarySpocName) {
          return { success: false, error: "No Primary SPOC assigned. Cannot update Secondary SPOC." }
        }

        const userMatchesPrimary = await sql`
          SELECT id FROM users
          WHERE id = ${currentUser.id}
            AND LOWER(TRIM(full_name)) = LOWER(TRIM(${primarySpocName}))
        `

        if (userMatchesPrimary.length === 0) {
          return { success: false, error: "Only Primary SPOC can update Secondary SPOC" }
        }
      }

      // A user can be Secondary SPOC for only one group at a time (strict by user identity).
      const trimmedSpocName = (spocName || "").trim()
      if (trimmedSpocName) {
        const candidates = await sql`
          SELECT id, full_name, business_unit_group_id FROM users
          WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(${trimmedSpocName}))
        `
        if (candidates.length === 0) {
          return {
            success: false,
            error: "No user found with that name. Choose someone from your business unit.",
          }
        }

        let selectedSecondaryUserId: number
        if (canBypassPrimaryCheck) {
          if (candidates.length > 1) {
            return {
              success: false,
              error:
                "Multiple users share this name. Please use a unique user name before assigning as Secondary SPOC.",
            }
          }
          selectedSecondaryUserId = Number(candidates[0].id)
        } else {
          // Non-admin path: Secondary must be from same business unit as Primary SPOC (current user).
          const [primaryBuRow] = await sql`
            SELECT business_unit_group_id FROM users WHERE id = ${currentUser.id}
          `
          const primaryBuId = primaryBuRow?.business_unit_group_id
          if (primaryBuId == null) {
            return {
              success: false,
              error:
                "Your account must belong to a business unit before you can assign a Secondary SPOC from the same unit.",
            }
          }

          const sameBuCandidates = candidates.filter(
            (c) =>
              c.business_unit_group_id != null &&
              Number(c.business_unit_group_id) === Number(primaryBuId),
          )
          if (sameBuCandidates.length === 0) {
            return {
              success: false,
              error: "Secondary SPOC must be a user from your same business unit group.",
            }
          }
          if (sameBuCandidates.length > 1) {
            return {
              success: false,
              error:
                "Multiple users share this name in your business unit. Please use a unique user name before assigning as Secondary SPOC.",
            }
          }
          selectedSecondaryUserId = Number(sameBuCandidates[0].id)
        }

        const existingSecondary = await sql`
          SELECT bug.id, bug.name
          FROM business_unit_groups bug
          JOIN users u
            ON LOWER(TRIM(u.full_name)) = LOWER(TRIM(bug.secondary_spoc_name))
          WHERE bug.id <> ${businessGroupId}
            AND bug.secondary_spoc_name IS NOT NULL
            AND u.id = ${selectedSecondaryUserId}
          LIMIT 1
        `
        if (existingSecondary.length > 0) {
          return {
            success: false,
            error: `This user is already assigned as Secondary SPOC for ${existingSecondary[0].name}. A user can be Secondary SPOC for only one group.`,
          }
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

    // Step 1: Delete all mappings first
    await sql`DELETE FROM ticket_classification_mapping`
    
    // Step 2: Get count of tickets that will be affected
    const ticketsToUpdate = await sql`
      SELECT COUNT(*) as count
      FROM tickets 
      WHERE category_id IS NOT NULL OR subcategory_id IS NOT NULL
    `
    const ticketsCount = ticketsToUpdate[0]?.count || 0
    
    // Step 3: Set category_id and subcategory_id to NULL in tickets to avoid FK constraint violations
    await sql`
      UPDATE tickets 
      SET category_id = NULL, subcategory_id = NULL 
      WHERE category_id IS NOT NULL OR subcategory_id IS NOT NULL
    `
    
    // Step 4: Delete subcategories (now safe since tickets no longer reference them)
    const subcatResult = await sql`DELETE FROM subcategories RETURNING id`
    
    // Step 5: Delete categories
    const catResult = await sql`DELETE FROM categories RETURNING id`

    await addSystemAuditLog({
      actionType: "BULK_DELETE",
      entityType: "master_data",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Deleted ${catResult.length} categories, ${subcatResult.length} subcategories, and all classification mappings. Updated ${ticketsCount} tickets to remove category/subcategory references.`,
    })

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    revalidatePath("/master-data")

    return { 
      success: true, 
      message: `Successfully deleted ${catResult.length} categories and ${subcatResult.length} subcategories. ${ticketsCount} tickets were updated to remove category/subcategory references.`,
      deletedCount: {
        categories: catResult.length,
        subcategories: subcatResult.length,
        ticketsUpdated: Number(ticketsCount)
      }
    }
  } catch (error: any) {
    console.error("Error bulk deleting master data:", error)
    const errorMessage = error?.message || error?.detail || "Failed to delete master data"
    return { success: false, error: errorMessage }
  }
}

// ==================== BULK USER OPERATIONS ====================

export async function bulkUpdateUserRoles(userIds: number[], newRole: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    if (!userIds || userIds.length === 0) {
      return { success: false, error: "No users selected" }
    }

    // Prevent changing own role
    const filteredUserIds = userIds.filter((id) => id !== currentUser.id)

    if (filteredUserIds.length === 0) {
      return { success: false, error: "Cannot change your own role" }
    }

    const result = await sql`
      UPDATE users 
      SET role = ${newRole}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY(${filteredUserIds})
      RETURNING id, email, full_name, role
    `

    await addSystemAuditLog({
      actionType: "BULK_ROLE_CHANGE",
      entityType: "users",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Bulk updated ${result.length} users to role: ${newRole}`,
    })

    revalidatePath("/admin")
    revalidatePath("/users")

    return {
      success: true,
      message: `Successfully updated ${result.length} users to role: ${newRole}`,
      updatedCount: result.length,
    }
  } catch (error) {
    console.error("Error bulk updating user roles:", error)
    return { success: false, error: "Failed to update user roles" }
  }
}

export async function bulkUpdateUserBusinessGroups(userIds: number[], businessGroupId: number | null) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    if (!userIds || userIds.length === 0) {
      return { success: false, error: "No users selected" }
    }

    const result = await sql`
      UPDATE users 
      SET business_unit_group_id = ${businessGroupId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY(${userIds})
      RETURNING id, email, full_name
    `

    const bgName = businessGroupId
      ? (await sql`SELECT name FROM business_unit_groups WHERE id = ${businessGroupId}`)[0]?.name || "Unknown"
      : "None"

    await addSystemAuditLog({
      actionType: "BULK_BG_UPDATE",
      entityType: "users",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Bulk updated ${result.length} users to business group: ${bgName}`,
    })

    revalidatePath("/admin")
    revalidatePath("/users")

    return {
      success: true,
      message: `Successfully updated ${result.length} users to business group: ${bgName}`,
      updatedCount: result.length,
    }
  } catch (error) {
    console.error("Error bulk updating user business groups:", error)
    return { success: false, error: "Failed to update user business groups" }
  }
}

export async function bulkActivateUsers(userIds: number[]) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    if (!userIds || userIds.length === 0) {
      return { success: false, error: "No users selected" }
    }

    const result = await sql`
      UPDATE users 
      SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY(${userIds})
      RETURNING id, email, full_name
    `

    await addSystemAuditLog({
      actionType: "BULK_ACTIVATE",
      entityType: "users",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Bulk activated ${result.length} users`,
    })

    revalidatePath("/admin")
    revalidatePath("/users")

    return {
      success: true,
      message: `Successfully activated ${result.length} users`,
      updatedCount: result.length,
    }
  } catch (error) {
    console.error("Error bulk activating users:", error)
    return { success: false, error: "Failed to activate users" }
  }
}

export async function bulkDeactivateUsers(userIds: number[]) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    if (!userIds || userIds.length === 0) {
      return { success: false, error: "No users selected" }
    }

    // Prevent deactivating self
    const filteredUserIds = userIds.filter((id) => id !== currentUser.id)

    if (filteredUserIds.length === 0) {
      return { success: false, error: "Cannot deactivate yourself" }
    }

    const result = await sql`
      UPDATE users 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY(${filteredUserIds})
      RETURNING id, email, full_name
    `

    await addSystemAuditLog({
      actionType: "BULK_DEACTIVATE",
      entityType: "users",
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email || "Unknown",
      notes: `Bulk deactivated ${result.length} users`,
    })

    revalidatePath("/admin")
    revalidatePath("/users")

    return {
      success: true,
      message: `Successfully deactivated ${result.length} users`,
      updatedCount: result.length,
    }
  } catch (error) {
    console.error("Error bulk deactivating users:", error)
    return { success: false, error: "Failed to deactivate users" }
  }
}

// ==================== SYSTEM HEALTH STATS ====================

export async function getTicketCreationHistory(days: number = 30) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    // Determine limit based on days
    let limit = 100 // Default limit
    if (days === 1) { // Today
      limit = 200 // More tickets for today
    } else if (days === 3650) { // Overall (10 years)
      limit = 500 // More tickets for overall
    } else if (days <= 7) {
      limit = 150
    } else if (days <= 30) {
      limit = 200
    } else if (days <= 90) {
      limit = 300
    }

    // Fetch individual tickets with details - build query conditionally
    let result
    if (days === 1) {
      // Today only
      result = await sql`
        SELECT 
          t.id,
          t.ticket_id,
          t.title,
          t.description,
          t.status,
          t.created_at,
          t.created_by,
          creator.full_name as creator_name,
          creator.email as creator_email,
          creator.role as creator_role,
          a.full_name as assignee_name,
          spoc.full_name as spoc_name,
          c.name as category_name,
          bug.name as business_group_name,
          tbg.name as target_business_group_name,
          fa.name as organization_name
        FROM tickets t
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users a ON t.assigned_to = a.id
        LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
        LEFT JOIN business_unit_groups tbg ON t.target_business_group_id = tbg.id
        LEFT JOIN functional_area_business_group_mapping fabgm ON tbg.id = fabgm.target_business_group_id
        LEFT JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
        WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
          AND DATE(t.created_at) = CURRENT_DATE
        ORDER BY t.created_at DESC
        LIMIT ${limit}
      `
    } else if (days === 3650) {
      // Overall - no date filter
      result = await sql`
        SELECT 
          t.id,
          t.ticket_id,
          t.title,
          t.description,
          t.status,
          t.created_at,
          t.created_by,
          creator.full_name as creator_name,
          creator.email as creator_email,
          creator.role as creator_role,
          a.full_name as assignee_name,
          spoc.full_name as spoc_name,
          c.name as category_name,
          bug.name as business_group_name,
          tbg.name as target_business_group_name,
          fa.name as organization_name
        FROM tickets t
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users a ON t.assigned_to = a.id
        LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
        LEFT JOIN business_unit_groups tbg ON t.target_business_group_id = tbg.id
        LEFT JOIN functional_area_business_group_mapping fabgm ON tbg.id = fabgm.target_business_group_id
        LEFT JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
        WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
        ORDER BY t.created_at DESC
        LIMIT ${limit}
      `
    } else {
      // Specific number of days
      result = await sql`
        SELECT 
          t.id,
          t.ticket_id,
          t.title,
          t.description,
          t.status,
          t.created_at,
          t.created_by,
          creator.full_name as creator_name,
          creator.email as creator_email,
          creator.role as creator_role,
          a.full_name as assignee_name,
          spoc.full_name as spoc_name,
          c.name as category_name,
          bug.name as business_group_name,
          tbg.name as target_business_group_name,
          fa.name as organization_name
        FROM tickets t
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users a ON t.assigned_to = a.id
        LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
        LEFT JOIN business_unit_groups tbg ON t.target_business_group_id = tbg.id
        LEFT JOIN functional_area_business_group_mapping fabgm ON tbg.id = fabgm.target_business_group_id
        LEFT JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
        WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
          AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${days}
        ORDER BY t.created_at DESC
        LIMIT ${limit}
      `
    }

    return { success: true, data: result }
  } catch (error: any) {
    console.error("Error fetching ticket creation history:", error)
    return { success: false, error: error.message || "Failed to fetch ticket creation history", data: [] }
  }
}

export async function getSystemHealthStats() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "superadmin") {
      return { success: false, error: "Unauthorized: Super Admin access required" }
    }

    const [
      usersResult,
      activeUsersResult,
      ticketsResult,
      openTicketsResult,
      businessGroupsResult,
      functionalAreasResult,
      categoriesResult,
      teamsResult,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM users`,
      sql`SELECT COUNT(*) as count FROM users WHERE is_active = TRUE OR is_active IS NULL`,
      sql`SELECT COUNT(*) as count FROM tickets WHERE is_deleted IS NULL OR is_deleted = FALSE`,
      sql`SELECT COUNT(*) as count FROM tickets WHERE status = 'open' AND (is_deleted IS NULL OR is_deleted = FALSE)`,
      sql`SELECT COUNT(*) as count FROM business_unit_groups`,
      sql`SELECT COUNT(*) as count FROM functional_areas`,
      sql`SELECT COUNT(*) as count FROM categories`,
      sql`SELECT COUNT(*) as count FROM teams`,
    ])

    return {
      success: true,
      data: {
        totalUsers: Number(usersResult[0]?.count || 0),
        activeUsers: Number(activeUsersResult[0]?.count || 0),
        totalTickets: Number(ticketsResult[0]?.count || 0),
        openTickets: Number(openTicketsResult[0]?.count || 0),
        businessGroups: Number(businessGroupsResult[0]?.count || 0),
        functionalAreas: Number(functionalAreasResult[0]?.count || 0),
        categories: Number(categoriesResult[0]?.count || 0),
        teams: Number(teamsResult[0]?.count || 0),
      },
    }
  } catch (error) {
    console.error("Error fetching system health stats:", error)
    return {
      success: false,
      error: "Failed to fetch system health stats",
      data: {
        totalUsers: 0,
        activeUsers: 0,
        totalTickets: 0,
        openTickets: 0,
        businessGroups: 0,
        functionalAreas: 0,
        categories: 0,
        teams: 0,
      },
    }
  }
}