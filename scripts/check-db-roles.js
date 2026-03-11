// Run: node scripts/check-db-roles.js
// This script shows all roles that actually exist in the database

require('dotenv').config({ path: '.env.local' })

const { Client } = require('pg')

async function checkRoles() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  const client = new Client({ 
    connectionString: dbUrl, 
    ssl: { rejectUnauthorized: false } 
  })

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Get all distinct roles from the database
    console.log('📋 Fetching roles from database...\n')
    const rolesResult = await client.query(`
      SELECT DISTINCT role, COUNT(*) as user_count
      FROM users
      WHERE role IS NOT NULL
      GROUP BY role
      ORDER BY role ASC
    `)

    if (rolesResult.rows.length === 0) {
      console.log('⚠️  No roles found in the database')
    } else {
      console.log('═══════════════════════════════════════════════════════════')
      console.log('                    DATABASE ROLES                          ')
      console.log('═══════════════════════════════════════════════════════════\n')
      
      rolesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.role.padEnd(20)} (${row.user_count} user${row.user_count !== 1 ? 's' : ''})`)
      })
      
      console.log('\n═══════════════════════════════════════════════════════════')
      console.log(`Total unique roles: ${rolesResult.rows.length}\n`)
    }

    // Show users by role
    console.log('📊 Users by Role:\n')
    for (const row of rolesResult.rows) {
      const usersResult = await client.query(`
        SELECT id, email, full_name, role
        FROM users
        WHERE role = $1
        ORDER BY full_name ASC
      `, [row.role])
      
      console.log(`\n${row.role.toUpperCase()} (${usersResult.rows.length} user${usersResult.rows.length !== 1 ? 's' : ''}):`)
      console.log('─'.repeat(60))
      if (usersResult.rows.length > 0) {
        usersResult.rows.forEach(user => {
          console.log(`  • ${user.full_name.padEnd(30)} (${user.email})`)
        })
      } else {
        console.log('  (No users)')
      }
    }

    // Check role column type
    console.log('\n\n🔍 Database Schema Info:\n')
    const schemaResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    `)
    
    if (schemaResult.rows.length > 0) {
      const col = schemaResult.rows[0]
      console.log('Role Column Type:')
      console.log(`  Data Type: ${col.data_type}`)
      console.log(`  Max Length: ${col.character_maximum_length || 'N/A'}`)
      console.log(`  Default: ${col.column_default || 'N/A'}`)
      console.log(`  Nullable: ${col.is_nullable}`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

checkRoles()
