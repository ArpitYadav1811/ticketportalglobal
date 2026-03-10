// Run: node scripts/run-032-superadmin-migration.js
// This script creates the system_audit_log table for the superadmin feature

require('dotenv').config({ path: '.env.local' })

const { Client } = require('pg')

async function run() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Step 1: Create system_audit_log table
    console.log('\n📋 Step 1: Creating system_audit_log table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_audit_log (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        performed_by_name VARCHAR(255),
        notes TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('   ✅ system_audit_log table created (or already exists)')

    // Step 2: Create indexes
    console.log('\n📋 Step 2: Creating indexes...')
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_audit_action ON system_audit_log(action_type)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_audit_entity ON system_audit_log(entity_type, entity_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_audit_performed_by ON system_audit_log(performed_by)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_audit_created_at ON system_audit_log(created_at DESC)`)
    console.log('   ✅ Indexes created')

    // Step 3: Show current superadmin count
    const superadminResult = await client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'`)
    console.log(`\n📊 Current superadmin users: ${superadminResult.rows[0].count}`)

    // Step 4: Show current admin users (candidates for promotion)
    const adminResult = await client.query(`SELECT id, email, full_name, role FROM users WHERE role = 'admin' ORDER BY id`)
    if (adminResult.rows.length > 0) {
      console.log('\n👥 Current admin users (can be promoted to superadmin):')
      adminResult.rows.forEach(u => {
        console.log(`   ID: ${u.id} | ${u.full_name} | ${u.email} | Role: ${u.role}`)
      })
      console.log('\n💡 To promote an admin to superadmin, run:')
      console.log(`   UPDATE users SET role = 'superadmin' WHERE email = '<email>';`)
    } else {
      console.log('\n⚠️  No admin users found. Create one first.')
    }

    // Step 5: Promote user to superadmin (change email if needed)
    const promoteEmail = 'arpit.yadav@mfilterit.com'
    console.log(`\n📋 Step 5: Promoting ${promoteEmail} to superadmin...`)
    const promoteResult = await client.query(
      `UPDATE users SET role = 'superadmin', updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING id, email, full_name, role`,
      [promoteEmail]
    )
    if (promoteResult.rows.length > 0) {
      const u = promoteResult.rows[0]
      console.log(`   ✅ Promoted: ${u.full_name} (${u.email}) → ${u.role}`)
    } else {
      console.log(`   ⚠️  No user found with email: ${promoteEmail}`)
    }

    console.log('\n✅ Migration complete!')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

run()
