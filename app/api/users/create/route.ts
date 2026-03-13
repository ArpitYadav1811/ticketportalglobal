import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, role, password } = await request.json()

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

    // Use provided password or generate temporary password
    let finalPassword: string
    let tempPassword: string | undefined
    
    if (password && password.trim()) {
      // Validate custom password
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
      }
      finalPassword = password
    } else {
      // Generate temporary password
      tempPassword = Math.random().toString(36).slice(-12) + "Temp1!"
      finalPassword = tempPassword
    }

    const passwordHash = await bcrypt.hash(finalPassword, 10)

    const result = await sql`
      INSERT INTO users (full_name, email, role, password_hash) VALUES (${full_name}, ${sanitizedEmail}, ${role}, ${passwordHash})
      RETURNING id, full_name, email, role
    `

    const userResult = Array.isArray(result) ? result[0] : null

    return NextResponse.json(
      {
        user: userResult,
        message: "User created successfully",
        tempPassword: tempPassword, // Only returned if temporary password was generated
        note: tempPassword 
          ? "Share this temporary password with the user. They should change it on first login."
          : "User created with custom password.",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
