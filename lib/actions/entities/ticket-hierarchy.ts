/**
 * TICKET HIERARCHY - Server Actions
 * 
 * Functions for managing parent-child ticket relationships.
 */

'use server'

import { sql } from '@vercel/postgres'
import { TicketHierarchy, TicketHierarchyWithDetails, TicketRelationshipType } from '@/types/entities'

/**
 * Create parent-child relationship
 */
export async function linkTickets(
  parentTicketId: number,
  childTicketId: number,
  relationshipType: TicketRelationshipType = 'subtask',
  createdBy?: number
): Promise<TicketHierarchy> {
  // Prevent self-referencing
  if (parentTicketId === childTicketId) {
    throw new Error('A ticket cannot be its own parent')
  }

  // Check for circular relationships
  const hasCircular = await checkCircularRelationship(parentTicketId, childTicketId)
  if (hasCircular) {
    throw new Error('Circular relationship detected - this would create an infinite loop')
  }

  const result = await sql`
    INSERT INTO ticket_hierarchy (
      parent_ticket_id,
      child_ticket_id,
      relationship_type,
      created_by
    ) VALUES (
      ${parentTicketId},
      ${childTicketId},
      ${relationshipType},
      ${createdBy}
    )
    ON CONFLICT (parent_ticket_id, child_ticket_id, relationship_type)
    DO NOTHING
    RETURNING *
  `

  if (result.rows.length === 0) {
    throw new Error('Relationship already exists')
  }

  return result.rows[0] as TicketHierarchy
}

/**
 * Check for circular relationships (prevent infinite loops)
 */
async function checkCircularRelationship(
  parentTicketId: number,
  childTicketId: number
): Promise<boolean> {
  const result = await sql`
    WITH RECURSIVE ticket_tree AS (
      SELECT parent_ticket_id, child_ticket_id, 1 as depth
      FROM ticket_hierarchy
      WHERE child_ticket_id = ${parentTicketId}
      
      UNION ALL
      
      SELECT th.parent_ticket_id, th.child_ticket_id, tt.depth + 1
      FROM ticket_hierarchy th
      JOIN ticket_tree tt ON th.child_ticket_id = tt.parent_ticket_id
      WHERE tt.depth < 10
    )
    SELECT EXISTS (
      SELECT 1 FROM ticket_tree WHERE parent_ticket_id = ${childTicketId}
    ) as has_circular
  `

  return result.rows[0]?.has_circular || false
}

/**
 * Get all children for a parent ticket
 */
export async function getTicketChildren(
  parentTicketId: number,
  relationshipType?: TicketRelationshipType
): Promise<TicketHierarchyWithDetails[]> {
  const typeFilter = relationshipType 
    ? sql`AND th.relationship_type = ${relationshipType}`
    : sql``

  const result = await sql`
    SELECT 
      th.*,
      parent.ticket_id as parent_ticket_number,
      parent.title as parent_title,
      child.ticket_id as child_ticket_number,
      child.title as child_title,
      ts.code as child_status_code,
      ts.name as child_status_name,
      creator.full_name as created_by_name
    FROM ticket_hierarchy th
    JOIN tickets parent ON parent.id = th.parent_ticket_id
    JOIN tickets child ON child.id = th.child_ticket_id
    JOIN ticket_statuses ts ON ts.id = child.status_id
    LEFT JOIN users creator ON creator.id = th.created_by
    WHERE th.parent_ticket_id = ${parentTicketId}
    ${typeFilter}
    ORDER BY th.created_at ASC
  `

  return result.rows as TicketHierarchyWithDetails[]
}

/**
 * Get all parents for a child ticket
 */
export async function getTicketParents(childTicketId: number): Promise<TicketHierarchyWithDetails[]> {
  const result = await sql`
    SELECT 
      th.*,
      parent.ticket_id as parent_ticket_number,
      parent.title as parent_title,
      child.ticket_id as child_ticket_number,
      child.title as child_title,
      ts.code as parent_status_code,
      ts.name as parent_status_name,
      creator.full_name as created_by_name
    FROM ticket_hierarchy th
    JOIN tickets parent ON parent.id = th.parent_ticket_id
    JOIN tickets child ON child.id = th.child_ticket_id
    JOIN ticket_statuses ts ON ts.id = parent.status_id
    LEFT JOIN users creator ON creator.id = th.created_by
    WHERE th.child_ticket_id = ${childTicketId}
    ORDER BY th.created_at ASC
  `

  return result.rows as TicketHierarchyWithDetails[]
}

/**
 * Get complete ticket tree (all descendants)
 */
export async function getTicketTree(rootTicketId: number): Promise<TicketHierarchyWithDetails[]> {
  const result = await sql`
    WITH RECURSIVE ticket_tree AS (
      -- Base case: direct children
      SELECT 
        th.*,
        1 as depth,
        ARRAY[th.parent_ticket_id, th.child_ticket_id] as path
      FROM ticket_hierarchy th
      WHERE th.parent_ticket_id = ${rootTicketId}
      
      UNION ALL
      
      -- Recursive case: children of children
      SELECT 
        th.*,
        tt.depth + 1,
        tt.path || th.child_ticket_id
      FROM ticket_hierarchy th
      JOIN ticket_tree tt ON th.parent_ticket_id = tt.child_ticket_id
      WHERE tt.depth < 10 -- Prevent infinite loops
    )
    SELECT 
      tt.*,
      parent.ticket_id as parent_ticket_number,
      parent.title as parent_title,
      child.ticket_id as child_ticket_number,
      child.title as child_title,
      creator.full_name as created_by_name
    FROM ticket_tree tt
    JOIN tickets parent ON parent.id = tt.parent_ticket_id
    JOIN tickets child ON child.id = tt.child_ticket_id
    LEFT JOIN users creator ON creator.id = tt.created_by
    ORDER BY tt.depth, tt.created_at
  `

  return result.rows as TicketHierarchyWithDetails[]
}

/**
 * Remove ticket relationship
 */
export async function unlinkTickets(
  parentTicketId: number,
  childTicketId: number,
  relationshipType?: TicketRelationshipType
): Promise<void> {
  const typeFilter = relationshipType 
    ? sql`AND relationship_type = ${relationshipType}`
    : sql``

  await sql`
    DELETE FROM ticket_hierarchy
    WHERE 
      parent_ticket_id = ${parentTicketId}
      AND child_ticket_id = ${childTicketId}
      ${typeFilter}
  `
}

/**
 * Get ticket relationship statistics
 */
export async function getTicketRelationshipStats(ticketId: number): Promise<{
  parent_count: number
  child_count: number
  subtask_count: number
  related_count: number
  blocks_count: number
}> {
  const result = await sql`
    SELECT 
      (SELECT COUNT(*) FROM ticket_hierarchy WHERE child_ticket_id = ${ticketId}) as parent_count,
      (SELECT COUNT(*) FROM ticket_hierarchy WHERE parent_ticket_id = ${ticketId}) as child_count,
      (SELECT COUNT(*) FROM ticket_hierarchy WHERE parent_ticket_id = ${ticketId} AND relationship_type = 'subtask') as subtask_count,
      (SELECT COUNT(*) FROM ticket_hierarchy WHERE parent_ticket_id = ${ticketId} AND relationship_type = 'related') as related_count,
      (SELECT COUNT(*) FROM ticket_hierarchy WHERE parent_ticket_id = ${ticketId} AND relationship_type = 'blocks') as blocks_count
  `

  return result.rows[0] as {
    parent_count: number
    child_count: number
    subtask_count: number
    related_count: number
    blocks_count: number
  }
}
