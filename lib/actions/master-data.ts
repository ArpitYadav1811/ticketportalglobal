"use server"

import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/actions/auth"
import { revalidatePath } from "next/cache"

// Helper function to revalidate all paths that might show master data
// This ensures Super Admin changes are visible to all roles immediately
function revalidateAllMasterDataPaths() {
  revalidatePath("/master-data")
  revalidatePath("/admin")
  revalidatePath("/dashboard")
  revalidatePath("/tickets")
  revalidatePath("/tickets/create")
  revalidatePath("/analytics")
}

// Business Unit Groups
export async function getBusinessUnitGroups() {
  try {
    const result = await sql`
      SELECT * FROM business_unit_groups
      ORDER BY name ASC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching business unit groups:", error)
    return { success: false, error: "Failed to fetch business unit groups", data: [] }
  }
}

// Target Business Groups (now uses business_unit_groups after merger)
export async function getTargetBusinessGroups(organizationId?: number) {
  try {
    let result
    if (organizationId) {
      // Filter by functional area if provided
      result = await sql`
        SELECT DISTINCT bug.*
        FROM business_unit_groups bug
        INNER JOIN functional_area_business_group_mapping fabgm ON bug.id = fabgm.target_business_group_id
        WHERE fabgm.functional_area_id = ${organizationId}
        ORDER BY bug.name ASC
      `
    } else {
      // Get all target business groups (same as business_unit_groups after merger)
      result = await sql`
        SELECT * FROM business_unit_groups
        ORDER BY name ASC
      `
    }
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching target business groups:", error)
    return { success: false, error: "Failed to fetch target business groups", data: [] }
  }
}

// Functional Areas (formerly Organizations)
export async function getOrganizations() {
  try {
    // Directly query the table - if it doesn't exist, the catch block will handle it
    const result = await sql`
      SELECT * FROM functional_areas
      ORDER BY name ASC
    `
    
    console.log("[getOrganizations] Fetched functional areas:", result.length, "records")
    
    if (result.length === 0) {
      console.warn("[getOrganizations] Functional Areas table is empty. Please run seed script 027-seed-functional-areas-updated.sql")
      return { success: true, data: [], error: "Functional Areas table is empty. Please run the seed script." }
    }
    
    return { success: true, data: result || [] }
  } catch (error) {
    console.error("[getOrganizations] Error fetching functional areas:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    // Check if it's a "table doesn't exist" error
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      console.warn("[getOrganizations] Functional Areas table does not exist in database")
      return { success: true, data: [], error: "Functional Areas table does not exist. Please run the seed script." }
    }
    
    // Return success: true with empty data so the form doesn't break
    return { success: true, data: [], error: `Failed to fetch functional areas: ${errorMessage}` }
  }
}

export async function getTargetBusinessGroupsByOrganization(organizationId: number) {
  try {
    const result = await sql`
      SELECT DISTINCT bug.*
      FROM business_unit_groups bug
      INNER JOIN functional_area_business_group_mapping fabgm ON bug.id = fabgm.target_business_group_id
      WHERE fabgm.functional_area_id = ${organizationId}
      ORDER BY bug.name ASC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching target business groups by functional area:", error)
    return { success: false, error: "Failed to fetch target business groups", data: [] }
  }
}

export async function createBusinessUnitGroup(name: string, description?: string, spocName?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Only admins can create business groups
    if (currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Only admins can create business groups" }
    }
    
    const trimmedName = name.trim()
    const result = await sql`
      INSERT INTO business_unit_groups (name, description, spoc_name)
      VALUES (${trimmedName}, ${description || null}, ${spocName || null})
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to create business unit group - no data returned" }
    }
    revalidateAllMasterDataPaths()
    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: `Business unit group with this name already exists`, isDuplicate: true }
    }
    console.error("Error creating business unit group:", error)
    return { success: false, error: "Failed to create business unit group" }
  }
}

export async function updateBusinessUnitGroup(id: number, name: string, description?: string, spocName?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Only admins can update business groups
    if (currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Only admins can update business groups" }
    }
    
    const trimmedName = name.trim()
    const result = await sql`
      UPDATE business_unit_groups
      SET name = ${trimmedName}, description = ${description || null}, spoc_name = ${spocName || null}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to update business unit group - no data returned" }
    }
    revalidateAllMasterDataPaths()
    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: `Business unit group with this name already exists`, isDuplicate: true }
    }
    console.error("Error updating business unit group:", error)
    return { success: false, error: "Failed to update business unit group" }
  }
}

export async function deleteBusinessUnitGroup(id: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    const userRole = currentUser.role?.toLowerCase()
    const isSuperAdmin = userRole === "superadmin"
    
    // Only admins can delete business groups
    if (userRole !== "admin" && !isSuperAdmin) {
      return { success: false, error: "Only admins can delete business groups" }
    }
    
    // Super Admin: Log permanent deletion and delete all related records first
    if (isSuperAdmin) {
      try {
        const { addSystemAuditLog } = await import("./admin")
        const bgToDelete = await sql`SELECT name FROM business_unit_groups WHERE id = ${id}`
        if (bgToDelete.length > 0) {
          // For Super Admin, delete all related records first to avoid foreign key constraints
          // Delete ticket classification mappings
          await sql`DELETE FROM ticket_classification_mapping WHERE target_business_group_id = ${id}`
          
          // Delete functional area mappings
          await sql`DELETE FROM functional_area_business_group_mapping WHERE target_business_group_id = ${id}`
          
          // Update users to remove business_unit_group_id reference (set to NULL)
          await sql`UPDATE users SET business_unit_group_id = NULL WHERE business_unit_group_id = ${id}`
          
          // Update tickets to remove business_unit_group_id and target_business_group_id references
          await sql`UPDATE tickets SET business_unit_group_id = NULL WHERE business_unit_group_id = ${id}`
          await sql`UPDATE tickets SET target_business_group_id = NULL WHERE target_business_group_id = ${id}`
          await sql`UPDATE tickets SET assignee_group_id = NULL WHERE assignee_group_id = ${id}`
          
          await addSystemAuditLog({
            actionType: "hard_delete",
            entityType: "business_unit_group",
            oldValue: bgToDelete[0].name,
            performedBy: currentUser.id,
            performedByName: currentUser.full_name || currentUser.email,
            notes: "Business Group permanently deleted by Super Admin. All related data has been removed."
          })
        }
      } catch (auditError) {
        console.log("Could not log to system audit:", auditError)
      }
    }
    
    // Hard delete: Permanently remove (for Super Admin, related records already deleted above)
    // For regular admin, cascade should handle it if constraints are set up correctly
    await sql`DELETE FROM business_unit_groups WHERE id = ${id}`
    
    // Revalidate cache to ensure UI updates for all roles
    revalidateAllMasterDataPaths()
    
    return { 
      success: true, 
      message: isSuperAdmin 
        ? "Business Group permanently deleted. All related tickets, users, and mappings have been removed." 
        : "Business Group deleted successfully"
    }
  } catch (error: any) {
    console.error("Error deleting business unit group:", error)
    // Check if it's a foreign key constraint error
    if (error.message?.includes("foreign key") || error.code === "23503") {
      return { 
        success: false, 
        error: "Cannot delete business group: It is still referenced by other records. Please remove all references first." 
      }
    }
    return { success: false, error: "Failed to delete business unit group" }
  }
}

// Categories
export async function getCategories() {
  try {
    const result = await sql`
      SELECT * FROM categories 
      ORDER BY name ASC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching categories:", error)
    return { success: false, error: "Failed to fetch categories", data: [] }
  }
}

export async function createCategory(name: string, description?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Only admins can create categories
    if (currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Only admins can create categories" }
    }
    
    const trimmedName = name.trim()
    const result = await sql`
      INSERT INTO categories (name, description)
      VALUES (${trimmedName}, ${description || null})
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to create category - no data returned" }
    }
    revalidateAllMasterDataPaths()
    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: `Category with this name already exists`, isDuplicate: true }
    }
    console.error("Error creating category:", error)
    return { success: false, error: "Failed to create category" }
  }
}

export async function updateCategory(id: number, name: string, description?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Only admins can update categories
    if (currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Only admins can update categories" }
    }
    
    const trimmedName = name.trim()
    const result = await sql`
      UPDATE categories 
      SET name = ${trimmedName}, description = ${description || null}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to update category - no data returned" }
    }
    revalidateAllMasterDataPaths()
    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: `Category with this name already exists`, isDuplicate: true }
    }
    console.error("Error updating category:", error)
    return { success: false, error: "Failed to update category" }
  }
}

export async function deleteCategory(id: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    const userRole = currentUser.role?.toLowerCase()
    const isSuperAdmin = userRole === "superadmin"
    
    // Only admins can delete categories
    if (userRole !== "admin" && !isSuperAdmin) {
      return { success: false, error: "Only admins can delete categories" }
    }
    
    // Super Admin: Log permanent deletion
    if (isSuperAdmin) {
      try {
        const { addSystemAuditLog } = await import("./admin")
        const catToDelete = await sql`SELECT name FROM categories WHERE id = ${id}`
        if (catToDelete.length > 0) {
          await addSystemAuditLog({
            actionType: "hard_delete",
            entityType: "category",
            oldValue: catToDelete[0].name,
            performedBy: currentUser.id,
            performedByName: currentUser.full_name || currentUser.email,
            notes: "Category permanently deleted by Super Admin. All related subcategories, tickets, and mappings will be cascade deleted."
          })
        }
      } catch (auditError) {
        console.log("Could not log to system audit:", auditError)
      }
    }
    
    // Hard delete: Permanently remove (cascade will handle related subcategories, tickets, mappings)
    await sql`DELETE FROM categories WHERE id = ${id}`
    revalidateAllMasterDataPaths()
    return { 
      success: true, 
      message: isSuperAdmin 
        ? "Category permanently deleted. All related subcategories, tickets, and mappings have been removed." 
        : "Category deleted successfully"
    }
  } catch (error) {
    console.error("Error deleting category:", error)
    return { success: false, error: "Failed to delete category" }
  }
}

// Subcategories
export async function getSubcategories(categoryId?: number) {
  try {
    const result = categoryId
      ? await sql`
          SELECT s.id, s.category_id, s.name, s.description,
                 s.input_template, s.estimated_duration_minutes, s.closure_steps,
                 c.name as category_name
          FROM subcategories s
          JOIN categories c ON s.category_id = c.id
          WHERE s.category_id = ${categoryId}
          ORDER BY s.name ASC
        `
      : await sql`
          SELECT s.id, s.category_id, s.name, s.description,
                 s.input_template, s.estimated_duration_minutes, s.closure_steps,
                 c.name as category_name
          FROM subcategories s
          JOIN categories c ON s.category_id = c.id
          ORDER BY c.name, s.name ASC
        `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching subcategories:", error)
    return { success: false, error: "Failed to fetch subcategories", data: [] }
  }
}

// Get subcategory details for auto-fill (template, duration, closure steps)
export async function getSubcategoryDetails(subcategoryId: number) {
  try {
    const result = await sql`
      SELECT
        s.id, s.name, s.input_template, s.estimated_duration_minutes, s.closure_steps,
        c.id as category_id, c.name as category_name
      FROM subcategories s
      JOIN categories c ON s.category_id = c.id
      WHERE s.id = ${subcategoryId}
    `
    return { success: true, data: result.length > 0 ? result[0] : null }
  } catch (error) {
    console.error("Error fetching subcategory details:", error)
    return { success: false, error: "Failed to fetch subcategory details", data: null }
  }
}

export async function createSubcategory(categoryId: number, name: string, description?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Only admins can create subcategories
    if (currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Only admins can create subcategories" }
    }
    
    const trimmedName = name.trim()
    const result = await sql`
      INSERT INTO subcategories (category_id, name, description)
      VALUES (${categoryId}, ${trimmedName}, ${description || null})
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to create subcategory - no data returned" }
    }
    revalidateAllMasterDataPaths()
    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: `Subcategory with this name already exists in this category`, isDuplicate: true }
    }
    console.error("Error creating subcategory:", error)
    return { success: false, error: "Failed to create subcategory" }
  }
}

export async function updateSubcategory(id: number, name: string, description?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Only admins can update subcategories
    if (currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Only admins can update subcategories" }
    }
    
    const result = await sql`
      UPDATE subcategories 
      SET name = ${name}, description = ${description || null}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to update subcategory - no data returned" }
    }
    revalidateAllMasterDataPaths()
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating subcategory:", error)
    return { success: false, error: "Failed to update subcategory" }
  }
}

export async function deleteSubcategory(id: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    const userRole = currentUser.role?.toLowerCase()
    const isSuperAdmin = userRole === "superadmin"
    
    // Only admins can delete subcategories
    if (userRole !== "admin" && !isSuperAdmin) {
      return { success: false, error: "Only admins can delete subcategories" }
    }
    
    // Check if there are any tickets referencing this subcategory
    const ticketsCheck = await sql`
      SELECT COUNT(*) as count FROM tickets WHERE subcategory_id = ${id}
    `

    const ticketCount = Number(ticketsCheck[0]?.count || 0)

    // Check if there are any mappings referencing this subcategory
    const mappingsCheck = await sql`
      SELECT COUNT(*) as count FROM ticket_classification_mapping WHERE subcategory_id = ${id}
    `

    const mappingCount = Number(mappingsCheck[0]?.count || 0)

    // Super Admin: Can delete even with dependencies (cascade will handle it)
    if (!isSuperAdmin) {
      if (ticketCount > 0) {
        return {
          success: false,
          error: `Cannot delete subcategory: ${ticketCount} ticket(s) still reference this subcategory. Please reassign or delete the tickets first.`,
          dependentCount: ticketCount,
        }
      }

      if (mappingCount > 0) {
        return {
          success: false,
          error: `Cannot delete subcategory: ${mappingCount} ticket classification mapping(s) still reference this subcategory. Please delete the mappings first.`,
          dependentCount: mappingCount,
        }
      }
    } else {
      // Super Admin: Log permanent deletion
      try {
        const { addSystemAuditLog } = await import("./admin")
        const subcatToDelete = await sql`SELECT name FROM subcategories WHERE id = ${id}`
        if (subcatToDelete.length > 0) {
          await addSystemAuditLog({
            actionType: "hard_delete",
            entityType: "subcategory",
            oldValue: subcatToDelete[0].name,
            performedBy: currentUser.id,
            performedByName: currentUser.full_name || currentUser.email,
            notes: `Subcategory permanently deleted by Super Admin. ${ticketCount} tickets and ${mappingCount} mappings will be cascade deleted.`
          })
        }
      } catch (auditError) {
        console.log("Could not log to system audit:", auditError)
      }
    }

    // Hard delete: Permanently remove (cascade will handle related tickets and mappings)
    await sql`DELETE FROM subcategories WHERE id = ${id}`
    revalidateAllMasterDataPaths()
    return { 
      success: true, 
      message: isSuperAdmin 
        ? `Subcategory permanently deleted. ${ticketCount} tickets and ${mappingCount} mappings have been cascade deleted.` 
        : "Subcategory deleted successfully"
    }
  } catch (error) {
    console.error("Error deleting subcategory:", error)
    return { success: false, error: "Failed to delete subcategory" }
  }
}

// Ticket Classification Mappings
export async function getTicketClassificationMappings() {
  try {
    const result = await sql`
      SELECT 
        tcm.*,
        bug.name as target_business_group_name,
        bug.name as business_unit_group_name,
        c.name as category_name,
        s.name as subcategory_name,
        u.full_name as spoc_name
      FROM ticket_classification_mapping tcm
      INNER JOIN business_unit_groups bug ON tcm.target_business_group_id = bug.id
      INNER JOIN categories c ON tcm.category_id = c.id
      INNER JOIN subcategories s ON tcm.subcategory_id = s.id
      LEFT JOIN users u ON tcm.spoc_user_id = u.id
      ORDER BY bug.name, c.name, s.name
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching ticket classification mappings:", error)
    return { success: false, error: "Failed to fetch mappings", data: [] }
  }
}

/**
 * Get business groups where a user is assigned as SPOC
 */
export async function getBusinessGroupsForSpoc(userId: number) {
  try {
    const result = await sql`
      SELECT DISTINCT bug.id, bug.name 
      FROM ticket_classification_mapping tcm
      JOIN business_unit_groups bug ON tcm.target_business_group_id = bug.id
      WHERE tcm.spoc_user_id = ${userId}
    `
    return { success: true, data: result || [] }
  } catch (error) {
    console.error("Error fetching business groups for SPOC:", error)
    return { success: false, error: "Failed to fetch business groups", data: [] }
  }
}

/**
 * Check if a user is a SPOC for any business group
 */
export async function isUserSpoc(userId: number) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM ticket_classification_mapping
      WHERE spoc_user_id = ${userId}
    `
    return (result[0]?.count || 0) > 0
  } catch (error) {
    console.error("Error checking if user is SPOC:", error)
    return false
  }
}

/**
 * Check if a SPOC has access to a specific business group
 */
export async function spocHasAccessToBusinessGroup(userId: number, businessGroupId: number) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM ticket_classification_mapping
      WHERE spoc_user_id = ${userId} AND target_business_group_id = ${businessGroupId}
    `
    return (result[0]?.count || 0) > 0
  } catch (error) {
    console.error("Error checking SPOC access to business group:", error)
    return false
  }
}

export async function getSpocForTargetBusinessGroup(targetBusinessGroupId: number) {
  try {
    const result = await sql`
      SELECT 
        bug.spoc_name,
        u.id,
        u.full_name,
        u.email
      FROM business_unit_groups bug
      LEFT JOIN users u ON LOWER(TRIM(u.full_name)) = LOWER(TRIM(bug.spoc_name))
      WHERE bug.id = ${targetBusinessGroupId}
      LIMIT 1
    `
    
    if (result.length > 0 && result[0].id) {
      return {
        success: true,
        data: {
          id: result[0].id,
          full_name: result[0].full_name,
          email: result[0].email,
        },
      }
    }
    
    return { success: false, error: "No SPOC found for this target business group", data: null }
  } catch (error) {
    console.error("Error fetching SPOC for target business group:", error)
    return { success: false, error: "Failed to fetch SPOC", data: null }
  }
}

/**
 * Get SPOC user ID for a business unit group from ticket_classification_mapping
 * DEPRECATED: Use getSpocForTargetBusinessGroup instead
 * Kept for backward compatibility
 */
export async function getSpocForBusinessUnitGroup(businessUnitGroupId: number) {
  // After table merger, business_unit_groups and target_business_groups are the same
  // So we can directly use the businessUnitGroupId
  try {
    return getSpocForTargetBusinessGroup(businessUnitGroupId)
  } catch (error) {
    console.error("Error fetching SPOC for business unit group:", error)
    return { success: false, error: "Failed to fetch SPOC", data: null }
  }
}

export async function createTicketClassificationMapping(
  targetBusinessGroupId: number,
  categoryId: number,
  subcategoryId: number,
  estimatedDuration: number,
  spocUserId?: number,
  autoTitleTemplate?: string,
  description?: string,
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    const _role = currentUser.role?.toLowerCase()
    const isAdmin = _role === "admin" || _role === "superadmin"
    
    // If user is SPOC (not admin), check if they have access to this business group
    if (!isAdmin) {
      const hasAccess = await spocHasAccessToBusinessGroup(currentUser.id, targetBusinessGroupId)
      if (!hasAccess) {
        return { success: false, error: "You can only create mappings for your assigned business groups" }
      }
    }
    
    const result = await sql`
      INSERT INTO ticket_classification_mapping 
        (target_business_group_id, category_id, subcategory_id, estimated_duration, spoc_user_id, auto_title_template, description)
      VALUES (${targetBusinessGroupId}, ${categoryId}, ${subcategoryId}, ${estimatedDuration}, ${spocUserId || null}, ${autoTitleTemplate || null}, ${description || null})
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to create mapping - no data returned" }
    }
    revalidateAllMasterDataPaths()
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error creating ticket classification mapping:", error)
    return { success: false, error: "Failed to create mapping" }
  }
}

export async function updateTicketClassificationMapping(
  id: number,
  estimatedDuration: number,
  spocUserId?: number,
  autoTitleTemplate?: string,
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    const _role = currentUser.role?.toLowerCase()
    const isAdmin = _role === "admin" || _role === "superadmin"
    
    // If user is SPOC (not admin), check if they have access to this mapping's business group
    if (!isAdmin) {
      const mappingCheck = await sql`
        SELECT target_business_group_id FROM ticket_classification_mapping WHERE id = ${id}
      `
      if (mappingCheck.length === 0) {
        return { success: false, error: "Mapping not found" }
      }
      const businessGroupId = mappingCheck[0].target_business_group_id
      const hasAccess = await spocHasAccessToBusinessGroup(currentUser.id, businessGroupId)
      if (!hasAccess) {
        return { success: false, error: "You can only update mappings for your assigned business groups" }
      }
    }
    
    const result = await sql`
      UPDATE ticket_classification_mapping 
      SET 
        estimated_duration = ${estimatedDuration},
        spoc_user_id = ${spocUserId || null},
        auto_title_template = ${autoTitleTemplate || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to update mapping - no data returned" }
    }
    revalidateAllMasterDataPaths()
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating ticket classification mapping:", error)
    return { success: false, error: "Failed to update mapping" }
  }
}

export async function deleteTicketClassificationMapping(id: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }
    
    const _role = currentUser.role?.toLowerCase()
    const isAdmin = _role === "admin" || _role === "superadmin"
    const isSuperAdmin = _role === "superadmin"
    
    // If user is SPOC (not admin), check if they have access to this mapping's business group
    if (!isAdmin) {
      const mappingCheck = await sql`
        SELECT target_business_group_id FROM ticket_classification_mapping WHERE id = ${id}
      `
      if (mappingCheck.length === 0) {
        return { success: false, error: "Mapping not found" }
      }
      const businessGroupId = mappingCheck[0].target_business_group_id
      const hasAccess = await spocHasAccessToBusinessGroup(currentUser.id, businessGroupId)
      if (!hasAccess) {
        return { success: false, error: "You can only delete mappings for your assigned business groups" }
      }
    }
    
    // Super Admin: Log permanent deletion
    if (isSuperAdmin) {
      try {
        const { addSystemAuditLog } = await import("./admin")
        const mappingToDelete = await sql`
          SELECT tcm.*, tbg.name as bg_name, c.name as cat_name, sc.name as subcat_name
          FROM ticket_classification_mapping tcm
          LEFT JOIN business_unit_groups tbg ON tcm.target_business_group_id = tbg.id
          LEFT JOIN categories c ON tcm.category_id = c.id
          LEFT JOIN subcategories sc ON tcm.subcategory_id = sc.id
          WHERE tcm.id = ${id}
        `
        if (mappingToDelete.length > 0) {
          const mapping = mappingToDelete[0]
          await addSystemAuditLog({
            actionType: "hard_delete",
            entityType: "ticket_classification_mapping",
            oldValue: `${mapping.bg_name} → ${mapping.cat_name} → ${mapping.subcat_name || 'N/A'}`,
            performedBy: currentUser.id,
            performedByName: currentUser.full_name || currentUser.email,
            notes: "Ticket Classification Mapping permanently deleted by Super Admin"
          })
        }
      } catch (auditError) {
        console.log("Could not log to system audit:", auditError)
      }
    }
    
    // Hard delete: Permanently remove
    await sql`DELETE FROM ticket_classification_mapping WHERE id = ${id}`
    revalidateAllMasterDataPaths()
    return { 
      success: true, 
      message: isSuperAdmin 
        ? "Mapping permanently deleted" 
        : "Mapping deleted successfully"
    }
  } catch (error) {
    console.error("Error deleting ticket classification mapping:", error)
    return { success: false, error: "Failed to delete mapping" }
  }
}

export async function getAutoTitleTemplate(targetBusinessGroupId: number, categoryId: number, subcategoryId: number | null) {
  try {
    const result = subcategoryId
      ? await sql`
          SELECT auto_title_template, estimated_duration, spoc_user_id, description
          FROM ticket_classification_mapping
          WHERE target_business_group_id = ${targetBusinessGroupId}
            AND category_id = ${categoryId}
            AND subcategory_id = ${subcategoryId}
        `
      : await sql`
          SELECT auto_title_template, estimated_duration, spoc_user_id, description
          FROM ticket_classification_mapping
          WHERE target_business_group_id = ${targetBusinessGroupId}
            AND category_id = ${categoryId}
          LIMIT 1
        `
    return { success: true, data: result && result.length > 0 ? result[0] : null }
  } catch (error) {
    console.error("Error fetching auto title template:", error)
    return { success: false, error: "Failed to fetch template" }
  }
}

/**
 * Get classification mapping by target business group, category, and subcategory
 */
export async function getClassificationMappingByTargetBusinessGroup(
  targetBusinessGroupId: number,
  categoryId: number,
  subcategoryId: number | null
) {
  try {
    const result = subcategoryId
      ? await sql`
          SELECT 
            tcm.*,
            tbg.name as target_business_group_name,
            c.name as category_name,
            s.name as subcategory_name,
            u.full_name as spoc_name
          FROM ticket_classification_mapping tcm
          JOIN business_unit_groups tbg ON tcm.target_business_group_id = tbg.id
          JOIN categories c ON tcm.category_id = c.id
          JOIN subcategories s ON tcm.subcategory_id = s.id
          LEFT JOIN users u ON tcm.spoc_user_id = u.id
          WHERE tcm.target_business_group_id = ${targetBusinessGroupId}
            AND tcm.category_id = ${categoryId}
            AND tcm.subcategory_id = ${subcategoryId}
        `
      : await sql`
          SELECT 
            tcm.*,
            tbg.name as target_business_group_name,
            c.name as category_name,
            s.name as subcategory_name,
            u.full_name as spoc_name
          FROM ticket_classification_mapping tcm
          JOIN business_unit_groups tbg ON tcm.target_business_group_id = tbg.id
          JOIN categories c ON tcm.category_id = c.id
          JOIN subcategories s ON tcm.subcategory_id = s.id
          LEFT JOIN users u ON tcm.spoc_user_id = u.id
          WHERE tcm.target_business_group_id = ${targetBusinessGroupId}
            AND tcm.category_id = ${categoryId}
          LIMIT 1
        `
    return { success: true, data: result && result.length > 0 ? result[0] : null }
  } catch (error) {
    console.error("Error fetching classification mapping:", error)
    return { success: false, error: "Failed to fetch mapping", data: null }
  }
}

// Bulk upload functions
export async function bulkUploadBusinessUnitGroups(data: Array<{ name: string; description?: string }>) {
  try {
    const results = []
    for (const item of data) {
      const result = await sql`
        INSERT INTO business_unit_groups (name, description)
        VALUES (${item.name}, ${item.description || null})
        ON CONFLICT (name) DO UPDATE SET description = ${item.description || null}
        RETURNING *
      `
      results.push(result[0])
    }
    return { success: true, data: results, count: results.length }
  } catch (error) {
    console.error("Error bulk uploading business unit groups:", error)
    return { success: false, error: "Failed to bulk upload business unit groups" }
  }
}

export async function bulkUploadCategories(data: Array<{ name: string; description?: string }>) {
  try {
    const results = []
    for (const item of data) {
      const result = await sql`
        INSERT INTO categories (name, description)
        VALUES (${item.name}, ${item.description || null})
        ON CONFLICT (name) DO UPDATE SET description = ${item.description || null}
        RETURNING *
      `
      results.push(result[0])
    }
    return { success: true, data: results, count: results.length }
  } catch (error) {
    console.error("Error bulk uploading categories:", error)
    return { success: false, error: "Failed to bulk upload categories" }
  }
}

export async function bulkUploadTicketClassificationMappings(
  data: Array<{
    targetBusinessGroup: string
    category: string
    subcategory: string
    estimatedDuration: number
    spocEmail?: string
    autoTitleTemplate?: string
    description?: string
  }>,
) {
  try {
    const results = []
    for (const item of data) {
      // Get IDs from names
      const tbgResult = await sql`SELECT id FROM business_unit_groups WHERE name = ${item.targetBusinessGroup}`
      const catResult = await sql`SELECT id FROM categories WHERE name = ${item.category}`
      const subcatResult = await sql`
        SELECT id FROM subcategories 
        WHERE name = ${item.subcategory} 
          AND category_id = ${catResult[0]?.id}
      `

      let spocUserId = null
      if (item.spocEmail) {
        const spocResult = await sql`SELECT id FROM users WHERE email = ${item.spocEmail}`
        spocUserId = spocResult[0]?.id
      }

      if (tbgResult[0] && catResult[0] && subcatResult[0]) {
        const result = await sql`
          INSERT INTO ticket_classification_mapping 
            (target_business_group_id, category_id, subcategory_id, estimated_duration, spoc_user_id, auto_title_template, description)
          VALUES (${tbgResult[0].id}, ${catResult[0].id}, ${subcatResult[0].id}, ${item.estimatedDuration}, ${spocUserId}, ${item.autoTitleTemplate || null}, ${item.description || null})
          ON CONFLICT (target_business_group_id, category_id, subcategory_id) 
          DO UPDATE SET 
            estimated_duration = ${item.estimatedDuration},
            spoc_user_id = ${spocUserId},
            auto_title_template = ${item.autoTitleTemplate || null},
            description = ${item.description || null}
          RETURNING *
        `
        results.push(result[0])
      }
    }
    return { success: true, data: results, count: results.length }
  } catch (error) {
    console.error("Error bulk uploading ticket classification mappings:", error)
    return { success: false, error: "Failed to bulk upload mappings" }
  }
}

// Projects
export async function getProjects(businessUnitGroupId?: number) {
  try {
    const result = businessUnitGroupId
      ? await sql`
          SELECT * FROM projects
          WHERE business_unit_group_id = ${businessUnitGroupId} AND is_active = TRUE
          ORDER BY name ASC
        `
      : await sql`
          SELECT * FROM projects
          WHERE is_active = TRUE
          ORDER BY name ASC
        `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching projects:", error)
    return { success: false, error: "Failed to fetch projects", data: [] }
  }
}

// Project Names (for release planning / master settings)
export async function getProjectNames() {
  try {
    const result = await sql`
      SELECT 
        p.*,
        bug.name AS business_group_name
      FROM projects p
      LEFT JOIN business_unit_groups bug ON p.business_unit_group_id = bug.id
      ORDER BY p.name ASC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching project names:", error)
    return { success: false, error: "Failed to fetch project names", data: [] }
  }
}

export async function createProjectName(
  name: string,
  estimatedReleaseDate?: string,
  businessUnitGroupId?: number | null,
) {
  try {
    const trimmedName = name.trim()
    const result = await sql`
      INSERT INTO projects (name, estimated_release_date, business_unit_group_id)
      VALUES (${trimmedName}, ${estimatedReleaseDate || null}, ${businessUnitGroupId || null})
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to create project - no data returned" }
    }
    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: `Project with this name already exists`, isDuplicate: true }
    }
    console.error("Error creating project:", error)
    return { success: false, error: "Failed to create project" }
  }
}

export async function updateProjectName(
  id: number,
  name: string,
  estimatedReleaseDate?: string,
  businessUnitGroupId?: number | null,
) {
  try {
    const trimmedName = name.trim()
    const result = await sql`
      UPDATE projects
      SET 
        name = ${trimmedName},
        estimated_release_date = ${estimatedReleaseDate || null},
        business_unit_group_id = ${businessUnitGroupId || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    if (!result || result.length === 0) {
      return { success: false, error: "Failed to update project - no data returned" }
    }
    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: `Project with this name already exists`, isDuplicate: true }
    }
    console.error("Error updating project:", error)
    return { success: false, error: "Failed to update project" }
  }
}

export async function deleteProjectName(id: number) {
  try {
    await sql`DELETE FROM projects WHERE id = ${id}`
    return { success: true }
  } catch (error) {
    console.error("Error deleting project:", error)
    return { success: false, error: "Failed to delete project" }
  }
}

// Product Releases
export async function getProductReleases() {
  try {
    const result = await sql`
      SELECT
        id,
        product_name,
        package_name,
        release_number,
        release_date,
        CONCAT(product_name, ' ', release_number,
               CASE WHEN release_date IS NOT NULL
                    THEN CONCAT(' (', TO_CHAR(release_date, 'DD Mon YYYY'), ')')
                    ELSE ''
               END) as display_name
      FROM product_releases
      WHERE is_active = TRUE
      ORDER BY product_name, release_date DESC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching product releases:", error)
    return { success: false, error: "Failed to fetch product releases", data: [] }
  }
}
