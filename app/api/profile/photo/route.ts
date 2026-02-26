import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { sql } from "@/lib/db"

/**
 * GET /api/profile/photo
 * Fetches the user's profile photo from Microsoft Graph API
 * Returns base64 encoded image or null if not available
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    
    // Check if photo is cached in database
    const cachedPhoto = await sql`
      SELECT avatar_url, updated_at 
      FROM users 
      WHERE id = ${userId}
    `
    
    if (cachedPhoto.length > 0 && cachedPhoto[0].avatar_url) {
      const lastUpdated = new Date(cachedPhoto[0].updated_at)
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      
      // Return cached photo if updated within last 7 days
      if (daysSinceUpdate < 7) {
        return NextResponse.json({ 
          photo: cachedPhoto[0].avatar_url,
          cached: true 
        })
      }
    }

    // For SSO users, fetch from Microsoft Graph
    if (session.user.auth_provider === "microsoft") {
      try {
        // Get access token from the session
        const accessToken = (session as any).accessToken
        
        if (!accessToken) {
          console.warn("No access token available for Graph API call")
          return NextResponse.json({ 
            photo: cachedPhoto[0]?.avatar_url || null, 
            error: "No access token" 
          })
        }

        // Fetch photo from Microsoft Graph
        const photoResponse = await fetch(
          "https://graph.microsoft.com/v1.0/me/photo/$value",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )

        if (photoResponse.ok) {
          const photoBuffer = await photoResponse.arrayBuffer()
          const base64Photo = `data:image/jpeg;base64,${Buffer.from(photoBuffer).toString("base64")}`
          
          // Cache the photo in database
          await sql`
            UPDATE users 
            SET avatar_url = ${base64Photo}, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ${userId}
          `
          
          return NextResponse.json({ 
            photo: base64Photo,
            cached: false 
          })
        } else if (photoResponse.status === 404) {
          // No photo available - user hasn't set one
          return NextResponse.json({ photo: null, error: "No photo found" })
        } else {
          console.error("Graph API error:", photoResponse.status, photoResponse.statusText)
          return NextResponse.json({ 
            photo: null, 
            error: `Graph API error: ${photoResponse.status}` 
          })
        }
      } catch (graphError) {
        console.error("Error fetching from Microsoft Graph:", graphError)
        return NextResponse.json({ 
          photo: cachedPhoto[0]?.avatar_url || null, 
          error: "Graph API unavailable" 
        })
      }
    }

    // For non-SSO users, return cached avatar or null
    return NextResponse.json({ 
      photo: cachedPhoto[0]?.avatar_url || null 
    })
    
  } catch (error) {
    console.error("Error in profile photo API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

