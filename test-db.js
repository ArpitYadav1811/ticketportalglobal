const { neon } = require('@neondatabase/serverless')
require('dotenv').config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL)

async function test() {
  console.log('Testing Neon connection...')
  const result = await sql`SELECT version()`
  console.log('✅ Connected to:', result[0].version.substring(0, 50))
  
  const tables = await sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
  console.log('✅ Found', tables[0].count, 'tables')
}

test().catch(console.error)
