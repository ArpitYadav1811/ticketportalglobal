"use server"

import { sql } from "@/lib/db"

// Personal team members management - for the "My Team" feature in Settings
// This allows users to designate other users as "their team" for ticket visibility

export async function getMyTeamMembers(userId: number) {
  try {
    // Get users that this user has added to their personal team
    const result = await sql`
      SELECT
        u.id,
        u.full_name as name,
        u.email,
        u.business_unit_group_id,
        bug.name as group_name,
        mtm.id as team_member_id,
        mtm.role
      FROM my_team_members mtm
      JOIN users u ON mtm.member_user_id = u.id
      LEFT JOIN business_unit_groups bug ON u.business_unit_group_id = bug.id
      WHERE mtm.lead_user_id = ${userId}
      ORDER BY u.full_name ASC
    `
    return { success: true, data: result }
  } catch (error: any) {
    // If table doesn't exist, create it
    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      await sql`
      CREATE TABLE IF NOT EXISTS my_team_members (
        id SERIAL PRIMARY KEY,
        lead_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' NOT NULL CHECK (role IN ('lead', 'member')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lead_user_id, member_user_id)
      )
    `
    return { success: true, data: [] }
    }
    console.error("Error fetching my team members:", error)
    return { success: false, error: "Failed to fetch team members", data: [] }
  }
}

export async function addMyTeamMember(leadUserId: number, memberUserId: number, role: 'lead' | 'member' = 'member') {
  try {
    // Ensure table exists first
    await sql`
      CREATE TABLE IF NOT EXISTS my_team_members (
        id SERIAL PRIMARY KEY,
        lead_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' NOT NULL CHECK (role IN ('lead', 'member')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lead_user_id, member_user_id)
      )
    `

    // Check if already exists
    const existing = await sql`
      SELECT id FROM my_team_members
      WHERE lead_user_id = ${leadUserId} AND member_user_id = ${memberUserId}
    `

    if (existing.length > 0) {
      return { success: false, error: "User is already in your team" }
    }

    const result = await sql`
      INSERT INTO my_team_members (lead_user_id, member_user_id, role)
      VALUES (${leadUserId}, ${memberUserId}, ${role})
      RETURNING id
    `

    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: "User is already in your team" }
    }
    console.error("Error adding team member:", error)
    return { success: false, error: "Failed to add team member" }
  }
}

export async function removeMyTeamMember(leadUserId: number, teamMemberId: number) {
  try {
    const result = await sql`
      DELETE FROM my_team_members
      WHERE id = ${teamMemberId} AND lead_user_id = ${leadUserId}
      RETURNING id
    `

    if (result.length === 0) {
      return { success: false, error: "Team member not found or unauthorized" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error removing team member:", error)
    return { success: false, error: "Failed to remove team member" }
  }
}

export async function getAvailableUsersForMyTeam(userId: number) {
  try {
    // Ensure table exists first
    await sql`
      CREATE TABLE IF NOT EXISTS my_team_members (
        id SERIAL PRIMARY KEY,
        lead_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' NOT NULL CHECK (role IN ('lead', 'member')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lead_user_id, member_user_id)
      )
    `

    // Get all users except the current user
    // Include a flag to indicate if they're already in the team
    const result = await sql`
      SELECT
        u.id,
        u.full_name as name,
        u.email,
        u.business_unit_group_id,
        bug.name as group_name,
        u.role,
        CASE
          WHEN mtm.id IS NOT NULL THEN true
          ELSE false
        END as is_in_team
      FROM users u
      LEFT JOIN business_unit_groups bug ON u.business_unit_group_id = bug.id
      LEFT JOIN my_team_members mtm ON mtm.member_user_id = u.id AND mtm.lead_user_id = ${userId}
      WHERE u.id != ${userId}
      ORDER BY u.full_name ASC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching available users:", error)
    return { success: false, error: "Failed to fetch users", data: [] }
  }
}

/**
 * Update the role of a team member
 */
export async function updateMyTeamMemberRole(leadUserId: number, memberUserId: number, role: 'lead' | 'member') {
  try {
    const result = await sql`
      UPDATE my_team_members
      SET role = ${role}
      WHERE lead_user_id = ${leadUserId} AND member_user_id = ${memberUserId}
      RETURNING id
    `

    if (result.length === 0) {
      return { success: false, error: "Team member not found" }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating team member role:", error)
    return { success: false, error: "Failed to update team member role" }
  }
}

/**
 * Check if a user is a lead of another user
 */
export async function isUserLeadOf(leadUserId: number, memberUserId: number): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM my_team_members
      WHERE lead_user_id = ${leadUserId} 
      AND member_user_id = ${memberUserId}
      AND role = 'lead'
    `
    return result.length > 0
  } catch (error) {
    console.error("Error checking lead status:", error)
    return false
  }
}

/**
 * Get all team members (any role) for a lead user
 */
export async function getAllTeamMembersForLead(leadUserId: number) {
  try {
    const result = await sql`
      SELECT member_user_id, role
      FROM my_team_members
      WHERE lead_user_id = ${leadUserId}
    `
    return result.map(r => ({ userId: r.member_user_id, role: r.role }))
  } catch (error) {
    console.error("Error fetching team members for lead:", error)
    return []
  }
}
