import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDatabaseUrl } from "@/lib/utils/db-config"

// Lazy initialization: only get database URL when actually needed (at runtime, not build time)
let sqlInstance: ReturnType<typeof neon> | null = null

function getSql() {
  if (!sqlInstance) {
    const databaseUrl = getDatabaseUrl()
    sqlInstance = neon(databaseUrl)
  }
  return sqlInstance
}

// Export a getter that initializes on first use
// Using Proxy to maintain the same API while deferring initialization
const sql = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getSql()
    const value = (instance as any)[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  }
}) as ReturnType<typeof neon>

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, role } = await request.json()

    if (!full_name || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Sanitize email: trim and lowercase for consistency
    const sanitizedEmail = email.trim().toLowerCase()
    
    // Check if email domain is allowed
    const ALLOWED_EMAIL_DOMAIN = "@mfilterit.com"
    if (!sanitizedEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      return NextResponse.json(
        { error: `Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed` }, 
        { status: 400 }
      )
    }

    // Check if user with this email already exists (case-insensitive)
    const existingUser = await sql`SELECT id FROM users WHERE LOWER(email) = ${sanitizedEmail}`

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    const tempPassword = Math.random().toString(36).slice(-12) + "Temp1!"
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    const result = await sql`
      INSERT INTO users (full_name, email, role, password_hash) VALUES (${full_name}, ${sanitizedEmail}, ${role}, ${passwordHash})
      RETURNING id, full_name, email, role
    `

    const userResult = Array.isArray(result) ? result[0] : null

    return NextResponse.json(
      {
        user: userResult,
        message: "User created successfully",
        tempPassword: tempPassword,
        note: "Share this temporary password with the user. They should change it on first login.",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
