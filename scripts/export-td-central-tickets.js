#!/usr/bin/env node

/**
 * Export Tickets for TD Central Group
 * 
 * This script exports all tickets targeted to "TD Central" business group
 * to a JSON file with complete ticket details including:
 * - Ticket information
 * - Creator, Assignee, SPOC details
 * - Comments
 * - Attachments
 * - Audit logs
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BUSINESS_GROUP_NAME = 'TD Central';
const OUTPUT_FILE = path.join(__dirname, 'td-central-tickets-export.json');
// Set daysFilter to 0 for "All" tickets, or specify number of days (e.g., 30 for last 30 days)
// Change this value:
//   - 0 = All time (no date filter) - Use this to get ALL tickets
//   - 30 = Last 30 days (matches analytics default)
//   - 90 = Last 3 months
const DAYS_FILTER = 0; // 0 = All time, 30 = Last 30 days, etc.

async function exportTickets() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n' + '='.repeat(80));
    console.log('EXPORTING TICKETS FOR TD CENTRAL');
    console.log('='.repeat(80) + '\n');

    await client.connect();
    console.log('✓ Connected to database\n');

    // First, get the business group ID
    console.log(`1️⃣  Finding business group: "${BUSINESS_GROUP_NAME}"...`);
    const bgResult = await client.query(`
      SELECT id, name 
      FROM business_unit_groups 
      WHERE name = $1
    `, [BUSINESS_GROUP_NAME]);

    if (bgResult.rows.length === 0) {
      throw new Error(`Business group "${BUSINESS_GROUP_NAME}" not found`);
    }

    const businessGroupId = bgResult.rows[0].id;
    console.log(`✓ Found business group ID: ${businessGroupId}\n`);

    // Calculate date interval (same logic as analytics)
    const daysInterval = DAYS_FILTER > 0 ? DAYS_FILTER : 36500; // 100 years ≈ all time
    
    // Get ALL tickets related to TD Central in ANY way:
    // 1. Tickets TARGETED to TD Central (target_business_group_id)
    // 2. Tickets where ticket's business_unit_group_id = TD Central
    // 3. Tickets created by users in TD Central (creator's business_unit_group_id)
    // 4. Tickets assigned to users in TD Central (assignee's business_unit_group_id)
    // 5. Tickets where assignee_group_id = TD Central
    console.log(`2️⃣  Fetching tickets${DAYS_FILTER > 0 ? ` (last ${DAYS_FILTER} days)` : ' (all time)'}...`);
    console.log(`   Including tickets with ANY relation to "${BUSINESS_GROUP_NAME}"...`);
    const ticketsResult = await client.query(`
      SELECT DISTINCT
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
        initiator_bug.name as initiator_group_name,
        p.name as project_name,
        closer.full_name as closed_by_name,
        closer.email as closed_by_email,
        holder.full_name as hold_by_name,
        holder.email as hold_by_email,
        redirected_bug.name as redirected_from_group_name,
        redirected_spoc.full_name as redirected_from_spoc_name,
        c.name as category_name,
        sc.name as subcategory_name,
        (SELECT COUNT(*) FROM attachments att WHERE att.ticket_id = t.id) as attachment_count,
        (SELECT COUNT(*) FROM ticket_references tr WHERE tr.source_ticket_id = t.id OR tr.reference_ticket_id = t.id) as reference_count,
        -- Add relation type for clarity
        CASE 
          WHEN t.target_business_group_id = $1 THEN 'targeted_to'
          WHEN t.business_unit_group_id = $1 THEN 'ticket_belongs_to'
          WHEN u.business_unit_group_id = $1 THEN 'created_by_member'
          WHEN a.business_unit_group_id = $1 THEN 'assigned_to_member'
          WHEN t.assignee_group_id = $1 THEN 'assigned_to_group'
          ELSE 'other'
        END as relation_type
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      LEFT JOIN business_unit_groups tbg ON t.target_business_group_id = tbg.id
      LEFT JOIN business_unit_groups assignee_bug ON t.assignee_group_id = assignee_bug.id
      LEFT JOIN business_unit_groups initiator_bug ON u.business_unit_group_id = initiator_bug.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users closer ON t.closed_by = closer.id
      LEFT JOIN users holder ON t.hold_by = holder.id
      LEFT JOIN business_unit_groups redirected_bug ON t.redirected_from_business_unit_group_id = redirected_bug.id
      LEFT JOIN users redirected_spoc ON t.redirected_from_spoc_user_id = redirected_spoc.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
        AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * $2
        AND (
          -- Ticket is targeted to TD Central
          t.target_business_group_id = $1
          -- OR ticket belongs to TD Central
          OR t.business_unit_group_id = $1
          -- OR creator is in TD Central
          OR u.business_unit_group_id = $1
          -- OR assignee is in TD Central
          OR a.business_unit_group_id = $1
          -- OR assignee group is TD Central
          OR t.assignee_group_id = $1
        )
      ORDER BY t.created_at DESC
    `, [businessGroupId, daysInterval]);

    const tickets = ticketsResult.rows;
    console.log(`✓ Found ${tickets.length} tickets\n`);

    if (tickets.length === 0) {
      console.log('⚠️  No tickets found for this business group');
      return;
    }

    // Get additional data for each ticket
    console.log('3️⃣  Fetching related data (comments, attachments, audit logs)...');
    const ticketsWithDetails = await Promise.all(
      tickets.map(async (ticket) => {
        // Get comments
        const commentsResult = await client.query(`
          SELECT 
            c.*,
            u.full_name as user_name,
            u.email as user_email,
            u.avatar_url
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.ticket_id = $1
          ORDER BY c.created_at ASC
        `, [ticket.id]);

        // Get attachments
        const attachmentsResult = await client.query(`
          SELECT 
            a.*,
            u.full_name as uploader_name,
            u.email as uploader_email
          FROM attachments a
          LEFT JOIN users u ON a.uploaded_by = u.id
          WHERE a.ticket_id = $1
          ORDER BY a.created_at DESC
        `, [ticket.id]);

        // Get audit logs
        const auditLogsResult = await client.query(`
          SELECT *
          FROM ticket_audit_log
          WHERE ticket_id = $1
          ORDER BY created_at ASC
        `, [ticket.id]);

        // Get ticket references
        const referencesResult = await client.query(`
          SELECT 
            tr.*,
            source_ticket.ticket_id as source_ticket_id_display,
            source_ticket.title as source_ticket_title,
            reference_ticket.ticket_id as reference_ticket_id_display,
            reference_ticket.title as reference_ticket_title
          FROM ticket_references tr
          LEFT JOIN tickets source_ticket ON tr.source_ticket_id = source_ticket.id
          LEFT JOIN tickets reference_ticket ON tr.reference_ticket_id = reference_ticket.id
          WHERE tr.source_ticket_id = $1 OR tr.reference_ticket_id = $1
        `, [ticket.id]);

        return {
          ...ticket,
          comments: commentsResult.rows,
          attachments: attachmentsResult.rows,
          audit_logs: auditLogsResult.rows,
          references: referencesResult.rows,
        };
      })
    );

    console.log(`✓ Fetched details for all tickets\n`);

    // Count tickets by relation type
    const relationTypeCounts = ticketsWithDetails.reduce((acc, ticket) => {
      const relationType = ticket.relation_type || 'other';
      acc[relationType] = (acc[relationType] || 0) + 1;
      return acc;
    }, {});

    // Create export object
    const exportData = {
      export_info: {
        business_group: BUSINESS_GROUP_NAME,
        business_group_id: businessGroupId,
        export_date: new Date().toISOString(),
        days_filter: DAYS_FILTER === 0 ? 'All time' : `${DAYS_FILTER} days`,
        export_scope: 'All tickets with ANY relation to TD Central (targeted, created by, assigned to, or belongs to)',
        total_tickets: ticketsWithDetails.length,
        relation_type_breakdown: relationTypeCounts,
        ticket_status_breakdown: {
          open: ticketsWithDetails.filter(t => t.status === 'open').length,
          resolved: ticketsWithDetails.filter(t => t.status === 'resolved').length,
          closed: ticketsWithDetails.filter(t => t.status === 'closed').length,
          on_hold: ticketsWithDetails.filter(t => t.status === 'hold' || t.status === 'on-hold').length,
          returned: ticketsWithDetails.filter(t => t.status === 'returned').length,
        }
      },
      tickets: ticketsWithDetails
    };

    // Write to JSON file
    console.log('4️⃣  Writing to JSON file...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exportData, null, 2), 'utf8');
    console.log(`✓ Exported to: ${OUTPUT_FILE}\n`);

    // Print summary
    console.log('5️⃣  Summary:');
    console.log(`   Total Tickets: ${exportData.export_info.total_tickets}`);
    console.log(`   Open: ${exportData.export_info.ticket_status_breakdown.open}`);
    console.log(`   Resolved: ${exportData.export_info.ticket_status_breakdown.resolved}`);
    console.log(`   Closed: ${exportData.export_info.ticket_status_breakdown.closed}`);
    console.log(`   On Hold: ${exportData.export_info.ticket_status_breakdown.on_hold}`);
    console.log(`   Returned: ${exportData.export_info.ticket_status_breakdown.returned}`);
    
    console.log(`\n   Relation Type Breakdown:`);
    Object.entries(relationTypeCounts).forEach(([type, count]) => {
      const typeLabel = {
        'targeted_to': 'Targeted to TD Central',
        'ticket_belongs_to': 'Ticket belongs to TD Central',
        'created_by_member': 'Created by TD Central member',
        'assigned_to_member': 'Assigned to TD Central member',
        'assigned_to_group': 'Assigned to TD Central group',
        'other': 'Other relation'
      }[type] || type;
      console.log(`     - ${typeLabel}: ${count}`);
    });
    
    const totalComments = ticketsWithDetails.reduce((sum, t) => sum + t.comments.length, 0);
    const totalAttachments = ticketsWithDetails.reduce((sum, t) => sum + t.attachments.length, 0);
    const totalAuditLogs = ticketsWithDetails.reduce((sum, t) => sum + t.audit_logs.length, 0);
    
    console.log(`\n   Total Comments: ${totalComments}`);
    console.log(`   Total Attachments: ${totalAttachments}`);
    console.log(`   Total Audit Logs: ${totalAuditLogs}`);

    console.log('\n' + '='.repeat(80));
    console.log('EXPORT COMPLETE');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await client.end();
  }
}

exportTickets()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
