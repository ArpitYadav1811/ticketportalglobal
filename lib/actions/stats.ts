"use server"

import { sql } from "@/lib/db"

export async function getDashboardStats() {
  try {
    const openResult = await sql`SELECT COUNT(*) as count FROM tickets WHERE status = 'open'`
    const closedResult = await sql`SELECT COUNT(*) as count FROM tickets WHERE status = 'closed'`
    const holdResult = await sql`SELECT COUNT(*) as count FROM tickets WHERE status = 'hold'`
    const totalResult = await sql`SELECT COUNT(*) as count FROM tickets`

    return {
      success: true,
      data: {
        open: Number(openResult[0]?.count || 0),
        closed: Number(closedResult[0]?.count || 0),
        hold: Number(holdResult[0]?.count || 0),
        total: Number(totalResult[0]?.count || 0),
      },
    }
  } catch (error) {
    console.error("[v0] Error fetching stats:", error)
    return {
      success: false,
      error: "Failed to fetch stats",
      data: { open: 0, closed: 0, hold: 0, total: 0 },
    }
  }
}

export async function getRecentTickets(limit = 5) {
  try {
    const result = await sql`
      SELECT
        t.id,
        t.ticket_id,
        t.title,
        t.description,
        c.name as category_name,
        sc.name as subcategory_name,
        t.status,
        t.created_at,
        a.full_name as assignee_name,
        spoc.full_name as spoc_name,
        closer.full_name as closed_by_name,
        t.closed_at,
        (SELECT COUNT(*) FROM attachments att WHERE att.ticket_id = t.id) as attachment_count
      FROM tickets t
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      LEFT JOIN users closer ON t.closed_by = closer.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
      ORDER BY t.created_at DESC
      LIMIT ${limit}
    `

    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching recent tickets:", error)
    return { success: false, error: "Failed to fetch recent tickets", data: [] }
  }
}

/**
 * Analytics data fetcher with role-based filtering:
 * - Super Admin / Admin: All tickets (no filter)
 * - Manager (SPOC): Only tickets targeted to their business groups
 * - User: Tickets for their business group + tickets where they are involved + tickets where team members are involved
 * 
 * filterType:
 * - 'initiator': Filter by tickets where the user's group is the initiator (creator's group)
 * - 'target': Filter by tickets where the user's group is the target (assigned group)
 */
export async function getAnalyticsData(
  daysFilter: number = 30,
  options?: { businessGroupIds?: number[]; userId?: number; teamMemberIds?: number[]; filterType?: 'initiator' | 'target' }
) {
  try {
    // Use a large interval for "all time" so we always have a valid WHERE clause
    // (avoids nested sql`` template fragments which Neon doesn't support)
    const daysInterval = daysFilter > 0 ? daysFilter : 36500 // 100 years ≈ all time
    const businessGroupIds = options?.businessGroupIds
    const userId = options?.userId
    const teamMemberIds = options?.teamMemberIds || []
    const filterType = options?.filterType || 'target' // Default to 'target' for backward compatibility
    const hasGroupFilter = businessGroupIds && businessGroupIds.length > 0
    const hasUserFilter = !!userId
    const hasTeamMembers = teamMemberIds.length > 0
    // Combined filter: when user has both group and user context (regular user scenario)
    const hasCombinedFilter = hasGroupFilter && hasUserFilter

    // --- Tickets by Business Unit ---
    // Helper: Build group filter condition based on filterType
    const groupFilterCondition = filterType === 'initiator' 
      ? sql`t.business_unit_group_id = ANY(${businessGroupIds})`
      : sql`t.target_business_group_id = ANY(${businessGroupIds})`
    
    const ticketsByBU = hasCombinedFilter
      ? await sql`
          SELECT bu.name as business_unit, COUNT(t.id) as ticket_count
          FROM tickets t
          LEFT JOIN business_unit_groups bu ON t.business_unit_group_id = bu.id
          WHERE bu.name IS NOT NULL
            AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR t.created_by = ${userId}
              OR t.assigned_to = ${userId}
              OR t.spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR t.created_by = ANY(${teamMemberIds}) OR t.assigned_to = ANY(${teamMemberIds}) OR t.spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY bu.name ORDER BY ticket_count DESC
        `
      : hasUserFilter
        ? await sql`
            SELECT bu.name as business_unit, COUNT(t.id) as ticket_count
            FROM tickets t
            LEFT JOIN business_unit_groups bu ON t.business_unit_group_id = bu.id
            WHERE bu.name IS NOT NULL
              AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
              AND (t.created_by = ${userId} OR t.assigned_to = ${userId})
              AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY bu.name ORDER BY ticket_count DESC
          `
        : hasGroupFilter
          ? await sql`
              SELECT bu.name as business_unit, COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN business_unit_groups bu ON t.business_unit_group_id = bu.id
              WHERE bu.name IS NOT NULL
                AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY bu.name ORDER BY ticket_count DESC
            `
          : await sql`
              SELECT bu.name as business_unit, COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN business_unit_groups bu ON t.business_unit_group_id = bu.id
              WHERE bu.name IS NOT NULL
                AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY bu.name ORDER BY ticket_count DESC
            `

    // --- Tickets by Initiator Category (Category of the initiator's business group) ---
    // Shows tickets grouped by category, where the category belongs to the creator's business group
    const ticketsByCategory = hasCombinedFilter
      ? await sql`
          SELECT 
            COALESCE(c.name, 'Uncategorized') as category, 
            COUNT(t.id) as ticket_count
          FROM tickets t
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN users creator ON t.created_by = creator.id
          LEFT JOIN business_unit_groups initiator_bg ON creator.business_unit_group_id = initiator_bg.id
          WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR t.created_by = ${userId}
              OR t.assigned_to = ${userId}
              OR t.spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR t.created_by = ANY(${teamMemberIds}) OR t.assigned_to = ANY(${teamMemberIds}) OR t.spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
            AND (c.business_unit_group_id = initiator_bg.id OR c.id IS NULL)
          GROUP BY c.name ORDER BY ticket_count DESC
        `
      : hasUserFilter
        ? await sql`
            SELECT 
              COALESCE(c.name, 'Uncategorized') as category, 
              COUNT(t.id) as ticket_count
            FROM tickets t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN business_unit_groups initiator_bg ON creator.business_unit_group_id = initiator_bg.id
            WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
              AND (t.created_by = ${userId} OR t.assigned_to = ${userId})
              AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              AND (c.business_unit_group_id = initiator_bg.id OR c.id IS NULL)
            GROUP BY c.name ORDER BY ticket_count DESC
          `
        : hasGroupFilter
          ? await sql`
              SELECT 
                COALESCE(c.name, 'Uncategorized') as category, 
                COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN categories c ON t.category_id = c.id
              LEFT JOIN users creator ON t.created_by = creator.id
              LEFT JOIN business_unit_groups initiator_bg ON creator.business_unit_group_id = initiator_bg.id
              WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
                AND (c.business_unit_group_id = initiator_bg.id OR c.id IS NULL)
              GROUP BY c.name ORDER BY ticket_count DESC
            `
          : await sql`
              SELECT 
                COALESCE(c.name, 'Uncategorized') as category, 
                COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN categories c ON t.category_id = c.id
              LEFT JOIN users creator ON t.created_by = creator.id
              LEFT JOIN business_unit_groups initiator_bg ON creator.business_unit_group_id = initiator_bg.id
              WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
                AND (c.business_unit_group_id = initiator_bg.id OR c.id IS NULL)
              GROUP BY c.name ORDER BY ticket_count DESC
            `

    // --- Team Member Status Breakdown (stacked bar: each member's ticket status) ---
    const teamMemberStatusBreakdown = hasCombinedFilter
      ? await sql`
          SELECT 
            u.full_name as member,
            COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open,
            COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved,
            COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed,
            COUNT(CASE WHEN t.status = 'hold' OR t.status = 'on-hold' THEN 1 END) as on_hold,
            COUNT(*) as total
          FROM tickets t
          LEFT JOIN users u ON t.assigned_to = u.id
          WHERE u.full_name IS NOT NULL
            AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR t.created_by = ${userId}
              OR t.assigned_to = ${userId}
              OR t.spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR t.created_by = ANY(${teamMemberIds}) OR t.assigned_to = ANY(${teamMemberIds}) OR t.spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY u.full_name ORDER BY total DESC LIMIT 10
        `
      : hasUserFilter
        ? await sql`
            SELECT 
              u.full_name as member,
              COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open,
              COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved,
              COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed,
              COUNT(CASE WHEN t.status = 'hold' OR t.status = 'on-hold' THEN 1 END) as on_hold,
              COUNT(*) as total
            FROM tickets t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE u.full_name IS NOT NULL
              AND (t.created_by = ${userId} OR t.assigned_to = ${userId})
              AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY u.full_name ORDER BY total DESC LIMIT 10
          `
        : hasGroupFilter
          ? await sql`
              SELECT 
                u.full_name as member,
                COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open,
                COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed,
                COUNT(CASE WHEN t.status = 'hold' OR t.status = 'on-hold' THEN 1 END) as on_hold,
                COUNT(*) as total
              FROM tickets t
              LEFT JOIN users u ON t.assigned_to = u.id
              WHERE u.full_name IS NOT NULL
                AND ${groupFilterCondition}
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY u.full_name ORDER BY total DESC LIMIT 10
            `
          : await sql`
              SELECT 
                u.full_name as member,
                COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open,
                COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed,
                COUNT(CASE WHEN t.status = 'hold' OR t.status = 'on-hold' THEN 1 END) as on_hold,
                COUNT(*) as total
              FROM tickets t
              LEFT JOIN users u ON t.assigned_to = u.id
              WHERE u.full_name IS NOT NULL
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY u.full_name ORDER BY total DESC LIMIT 10
            `

    // --- Tickets by Status ---
    const ticketsByStatus = hasCombinedFilter
      ? await sql`
          SELECT status, COUNT(*) as count FROM tickets
          WHERE (is_deleted IS NULL OR is_deleted = FALSE)
            AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR created_by = ${userId}
              OR assigned_to = ${userId}
              OR spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR created_by = ANY(${teamMemberIds}) OR assigned_to = ANY(${teamMemberIds}) OR spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY status ORDER BY count DESC
        `
      : hasUserFilter
        ? await sql`
            SELECT status, COUNT(*) as count FROM tickets
            WHERE (is_deleted IS NULL OR is_deleted = FALSE)
              AND (created_by = ${userId} OR assigned_to = ${userId})
              AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY status ORDER BY count DESC
          `
        : hasGroupFilter
          ? await sql`
              SELECT status, COUNT(*) as count FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY status ORDER BY count DESC
            `
          : await sql`
              SELECT status, COUNT(*) as count FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY status ORDER BY count DESC
            `

    // --- Summary Stats (excluding deleted tickets) ---
    const summaryStats = hasCombinedFilter
      ? await sql`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'open') as open,
            COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
            COUNT(*) FILTER (WHERE status = 'closed') as closed,
            COUNT(*) FILTER (WHERE status = 'hold' OR status = 'on-hold') as on_hold
          FROM tickets
          WHERE (is_deleted IS NULL OR is_deleted = FALSE)
            AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR created_by = ${userId}
              OR assigned_to = ${userId}
              OR spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR created_by = ANY(${teamMemberIds}) OR assigned_to = ANY(${teamMemberIds}) OR spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
        `
      : hasUserFilter
        ? await sql`
            SELECT
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'open') as open,
              COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
              COUNT(*) FILTER (WHERE status = 'closed') as closed,
              COUNT(*) FILTER (WHERE status = 'hold' OR status = 'on-hold') as on_hold
            FROM tickets
            WHERE (is_deleted IS NULL OR is_deleted = FALSE)
              AND (created_by = ${userId} OR assigned_to = ${userId})
              AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
          `
        : hasGroupFilter
          ? await sql`
              SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'open') as open,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE status = 'closed') as closed,
                COUNT(*) FILTER (WHERE status = 'hold' OR status = 'on-hold') as on_hold
              FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            `
          : await sql`
              SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'open') as open,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE status = 'closed') as closed,
                COUNT(*) FILTER (WHERE status = 'hold' OR status = 'on-hold') as on_hold
              FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            `

    // --- Tickets by Type ---
    const ticketsByType = hasCombinedFilter
      ? await sql`
          SELECT ticket_type, COUNT(*) as count FROM tickets
          WHERE (is_deleted IS NULL OR is_deleted = FALSE)
            AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR created_by = ${userId}
              OR assigned_to = ${userId}
              OR spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR created_by = ANY(${teamMemberIds}) OR assigned_to = ANY(${teamMemberIds}) OR spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY ticket_type ORDER BY count DESC
        `
      : hasUserFilter
        ? await sql`
            SELECT ticket_type, COUNT(*) as count FROM tickets
            WHERE (is_deleted IS NULL OR is_deleted = FALSE)
              AND (created_by = ${userId} OR assigned_to = ${userId})
              AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY ticket_type ORDER BY count DESC
          `
        : hasGroupFilter
          ? await sql`
              SELECT ticket_type, COUNT(*) as count FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY ticket_type ORDER BY count DESC
            `
          : await sql`
              SELECT ticket_type, COUNT(*) as count FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY ticket_type ORDER BY count DESC
            `

    // --- Tickets by Priority ---
    const ticketsByPriority = hasCombinedFilter
      ? await sql`
          SELECT priority, COUNT(*) as count FROM tickets
          WHERE (is_deleted IS NULL OR is_deleted = FALSE)
            AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR created_by = ${userId}
              OR assigned_to = ${userId}
              OR spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR created_by = ANY(${teamMemberIds}) OR assigned_to = ANY(${teamMemberIds}) OR spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY priority ORDER BY count DESC
        `
      : hasUserFilter
        ? await sql`
            SELECT priority, COUNT(*) as count FROM tickets
            WHERE (is_deleted IS NULL OR is_deleted = FALSE)
              AND (created_by = ${userId} OR assigned_to = ${userId})
              AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY priority ORDER BY count DESC
          `
        : hasGroupFilter
          ? await sql`
              SELECT priority, COUNT(*) as count FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY priority ORDER BY count DESC
            `
          : await sql`
              SELECT priority, COUNT(*) as count FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY priority ORDER BY count DESC
            `

    // --- Ticket Trend ---
    const ticketTrend = hasCombinedFilter
      ? await sql`
          SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date, COUNT(*) as count FROM tickets
          WHERE (is_deleted IS NULL OR is_deleted = FALSE)
            AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR created_by = ${userId}
              OR assigned_to = ${userId}
              OR spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR created_by = ANY(${teamMemberIds}) OR assigned_to = ANY(${teamMemberIds}) OR spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC
        `
      : hasUserFilter
        ? await sql`
            SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date, COUNT(*) as count FROM tickets
            WHERE (is_deleted IS NULL OR is_deleted = FALSE)
              AND (created_by = ${userId} OR assigned_to = ${userId})
              AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC
          `
        : hasGroupFilter
          ? await sql`
              SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date, COUNT(*) as count FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC
            `
          : await sql`
              SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date, COUNT(*) as count FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC
            `

    // --- Team Performance ---
    const teamPerformance = hasCombinedFilter
      ? await sql`
          SELECT
            u.full_name as assignee,
            COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_count,
            COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open_count,
            COUNT(*) as total_count
          FROM tickets t
          LEFT JOIN users u ON t.assigned_to = u.id
          WHERE u.full_name IS NOT NULL
            AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            AND (
              ${groupFilterCondition}
              OR t.created_by = ${userId}
              OR t.assigned_to = ${userId}
              OR t.spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR t.created_by = ANY(${teamMemberIds}) OR t.assigned_to = ANY(${teamMemberIds}) OR t.spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY u.full_name ORDER BY total_count DESC LIMIT 10
        `
      : hasUserFilter
        ? await sql`
            SELECT
              u.full_name as assignee,
              COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_count,
              COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open_count,
              COUNT(*) as total_count
          FROM tickets t
          LEFT JOIN users u ON t.assigned_to = u.id
          WHERE u.full_name IS NOT NULL
            AND (t.created_by = ${userId} OR t.assigned_to = ${userId})
          GROUP BY u.full_name ORDER BY total_count DESC LIMIT 10
          `
        : hasGroupFilter
          ? await sql`
              SELECT
                u.full_name as assignee,
                COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_count,
                COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open_count,
                COUNT(*) as total_count
              FROM tickets t
              LEFT JOIN users u ON t.assigned_to = u.id
              WHERE u.full_name IS NOT NULL
                AND ${groupFilterCondition}
              GROUP BY u.full_name ORDER BY total_count DESC LIMIT 10
            `
          : await sql`
              SELECT
                u.full_name as assignee,
                COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_count,
                COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open_count,
                COUNT(*) as total_count
              FROM tickets t
              LEFT JOIN users u ON t.assigned_to = u.id
              WHERE u.full_name IS NOT NULL
              GROUP BY u.full_name ORDER BY total_count DESC LIMIT 10
            `

    // --- Avg Resolution Time ---
    const avgResolutionTime = hasUserFilter
      ? await sql`
          SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
          FROM tickets
          WHERE resolved_at IS NOT NULL AND (created_by = ${userId} OR assigned_to = ${userId})
        `
      : hasGroupFilter
        ? await sql`
            SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
            FROM tickets
            WHERE resolved_at IS NOT NULL AND ${groupFilterCondition}
          `
        : await sql`
            SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
            FROM tickets WHERE resolved_at IS NOT NULL
          `

    // --- Top Initiators (who creates the most tickets) ---
    const topInitiators = hasUserFilter
      ? await sql`
          SELECT u.full_name as initiator, COUNT(t.id) as ticket_count
          FROM tickets t
          LEFT JOIN users u ON t.created_by = u.id
          WHERE u.full_name IS NOT NULL
            AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            AND (t.created_by = ${userId} OR t.assigned_to = ${userId})
            AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
          GROUP BY u.full_name ORDER BY ticket_count DESC LIMIT 10
        `
      : hasGroupFilter
        ? await sql`
            SELECT u.full_name as initiator, COUNT(t.id) as ticket_count
            FROM tickets t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE u.full_name IS NOT NULL
              AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
              AND ${groupFilterCondition}
              AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY u.full_name ORDER BY ticket_count DESC LIMIT 10
          `
        : await sql`
            SELECT u.full_name as initiator, COUNT(t.id) as ticket_count
            FROM tickets t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE u.full_name IS NOT NULL
              AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
              AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY u.full_name ORDER BY ticket_count DESC LIMIT 10
          `

    // --- Assignment Distribution (who gets assigned the most tickets) ---
    const assignmentDistribution = hasCombinedFilter
      ? await sql`
          SELECT u.full_name as assignee, COUNT(t.id) as ticket_count
          FROM tickets t
          LEFT JOIN users u ON t.assigned_to = u.id
          WHERE u.full_name IS NOT NULL
            AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR t.created_by = ${userId}
              OR t.assigned_to = ${userId}
              OR t.spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR t.created_by = ANY(${teamMemberIds}) OR t.assigned_to = ANY(${teamMemberIds}) OR t.spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY u.full_name ORDER BY ticket_count DESC LIMIT 10
        `
      : hasUserFilter
        ? await sql`
            SELECT u.full_name as assignee, COUNT(t.id) as ticket_count
            FROM tickets t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE u.full_name IS NOT NULL
              AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
              AND (t.created_by = ${userId} OR t.assigned_to = ${userId})
              AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY u.full_name ORDER BY ticket_count DESC LIMIT 10
          `
        : hasGroupFilter
          ? await sql`
              SELECT u.full_name as assignee, COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN users u ON t.assigned_to = u.id
              WHERE u.full_name IS NOT NULL
                AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY u.full_name ORDER BY ticket_count DESC LIMIT 10
            `
          : await sql`
              SELECT u.full_name as assignee, COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN users u ON t.assigned_to = u.id
              WHERE u.full_name IS NOT NULL
                AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY u.full_name ORDER BY ticket_count DESC LIMIT 10
            `

    // --- Tickets by Target Group Category (Category of the target group for which ticket was raised) ---
    // Shows tickets grouped by category, where the category belongs to the target business group
    const ticketsByInitiatorGroup = hasCombinedFilter
      ? await sql`
          SELECT 
            COALESCE(c.name, 'Uncategorized') as initiator_group, 
            COUNT(t.id) as ticket_count
          FROM tickets t
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN business_unit_groups target_bg ON t.target_business_group_id = target_bg.id
          WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR t.created_by = ${userId}
              OR t.assigned_to = ${userId}
              OR t.spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR t.created_by = ANY(${teamMemberIds}) OR t.assigned_to = ANY(${teamMemberIds}) OR t.spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
            AND (c.business_unit_group_id = target_bg.id OR c.id IS NULL)
          GROUP BY c.name ORDER BY ticket_count DESC LIMIT 10
        `
      : hasUserFilter
        ? await sql`
            SELECT 
              COALESCE(c.name, 'Uncategorized') as initiator_group, 
              COUNT(t.id) as ticket_count
            FROM tickets t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN business_unit_groups target_bg ON t.target_business_group_id = target_bg.id
            WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
              AND (t.created_by = ${userId} OR t.assigned_to = ${userId})
              AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              AND (c.business_unit_group_id = target_bg.id OR c.id IS NULL)
            GROUP BY c.name ORDER BY ticket_count DESC LIMIT 10
          `
        : hasGroupFilter
          ? await sql`
              SELECT 
                COALESCE(c.name, 'Uncategorized') as initiator_group, 
                COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN categories c ON t.category_id = c.id
              LEFT JOIN business_unit_groups target_bg ON t.target_business_group_id = target_bg.id
              WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
                AND (c.business_unit_group_id = target_bg.id OR c.id IS NULL)
              GROUP BY c.name ORDER BY ticket_count DESC LIMIT 10
            `
          : await sql`
              SELECT 
                COALESCE(c.name, 'Uncategorized') as initiator_group, 
                COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN categories c ON t.category_id = c.id
              LEFT JOIN business_unit_groups target_bg ON t.target_business_group_id = target_bg.id
              WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
                AND (c.business_unit_group_id = target_bg.id OR c.id IS NULL)
              GROUP BY c.name ORDER BY ticket_count DESC LIMIT 10
            `

    // --- Tickets by SPOC ---
    const ticketsBySpoc = hasCombinedFilter
      ? await sql`
          SELECT 
            COALESCE(spoc.full_name, 'Unassigned') as spoc_name, 
            COUNT(t.id) as ticket_count
          FROM tickets t
          LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
          WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            AND (
              ${groupFilterCondition}
              OR t.created_by = ${userId}
              OR t.assigned_to = ${userId}
              OR t.spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR t.created_by = ANY(${teamMemberIds}) OR t.assigned_to = ANY(${teamMemberIds}) OR t.spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY spoc.full_name
          ORDER BY ticket_count DESC
          LIMIT 10
        `
      : hasUserFilter
        ? await sql`
            SELECT 
              COALESCE(spoc.full_name, 'Unassigned') as spoc_name, 
              COUNT(t.id) as ticket_count
            FROM tickets t
            LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
            WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
              AND (t.created_by = ${userId} OR t.assigned_to = ${userId})
              AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
            GROUP BY spoc.full_name
            ORDER BY ticket_count DESC
            LIMIT 10
          `
        : hasGroupFilter
          ? await sql`
              SELECT 
                COALESCE(spoc.full_name, 'Unassigned') as spoc_name, 
                COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
              WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND ${groupFilterCondition}
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY spoc.full_name
              ORDER BY ticket_count DESC
              LIMIT 10
            `
          : await sql`
              SELECT 
                COALESCE(spoc.full_name, 'Unassigned') as spoc_name, 
                COUNT(t.id) as ticket_count
              FROM tickets t
              LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
              WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
                AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * ${daysInterval}
              GROUP BY spoc.full_name
              ORDER BY ticket_count DESC
              LIMIT 10
            `

    // --- Monthly Trend ---
    const ticketsByMonth = hasCombinedFilter
      ? await sql`
          SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
          FROM tickets
          WHERE (is_deleted IS NULL OR is_deleted = FALSE)
            AND created_at >= CURRENT_DATE - INTERVAL '12 months'
            AND (
              ${groupFilterCondition}
              OR created_by = ${userId}
              OR assigned_to = ${userId}
              OR spoc_user_id = ${userId}
              ${hasTeamMembers ? sql`OR created_by = ANY(${teamMemberIds}) OR assigned_to = ANY(${teamMemberIds}) OR spoc_user_id = ANY(${teamMemberIds})` : sql``}
            )
          GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
          ORDER BY DATE_TRUNC('month', created_at) ASC
        `
      : hasUserFilter
        ? await sql`
            SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
            FROM tickets
            WHERE (is_deleted IS NULL OR is_deleted = FALSE)
              AND created_at >= CURRENT_DATE - INTERVAL '12 months'
              AND (created_by = ${userId} OR assigned_to = ${userId})
            GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at) ASC
          `
        : hasGroupFilter
          ? await sql`
              SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
              FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND created_at >= CURRENT_DATE - INTERVAL '12 months'
                AND ${groupFilterCondition}
              GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
              ORDER BY DATE_TRUNC('month', created_at) ASC
            `
          : await sql`
              SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
              FROM tickets
              WHERE (is_deleted IS NULL OR is_deleted = FALSE)
                AND created_at >= CURRENT_DATE - INTERVAL '12 months'
              GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
              ORDER BY DATE_TRUNC('month', created_at) ASC
            `

    return {
      success: true,
      data: {
        ticketsByBU: ticketsByBU || [],
        ticketsByCategory: ticketsByCategory || [],
        ticketsByStatus: ticketsByStatus || [],
        ticketsByType: ticketsByType || [],
        ticketTrend: ticketTrend || [],
        topInitiators: topInitiators || [],
        assignmentDistribution: assignmentDistribution || [],
        ticketsByInitiatorGroup: ticketsByInitiatorGroup || [],
        ticketsBySpoc: ticketsBySpoc || [],
        ticketsByMonth: ticketsByMonth || [],
        summaryStats: summaryStats[0] || { total: 0, open: 0, resolved: 0, closed: 0, on_hold: 0 },
      },
    }
  } catch (error) {
    console.error("[v0] Error fetching analytics data:", error)
    return {
      success: false,
      error: "Failed to fetch analytics data",
      data: {
        ticketsByBU: [],
        ticketsByCategory: [],
        ticketsByStatus: [],
        ticketsByType: [],
        ticketTrend: [],
        topInitiators: [],
        assignmentDistribution: [],
        ticketsByInitiatorGroup: [],
        ticketsBySpoc: [],
        ticketsByMonth: [],
        summaryStats: { total: 0, open: 0, resolved: 0, closed: 0, on_hold: 0 },
      },
    }
  }
}

export async function getDelayedTickets() {
  try {
    // Find tickets where actual duration exceeds estimated duration from ticket_classification_mapping
    const result = await sql`
      SELECT
        t.id,
        t.ticket_id,
        t.ticket_number,
        t.title,
        t.created_at,
        t.estimated_duration as ticket_estimated_duration,
        tcm.estimated_duration as mapping_estimated_duration_minutes,
        a.full_name as assignee_name,
        a.email as assignee_email,
        bug.name as target_group_name,
        c.name as category_name,
        sc.name as subcategory_name,
        t.status,
        -- Calculate actual duration in minutes
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at)) / 60 as actual_duration_minutes,
        -- Calculate days delayed (actual - estimated)
        (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at)) / 60 - COALESCE(tcm.estimated_duration, 0)) / (24 * 60) as days_delayed
      FROM tickets t
      LEFT JOIN ticket_classification_mapping tcm 
        ON t.business_unit_group_id = tcm.business_unit_group_id
        AND t.category_id = tcm.category_id
        AND t.subcategory_id = tcm.subcategory_id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
        AND t.status NOT IN ('closed', 'deleted')
        AND tcm.estimated_duration IS NOT NULL
        -- Only show tickets where actual duration exceeds estimated
        AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at)) / 60 > tcm.estimated_duration
      ORDER BY days_delayed DESC, t.created_at DESC
    `

    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching delayed tickets:", error)
    return { success: false, error: "Failed to fetch delayed tickets", data: [] }
  }
}