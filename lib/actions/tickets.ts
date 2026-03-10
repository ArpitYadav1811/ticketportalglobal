"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./auth"
import { sendSpocNotificationEmail, sendAssignmentEmail, sendStatusChangeEmail } from "@/lib/email"

// Helper function to add audit log entry
async function addAuditLog(params: {
  ticketId: number
  actionType: string
  oldValue: string | null
  newValue: string | null
  performedBy: number | null
  performedByName: string | null
  notes?: string
}) {
  await sql`
    INSERT INTO ticket_audit_log (ticket_id, action_type, old_value, new_value, performed_by, performed_by_name, notes)
    VALUES (${params.ticketId}, ${params.actionType}, ${params.oldValue}, ${params.newValue}, ${params.performedBy}, ${params.performedByName}, ${params.notes || null})
  `
}

// Get audit log for a ticket (includes both audit log entries and comments)
export async function getTicketAuditLog(ticketId: number) {
  try {
    // Fetch audit log entries
    const auditLog = await sql`
      SELECT 
        id,
        ticket_id,
        action_type,
        old_value,
        new_value,
        performed_by,
        performed_by_name,
        notes,
        created_at,
        'audit' as entry_type
      FROM ticket_audit_log
      WHERE ticket_id = ${ticketId}
    `

    // Fetch comments (check if is_edited column exists)
    const commentsTableInfo = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'comments' AND column_name = 'is_edited'
    `
    
    const hasEditTracking = commentsTableInfo.length > 0
    
    const comments = hasEditTracking 
      ? await sql`
          SELECT 
            c.id,
            c.ticket_id,
            'comment' as action_type,
            NULL as old_value,
            c.content as new_value,
            c.user_id as performed_by,
            u.full_name as performed_by_name,
            CASE 
              WHEN c.is_edited = TRUE THEN CONCAT('Edited', CASE WHEN c.updated_at IS NOT NULL THEN CONCAT(' at ', TO_CHAR(c.updated_at, 'Mon DD, YYYY at HH24:MI')) ELSE '' END)
              ELSE NULL 
            END as notes,
            c.created_at,
            'comment' as entry_type
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.ticket_id = ${ticketId}
        `
      : await sql`
          SELECT 
            c.id,
            c.ticket_id,
            'comment' as action_type,
            NULL as old_value,
            c.content as new_value,
            c.user_id as performed_by,
            u.full_name as performed_by_name,
            NULL as notes,
            c.created_at,
            'comment' as entry_type
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.ticket_id = ${ticketId}
        `

    // Combine and sort by created_at
    const combined = [...auditLog, ...comments].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return { success: true, data: combined }
  } catch (error) {
    console.error("[v0] Error fetching ticket audit log:", error)
    return { success: false, error: "Failed to fetch audit log", data: [] }
  }
}

export async function getTickets(filters?: {
  status?: string
  assignee?: string
  type?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  includeDeleted?: boolean
  myTeam?: boolean
  userId?: number
  teamMemberIds?: number[]
  isInternal?: boolean
  targetBusinessGroup?: string
  initiator?: string
  initiatorGroup?: string
  project?: string
}) {
  try {
    // Fetch all non-deleted tickets - filtering done client-side for flexibility
    const tickets = await sql`
      SELECT
        t.*,
        u.full_name as creator_name,
        u.business_unit_group_id as creator_business_unit_group_id,
        a.full_name as assignee_name,
        a.business_unit_group_id as assignee_business_unit_group_id,
        spoc.full_name as spoc_name,
        c.name as category_name,
        sc.name as subcategory_name,
        bug.name as group_name,
        tbg.name as target_business_group_name,
        assignee_bug.name as assignee_group_name,
        initiator_bug.name as initiator_group_name,
        p.name as project_name,
        closer.full_name as closed_by_name,
        holder.full_name as hold_by_name,
        redirected_bug.name as redirected_from_group_name,
        redirected_spoc.full_name as redirected_from_spoc_name,
        (SELECT COUNT(*) FROM attachments att WHERE att.ticket_id = t.id) as attachment_count,
        (SELECT COUNT(*) FROM ticket_references tr WHERE tr.source_ticket_id = t.id OR tr.reference_ticket_id = t.id) as reference_count
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      LEFT JOIN business_unit_groups tbg ON t.target_business_group_id = tbg.id
      LEFT JOIN business_unit_groups assignee_bug ON t.assignee_group_id = assignee_bug.id
      LEFT JOIN business_unit_groups initiator_bug ON u.business_unit_group_id = initiator_bug.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users closer ON t.closed_by = closer.id
      LEFT JOIN users holder ON t.hold_by = holder.id
      LEFT JOIN business_unit_groups redirected_bug ON t.redirected_from_business_unit_group_id = redirected_bug.id
      LEFT JOIN users redirected_spoc ON t.redirected_from_spoc_user_id = redirected_spoc.id
      WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
      ORDER BY t.created_at DESC
    `

    // Apply filters in JavaScript
    let filteredTickets = [...tickets]

    // My Team filter - show tickets where assignee or creator is in the team
    if (filters?.myTeam && filters?.teamMemberIds && filters.teamMemberIds.length > 0) {
      filteredTickets = filteredTickets.filter(t => {
        // Include tickets where:
        // 1. Assignee is a team member
        // 2. Creator is a team member
        // 3. SPOC is a team member
        const isAssigneeInTeam = t.assigned_to && filters.teamMemberIds!.includes(t.assigned_to)
        const isCreatorInTeam = t.created_by && filters.teamMemberIds!.includes(t.created_by)
        const isSpocInTeam = t.spoc_user_id && filters.teamMemberIds!.includes(t.spoc_user_id)
        
        return isAssigneeInTeam || isCreatorInTeam || isSpocInTeam
      })
    }

    if (filters?.status && filters.status !== "all") {
      filteredTickets = filteredTickets.filter(t => t.status === filters.status)
    }

    if (filters?.type && filters.type !== "all") {
      filteredTickets = filteredTickets.filter(t => t.ticket_type === filters.type)
    }

    if (filters?.assignee) {
      const assigneeId = parseInt(filters.assignee)
      filteredTickets = filteredTickets.filter(t => t.assigned_to === assigneeId)
    }

    if (filters?.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim()
      filteredTickets = filteredTickets.filter(t => {
        // Search across multiple fields
        const searchableFields = [
          t.title,
          t.ticket_id,
          t.description,
          t.creator_name,
          t.assignee_name,
          t.category_name,
          t.subcategory_name,
          t.spoc_name,
          t.target_business_group_name,
          t.project_name,
          t.initiator_group_name,
          t.assignee_group_name,
          t.ticket_number?.toString(),
        ].filter(Boolean) // Remove null/undefined values
        
        return searchableFields.some(field => 
          field?.toLowerCase().includes(searchLower)
        )
      })
    }

    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filteredTickets = filteredTickets.filter(t => new Date(t.created_at) >= fromDate)
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo)
      filteredTickets = filteredTickets.filter(t => new Date(t.created_at) <= toDate)
    }

    // Filter by internal vs customer tickets
    // Internal tickets: creator's business_unit_group_id is not null (user belongs to a business unit)
    // Customer tickets: creator's business_unit_group_id is null (external customer)
    if (filters?.isInternal !== undefined) {
      filteredTickets = filteredTickets.filter(t => {
        const isInternal = t.creator_business_unit_group_id !== null && t.creator_business_unit_group_id !== undefined
        return isInternal === filters.isInternal
      })
    }

    // Filter by target business group
    if (filters?.targetBusinessGroup) {
      filteredTickets = filteredTickets.filter(t => t.target_business_group_name === filters.targetBusinessGroup)
    }

    // Filter by initiator
    if (filters?.initiator) {
      filteredTickets = filteredTickets.filter(t => t.creator_name === filters.initiator)
    }

    // Filter by initiator group
    if (filters?.initiatorGroup) {
      filteredTickets = filteredTickets.filter(t => t.initiator_group_name === filters.initiatorGroup)
    }

    // Filter by project
    if (filters?.project) {
      filteredTickets = filteredTickets.filter(t => t.project_name === filters.project)
    }

    return { success: true, data: filteredTickets }
  } catch (error) {
    console.error("[v0] Error fetching tickets:", error)
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = (error as any)?.code
    const cause = (error as any)?.cause
    
    let userMessage = "Failed to fetch tickets"
    
    // Check for timeout/network errors
    if (
      errorCode === 'ETIMEDOUT' ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('timeout') ||
      cause?.code === 'ETIMEDOUT' ||
      (cause?.errors && cause.errors.some((e: any) => e?.code === 'ETIMEDOUT'))
    ) {
      userMessage = "Database connection timed out. Please try again in a moment. If the problem persists, check your network connection or contact support."
    } else if (
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('connection')
    ) {
      userMessage = "Unable to connect to the database. Please check your network connection or contact support."
    }
    
    return { success: false, error: userMessage }
  }
}

export async function getTicketById(id: number) {
  try {
    if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
      return { success: false, error: "Invalid ticket ID" }
    }

    const ticketResult = await sql`
      SELECT
        t.*,
        u.full_name as creator_name,
        u.email as creator_email,
        u.business_unit_group_id as creator_business_unit_group_id,
        a.full_name as assignee_name,
        a.email as assignee_email,
        a.business_unit_group_id as assignee_business_unit_group_id,
        spoc.full_name as spoc_name,
        spoc.email as spoc_email,
        bug.name as group_name,
        tbg.name as target_business_group_name,
        assignee_bug.name as assignee_group_name,
        c.full_name as closed_by_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      LEFT JOIN business_unit_groups tbg ON t.target_business_group_id = tbg.id
      LEFT JOIN business_unit_groups assignee_bug ON t.assignee_group_id = assignee_bug.id
      LEFT JOIN users c ON t.closed_by = c.id
      WHERE t.id = ${id}
    `

    if (ticketResult.length === 0) {
      return { success: false, error: "Ticket not found" }
    }

    const ticket = ticketResult[0]

    const commentsResult = await sql`
      SELECT c.*, u.full_name as user_name, u.avatar_url
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ${id}
      ORDER BY c.created_at ASC
    `

    const attachmentsResult = await sql`
      SELECT a.*, u.full_name as uploader_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.ticket_id = ${id}
      ORDER BY a.created_at DESC
    `

    return {
      success: true,
      data: {
        ...ticket,
        comments: commentsResult,
        attachments: attachmentsResult,
      },
    }
  } catch (error) {
    console.error("[v0] Error fetching ticket:", error)
    return { success: false, error: "Failed to fetch ticket" }
  }
}

export async function createTicket(data: {
 ticketType: string
 parentTicketId?: number | null
 targetBusinessGroupId: number
 projectName?: string
 projectId?: number | null
 categoryId: number | null
 subcategoryId: number | null
 title: string
 description: string
 estimatedDuration: number // Changed from string to number (hours)
 spocId: number
 productReleaseName?: string
 estimatedReleaseDate?: string | null
 isInternal?: boolean
 assignedTo?: number | null
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.id) {
      return { success: false, error: "User not authenticated" }
    }

    // Get creator's business_unit_group_id for initiator group
    const creatorUser = await sql`
      SELECT business_unit_group_id FROM users WHERE id = ${currentUser.id}
    `
    const creatorBusinessUnitGroupId = creatorUser[0]?.business_unit_group_id || null

    // Get assignee's business_unit_group_id if assigned
    let assigneeGroupId = null
    if (data.assignedTo) {
      const assigneeUser = await sql`
        SELECT business_unit_group_id FROM users WHERE id = ${data.assignedTo}
      `
      assigneeGroupId = assigneeUser[0]?.business_unit_group_id || null
    }

    // Get next sequential ticket number
    const maxResult = await sql`SELECT COALESCE(MAX(ticket_number), 0) as max_num FROM tickets`
    const nextTicketNumber = (maxResult[0]?.max_num || 0) + 1

    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "")
    const randomNum = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0")
    const ticketId = `TKT-${dateStr}-${randomNum}`

    const result = await sql`
      INSERT INTO tickets (
        ticket_id, ticket_number, title, description, ticket_type, priority,
        status, created_by, assigned_to, spoc_user_id,
        business_unit_group_id, target_business_group_id, assignee_group_id,
        project_name, project_id, category_id, subcategory_id,
        estimated_duration, product_release_name, estimated_release_date,
        is_internal
      )
      VALUES (
        ${ticketId},
        ${nextTicketNumber},
        ${data.title},
        ${data.description},
        ${data.ticketType},
        ${"medium"},
        ${"open"},
        ${currentUser.id},
        ${data.assignedTo || null},
        ${data.spocId},
        ${creatorBusinessUnitGroupId},
        ${data.targetBusinessGroupId},
        ${assigneeGroupId},
        ${data.projectName || null},
        ${data.projectId || null},
        ${data.categoryId || null},
        ${data.subcategoryId || null},
        ${data.estimatedDuration || null},
        ${data.productReleaseName || null},
        ${data.estimatedReleaseDate || null},
        ${data.isInternal || false}
      )
      RETURNING *
    `

    revalidatePath("/dashboard")
    revalidatePath("/tickets")

    // Log ticket creation to audit trail
    await addAuditLog({
      ticketId: result[0].id,
      actionType: 'created',
      oldValue: null,
      newValue: `Ticket #${result[0].ticket_number} created`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
    })

    // Send email notification to SPOC
    if (data.spocId) {
      try {
        const spocResult = await sql`
          SELECT u.email, u.full_name, bug.name as group_name
          FROM users u
          LEFT JOIN business_unit_groups bug ON u.business_unit_group_id = bug.id
          WHERE u.id = ${data.spocId}
        `
        if (spocResult.length > 0) {
          const spoc = spocResult[0]
          await sendSpocNotificationEmail({
            spocEmail: spoc.email,
            spocName: spoc.full_name,
            ticketId: `#${result[0].ticket_number}`,
            ticketDbId: result[0].id,
            ticketTitle: data.title,
            description: data.description,
            creatorName: currentUser.full_name || currentUser.email,
            creatorGroup: currentUser.group_name || 'Unknown Group',
          })
        }
      } catch (emailError) {
        console.error("[Email] Failed to send SPOC notification:", emailError)
        // Don't fail ticket creation if email fails
      }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error creating ticket:", error)
    return { success: false, error: "Failed to create ticket" }
  }
}

export async function updateTicketStatus(ticketId: number, status: string, reason?: string, remarks?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Get ticket info before update
    const ticketBefore = await sql`
      SELECT t.*, u.full_name as creator_name, u.email as creator_email,
             a.full_name as assignee_name, a.email as assignee_email,
             s.full_name as spoc_name, s.email as spoc_email
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users s ON t.spoc_user_id = s.id
      WHERE t.id = ${ticketId}
    `
    
    if (ticketBefore.length === 0) {
      return { success: false, error: "Ticket not found" }
    }

    const ticket = ticketBefore[0]
    const oldStatus = ticket.status
    const userId = currentUser.id
    const _role = currentUser.role?.toLowerCase()
    const isAdmin = _role === "admin" || _role === "superadmin"
    const isInitiator = userId === ticket.created_by
    const isAssignee = userId === ticket.assigned_to
    const isSPOC = userId === ticket.spoc_user_id

    // Validate permissions based on status per permissions matrix
    if (!isAdmin) {
      if (status === "closed" || status === "deleted") {
        // 2. Close / Delete Ticket: Initiator ✅ (with remarks) | SPOC ❌ | Assignee ❌
        if (!isInitiator) {
          return { success: false, error: "Only the ticket initiator can close or delete tickets" }
        }
      } else if (status === "on-hold") {
        // 6. Change Status to On-Hold: Initiator ❌ | SPOC ✅ | Assignee ❌
        if (!isSPOC) {
          return { success: false, error: "Only the SPOC can set status to on-hold" }
        }
      } else if (status === "resolved") {
        // 7. Update Status to Resolved: Initiator ❌ | SPOC ❌ | Assignee ✅ (with remarks)
        if (!isAssignee) {
          return { success: false, error: "Only the assignee can set status to resolved" }
        }
      } else if (status === "returned") {
        // Returned: Typically assignee only (similar to resolved)
        if (!isAssignee) {
          return { success: false, error: "Only the assignee can set status to returned" }
        }
      } else if (status === "open") {
        // 3. Reopen Resolved Ticket: Initiator ✅ (with remarks) | SPOC ❌ | Assignee ✅
        // Allow reopening if ticket was resolved or closed
        if (oldStatus === "resolved" || oldStatus === "closed") {
          if (!isInitiator && !isAssignee) {
            return { success: false, error: "Only the initiator or assignee can reopen a resolved/closed ticket" }
          }
        } else {
          // For other status changes to open, check if user has permission
          if (!isInitiator && !isAssignee && !isSPOC) {
            return { success: false, error: "You do not have permission to change status to open" }
          }
        }
      }
    }

    // Don't allow status changes if ticket is soft deleted
    if (ticket.is_deleted) {
      return { success: false, error: "Cannot change status of a deleted ticket. Please restore it first." }
    }

    // Update ticket status with appropriate fields
    await sql`
      UPDATE tickets
      SET status = ${status},
          updated_at = CURRENT_TIMESTAMP,
          resolved_at = CASE WHEN ${status} = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
          closed_by = CASE WHEN ${status} = 'closed' THEN ${userId} ELSE closed_by END,
          closed_at = CASE WHEN ${status} = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END,
          hold_by = CASE WHEN ${status} = 'on-hold' THEN ${userId} ELSE hold_by END,
          hold_at = CASE WHEN ${status} = 'on-hold' THEN CURRENT_TIMESTAMP ELSE hold_at END
      WHERE id = ${ticketId}
    `

    revalidatePath("/dashboard")
    revalidatePath("/tickets")

    // Log the status change to audit trail
    if (oldStatus !== status) {
      const statusChangeNote = `Status changed from ${oldStatus} to ${status}`
      const fullNotes = reason 
        ? `${statusChangeNote}. Reason: ${reason}${remarks ? `. Remarks: ${remarks}` : ''}`
        : statusChangeNote
      
      await addAuditLog({
        ticketId,
        actionType: 'status_change',
        oldValue: oldStatus,
        newValue: status,
        performedBy: currentUser?.id || null,
        performedByName: currentUser?.full_name || 'System',
        notes: fullNotes,
      })
    }

    // Send email notifications for status change
    if (ticketBefore.length > 0 && oldStatus !== status) {
      const ticket = ticketBefore[0]
      const changedByName = currentUser?.full_name || 'System'

      // Notify creator if they didn't make the change
      if (ticket.creator_email && ticket.created_by !== currentUser?.id) {
        sendStatusChangeEmail({
          recipientEmail: ticket.creator_email,
          recipientName: ticket.creator_name,
          ticketId: `#${ticket.ticket_number}`,
          ticketDbId: ticketId,
          ticketTitle: ticket.title,
          oldStatus,
          newStatus: status,
          changedByName,
        }).catch(err => console.error('[Email] Status change email failed:', err))
      }

      // Notify assignee if different from creator and they didn't make the change
      if (ticket.assignee_email && ticket.assigned_to !== ticket.created_by && ticket.assigned_to !== currentUser?.id) {
        sendStatusChangeEmail({
          recipientEmail: ticket.assignee_email,
          recipientName: ticket.assignee_name,
          ticketId: `#${ticket.ticket_number}`,
          ticketDbId: ticketId,
          ticketTitle: ticket.title,
          oldStatus,
          newStatus: status,
          changedByName,
        }).catch(err => console.error('[Email] Status change email failed:', err))
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating ticket status:", error)
    return { success: false, error: "Failed to update ticket status" }
  }
}

export async function addComment(ticketId: number, content: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.id) {
      return { success: false, error: "User not authenticated" }
    }

    const result = await sql`
      INSERT INTO comments (ticket_id, user_id, content)
      VALUES (${ticketId}, ${currentUser.id}, ${content})
      RETURNING *
    `

    await sql`
      UPDATE tickets
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    revalidatePath("/tickets")

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error adding comment:", error)
    return { success: false, error: "Failed to add comment" }
  }
}

export async function updateComment(commentId: number, content: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.id) {
      return { success: false, error: "User not authenticated" }
    }

    // Get the comment and verify ownership
    const commentBefore = await sql`
      SELECT c.*, t.id as ticket_id, t.ticket_number
      FROM comments c
      JOIN tickets t ON c.ticket_id = t.id
      WHERE c.id = ${commentId}
    `

    if (commentBefore.length === 0) {
      return { success: false, error: "Comment not found" }
    }

    const comment = commentBefore[0]
    const _role = currentUser.role?.toLowerCase()
    const isAdmin = _role === "admin" || _role === "superadmin"

    // Only comment owner or admin can edit
    if (comment.user_id !== currentUser.id && !isAdmin) {
      return { success: false, error: "You can only edit your own comments" }
    }

    // Update the comment
    const result = await sql`
      UPDATE comments
      SET 
        content = ${content},
        updated_at = CURRENT_TIMESTAMP,
        is_edited = TRUE,
        edited_by = ${currentUser.id}
      WHERE id = ${commentId}
      RETURNING *
    `

    // Log comment edit to audit trail
    await addAuditLog({
      ticketId: comment.ticket_id,
      actionType: 'comment_edited',
      oldValue: null,
      newValue: `Comment #${commentId} edited`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Comment was edited at ${new Date().toISOString()}`,
    })

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${comment.ticket_id}`)

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error updating comment:", error)
    return { success: false, error: "Failed to update comment" }
  }
}

export async function updateTicketSPOC(ticketId: number, newSpocId: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Get ticket info before update
    const ticketBefore = await sql`
      SELECT t.*, spoc.full_name as old_spoc_name
      FROM tickets t
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      WHERE t.id = ${ticketId}
    `

    if (ticketBefore.length === 0) {
      return { success: false, error: "Ticket not found" }
    }

    const ticket = ticketBefore[0]
    const oldSpocId = ticket.spoc_user_id

    // Only process if SPOC actually changed
    if (oldSpocId !== newSpocId) {
      // Get new SPOC name
      const newSpocResult = await sql`
        SELECT full_name FROM users WHERE id = ${newSpocId}
      `
      const newSpocName = newSpocResult.length > 0 ? newSpocResult[0].full_name : 'Unknown'

      // Update ticket
      await sql`
        UPDATE tickets
        SET spoc_user_id = ${newSpocId}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${ticketId}
      `

      // Log SPOC change to audit trail
      await addAuditLog({
        ticketId,
        actionType: 'spoc_change',
        oldValue: ticket.old_spoc_name || 'Unassigned',
        newValue: newSpocName,
        performedBy: currentUser.id,
        performedByName: currentUser.full_name || currentUser.email,
      })

      revalidatePath("/tickets")
      revalidatePath(`/tickets/${ticketId}`)
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating SPOC:", error)
    return { success: false, error: "Failed to update SPOC" }
  }
}

export async function updateTicket(
  ticketId: number,
  data: {
    title: string
    description: string
    status: string
    priority: string
    targetBusinessGroupId: number
    categoryId: number
    subcategoryId: number | null
    assigneeId: number
    estimatedDuration: number // Changed from string to number (hours)
  },
) {
  try {
    // Get assignee's business_unit_group_id if assigned
    let assigneeGroupId = null
    if (data.assigneeId) {
      const assigneeUser = await sql`
        SELECT business_unit_group_id FROM users WHERE id = ${data.assigneeId}
      `
      assigneeGroupId = assigneeUser[0]?.business_unit_group_id || null
    }

    const result = await sql`
      UPDATE tickets 
      SET 
        title = ${data.title},
        description = ${data.description},
        status = ${data.status},
        priority = ${data.priority},
        target_business_group_id = ${data.targetBusinessGroupId},
        category_id = ${data.categoryId},
        subcategory_id = ${data.subcategoryId},
        assigned_to = ${data.assigneeId},
        assignee_group_id = ${assigneeGroupId},
        estimated_duration = ${data.estimatedDuration},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
      RETURNING *
    `

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${ticketId}`)

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error updating ticket:", error)
    return { success: false, error: "Failed to update ticket" }
  }
}

export async function softDeleteTicket(ticketId: number) {
  try {
    // Get current user to verify they are the ticket creator or admin
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    const _role = currentUser.role?.toLowerCase()
    const isAdmin = _role === "admin" || _role === "superadmin"

    // Check if user is the ticket creator and get current status
    const ticket = await sql`
      SELECT created_by, status FROM tickets WHERE id = ${ticketId}
    `
    
    if (ticket.length === 0) {
      return { success: false, error: "Ticket not found" }
    }

    // Allow deletion if user is admin OR the ticket creator
    if (!isAdmin && ticket[0].created_by !== currentUser.id) {
      return { success: false, error: "Only the ticket initiator or admin can delete this ticket" }
    }

    // Soft delete: set is_deleted flag ONLY, keep status unchanged
    await sql`
      UPDATE tickets
      SET is_deleted = TRUE,
          deleted_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    // Log deletion to audit trail
    const deletionNote = isAdmin ? 'Ticket soft deleted by admin' : 'Ticket soft deleted by initiator'
    await addAuditLog({
      ticketId,
      actionType: 'soft_delete',
      oldValue: 'active',
      newValue: 'deleted',
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: deletionNote
    })

    revalidatePath("/tickets")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error soft deleting ticket:", error)
    return { success: false, error: "Failed to delete ticket" }
  }
}

export async function restoreTicket(ticketId: number) {
  try {
    await sql`
      UPDATE tickets
      SET is_deleted = FALSE, deleted_at = NULL
      WHERE id = ${ticketId}
    `

    revalidatePath("/tickets")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error restoring ticket:", error)
    return { success: false, error: "Failed to restore ticket" }
  }
}

export async function redirectTicket(
  ticketId: number,
  newTargetBusinessGroupId: number,
  newSpocUserId: number,
  remarks: string
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Get ticket info before update
    const ticketBefore = await sql`
      SELECT 
        t.*,
        tbg.name as current_target_business_group_name,
        spoc.full_name as current_spoc_name
      FROM tickets t
      LEFT JOIN business_unit_groups tbg ON t.target_business_group_id = tbg.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      WHERE t.id = ${ticketId}
    `

    if (ticketBefore.length === 0) {
      return { success: false, error: "Ticket not found" }
    }

    const ticket = ticketBefore[0]
    const _role = currentUser.role?.toLowerCase()
    const isAdmin = _role === "admin" || _role === "superadmin"
    const isSPOC = currentUser.id === ticket.spoc_user_id

    // Check permissions per permissions matrix:
    // 5. Redirect to another SPOC: Initiator ❌ | SPOC ✅ (with remarks) | Assignee ❌
    if (!isAdmin && !isSPOC) {
      return { success: false, error: "Only SPOC can redirect tickets" }
    }

    // Get new target business group and SPOC names for audit trail
    const newGroupResult = await sql`
      SELECT name FROM business_unit_groups WHERE id = ${newTargetBusinessGroupId}
    `
    const newSpocResult = await sql`
      SELECT full_name FROM users WHERE id = ${newSpocUserId}
    `

    const newGroupName = newGroupResult[0]?.name || "Unknown Group"
    const newSpocName = newSpocResult[0]?.full_name || "Unknown SPOC"

    // Update ticket with redirection
    await sql`
      UPDATE tickets
      SET 
        target_business_group_id = ${newTargetBusinessGroupId},
        spoc_user_id = ${newSpocUserId},
        redirected_from_business_unit_group_id = ${ticket.target_business_group_id},
        redirected_from_spoc_user_id = ${ticket.spoc_user_id},
        redirection_remarks = ${remarks},
        redirected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    // Log redirection to audit trail
    await addAuditLog({
      ticketId,
      actionType: 'redirection',
      oldValue: `${ticket.current_target_business_group_name || 'Unknown'} (${ticket.current_spoc_name || 'Unknown SPOC'})`,
      newValue: `${newGroupName} (${newSpocName})`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
      notes: `Redirected: ${remarks}`
    })

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${ticketId}`)
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error redirecting ticket:", error)
    return { success: false, error: "Failed to redirect ticket" }
  }
}

export async function getUsers() {
  try {
    const result = await sql`
      SELECT u.id, u.full_name, u.email, u.role, u.business_unit_group_id, bug.name as group_name
      FROM users u
      LEFT JOIN business_unit_groups bug ON u.business_unit_group_id = bug.id
      ORDER BY u.full_name
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching users:", error)
    return { success: false, error: "Failed to fetch users", data: [] }
  }
}

export async function updateTicketAssignee(ticketId: number, assigneeId: number) {
  try {
    const currentUser = await getCurrentUser()

    // Get ticket info before update including old assignee name
    const ticketBefore = await sql`
      SELECT t.ticket_id, t.ticket_number, t.title, t.description, t.priority, t.assigned_to,
             a.full_name as old_assignee_name
      FROM tickets t
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE t.id = ${ticketId}
    `

    // Get assignee's business_unit_group_id if assigned
    let assigneeGroupId = null
    if (assigneeId) {
      const assigneeUser = await sql`
        SELECT business_unit_group_id FROM users WHERE id = ${assigneeId}
      `
      assigneeGroupId = assigneeUser[0]?.business_unit_group_id || null
    }

    await sql`
      UPDATE tickets
      SET assigned_to = ${assigneeId}, 
          assignee_group_id = ${assigneeGroupId},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${ticketId}`)

    // Send email notification to new assignee and log audit
    if (ticketBefore.length > 0) {
      const ticket = ticketBefore[0]
      const oldAssigneeId = ticket.assigned_to

      // Only process if assignee actually changed
      if (oldAssigneeId !== assigneeId) {
        // Get new assignee name for audit log
        const newAssigneeResult = await sql`
          SELECT email, full_name FROM users WHERE id = ${assigneeId}
        `
        const newAssigneeName = newAssigneeResult.length > 0 ? newAssigneeResult[0].full_name : null

        // Log to audit trail
        await addAuditLog({
          ticketId,
          actionType: 'assignment_change',
          oldValue: ticket.old_assignee_name || 'Unassigned',
          newValue: newAssigneeName || 'Unassigned',
          performedBy: currentUser?.id || null,
          performedByName: currentUser?.full_name || 'System',
        })

        // Send email notification
        if (newAssigneeResult.length > 0) {
          const assignee = newAssigneeResult[0]
          try {
            await sendAssignmentEmail({
              assigneeEmail: assignee.email,
              assigneeName: assignee.full_name,
              ticketId: `#${ticket.ticket_number}`,
              ticketDbId: ticketId,
              ticketTitle: ticket.title,
              description: ticket.description || '',
              priority: ticket.priority,
              assignedByName: currentUser?.full_name || 'System',
            })
          } catch (emailError) {
            console.error("[Email] Failed to send assignment email:", emailError)
            // Don't fail the update if email fails
          }
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating ticket assignee:", error)
    return { success: false, error: "Failed to update assignee" }
  }
}

export async function updateTicketProject(ticketId: number, projectId: number | null) {
  try {
    const currentUser = await getCurrentUser()

    // Get old project name
    const ticketBefore = await sql`
      SELECT t.project_id, p.name as old_project_name
      FROM tickets t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ${ticketId}
    `

    await sql`
      UPDATE tickets
      SET project_id = ${projectId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    // Get new project name and log to audit
    if (ticketBefore.length > 0) {
      const oldProjectId = ticketBefore[0].project_id
      if (oldProjectId !== projectId) {
        let newProjectName = null
        if (projectId) {
          const projectResult = await sql`SELECT name FROM projects WHERE id = ${projectId}`
          newProjectName = projectResult.length > 0 ? projectResult[0].name : null
        }

        await addAuditLog({
          ticketId,
          actionType: 'project_change',
          oldValue: ticketBefore[0].old_project_name || 'None',
          newValue: newProjectName || 'None',
          performedBy: currentUser?.id || null,
          performedByName: currentUser?.full_name || 'System',
        })
      }
    }

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${ticketId}`)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating ticket project:", error)
    return { success: false, error: "Failed to update project" }
  }
}

export async function getTeamMembers(userId: number) {
  try {
    const result = await sql`
      SELECT DISTINCT u.id, u.full_name, u.email
      FROM users u
      JOIN team_members tm ON u.id = tm.user_id
      WHERE tm.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = ${userId}
      )
      ORDER BY u.full_name
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching team members:", error)
    return { success: false, error: "Failed to fetch team members", data: [] }
  }
}

// ===== Ticket References =====

// Auto-create ticket_references table if it doesn't exist
let ticketReferencesTableReady = false
async function ensureTicketReferencesTable() {
  if (ticketReferencesTableReady) return
  try {
    // Check if table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ticket_references'
      ) as table_exists
    `
    if (tableCheck[0]?.table_exists) {
      console.log("[TicketRef] Table already exists")
      ticketReferencesTableReady = true
      return
    }

    console.log("[TicketRef] Creating ticket_references table...")
    await sql`
      CREATE TABLE IF NOT EXISTS ticket_references (
        id SERIAL PRIMARY KEY,
        source_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        reference_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(source_ticket_id, reference_ticket_id),
        CHECK (source_ticket_id <> reference_ticket_id)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_ticket_ref_source ON ticket_references(source_ticket_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ticket_ref_reference ON ticket_references(reference_ticket_id)`
    console.log("[TicketRef] Table and indexes created successfully")
    ticketReferencesTableReady = true
  } catch (error) {
    console.error("[TicketRef] FAILED to create ticket_references table:", error)
    // Re-throw so callers know the table isn't ready
    throw new Error(`Failed to ensure ticket_references table: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function validateTicketByNumber(ticketNumber: number) {
  try {
    const result = await sql`
      SELECT t.id, t.ticket_number, t.ticket_id, t.title, t.ticket_type, t.status,
             u.full_name as creator_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.ticket_number = ${ticketNumber} AND t.is_deleted = FALSE
      LIMIT 1
    `
    if (result.length === 0) {
      return { success: false, error: "No ticket found" }
    }
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error validating ticket:", error)
    return { success: false, error: "Failed to validate ticket" }
  }
}

export async function addTicketReferences(sourceTicketId: number, referenceTicketIds: number[]) {
  try {
    console.log(`[TicketRef] addTicketReferences called: source=${sourceTicketId}, refs=[${referenceTicketIds.join(",")}]`)
    await ensureTicketReferencesTable()
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.id) {
      console.error("[TicketRef] User not authenticated")
      return { success: false, error: "User not authenticated" }
    }

    let addedCount = 0
    for (const refTicketId of referenceTicketIds) {
      if (refTicketId === sourceTicketId) {
        console.warn(`[TicketRef] Skipping self-reference: ${refTicketId}`)
        continue
      }
      try {
        console.log(`[TicketRef] Inserting reference: ${sourceTicketId} -> ${refTicketId}`)
        await sql`
          INSERT INTO ticket_references (source_ticket_id, reference_ticket_id, created_by)
          VALUES (${sourceTicketId}, ${refTicketId}, ${currentUser.id})
          ON CONFLICT (source_ticket_id, reference_ticket_id) DO NOTHING
        `
        addedCount++
        console.log(`[TicketRef] Successfully inserted reference: ${sourceTicketId} -> ${refTicketId}`)
      } catch (err) {
        console.error(`[TicketRef] FAILED to insert reference ${sourceTicketId} -> ${refTicketId}:`, err)
      }
    }

    console.log(`[TicketRef] Done. Added ${addedCount} references.`)
    return { success: true, addedCount }
  } catch (error) {
    console.error("[TicketRef] Error in addTicketReferences:", error)
    return { success: false, error: `Failed to add ticket references: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function getTicketReferences(ticketId: number) {
  try {
    await ensureTicketReferencesTable()
    const result = await sql`
      SELECT 
        tr.id as ref_id,
        t.id, t.ticket_number, t.ticket_id, t.title, t.ticket_type, t.status,
        u.full_name as creator_name
      FROM ticket_references tr
      JOIN tickets t ON tr.reference_ticket_id = t.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE tr.source_ticket_id = ${ticketId} AND t.is_deleted = FALSE
      UNION
      SELECT 
        tr.id as ref_id,
        t.id, t.ticket_number, t.ticket_id, t.title, t.ticket_type, t.status,
        u.full_name as creator_name
      FROM ticket_references tr
      JOIN tickets t ON tr.source_ticket_id = t.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE tr.reference_ticket_id = ${ticketId} AND t.is_deleted = FALSE
      ORDER BY ticket_number DESC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching ticket references:", error)
    return { success: false, error: "Failed to fetch references", data: [] }
  }
}

export async function removeTicketReference(sourceTicketId: number, referenceTicketId: number) {
  try {
    await ensureTicketReferencesTable()
    await sql`
      DELETE FROM ticket_references 
      WHERE (source_ticket_id = ${sourceTicketId} AND reference_ticket_id = ${referenceTicketId})
         OR (source_ticket_id = ${referenceTicketId} AND reference_ticket_id = ${sourceTicketId})
    `
    return { success: true }
  } catch (error) {
    console.error("[v0] Error removing ticket reference:", error)
    return { success: false, error: "Failed to remove reference" }
  }
}

export async function getTicketReferenceCount(ticketId: number) {
  try {
    await ensureTicketReferencesTable()
    const result = await sql`
      SELECT COUNT(*) as count FROM (
        SELECT reference_ticket_id as linked_id FROM ticket_references WHERE source_ticket_id = ${ticketId}
        UNION
        SELECT source_ticket_id as linked_id FROM ticket_references WHERE reference_ticket_id = ${ticketId}
      ) refs
      JOIN tickets t ON t.id = refs.linked_id AND t.is_deleted = FALSE
    `
    return { success: true, count: Number(result[0]?.count || 0) }
  } catch (error) {
    return { success: true, count: 0 }
  }
}
