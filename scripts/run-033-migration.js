/**
 * Run Role Permissions Table Migration
 * 
 * This script runs the SQL migration to create the role_permissions table.
 * 
 * Usage: node scripts/run-033-migration.js
 */

const { Client } = require('pg')
const fs = require("fs")
const path = require("path")
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  })

  try {
    console.log("🚀 Running Role Permissions Table Migration...\n")

    // Get database URL
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

    if (!databaseUrl) {
      console.error("❌ Error: DATABASE_URL or POSTGRES_URL environment variable is required")
      console.error("\nPlease set DATABASE_URL in .env.local file")
      process.exit(1)
    }

    console.log("✓ Database URL found")
    console.log("✓ Connecting to database...\n")

    await client.connect()
    console.log("✓ Database connection successful!\n")

    // Read SQL file
    const sqlFilePath = path.join(__dirname, "033-create-role-permissions-table.sql")
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ SQL file not found: ${sqlFilePath}`)
      process.exit(1)
    }

    console.log("📄 Reading SQL file...")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf-8")

    // Execute the entire SQL file
    try {
      console.log("   Executing SQL migration...")
      await client.query(sqlContent)
      console.log("   ✅ SQL migration executed successfully")
    } catch (err) {
      // Ignore "already exists" errors (idempotent)
      if (err.message.includes('already exists') || 
          err.message.includes('duplicate key') ||
          err.message.includes('relation already exists') ||
          err.message.includes('already exists')) {
        console.log("   ⚠️  Some objects already exist (this is okay)")
      } else {
        console.error(`   ❌ Error executing migration:`, err.message)
        throw err
      }
    }

    // Verify table was created
    console.log("\n🔍 Verifying table creation...")
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissions'
      )
    `)

    if (tableCheck.rows[0].exists) {
      console.log("✅ Table 'role_permissions' created successfully!")
      
      // Check indexes
      const indexCheck = await client.query(`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'role_permissions'
      `)
      console.log(`✅ Found ${indexCheck.rows.length} indexes`)
      
      console.log("\n🎉 Migration completed successfully!")
      console.log("\n📋 Next Steps:")
      console.log("   1. Run: node scripts/initialize-role-permissions.js")
      console.log("   2. This will populate default permissions for all roles")
      console.log("   3. Then access Role Permissions in Admin Dashboard (Super Admin only)")
    } else {
      console.error("❌ Table verification failed - table was not created")
      process.exit(1)
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run the migration
runMigration()
