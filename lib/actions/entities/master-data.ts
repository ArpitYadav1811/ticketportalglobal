/**
 * MASTER DATA ENTITIES - Server Actions
 * 
 * Functions for managing ticket statuses, priorities, types, and user roles.
 */

'use server'

import { sql } from '@vercel/postgres'
import { TicketStatus, TicketPriority, TicketType, UserRole } from '@/types/entities'

// =====================================================
// TICKET STATUSES
// =====================================================

export async function getAllTicketStatuses(): Promise<TicketStatus[]> {
  const result = await sql`
    SELECT * FROM ticket_statuses
    WHERE is_active = true
    ORDER BY sort_order
  `
  return result.rows as TicketStatus[]
}

export async function getTicketStatusByCode(code: string): Promise<TicketStatus | null> {
  const result = await sql`
    SELECT * FROM ticket_statuses
    WHERE code = ${code} AND is_active = true
    LIMIT 1
  `
  return result.rows.length > 0 ? (result.rows[0] as TicketStatus) : null
}

export async function getTicketStatusById(id: number): Promise<TicketStatus | null> {
  const result = await sql`
    SELECT * FROM ticket_statuses
    WHERE id = ${id}
    LIMIT 1
  `
  return result.rows.length > 0 ? (result.rows[0] as TicketStatus) : null
}

export async function createTicketStatus(
  code: string,
  name: string,
  description?: string,
  color?: string,
  icon?: string,
  sortOrder?: number,
  isClosedState?: boolean
): Promise<TicketStatus> {
  const result = await sql`
    INSERT INTO ticket_statuses (
      code, name, description, color, icon, sort_order, is_closed_state
    ) VALUES (
      ${code}, ${name}, ${description}, ${color}, ${icon}, ${sortOrder || 0}, ${isClosedState || false}
    )
    RETURNING *
  `
  return result.rows[0] as TicketStatus
}

// =====================================================
// TICKET PRIORITIES
// =====================================================

export async function getAllTicketPriorities(): Promise<TicketPriority[]> {
  const result = await sql`
    SELECT * FROM ticket_priorities
    WHERE is_active = true
    ORDER BY sort_order
  `
  return result.rows as TicketPriority[]
}

export async function getTicketPriorityByCode(code: string): Promise<TicketPriority | null> {
  const result = await sql`
    SELECT * FROM ticket_priorities
    WHERE code = ${code} AND is_active = true
    LIMIT 1
  `
  return result.rows.length > 0 ? (result.rows[0] as TicketPriority) : null
}

export async function getTicketPriorityById(id: number): Promise<TicketPriority | null> {
  const result = await sql`
    SELECT * FROM ticket_priorities
    WHERE id = ${id}
    LIMIT 1
  `
  return result.rows.length > 0 ? (result.rows[0] as TicketPriority) : null
}

export async function createTicketPriority(
  code: string,
  name: string,
  description?: string,
  color?: string,
  icon?: string,
  sortOrder?: number,
  slaHours?: number
): Promise<TicketPriority> {
  const result = await sql`
    INSERT INTO ticket_priorities (
      code, name, description, color, icon, sort_order, sla_hours
    ) VALUES (
      ${code}, ${name}, ${description}, ${color}, ${icon}, ${sortOrder || 0}, ${slaHours}
    )
    RETURNING *
  `
  return result.rows[0] as TicketPriority
}

// =====================================================
// TICKET TYPES
// =====================================================

export async function getAllTicketTypes(): Promise<TicketType[]> {
  const result = await sql`
    SELECT * FROM ticket_types
    WHERE is_active = true
    ORDER BY sort_order
  `
  return result.rows as TicketType[]
}

export async function getTicketTypeByCode(code: string): Promise<TicketType | null> {
  const result = await sql`
    SELECT * FROM ticket_types
    WHERE code = ${code} AND is_active = true
    LIMIT 1
  `
  return result.rows.length > 0 ? (result.rows[0] as TicketType) : null
}

export async function getTicketTypeById(id: number): Promise<TicketType | null> {
  const result = await sql`
    SELECT * FROM ticket_types
    WHERE id = ${id}
    LIMIT 1
  `
  return result.rows.length > 0 ? (result.rows[0] as TicketType) : null
}

export async function createTicketType(
  code: string,
  name: string,
  description?: string,
  icon?: string,
  color?: string,
  sortOrder?: number
): Promise<TicketType> {
  const result = await sql`
    INSERT INTO ticket_types (
      code, name, description, icon, color, sort_order
    ) VALUES (
      ${code}, ${name}, ${description}, ${icon}, ${color}, ${sortOrder || 0}
    )
    RETURNING *
  `
  return result.rows[0] as TicketType
}

// =====================================================
// USER ROLES
// =====================================================

export async function getAllUserRoles(): Promise<UserRole[]> {
  const result = await sql`
    SELECT * FROM user_roles
    WHERE is_active = true
    ORDER BY level DESC
  `
  return result.rows as UserRole[]
}

export async function getUserRoleByCode(code: string): Promise<UserRole | null> {
  const result = await sql`
    SELECT * FROM user_roles
    WHERE code = ${code} AND is_active = true
    LIMIT 1
  `
  return result.rows.length > 0 ? (result.rows[0] as UserRole) : null
}

export async function getUserRoleById(id: number): Promise<UserRole | null> {
  const result = await sql`
    SELECT * FROM user_roles
    WHERE id = ${id}
    LIMIT 1
  `
  return result.rows.length > 0 ? (result.rows[0] as UserRole) : null
}

export async function getUserActiveRoles(userId: number): Promise<UserRole[]> {
  const result = await sql`
    SELECT ur.*
    FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE 
      ura.user_id = ${userId}
      AND ura.is_active = true
      AND ur.is_active = true
    ORDER BY ur.level DESC
  `
  return result.rows as UserRole[]
}

export async function getUserHighestRoleLevel(userId: number): Promise<number> {
  const result = await sql`
    SELECT COALESCE(MAX(ur.level), 0) as max_level
    FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE 
      ura.user_id = ${userId}
      AND ura.is_active = true
      AND ur.is_active = true
  `
  return result.rows[0]?.max_level || 0
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get master data for dropdowns (all at once)
 */
export async function getMasterDataForTicketForm(): Promise<{
  statuses: TicketStatus[]
  priorities: TicketPriority[]
  types: TicketType[]
}> {
  const [statuses, priorities, types] = await Promise.all([
    getAllTicketStatuses(),
    getAllTicketPriorities(),
    getAllTicketTypes()
  ])

  return { statuses, priorities, types }
}

/**
 * Validate master data IDs
 */
export async function validateMasterDataIds(
  statusId: number,
  priorityId: number,
  typeId: number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  const [status, priority, type] = await Promise.all([
    getTicketStatusById(statusId),
    getTicketPriorityById(priorityId),
    getTicketTypeById(typeId)
  ])

  if (!status) errors.push(`Invalid status ID: ${statusId}`)
  if (!priority) errors.push(`Invalid priority ID: ${priorityId}`)
  if (!type) errors.push(`Invalid type ID: ${typeId}`)

  return {
    valid: errors.length === 0,
    errors
  }
}
