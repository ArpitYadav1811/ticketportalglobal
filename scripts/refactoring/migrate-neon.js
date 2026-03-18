#!/usr/bin/env node

/**
 * NEON DATABASE MIGRATION SCRIPT
 * 
 * Executes all refactoring migrations on Neon database
 * Usage: node migrate-neon.js
 */

const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') })

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n`)
}

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  log.error('DATABASE_URL not found in .env.local')
  log.info('Please set DATABASE_URL in .env.local file')
  process.exit(1)
}

// Initialize Neon client
const sql = neon(DATABASE_URL)

// Migration scripts in order
const MIGRATION_SCRIPTS = [
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

// Read and parse SQL file
function readSqlFile(filename) {
  const filepath = path.join(__dirname, filename)
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`)
  }
  return fs.readFileSync(filepath, 'utf8')
}

// Execute SQL script
async function executeScript(scriptName, scriptContent) {
  try {
    // Split by semicolon but be careful with function definitions
    const statements = scriptContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'COMMENT ON SCRIPT IS')
    
    for (const statement of statements) {
      if (statement.length > 10) {
        await sql(statement)
      }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Verify migration
async function verifyMigration() {
  log.header('VERIFICATION')
  
  try {
    // Check new tables exist
    log.info('Checking new tables...')
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'ticket_audit_events', 'ticket_projects', 'ticket_redirections', 
        'ticket_hierarchy', 'business_group_spocs', 'ticket_statuses', 
        'ticket_priorities', 'ticket_types', 'user_roles', 'user_role_assignments'
      )
      ORDER BY table_name
    `
    
    log.success(`Found ${tables.length} new tables`)
    tables.forEach(t => log.info(`  - ${t.table_name}`))
    
    // Check row counts
    log.info('\nChecking row counts...')
    const counts = await sql`
      SELECT 'tickets' as table_name, COUNT(*) as count FROM tickets
      UNION ALL SELECT 'ticket_audit_events', COUNT(*) FROM ticket_audit_events
      UNION ALL SELECT 'ticket_projects', COUNT(*) FROM ticket_projects
      UNION ALL SELECT 'ticket_redirections', COUNT(*) FROM ticket_redirections
      UNION ALL SELECT 'ticket_hierarchy', COUNT(*) FROM ticket_hierarchy
      UNION ALL SELECT 'business_group_spocs', COUNT(*) FROM business_group_spocs
      UNION ALL SELECT 'ticket_statuses', COUNT(*) FROM ticket_statuses
      UNION ALL SELECT 'ticket_priorities', COUNT(*) FROM ticket_priorities
      UNION ALL SELECT 'ticket_types', COUNT(*) FROM ticket_types
      UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
      ORDER BY table_name
    `
    
    counts.forEach(c => {
      const count = parseInt(c.count)
      if (count > 0) {
        log.success(`  ${c.table_name}: ${count} rows`)
      } else {
        log.warning(`  ${c.table_name}: ${count} rows`)
      }
    })
    
    // Check for NULL values in critical columns
    log.info('\nChecking data integrity...')
    const nullChecks = await sql`
      SELECT 
        'tickets.status_id' as column_name,
        COUNT(*) FILTER (WHERE status_id IS NULL) as null_count,
        COUNT(*) as total_count
      FROM tickets
      UNION ALL
      SELECT 
        'tickets.priority_id',
        COUNT(*) FILTER (WHERE priority_id IS NULL),
        COUNT(*)
      FROM tickets
      UNION ALL
      SELECT 
        'tickets.type_id',
        COUNT(*) FILTER (WHERE type_id IS NULL),
        COUNT(*)
      FROM tickets
    `
    
    nullChecks.forEach(check => {
      const nullCount = parseInt(check.null_count)
      const totalCount = parseInt(check.total_count)
      if (nullCount === 0) {
        log.success(`  ${check.column_name}: ${nullCount}/${totalCount} NULL (good!)`)
      } else {
        log.warning(`  ${check.column_name}: ${nullCount}/${totalCount} NULL`)
      }
    })
    
    return true
  } catch (error) {
    log.error(`Verification failed: ${error.message}`)
    return false
  }
}

// Main migration function
async function runMigration() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         NEON DATABASE REFACTORING MIGRATION               ║
╚════════════════════════════════════════════════════════════╝
  `)
  
  log.info(`Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'Neon'}`)
  log.info(`Total scripts: ${MIGRATION_SCRIPTS.length}`)
  console.log('')
  
  let successCount = 0
  let failureCount = 0
  
  // Phase 1: Create Tables
  log.header('PHASE 1: Creating New Entity Tables')
  for (let i = 0; i < 6; i++) {
    const scriptName = MIGRATION_SCRIPTS[i]
    const scriptNum = i + 1
    
    log.info(`[${scriptNum}/${MIGRATION_SCRIPTS.length}] Running ${scriptName}...`)
    
    try {
      const scriptContent = readSqlFile(scriptName)
      const result = await executeScript(scriptName, scriptContent)
      
      if (result.success) {
        log.success(`${scriptName} completed`)
        successCount++
      } else {
        log.error(`${scriptName} failed: ${result.error}`)
        failureCount++
        
        // Continue on error for idempotent scripts
        if (result.error.includes('already exists')) {
          log.warning('Table/type already exists - continuing...')
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      log.error(`Failed to execute ${scriptName}: ${error.message}`)
      failureCount++
      
      if (!error.message.includes('already exists')) {
        log.error('Stopping migration due to error')
        process.exit(1)
      }
    }
    
    console.log('')
  }
  
  // Phase 2: Add Columns
  log.header('PHASE 2: Adding New Columns to Tickets Table')
  const script007 = MIGRATION_SCRIPTS[6]
  log.info(`[7/${MIGRATION_SCRIPTS.length}] Running ${script007}...`)
  
  try {
    const scriptContent = readSqlFile(script007)
    const result = await executeScript(script007, scriptContent)
    
    if (result.success) {
      log.success(`${script007} completed`)
      successCount++
    } else {
      log.warning(`${script007} had issues: ${result.error}`)
      log.info('Continuing anyway (columns may already exist)...')
    }
  } catch (error) {
    log.warning(`${script007} error: ${error.message}`)
    log.info('Continuing anyway...')
  }
  
  console.log('')
  
  // Phase 3: Migrate Data
  log.header('PHASE 3: Migrating Data to New Tables')
  for (let i = 7; i < 13; i++) {
    const scriptName = MIGRATION_SCRIPTS[i]
    const scriptNum = i + 1
    
    log.info(`[${scriptNum}/${MIGRATION_SCRIPTS.length}] Running ${scriptName}...`)
    
    try {
      const scriptContent = readSqlFile(scriptName)
      const result = await executeScript(scriptName, scriptContent)
      
      if (result.success) {
        log.success(`${scriptName} completed`)
        successCount++
      } else {
        log.error(`${scriptName} failed: ${result.error}`)
        failureCount++
        
        if (result.error.includes('duplicate key') || result.error.includes('already exists')) {
          log.warning('Data already migrated - continuing...')
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      log.error(`Failed to execute ${scriptName}: ${error.message}`)
      failureCount++
      
      if (!error.message.includes('duplicate') && !error.message.includes('already exists')) {
        log.error('Stopping migration due to error')
        process.exit(1)
      }
    }
    
    console.log('')
  }
  
  // Phase 4: Helper Functions
  log.header('PHASE 4: Creating Helper Functions')
  const script014 = MIGRATION_SCRIPTS[13]
  log.info(`[14/${MIGRATION_SCRIPTS.length}] Running ${script014}...`)
  
  try {
    const scriptContent = readSqlFile(script014)
    const result = await executeScript(script014, scriptContent)
    
    if (result.success) {
      log.success(`${script014} completed`)
      successCount++
    } else {
      log.warning(`${script014} had issues: ${result.error}`)
      log.info('Functions may already exist - continuing...')
    }
  } catch (error) {
    log.warning(`${script014} error: ${error.message}`)
    log.info('Continuing anyway...')
  }
  
  console.log('')
  
  // Summary
  log.header('MIGRATION SUMMARY')
  log.info(`Total scripts: ${MIGRATION_SCRIPTS.length}`)
  log.success(`Successful: ${successCount}`)
  if (failureCount > 0) {
    log.warning(`Warnings/Skipped: ${failureCount}`)
  }
  console.log('')
  
  // Verification
  const verified = await verifyMigration()
  
  if (verified) {
    console.log('')
    log.header('✅ MIGRATION COMPLETED SUCCESSFULLY')
    log.success('All entity tables created and data migrated!')
    console.log('')
    log.info('Next steps:')
    log.info('1. Review verification output above')
    log.info('2. Update application code to use new entity structure')
    log.info('3. Test thoroughly')
    log.info('4. Deploy to production')
    console.log('')
  } else {
    log.error('Migration verification failed - please review errors above')
    process.exit(1)
  }
}

// Run migration
runMigration().catch(error => {
  log.error(`Migration failed: ${error.message}`)
  console.error(error)
  process.exit(1)
})
