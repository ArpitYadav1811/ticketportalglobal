import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  const log: string[] = []

  try {
    // Step 1: Check if table exists
    log.push("Step 1: Checking if ticket_references table exists...")
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ticket_references'
      ) as exists
    `
    const tableExists = tableCheck[0]?.exists
    log.push(`  Table exists: ${tableExists}`)

    // Step 2: Create table if needed
    if (!tableExists) {
      log.push("Step 2: Creating ticket_references table...")
      await sql`
        CREATE TABLE ticket_references (
          id SERIAL PRIMARY KEY,
          source_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          reference_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE(source_ticket_id, reference_ticket_id),
          CHECK (source_ticket_id <> reference_ticket_id)
        )
      `
      log.push("  Table created successfully!")

      await sql`CREATE INDEX IF NOT EXISTS idx_ticket_ref_source ON ticket_references(source_ticket_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_ticket_ref_reference ON ticket_references(reference_ticket_id)`
      log.push("  Indexes created successfully!")
    } else {
      log.push("Step 2: Table already exists, skipping creation.")
    }

    // Step 3: Check row count
    log.push("Step 3: Checking row count...")
    const countResult = await sql`SELECT COUNT(*) as count FROM ticket_references`
    log.push(`  Row count: ${countResult[0]?.count}`)

    // Step 4: Show all references if any
    if (Number(countResult[0]?.count) > 0) {
      log.push("Step 4: Fetching all references...")
      const refs = await sql`
        SELECT tr.*, 
               st.ticket_id as source_ticket_id_str, st.title as source_title,
               rt.ticket_id as ref_ticket_id_str, rt.title as ref_title
        FROM ticket_references tr
        LEFT JOIN tickets st ON tr.source_ticket_id = st.id
        LEFT JOIN tickets rt ON tr.reference_ticket_id = rt.id
        ORDER BY tr.created_at DESC
        LIMIT 20
      `
      log.push(`  References found: ${refs.length}`)
      refs.forEach((r: any) => {
        log.push(`    ${r.source_ticket_id_str} (${r.source_title}) -> ${r.ref_ticket_id_str} (${r.ref_title})`)
      })
    } else {
      log.push("Step 4: No references found in database.")
    }

    return NextResponse.json({ success: true, log })
  } catch (error: any) {
    log.push(`ERROR: ${error?.message || String(error)}`)
    return NextResponse.json({ success: false, log, error: error?.message || String(error) }, { status: 500 })
  }
}
