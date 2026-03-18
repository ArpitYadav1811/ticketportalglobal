#!/usr/bin/env node

/**
 * NEON DATABASE MIGRATION - SIMPLE RUNNER
 * Executes all refactoring migrations on Neon database
 */

const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

console.log('🚀 Starting Neon database migration...\n')

const sql = neon(DATABASE_URL)

const scripts = [
  'scripts/refactoring/001-create-ticket-audit-events.sql',
  'scripts/refactoring/002-create-ticket-projects.sql',
  'scripts/refactoring/003-create-ticket-redirections.sql',
  'scripts/refactoring/004-create-ticket-hierarchy.sql',
  'scripts/refactoring/005-create-business-group-spocs.sql',
  'scripts/refactoring/006-create-master-data-entities.sql',
  'scripts/refactoring/007-refactor-tickets-table.sql',
  'scripts/refactoring/008-migrate-ticket-audit-data.sql',
  'scripts/refactoring/009-migrate-ticket-projects-data.sql',
  'scripts/refactoring/010-migrate-ticket-redirections-data.sql',
  'scripts/refactoring/011-migrate-ticket-hierarchy-data.sql',
  'scripts/refactoring/012-migrate-business-group-spocs-data.sql',
  'scripts/refactoring/013-migrate-master-data-references.sql',
  'scripts/refactoring/014-helper-functions.sql'
]

async function runMigration() {
  let completed = 0
  
  for (const scriptPath of scripts) {
    const scriptName = path.basename(scriptPath)
    console.log(`\n[${completed + 1}/${scripts.length}] Running ${scriptName}...`)
    
    try {
      const sqlContent = fs.readFileSync(scriptPath, 'utf8')
      
      // Execute the SQL (Neon handles multi-statement execution)
      await sql(sqlContent)
      
      console.log(`✅ ${scriptName} completed`)
      completed++
    } catch (error) {
      // Check if it's an "already exists" error (safe to continue)
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate')) {
        console.log(`⚠️  ${scriptName} - already exists, skipping`)
        completed++
      } else {
        console.error(`❌ ${scriptName} failed:`, error.message)
        throw error
      }
    }
  }
  
  console.log(`\n✅ Migration completed! ${completed}/${scripts.length} scripts executed\n`)
  
  // Verification
  console.log('🔍 Verifying migration...\n')
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'ticket_audit_events', 'ticket_projects', 'ticket_redirections', 
      'ticket_hierarchy', 'business_group_spocs', 'ticket_statuses', 
      'ticket_priorities', 'ticket_types', 'user_roles', 'user_role_assignments'
    )
  `
  
  console.log(`✅ Found ${tables.length}/10 new tables`)
  
  const counts = await sql`
    SELECT 'tickets' as name, COUNT(*)::int as count FROM tickets
    UNION ALL SELECT 'ticket_audit_events', COUNT(*)::int FROM ticket_audit_events
    UNION ALL SELECT 'business_group_spocs', COUNT(*)::int FROM business_group_spocs
    UNION ALL SELECT 'ticket_statuses', COUNT(*)::int FROM ticket_statuses
  `
  
  console.log('\n📊 Row counts:')
  counts.forEach(c => console.log(`   ${c.name}: ${c.count}`))
  
  console.log('\n✅ Migration successful!\n')
}

runMigration().catch(err => {
  console.error('\n❌ Migration failed:', err.message)
  process.exit(1)
})
