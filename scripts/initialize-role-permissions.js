/**
 * Initialize Role Permissions System
 * 
 * This script:
 * 1. Creates the role_permissions table if it doesn't exist
 * 2. Initializes default permissions for all roles
 * 
 * Run this once after deploying the role_permissions table migration.
 * 
 * Usage: node scripts/initialize-role-permissions.js
 */

const { Client } = require('pg')
const fs = require("fs")
const path = require("path")
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!databaseUrl) {
  console.error("❌ Error: DATABASE_URL or POSTGRES_URL environment variable is required")
  console.error("\nPlease set DATABASE_URL in .env.local file")
  process.exit(1)
}

const client = new Client({
  connectionString: databaseUrl,
})

async function initializeRolePermissions() {
  try {
    console.log("🚀 Initializing Role Permissions System...\n")

    // Connect to database
    await client.connect()
    console.log("✓ Connected to database\n")

    // 1. Create table if it doesn't exist
    console.log("📋 Step 1: Creating role_permissions table...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        permission_key VARCHAR(100) NOT NULL,
        permission_value TEXT,
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role, permission_key)
      )
    `)
    console.log("✅ Table created/verified\n")

    // 2. Create indexes
    console.log("📋 Step 2: Creating indexes...")
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON role_permissions(permission_key)
    `)
    console.log("✅ Indexes created\n")

    // 3. Load default permissions from the proposal document
    console.log("📋 Step 3: Loading default permissions...")
    
    // Default permissions for each role
    const defaultPermissions = {
      superadmin: {
        "tickets.view_scope": "all",
        "tickets.view_all_tickets": true,
        "tickets.edit_all": true,
        "tickets.edit_title": true,
        "tickets.edit_description": true,
        "tickets.edit_category": true,
        "tickets.edit_project": true,
        "tickets.delete_all": true,
        "tickets.soft_delete": true,
        "tickets.hard_delete": true,
        "tickets.assign_tickets": true,
        "tickets.assign_to_own_group": true,
        "tickets.assign_to_any_group": true,
        "tickets.assign_to_self": true,
        "tickets.reassign_tickets": true,
        "tickets.unassign_tickets": true,
        "tickets.redirect_tickets": true,
        "tickets.redirect_to_own_group": true,
        "tickets.redirect_to_any_group": true,
        "tickets.redirect_from_own_group": true,
        "tickets.redirect_from_any_group": true,
        "tickets.change_status": JSON.stringify(["open", "on-hold", "resolved", "closed", "deleted"]),
        "tickets.change_to_open": true,
        "tickets.change_to_on_hold": true,
        "tickets.change_to_resolved": true,
        "tickets.change_to_closed": true,
        "tickets.change_to_deleted": true,
        "tickets.reopen_tickets": true,
        "tickets.add_comments": true,
        "tickets.edit_comments": true,
        "tickets.delete_comments": true,
        "tickets.delete_any_comment": true,
        "tickets.upload_attachments": true,
        "tickets.delete_attachments": true,
        "tickets.delete_any_attachment": true,
        "tickets.create_tickets": true,
        "tickets.create_internal_tickets": true,
        "tickets.create_customer_tickets": true,
        "tickets.view_audit_log": true,
        "tickets.export_tickets": true,
        "analytics.view_scope": "all_groups",
        "analytics.view_own_group": true,
        "analytics.view_spoc_groups": true,
        "analytics.view_initiator_groups": true,
        "analytics.view_spoc_or_initiator": true,
        "analytics.view_team_member_groups": true,
        "analytics.view_team_spoc_groups": true,
        "analytics.view_combined": true,
        "analytics.view_all_groups": true,
        "analytics.export_data": true,
        "analytics.group_selector_enabled": true,
        "features.admin_dashboard": true,
        "features.user_management": true,
        "features.master_data": true,
        "features.teams": true,
        "features.analytics": true,
        "features.settings": true,
        "features.audit_logs": true,
        "business_groups.view_all": true,
        "business_groups.manage_all": true
      },
      admin: {
        "tickets.view_scope": "all_groups",
        "tickets.view_all_tickets": true,
        "tickets.edit_all": true,
        "tickets.edit_title": true,
        "tickets.edit_description": true,
        "tickets.edit_category": true,
        "tickets.edit_project": true,
        "tickets.delete_all": false,
        "tickets.soft_delete": true,
        "tickets.hard_delete": false,
        "tickets.assign_tickets": true,
        "tickets.assign_to_own_group": true,
        "tickets.assign_to_any_group": true,
        "tickets.assign_to_self": true,
        "tickets.reassign_tickets": true,
        "tickets.unassign_tickets": true,
        "tickets.redirect_tickets": true,
        "tickets.redirect_to_own_group": true,
        "tickets.redirect_to_any_group": true,
        "tickets.redirect_from_own_group": true,
        "tickets.redirect_from_any_group": true,
        "tickets.change_status": JSON.stringify(["open", "on-hold", "resolved", "closed"]),
        "tickets.change_to_open": true,
        "tickets.change_to_on_hold": true,
        "tickets.change_to_resolved": true,
        "tickets.change_to_closed": true,
        "tickets.change_to_deleted": false,
        "tickets.reopen_tickets": true,
        "tickets.add_comments": true,
        "tickets.edit_comments": true,
        "tickets.delete_comments": true,
        "tickets.delete_any_comment": true,
        "tickets.upload_attachments": true,
        "tickets.delete_attachments": true,
        "tickets.delete_any_attachment": true,
        "tickets.create_tickets": true,
        "tickets.create_internal_tickets": true,
        "tickets.create_customer_tickets": true,
        "tickets.view_audit_log": true,
        "tickets.export_tickets": true,
        "analytics.view_scope": "all_groups",
        "analytics.view_own_group": true,
        "analytics.view_spoc_groups": true,
        "analytics.view_initiator_groups": true,
        "analytics.view_spoc_or_initiator": true,
        "analytics.view_team_member_groups": true,
        "analytics.view_team_spoc_groups": true,
        "analytics.view_combined": true,
        "analytics.view_all_groups": true,
        "analytics.export_data": true,
        "analytics.group_selector_enabled": true,
        "features.admin_dashboard": false,
        "features.user_management": true,
        "features.master_data": true,
        "features.teams": true,
        "features.analytics": true,
        "features.settings": true,
        "features.audit_logs": false,
        "business_groups.view_all": true,
        "business_groups.manage_all": true
      },
      manager: {
        "tickets.view_scope": "own_group",
        "tickets.view_own_created": true,
        "tickets.view_own_assigned": true,
        "tickets.view_group_tickets": true,
        "tickets.edit_group": true,
        "tickets.edit_title": false,
        "tickets.edit_description": false,
        "tickets.edit_category": true,
        "tickets.edit_project": true,
        "tickets.delete_own": true,
        "tickets.soft_delete": true,
        "tickets.hard_delete": false,
        "tickets.assign_tickets": true,
        "tickets.assign_to_own_group": true,
        "tickets.assign_to_any_group": false,
        "tickets.assign_to_self": true,
        "tickets.reassign_tickets": true,
        "tickets.unassign_tickets": true,
        "tickets.redirect_tickets": true,
        "tickets.redirect_to_own_group": true,
        "tickets.redirect_to_any_group": false,
        "tickets.redirect_from_own_group": true,
        "tickets.redirect_from_any_group": false,
        "tickets.change_status": JSON.stringify(["on-hold", "resolved"]),
        "tickets.change_to_open": false,
        "tickets.change_to_on_hold": true,
        "tickets.change_to_resolved": true,
        "tickets.change_to_closed": false,
        "tickets.change_to_deleted": false,
        "tickets.reopen_tickets": false,
        "tickets.add_comments": true,
        "tickets.edit_comments": true,
        "tickets.delete_comments": true,
        "tickets.delete_any_comment": false,
        "tickets.upload_attachments": true,
        "tickets.delete_attachments": true,
        "tickets.delete_any_attachment": false,
        "tickets.create_tickets": true,
        "tickets.create_internal_tickets": true,
        "tickets.create_customer_tickets": true,
        "tickets.view_audit_log": true,
        "tickets.export_tickets": false,
        "analytics.view_scope": "combined",
        "analytics.view_own_group": true,
        "analytics.view_spoc_groups": true,
        "analytics.view_initiator_groups": true,
        "analytics.view_spoc_or_initiator": true,
        "analytics.view_team_member_groups": false,
        "analytics.view_team_spoc_groups": false,
        "analytics.view_combined": true,
        "analytics.view_other_groups": false,
        "analytics.view_all_groups": false,
        "analytics.export_data": false,
        "analytics.group_selector_enabled": false,
        "features.admin_dashboard": false,
        "features.user_management": false,
        "features.master_data": false,
        "features.teams": false,
        "features.analytics": true,
        "features.settings": false,
        "features.audit_logs": false,
        "business_groups.view_own": true,
        "business_groups.manage_own": false
      },
      user: {
        "tickets.view_scope": "own",
        "tickets.view_own_created": true,
        "tickets.view_own_assigned": true,
        "tickets.edit_own": true,
        "tickets.edit_title": true,
        "tickets.edit_description": true,
        "tickets.edit_category": false,
        "tickets.edit_project": false,
        "tickets.delete_own": true,
        "tickets.soft_delete": true,
        "tickets.hard_delete": false,
        "tickets.assign_tickets": false,
        "tickets.assign_to_own_group": false,
        "tickets.assign_to_any_group": false,
        "tickets.assign_to_self": false,
        "tickets.reassign_tickets": false,
        "tickets.unassign_tickets": false,
        "tickets.redirect_tickets": false,
        "tickets.redirect_to_own_group": false,
        "tickets.redirect_to_any_group": false,
        "tickets.redirect_from_own_group": false,
        "tickets.redirect_from_any_group": false,
        "tickets.change_status": JSON.stringify(["closed"]),
        "tickets.change_to_open": false,
        "tickets.change_to_on_hold": false,
        "tickets.change_to_resolved": false,
        "tickets.change_to_closed": true,
        "tickets.change_to_deleted": false,
        "tickets.reopen_tickets": false,
        "tickets.add_comments": true,
        "tickets.edit_comments": true,
        "tickets.delete_comments": true,
        "tickets.delete_any_comment": false,
        "tickets.upload_attachments": true,
        "tickets.delete_attachments": true,
        "tickets.delete_any_attachment": false,
        "tickets.create_tickets": true,
        "tickets.create_internal_tickets": true,
        "tickets.create_customer_tickets": true,
        "tickets.view_audit_log": true,
        "tickets.export_tickets": false,
        "analytics.view_scope": "spoc_or_initiator",
        "analytics.view_own_group": true,
        "analytics.view_spoc_groups": false,
        "analytics.view_initiator_groups": true,
        "analytics.view_spoc_or_initiator": true,
        "analytics.view_team_member_groups": false,
        "analytics.view_team_spoc_groups": false,
        "analytics.view_combined": false,
        "analytics.view_other_groups": false,
        "analytics.view_all_groups": false,
        "analytics.export_data": false,
        "analytics.group_selector_enabled": false,
        "features.admin_dashboard": false,
        "features.user_management": false,
        "features.master_data": false,
        "features.teams": false,
        "features.analytics": true,
        "features.settings": false,
        "features.audit_logs": false,
        "business_groups.view_own": true,
        "business_groups.manage_own": false
      }
    }

    // 4. Insert default permissions for each role
    console.log("📋 Step 4: Inserting default permissions...")
    
    for (const [role, permissions] of Object.entries(defaultPermissions)) {
      console.log(`   Setting permissions for role: ${role}...`)
      
      // Delete existing permissions for this role
      await client.query('DELETE FROM role_permissions WHERE role = $1', [role])
      
      // Insert new permissions
      for (const [key, value] of Object.entries(permissions)) {
        let permissionValue = value
        if (typeof value === 'object') {
          permissionValue = JSON.stringify(value)
        } else if (typeof value === 'boolean') {
          permissionValue = value.toString()
        } else {
          permissionValue = String(value)
        }

        await client.query(
          `INSERT INTO role_permissions (role, permission_key, permission_value, is_enabled, updated_at)
           VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)`,
          [role, key, permissionValue]
        )
      }
      
      console.log(`   ✅ ${Object.keys(permissions).length} permissions set for ${role}`)
    }

    console.log("\n✅ Role permissions initialized successfully!")
    console.log("\n📊 Summary:")
    for (const role of Object.keys(defaultPermissions)) {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM role_permissions WHERE role = $1',
        [role]
      )
      console.log(`   ${role}: ${result.rows[0].count} permissions`)
    }
    
    console.log("\n🎉 All done! You can now manage permissions via the Admin Dashboard.")
    
  } catch (error) {
    console.error("\n❌ Error initializing role permissions:", error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run the initialization
initializeRolePermissions()
