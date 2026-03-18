/**
 * TICKET AUDIT EVENTS - Server Actions
 * 
 * Functions for managing ticket audit events using the new entity structure.
 */

'use server'

import { sql } from '@vercel/postgres'
import { TicketAuditEvent, TicketAuditEventWithUser, TicketEventType } from '@/types/entities'

/**
 * Create a new ticket audit event
 */
export async function createTicketAuditEvent(
  ticketId: number,
  eventType: TicketEventType,
  performedBy: number,
  oldValue?: string | null,
  newValue?: string | null,
  notes?: string | null,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<TicketAuditEvent> {
  const result = await sql`
    INSERT INTO ticket_audit_events (
      ticket_id,
      event_type,
      performed_by,
      old_value,
      new_value,
      notes,
      ip_address,
      user_agent
    ) VALUES (
      ${ticketId},
      ${eventType},
      ${performedBy},
      ${oldValue},
      ${newValue},
      ${notes},
      ${ipAddress},
      ${userAgent}
    )
    RETURNING *
  `

  return result.rows[0] as TicketAuditEvent
}

/**
 * Get all audit events for a ticket
 */
export async function getTicketAuditEvents(
  ticketId: number
): Promise<TicketAuditEventWithUser[]> {
  const result = await sql`
    SELECT 
      tae.*,
      u.full_name as performer_name,
      u.email as performer_email
    FROM ticket_audit_events tae
    JOIN users u ON u.id = tae.performed_by
    WHERE tae.ticket_id = ${ticketId}
    ORDER BY tae.created_at DESC
  `

  return result.rows as TicketAuditEventWithUser[]
}

/**
 * Get audit events by event type
 */
export async function getTicketAuditEventsByType(
  ticketId: number,
  eventType: TicketEventType
): Promise<TicketAuditEventWithUser[]> {
  const result = await sql`
    SELECT 
      tae.*,
      u.full_name as performer_name,
      u.email as performer_email
    FROM ticket_audit_events tae
    JOIN users u ON u.id = tae.performed_by
    WHERE 
      tae.ticket_id = ${ticketId}
      AND tae.event_type = ${eventType}
    ORDER BY tae.created_at DESC
  `

  return result.rows as TicketAuditEventWithUser[]
}

/**
 * Get recent audit events across all tickets (for admin dashboard)
 */
export async function getRecentAuditEvents(
  limit: number = 50,
  eventTypes?: TicketEventType[]
): Promise<TicketAuditEventWithUser[]> {
  const eventTypeFilter = eventTypes && eventTypes.length > 0
    ? sql`AND tae.event_type = ANY(${eventTypes})`
    : sql``

  const result = await sql`
    SELECT 
      tae.*,
      u.full_name as performer_name,
      u.email as performer_email,
      t.ticket_id,
      t.title as ticket_title
    FROM ticket_audit_events tae
    JOIN users u ON u.id = tae.performed_by
    JOIN tickets t ON t.id = tae.ticket_id
    WHERE 1=1 ${eventTypeFilter}
    ORDER BY tae.created_at DESC
    LIMIT ${limit}
  `

  return result.rows as TicketAuditEventWithUser[]
}

/**
 * Get audit events for a user (what they've done)
 */
export async function getUserAuditEvents(
  userId: number,
  limit: number = 50
): Promise<TicketAuditEventWithUser[]> {
  const result = await sql`
    SELECT 
      tae.*,
      u.full_name as performer_name,
      u.email as performer_email,
      t.ticket_id,
      t.title as ticket_title
    FROM ticket_audit_events tae
    JOIN users u ON u.id = tae.performed_by
    JOIN tickets t ON t.id = tae.ticket_id
    WHERE tae.performed_by = ${userId}
    ORDER BY tae.created_at DESC
    LIMIT ${limit}
  `

  return result.rows as TicketAuditEventWithUser[]
}

/**
 * Get audit statistics for a date range
 */
export async function getAuditStatistics(
  startDate: Date,
  endDate: Date
): Promise<{ event_type: string; count: number }[]> {
  const result = await sql`
    SELECT 
      event_type::TEXT,
      COUNT(*) as count
    FROM ticket_audit_events
    WHERE created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    GROUP BY event_type
    ORDER BY count DESC
  `

  return result.rows as { event_type: string; count: number }[]
}
