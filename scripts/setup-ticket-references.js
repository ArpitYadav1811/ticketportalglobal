#!/usr/bin/env node
/**
 * Creates the ticket_references table in the database.
 * Run: node scripts/setup-ticket-references.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found. Ensure .env.local exists.');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Connected to database');

  try {
    // Check if table exists
    const check = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ticket_references'
      ) as table_exists
    `);

    if (check.rows[0].table_exists) {
      console.log('✅ ticket_references table already exists');
    } else {
      console.log('🔨 Creating ticket_references table...');
      await client.query(`
        CREATE TABLE ticket_references (
          id SERIAL PRIMARY KEY,
          source_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          reference_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE(source_ticket_id, reference_ticket_id),
          CHECK (source_ticket_id <> reference_ticket_id)
        )
      `);
      console.log('✅ Table created');

      await client.query(`CREATE INDEX IF NOT EXISTS idx_ticket_ref_source ON ticket_references(source_ticket_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ticket_ref_reference ON ticket_references(reference_ticket_id)`);
      console.log('✅ Indexes created');
    }

    // Show row count
    const count = await client.query('SELECT COUNT(*) as cnt FROM ticket_references');
    console.log(`📊 Current rows in ticket_references: ${count.rows[0].cnt}`);

    // Show all refs if any
    if (parseInt(count.rows[0].cnt) > 0) {
      const refs = await client.query(`
        SELECT tr.id, 
               st.ticket_id as source, st.title as source_title,
               rt.ticket_id as reference, rt.title as ref_title
        FROM ticket_references tr
        LEFT JOIN tickets st ON tr.source_ticket_id = st.id
        LEFT JOIN tickets rt ON tr.reference_ticket_id = rt.id
        ORDER BY tr.created_at DESC
      `);
      console.log('\n📋 Existing references:');
      refs.rows.forEach(r => {
        console.log(`   ${r.source} → ${r.reference} (${r.ref_title})`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
    console.log('\n✅ Done');
  }
}

main();
