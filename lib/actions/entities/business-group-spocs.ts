/**
 * BUSINESS GROUP SPOCS - Server Actions
 * 
 * Functions for managing SPOC assignments using the new entity structure.
 */

'use server'

import { sql } from '@vercel/postgres'
import { BusinessGroupSpoc, User } from '@/types/entities'

/**
 * Get primary SPOC for a business group
 */
export async function getPrimarySpoc(businessGroupId: number): Promise<User | null> {
  const result = await sql`
    SELECT 
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.avatar_url,
      u.business_unit_group_id,
      u.created_at,
      u.updated_at
    FROM business_group_spocs bgs
    JOIN users u ON u.id = bgs.user_id
    WHERE 
      bgs.business_group_id = ${businessGroupId}
      AND bgs.spoc_type = 'primary'
      AND bgs.is_active = true
    LIMIT 1
  `

  return result.rows.length > 0 ? (result.rows[0] as User) : null
}

/**
 * Get all active SPOCs for a business group
 */
export async function getAllSpocs(businessGroupId: number): Promise<{
  primary: User | null
  secondary: User[]
  functional_area: User[]
}> {
  const result = await sql`
    SELECT 
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.avatar_url,
      u.business_unit_group_id,
      bgs.spoc_type,
      u.created_at,
      u.updated_at
    FROM business_group_spocs bgs
    JOIN users u ON u.id = bgs.user_id
    WHERE 
      bgs.business_group_id = ${businessGroupId}
      AND bgs.is_active = true
    ORDER BY 
      CASE bgs.spoc_type
        WHEN 'primary' THEN 1
        WHEN 'secondary' THEN 2
        WHEN 'functional_area' THEN 3
      END
  `

  const spocs = result.rows as (User & { spoc_type: string })[]

  return {
    primary: spocs.find(s => s.spoc_type === 'primary') || null,
    secondary: spocs.filter(s => s.spoc_type === 'secondary'),
    functional_area: spocs.filter(s => s.spoc_type === 'functional_area')
  }
}

/**
 * Check if user is a SPOC (any type) for a business group
 */
export async function isUserSpoc(userId: number, businessGroupId: number): Promise<boolean> {
  const result = await sql`
    SELECT EXISTS (
      SELECT 1 
      FROM business_group_spocs
      WHERE 
        user_id = ${userId}
        AND business_group_id = ${businessGroupId}
        AND is_active = true
    ) as is_spoc
  `

  return result.rows[0]?.is_spoc || false
}

/**
 * Check if user is primary SPOC for a business group
 */
export async function isUserPrimarySpoc(userId: number, businessGroupId: number): Promise<boolean> {
  const result = await sql`
    SELECT EXISTS (
      SELECT 1 
      FROM business_group_spocs
      WHERE 
        user_id = ${userId}
        AND business_group_id = ${businessGroupId}
        AND spoc_type = 'primary'
        AND is_active = true
    ) as is_primary
  `

  return result.rows[0]?.is_primary || false
}

/**
 * Check if user is secondary SPOC for a business group
 */
export async function isUserSecondarySpoc(userId: number, businessGroupId: number): Promise<boolean> {
  const result = await sql`
    SELECT EXISTS (
      SELECT 1 
      FROM business_group_spocs
      WHERE 
        user_id = ${userId}
        AND business_group_id = ${businessGroupId}
        AND spoc_type = 'secondary'
        AND is_active = true
    ) as is_secondary
  `

  return result.rows[0]?.is_secondary || false
}

/**
 * Assign primary SPOC to a business group
 * Note: Automatically deactivates previous primary SPOC
 */
export async function assignPrimarySpoc(
  businessGroupId: number,
  userId: number,
  assignedBy: number
): Promise<BusinessGroupSpoc> {
  // Deactivate existing primary SPOC
  await sql`
    UPDATE business_group_spocs
    SET is_active = false
    WHERE 
      business_group_id = ${businessGroupId}
      AND spoc_type = 'primary'
      AND is_active = true
  `

  // Assign new primary SPOC
  const result = await sql`
    INSERT INTO business_group_spocs (
      business_group_id,
      user_id,
      spoc_type,
      assigned_by,
      is_active
    ) VALUES (
      ${businessGroupId},
      ${userId},
      'primary',
      ${assignedBy},
      true
    )
    ON CONFLICT (business_group_id, user_id, spoc_type)
    DO UPDATE SET 
      is_active = true,
      assigned_at = CURRENT_TIMESTAMP,
      assigned_by = ${assignedBy}
    RETURNING *
  `

  return result.rows[0] as BusinessGroupSpoc
}

/**
 * Assign secondary SPOC to a business group
 */
export async function assignSecondarySpoc(
  businessGroupId: number,
  userId: number,
  assignedBy: number
): Promise<BusinessGroupSpoc> {
  const result = await sql`
    INSERT INTO business_group_spocs (
      business_group_id,
      user_id,
      spoc_type,
      assigned_by,
      is_active
    ) VALUES (
      ${businessGroupId},
      ${userId},
      'secondary',
      ${assignedBy},
      true
    )
    ON CONFLICT (business_group_id, user_id, spoc_type)
    DO UPDATE SET 
      is_active = true,
      assigned_at = CURRENT_TIMESTAMP,
      assigned_by = ${assignedBy}
    RETURNING *
  `

  return result.rows[0] as BusinessGroupSpoc
}

/**
 * Remove SPOC assignment
 */
export async function removeSpocAssignment(
  businessGroupId: number,
  userId: number,
  spocType: 'primary' | 'secondary' | 'functional_area'
): Promise<void> {
  await sql`
    UPDATE business_group_spocs
    SET is_active = false
    WHERE 
      business_group_id = ${businessGroupId}
      AND user_id = ${userId}
      AND spoc_type = ${spocType}
  `
}

/**
 * Get all business groups where user is a SPOC
 */
export async function getBusinessGroupsForSpoc(userId: number): Promise<{
  business_group_id: number
  business_group_name: string
  spoc_type: string
}[]> {
  const result = await sql`
    SELECT 
      bg.id as business_group_id,
      bg.name as business_group_name,
      bgs.spoc_type::TEXT as spoc_type
    FROM business_group_spocs bgs
    JOIN business_unit_groups bg ON bg.id = bgs.business_group_id
    WHERE 
      bgs.user_id = ${userId}
      AND bgs.is_active = true
    ORDER BY bg.name
  `

  return result.rows as { business_group_id: number; business_group_name: string; spoc_type: string }[]
}

/**
 * Get SPOC assignment history for a business group
 */
export async function getSpocAssignmentHistory(
  businessGroupId: number,
  spocType?: 'primary' | 'secondary' | 'functional_area'
): Promise<(BusinessGroupSpoc & { user_name: string; user_email: string })[]> {
  const typeFilter = spocType ? sql`AND bgs.spoc_type = ${spocType}` : sql``

  const result = await sql`
    SELECT 
      bgs.*,
      u.full_name as user_name,
      u.email as user_email
    FROM business_group_spocs bgs
    JOIN users u ON u.id = bgs.user_id
    WHERE bgs.business_group_id = ${businessGroupId}
    ${typeFilter}
    ORDER BY bgs.assigned_at DESC
  `

  return result.rows as (BusinessGroupSpoc & { user_name: string; user_email: string })[]
}

/**
 * Can user update primary SPOC field?
 * Secondary SPOCs cannot update primary SPOC field
 */
export async function canUpdatePrimarySpocField(
  userId: number,
  businessGroupId: number
): Promise<boolean> {
  // Check if user is secondary SPOC (they cannot update primary SPOC)
  const isSecondary = await isUserSecondarySpoc(userId, businessGroupId)
  if (isSecondary) {
    return false
  }

  // Check if user is primary SPOC or admin
  const isPrimary = await isUserPrimarySpoc(userId, businessGroupId)
  if (isPrimary) {
    return true
  }

  // Check if user is admin or superadmin (from users.role)
  const userResult = await sql`
    SELECT role FROM users WHERE id = ${userId}
  `
  const userRole = userResult.rows[0]?.role

  return userRole === 'admin' || userRole === 'superadmin'
}
