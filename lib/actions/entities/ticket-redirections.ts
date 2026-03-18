/**
 * TICKET REDIRECTIONS - Server Actions
 * 
 * Functions for managing ticket redirection history.
 */

'use server'

import { sql } from '@vercel/postgres'
import { TicketRedirection, TicketRedirectionWithDetails } from '@/types/entities'

/**
 * Create a ticket redirection record
 */
export async function createTicketRedirection(
  ticketId: number,
  fromBusinessGroupId: number,
  toBusinessGroupId: number,
  remarks: string,
  redirectedBy: number,
  fromSpocUserId?: number | null,
  toSpocUserId?: number | null
): Promise<TicketRedirection> {
  const result = await sql`
    INSERT INTO ticket_redirections (
      ticket_id,
      from_business_group_id,
      from_spoc_user_id,
      to_business_group_id,
      to_spoc_user_id,
      remarks,
      redirected_by
    ) VALUES (
      ${ticketId},
      ${fromBusinessGroupId},
      ${fromSpocUserId},
      ${toBusinessGroupId},
      ${toSpocUserId},
      ${remarks},
      ${redirectedBy}
    )
    RETURNING *
  `

  return result.rows[0] as TicketRedirection
}

/**
 * Get redirection history for a ticket
 */
export async function getTicketRedirections(ticketId: number): Promise<TicketRedirectionWithDetails[]> {
  const result = await sql`
    SELECT 
      tr.*,
      bg_from.name as from_group_name,
      bg_to.name as to_group_name,
      u_from.full_name as from_spoc_name,
      u_to.full_name as to_spoc_name,
      u_by.full_name as redirected_by_name
    FROM ticket_redirections tr
    JOIN business_unit_groups bg_from ON bg_from.id = tr.from_business_group_id
    JOIN business_unit_groups bg_to ON bg_to.id = tr.to_business_group_id
    LEFT JOIN users u_from ON u_from.id = tr.from_spoc_user_id
    LEFT JOIN users u_to ON u_to.id = tr.to_spoc_user_id
    JOIN users u_by ON u_by.id = tr.redirected_by
    WHERE tr.ticket_id = ${ticketId}
    ORDER BY tr.redirected_at ASC
  `

  return result.rows as TicketRedirectionWithDetails[]
}

/**
 * Get latest redirection for a ticket
 */
export async function getLatestTicketRedirection(
  ticketId: number
): Promise<TicketRedirectionWithDetails | null> {
  const result = await sql`
    SELECT 
      tr.*,
      bg_from.name as from_group_name,
      bg_to.name as to_group_name,
      u_from.full_name as from_spoc_name,
      u_to.full_name as to_spoc_name,
      u_by.full_name as redirected_by_name
    FROM ticket_redirections tr
    JOIN business_unit_groups bg_from ON bg_from.id = tr.from_business_group_id
    JOIN business_unit_groups bg_to ON bg_to.id = tr.to_business_group_id
    LEFT JOIN users u_from ON u_from.id = tr.from_spoc_user_id
    LEFT JOIN users u_to ON u_to.id = tr.to_spoc_user_id
    JOIN users u_by ON u_by.id = tr.redirected_by
    WHERE tr.ticket_id = ${ticketId}
    ORDER BY tr.redirected_at DESC
    LIMIT 1
  `

  return result.rows.length > 0 ? (result.rows[0] as TicketRedirectionWithDetails) : null
}

/**
 * Get all redirections from a business group
 */
export async function getRedirectionsFromGroup(
  businessGroupId: number,
  startDate?: Date,
  endDate?: Date
): Promise<TicketRedirectionWithDetails[]> {
  const dateFilter = startDate && endDate
    ? sql`AND tr.redirected_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}`
    : sql``

  const result = await sql`
    SELECT 
      tr.*,
      bg_from.name as from_group_name,
      bg_to.name as to_group_name,
      u_from.full_name as from_spoc_name,
      u_to.full_name as to_spoc_name,
      u_by.full_name as redirected_by_name,
      t.ticket_id,
      t.title as ticket_title
    FROM ticket_redirections tr
    JOIN business_unit_groups bg_from ON bg_from.id = tr.from_business_group_id
    JOIN business_unit_groups bg_to ON bg_to.id = tr.to_business_group_id
    LEFT JOIN users u_from ON u_from.id = tr.from_spoc_user_id
    LEFT JOIN users u_to ON u_to.id = tr.to_spoc_user_id
    JOIN users u_by ON u_by.id = tr.redirected_by
    JOIN tickets t ON t.id = tr.ticket_id
    WHERE tr.from_business_group_id = ${businessGroupId}
    ${dateFilter}
    ORDER BY tr.redirected_at DESC
  `

  return result.rows as TicketRedirectionWithDetails[]
}

/**
 * Get all redirections to a business group
 */
export async function getRedirectionsToGroup(
  businessGroupId: number,
  startDate?: Date,
  endDate?: Date
): Promise<TicketRedirectionWithDetails[]> {
  const dateFilter = startDate && endDate
    ? sql`AND tr.redirected_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}`
    : sql``

  const result = await sql`
    SELECT 
      tr.*,
      bg_from.name as from_group_name,
      bg_to.name as to_group_name,
      u_from.full_name as from_spoc_name,
      u_to.full_name as to_spoc_name,
      u_by.full_name as redirected_by_name,
      t.ticket_id,
      t.title as ticket_title
    FROM ticket_redirections tr
    JOIN business_unit_groups bg_from ON bg_from.id = tr.from_business_group_id
    JOIN business_unit_groups bg_to ON bg_to.id = tr.to_business_group_id
    LEFT JOIN users u_from ON u_from.id = tr.from_spoc_user_id
    LEFT JOIN users u_to ON u_to.id = tr.to_spoc_user_id
    JOIN users u_by ON u_by.id = tr.redirected_by
    JOIN tickets t ON t.id = tr.ticket_id
    WHERE tr.to_business_group_id = ${businessGroupId}
    ${dateFilter}
    ORDER BY tr.redirected_at DESC
  `

  return result.rows as TicketRedirectionWithDetails[]
}

/**
 * Get redirection statistics for a business group
 */
export async function getRedirectionStatistics(
  businessGroupId: number,
  startDate?: Date,
  endDate?: Date
): Promise<{
  redirected_out: number
  redirected_in: number
  net_redirections: number
  top_redirect_destinations: { group_name: string; count: number }[]
  top_redirect_sources: { group_name: string; count: number }[]
}> {
  const dateFilter = startDate && endDate
    ? sql`AND redirected_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}`
    : sql``

  // Count redirections out
  const outResult = await sql`
    SELECT COUNT(*) as count
    FROM ticket_redirections
    WHERE from_business_group_id = ${businessGroupId}
    ${dateFilter}
  `

  // Count redirections in
  const inResult = await sql`
    SELECT COUNT(*) as count
    FROM ticket_redirections
    WHERE to_business_group_id = ${businessGroupId}
    ${dateFilter}
  `

  // Top destinations
  const destResult = await sql`
    SELECT 
      bg.name as group_name,
      COUNT(*) as count
    FROM ticket_redirections tr
    JOIN business_unit_groups bg ON bg.id = tr.to_business_group_id
    WHERE tr.from_business_group_id = ${businessGroupId}
    ${dateFilter}
    GROUP BY bg.name
    ORDER BY count DESC
    LIMIT 5
  `

  // Top sources
  const sourceResult = await sql`
    SELECT 
      bg.name as group_name,
      COUNT(*) as count
    FROM ticket_redirections tr
    JOIN business_unit_groups bg ON bg.id = tr.from_business_group_id
    WHERE tr.to_business_group_id = ${businessGroupId}
    ${dateFilter}
    GROUP BY bg.name
    ORDER BY count DESC
    LIMIT 5
  `

  const redirectedOut = parseInt(outResult.rows[0]?.count || '0')
  const redirectedIn = parseInt(inResult.rows[0]?.count || '0')

  return {
    redirected_out: redirectedOut,
    redirected_in: redirectedIn,
    net_redirections: redirectedIn - redirectedOut,
    top_redirect_destinations: destResult.rows as { group_name: string; count: number }[],
    top_redirect_sources: sourceResult.rows as { group_name: string; count: number }[]
  }
}

/**
 * Check if ticket has been redirected
 */
export async function hasTicketBeenRedirected(ticketId: number): Promise<boolean> {
  const result = await sql`
    SELECT EXISTS (
      SELECT 1 FROM ticket_redirections WHERE ticket_id = ${ticketId}
    ) as has_redirections
  `

  return result.rows[0]?.has_redirections || false
}

/**
 * Get redirection count for a ticket
 */
export async function getTicketRedirectionCount(ticketId: number): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM ticket_redirections
    WHERE ticket_id = ${ticketId}
  `

  return parseInt(result.rows[0]?.count || '0')
}
