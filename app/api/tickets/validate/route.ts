import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get("ticketId")

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: "ticketId parameter is required" },
        { status: 400 }
      )
    }

    // Try matching by ticket_id string (e.g. "TKT-202603-04821") or the last numeric part
    const trimmed = ticketId.trim()

    let result

    // If it's a pure number, search by ticket_number
    if (/^\d+$/.test(trimmed)) {
      result = await sql`
        SELECT t.id, t.ticket_number, t.ticket_id, t.title, t.ticket_type, t.status
        FROM tickets t
        WHERE (t.ticket_number = ${Number(trimmed)} OR t.ticket_id LIKE ${"%" + trimmed})
          AND t.is_deleted = FALSE
        LIMIT 1
      `
    } else {
      // Search by full ticket_id string
      result = await sql`
        SELECT t.id, t.ticket_number, t.ticket_id, t.title, t.ticket_type, t.status
        FROM tickets t
        WHERE t.ticket_id = ${trimmed} AND t.is_deleted = FALSE
        LIMIT 1
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "No ticket found" })
    }

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("[API] Error validating ticket:", error)
    return NextResponse.json(
      { success: false, error: "Failed to validate ticket" },
      { status: 500 }
    )
  }
}
