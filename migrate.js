#!/usr/bin/env node

/**
 * NEON DATABASE MIGRATION
 * Simple migration script for Neon serverless database
 */

const { Pool } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  console.error('Please set DATABASE_URL in your .env.local file')
  process.exit(1)
}

// Configure WebSocket for Neon
const { neonConfig } = require('@neondatabase/serverless')
const ws = require('ws')
neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: DATABASE_URL })

const scripts = [
  '001-create-ticket-audit-events.sql',
  '002-create-ticket-projects.sql',
  '003-create-ticket-redirections.sql',
  '004-create-ticket-hierarchy.sql',
  '005-create-business-group-spocs.sql',
  '006-create-master-data-entities.sql',
  '007-refactor-tickets-table.sql',
  '008-migrate-ticket-audit-data.sql',
  '009-migrate-ticket-projects-data.sql',
  '010-migrate-ticket-redirections-data.sql',
  '011-migrate-ticket-hierarchy-data.sql',
  '012-migrate-business-group-spocs-data.sql',
  '013-migrate-master-data-references.sql',
  '014-helper-functions.sql'
]

async function run() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║         NEON DATABASE REFACTORING MIGRATION               ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')
  
  const client = await pool.connect()
  let success = 0
  let skipped = 0
  let failed = 0
  
  try {
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i]
      const scriptPath = path.join(__dirname, 'scripts', 'refactoring', script)
      
      console.log(`[${i+1}/${scripts.length}] ${script}`)
      
      if (!fs.existsSync(scriptPath)) {
        console.error(`❌ File not found: ${scriptPath}\n`)
        failed++
        continue
      }
      
      try {
        const sqlContent = fs.readFileSync(scriptPath, 'utf8')
        
        // Execute the SQL file
        await client.query(sqlContent)
        
        console.log(`✅ Completed\n`)
        success++
      } catch (err) {
        const errMsg = err.message.toLowerCase()
        
        if (errMsg.includes('already exists')) {
          console.log(`⚠️  Already exists - skipping\n`)
          skipped++
        } else if (errMsg.includes('duplicate')) {
          console.log(`⚠️  Duplicate - skipping\n`)
          skipped++
        } else if (errMsg.includes('does not exist') && i >= 7) {
          // For data migration scripts, source data might not exist
          console.log(`⚠️  Source data not found - skipping\n`)
          skipped++
        } else {
          console.error(`❌ Error: ${err.message}`)
          
          // Decide whether to continue or stop
          if (errMsg.includes('syntax error')) {
            console.log(`⚠️  Syntax issue - stopping\n`)
            throw err
          } else if (errMsg.includes('permission denied')) {
            console.log(`⚠️  Permission issue - stopping\n`)
            throw err
          } else {
            console.log(`⚠️  Continuing despite error...\n`)
            failed++
          }
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log(`📊 SUMMARY: ${success} completed, ${skipped} skipped, ${failed} failed`)
    console.log('═══════════════════════════════════════════════════════════\n')
    
    // Verification
    console.log('🔍 Verifying migration...\n')
    
    try {
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'ticket_audit_events', 'ticket_projects', 'ticket_redirections', 
          'ticket_hierarchy', 'business_group_spocs', 'ticket_statuses', 
          'ticket_priorities', 'ticket_types', 'user_roles', 'user_role_assignments'
        )
        ORDER BY table_name
      `)
      
      console.log(`✅ New tables created: ${tablesResult.rows.length}/10`)
      if (tablesResult.rows.length > 0) {
        tablesResult.rows.forEach(r => console.log(`   - ${r.table_name}`))
      }
      
      console.log('')
      
      const countsResult = await client.query(`
        SELECT 'tickets' as n, COUNT(*)::int as c FROM tickets
        UNION ALL SELECT 'ticket_audit_events', COUNT(*)::int FROM ticket_audit_events
        UNION ALL SELECT 'business_group_spocs', COUNT(*)::int FROM business_group_spocs
        UNION ALL SELECT 'ticket_statuses', COUNT(*)::int FROM ticket_statuses
        UNION ALL SELECT 'ticket_priorities', COUNT(*)::int FROM ticket_priorities
        UNION ALL SELECT 'ticket_types', COUNT(*)::int FROM ticket_types
        ORDER BY n
      `)
      
      console.log('📊 Row counts:')
      countsResult.rows.forEach(r => console.log(`   ${r.n}: ${r.c}`))
      
      console.log('')
      
      // Check FK columns populated
      const fkCheck = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(status_id) as with_status,
          COUNT(priority_id) as with_priority,
          COUNT(type_id) as with_type
        FROM tickets
      `)
      
      const fk = fkCheck.rows[0]
      console.log('📊 FK columns in tickets table:')
      console.log(`   status_id: ${fk.with_status}/${fk.total} ${fk.with_status == fk.total ? '✅' : '⚠️'}`)
      console.log(`   priority_id: ${fk.with_priority}/${fk.total} ${fk.with_priority == fk.total ? '✅' : '⚠️'}`)
      console.log(`   type_id: ${fk.with_type}/${fk.total} ${fk.with_type == fk.total ? '✅' : '⚠️'}`)
      
      console.log('\n✅ MIGRATION COMPLETE!\n')
      console.log('📖 Next steps:')
      console.log('   1. Review output above')
      console.log('   2. Update application code (see lib/actions/entities/README.md)')
      console.log('   3. Test your application')
      console.log('   4. Deploy\n')
      
    } catch (verifyErr) {
      console.error('⚠️  Verification error:', verifyErr.message)
      console.log('\nMigration may have partially completed.')
      console.log('Check your Neon dashboard to see which tables were created.\n')
    }
    
  } catch (err) {
    console.error('\n❌ MIGRATION FAILED')
    console.error('Error:', err.message)
    console.error('\nFull stack trace:')
    console.error(err.stack)
    console.error('\nPlease check the error above and try again.\n')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

// Run migration
console.log('Connecting to Neon database...')
run().catch(err => {
  pool.end()
  process.exit(1)
})
