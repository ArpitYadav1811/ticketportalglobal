/**
 * TICKET PROJECTS - Server Actions
 * 
 * Functions for managing ticket project and release associations.
 */

'use server'

import { sql } from '@vercel/postgres'
import { TicketProject, TicketProjectWithDetails } from '@/types/entities'

/**
 * Link ticket to project and/or release
 */
export async function linkTicketToProject(
  ticketId: number,
  projectId?: number | null,
  productReleaseId?: number | null,
  estimatedReleaseDate?: Date | string | null,
  createdBy?: number
): Promise<TicketProject> {
  const result = await sql`
    INSERT INTO ticket_projects (
      ticket_id,
      project_id,
      product_release_id,
      estimated_release_date,
      created_by
    ) VALUES (
      ${ticketId},
      ${projectId},
      ${productReleaseId},
      ${estimatedReleaseDate},
      ${createdBy}
    )
    ON CONFLICT (ticket_id)
    DO UPDATE SET
      project_id = COALESCE(${projectId}, ticket_projects.project_id),
      product_release_id = COALESCE(${productReleaseId}, ticket_projects.product_release_id),
      estimated_release_date = COALESCE(${estimatedReleaseDate}, ticket_projects.estimated_release_date),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `

  return result.rows[0] as TicketProject
}

/**
 * Get project details for a ticket
 */
export async function getTicketProject(ticketId: number): Promise<TicketProjectWithDetails | null> {
  const result = await sql`
    SELECT 
      tp.*,
      p.name as project_name,
      pr.product_name,
      pr.release_number,
      pr.release_date
    FROM ticket_projects tp
    LEFT JOIN projects p ON p.id = tp.project_id
    LEFT JOIN product_releases pr ON pr.id = tp.product_release_id
    WHERE tp.ticket_id = ${ticketId}
  `

  return result.rows.length > 0 ? (result.rows[0] as TicketProjectWithDetails) : null
}

/**
 * Get all tickets for a project
 */
export async function getTicketsForProject(projectId: number): Promise<TicketProjectWithDetails[]> {
  const result = await sql`
    SELECT 
      tp.*,
      t.ticket_id,
      t.title as ticket_title,
      ts.code as status_code,
      ts.name as status_name,
      p.name as project_name
    FROM ticket_projects tp
    JOIN tickets t ON t.id = tp.ticket_id
    JOIN ticket_statuses ts ON ts.id = t.status_id
    LEFT JOIN projects p ON p.id = tp.project_id
    WHERE tp.project_id = ${projectId}
    ORDER BY tp.created_at DESC
  `

  return result.rows as TicketProjectWithDetails[]
}

/**
 * Get all tickets for a product release
 */
export async function getTicketsForRelease(productReleaseId: number): Promise<TicketProjectWithDetails[]> {
  const result = await sql`
    SELECT 
      tp.*,
      t.ticket_id,
      t.title as ticket_title,
      ts.code as status_code,
      ts.name as status_name,
      pr.product_name,
      pr.release_number
    FROM ticket_projects tp
    JOIN tickets t ON t.id = tp.ticket_id
    JOIN ticket_statuses ts ON ts.id = t.status_id
    LEFT JOIN product_releases pr ON pr.id = tp.product_release_id
    WHERE tp.product_release_id = ${productReleaseId}
    ORDER BY tp.created_at DESC
  `

  return result.rows as TicketProjectWithDetails[]
}

/**
 * Update ticket project association
 */
export async function updateTicketProject(
  ticketId: number,
  updates: {
    projectId?: number | null
    productReleaseId?: number | null
    estimatedReleaseDate?: Date | string | null
  }
): Promise<TicketProject> {
  const setClauses: string[] = []
  const values: any[] = []

  if (updates.projectId !== undefined) {
    setClauses.push(`project_id = $${values.length + 1}`)
    values.push(updates.projectId)
  }
  if (updates.productReleaseId !== undefined) {
    setClauses.push(`product_release_id = $${values.length + 1}`)
    values.push(updates.productReleaseId)
  }
  if (updates.estimatedReleaseDate !== undefined) {
    setClauses.push(`estimated_release_date = $${values.length + 1}`)
    values.push(updates.estimatedReleaseDate)
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP')

  const result = await sql`
    UPDATE ticket_projects
    SET ${sql.raw(setClauses.join(', '))}
    WHERE ticket_id = ${ticketId}
    RETURNING *
  `

  return result.rows[0] as TicketProject
}

/**
 * Remove ticket from project
 */
export async function unlinkTicketFromProject(ticketId: number): Promise<void> {
  await sql`
    DELETE FROM ticket_projects
    WHERE ticket_id = ${ticketId}
  `
}

/**
 * Get project statistics
 */
export async function getProjectStatistics(projectId: number): Promise<{
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  on_hold_tickets: number
}> {
  const result = await sql`
    SELECT 
      COUNT(*) as total_tickets,
      COUNT(*) FILTER (WHERE ts.code = 'open') as open_tickets,
      COUNT(*) FILTER (WHERE ts.code = 'resolved') as resolved_tickets,
      COUNT(*) FILTER (WHERE ts.code = 'on_hold') as on_hold_tickets
    FROM ticket_projects tp
    JOIN tickets t ON t.id = tp.ticket_id
    JOIN ticket_statuses ts ON ts.id = t.status_id
    WHERE tp.project_id = ${projectId}
  `

  return result.rows[0] as {
    total_tickets: number
    open_tickets: number
    resolved_tickets: number
    on_hold_tickets: number
  }
}
