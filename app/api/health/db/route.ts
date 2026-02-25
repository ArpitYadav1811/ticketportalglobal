import { sql } from '@/lib/db'

export async function GET() {
  try {
    const start = Date.now()
    await sql`SELECT 1 as health_check`
    const duration = Date.now() - start
    
    return Response.json({ 
      status: 'healthy', 
      latency: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return Response.json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}
