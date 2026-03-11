// Run: node scripts/run-034-secondary-spoc-migration.js
// This script adds secondary SPOC support to business_unit_groups table

require('dotenv').config({ path: '.env.local' })

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function run() {
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
    console.log('✅ Connected to database')

    // Read and execute the migration SQL file
    const sqlFilePath = path.join(__dirname, '034-add-secondary-spoc.sql')
    console.log(`\n📋 Running migration: 034-add-secondary-spoc.sql`)
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8')
    await client.query(sql)
    
    console.log('   ✅ Migration executed successfully')

    // Verify the changes
    console.log('\n📊 Verifying changes...')
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total_groups,
        COUNT(CASE WHEN spoc_name IS NOT NULL OR primary_spoc_name IS NOT NULL THEN 1 END) as groups_with_primary,
        COUNT(CASE WHEN secondary_spoc_name IS NOT NULL THEN 1 END) as groups_with_secondary
      FROM business_unit_groups
    `)
    
    const stats = verifyResult.rows[0]
    console.log(`   Total business groups: ${stats.total_groups}`)
    console.log(`   Groups with Primary SPOC: ${stats.groups_with_primary}`)
    console.log(`   Groups with Secondary SPOC: ${stats.groups_with_secondary}`)

    // Show sample data
    console.log('\n📋 Sample Business Groups with SPOCs:')
    const sampleResult = await client.query(`
      SELECT 
        name,
        spoc_name as primary_spoc,
        secondary_spoc_name as secondary_spoc
      FROM business_unit_groups
      WHERE spoc_name IS NOT NULL OR secondary_spoc_name IS NOT NULL
      ORDER BY name
      LIMIT 10
    `)
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach(bg => {
        console.log(`   ${bg.name}:`)
        console.log(`     Primary: ${bg.primary_spoc || '—'}`)
        console.log(`     Secondary: ${bg.secondary_spoc || '—'}`)
      })
    } else {
      console.log('   No business groups with SPOCs found')
    }

    console.log('\n✅ Migration complete!')
    console.log('\n💡 Next steps:')
    console.log('   1. The Admin Dashboard now supports dual SPOC management')
    console.log('   2. Primary SPOC can update Secondary SPOC')
    console.log('   3. Secondary SPOC cannot update Primary SPOC')
    console.log('   4. Super Admins and Admins can update both SPOCs')

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Some columns may already exist. This is normal if running the migration multiple times.')
    }
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

run()
