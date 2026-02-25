import { neon, NeonQueryFunction, neonConfig } from "@neondatabase/serverless"
import { getDatabaseUrl } from "./utils/db-config"
import { existsSync, readFileSync } from "fs"

// ─── Global Configuration for Neon Serverless Driver ─────────────────────────
// Configure global settings for optimal serverless performance
// This applies to all Neon client instances created in this process
// Note: fetchConnectionCache is deprecated - all queries now use connection pool/cache automatically

// Configure fetch with timeout for cold start handling
// This ensures we wait up to 30 seconds for Neon to wake up from scale-to-zero
const fetchWithTimeout = (url: RequestInfo, init?: RequestInit) => {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(30000), // 30 second timeout for cold starts
  })
}

// Set custom fetch function with timeout globally
// This ensures all Neon queries use the timeout configuration
neonConfig.fetchFunction = fetchWithTimeout

// ─── Global Singleton Pattern for Development ────────────────────────────────
// Prevents creating new database connections on every Fast Refresh (HMR)
// In production, this runs once per serverless function invocation (normal behavior)
// For Next.js Server Actions, the singleton ensures we don't create multiple pools

// Extend globalThis to include our database client
declare global {
  // eslint-disable-next-line no-var
  var __neonClient: ReturnType<typeof neon> | undefined
}

// Detect WSL environment
function detectWSL(): boolean {
  if (process.platform !== 'linux') return false
  
  // Check for WSL environment variables
  if (process.env.WSL_DISTRO_NAME !== undefined) {
    return true
  }
  
  // Check /proc/version for Microsoft/WSL indicators
  try {
    if (existsSync('/proc/version')) {
      const versionContent = readFileSync('/proc/version', 'utf8').toLowerCase()
      if (versionContent.includes('microsoft') || versionContent.includes('wsl')) {
        return true
      }
    }
  } catch {
    // If we can't read the file, assume not WSL
  }
  
  return false
}

// Apply WSL-specific network optimizations
const isWSL = detectWSL()
if (isWSL) {
  console.log('[DB] WSL environment detected - applying network optimizations')
  // Increase DNS timeout for WSL - prefer IPv4 first
  if (!process.env.NODE_OPTIONS?.includes('--dns-result-order')) {
    process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} --dns-result-order=ipv4first`
  }
}

// Get or create the Neon client using singleton pattern
// This ensures we don't create multiple connection pools on hot-reload
function getNeonClient() {
  const databaseUrl = getDatabaseUrl()
  
  // In development, reuse the existing client to avoid reconnecting on HMR
  // This is critical for Next.js Fast Refresh - prevents connection pool exhaustion
  if (process.env.NODE_ENV !== "production") {
    if (!global.__neonClient) {
      console.log("[DB] Creating new Neon client (development)")
      // neonConfig is already set globally, so we just pass the URL
      global.__neonClient = neon(databaseUrl)
    } else {
      console.log("[DB] Reusing existing Neon client (development)")
    }
    return global.__neonClient
  }
  
  // In production (serverless), create a new client for each function invocation
  // The global neonConfig ensures optimal settings are applied
  // Each serverless function instance gets its own client, which is correct behavior
  return neon(databaseUrl)
}

// Initialize Neon client with singleton pattern
// Note: Neon serverless uses fetch under the hood
// For timeout issues, we'll add retry logic via a wrapper
const neonClient = getNeonClient()

// Helper function to check if an error is retryable
// Specifically handles Neon cold start scenarios and network issues
function isRetryableError(error: unknown): boolean {
  if (!error) return false
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorCode = (error as any)?.code
  const cause = (error as any)?.cause
  
  // Check direct error properties
  // These errors typically indicate transient issues (cold starts, network timeouts)
  if (
    errorCode === 'ETIMEDOUT' ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('cold start') ||
    errorMessage.includes('scaling')
  ) {
    return true
  }
  
  // Check nested cause (common with Neon serverless driver)
  if (cause) {
    const causeCode = cause?.code
    const causeMessage = cause instanceof Error ? cause.message : String(cause)
    if (
      causeCode === 'ETIMEDOUT' ||
      causeMessage?.includes('ETIMEDOUT') ||
      causeMessage?.includes('fetch failed') ||
      causeMessage?.includes('timeout') ||
      causeMessage?.includes('cold start')
    ) {
      return true
    }
    
    // Check for AggregateError with ETIMEDOUT (common in Node.js fetch)
    if (cause?.errors && Array.isArray(cause.errors)) {
      for (const err of cause.errors) {
        if (err?.code === 'ETIMEDOUT' || err?.message?.includes('ETIMEDOUT')) {
          return true
        }
      }
    }
  }
  
  return false
}

// Wrapper function to add retry logic for transient failures
// Optimized for Neon cold starts: database scaling from zero can take 1-3 seconds
// This gracefully handles the initial "wake up" lag without crashing the app
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 2000 // Initial 2s delay accommodates typical cold start (1-3s)
): Promise<T> {
  let lastError: Error | unknown
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Check if it's a retryable error (cold starts, network issues)
      const isRetryable = isRetryableError(error)
      
      if (!isRetryable || attempt === maxRetries) {
        // Log final error with more details
        if (attempt === maxRetries && isRetryable) {
          console.error(`[DB Retry] All ${maxRetries} attempts failed. Final error:`, error)
          console.error('[DB Retry] Possible causes:')
          console.error('  1) Database cold start taking longer than expected (>30s)')
          console.error('  2) Network connectivity issues')
          console.error('  3) WSL networking problems (if running in WSL)')
          console.error('  4) Database may be suspended - check Neon dashboard')
        }
        throw error
      }
      
      // Exponential backoff with jitter: 2s, 4s, 8s, 16s, 32s
      // This pattern gives cold starts time to complete while avoiding thundering herd
      const baseWaitTime = delayMs * Math.pow(2, attempt - 1)
      const jitter = Math.random() * 1000 // Random jitter prevents synchronized retries
      const waitTime = baseWaitTime + jitter
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isLikelyColdStart = attempt === 1 && (errorMessage.includes('timeout') || errorMessage.includes('fetch failed'))
      
      if (isLikelyColdStart) {
        console.warn(`[DB Retry] Cold start detected (attempt ${attempt}/${maxRetries}). Waiting ${Math.round(waitTime)}ms for database to wake up...`)
      } else {
      console.warn(`[DB Retry] Attempt ${attempt}/${maxRetries} failed (${errorMessage}). Retrying in ${Math.round(waitTime)}ms...`)
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  throw lastError
}

// Create a wrapped SQL function that includes retry logic
// The Neon client returns a function that accepts template strings
export const sql = ((strings: TemplateStringsArray, ...values: any[]) => {
  return withRetry(() => neonClient(strings, ...values))
}) as NeonQueryFunction<false, false>

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = {
  id: number
  email: string
  password_hash: string
  full_name: string
  role: "admin" | "agent" | "user"
  avatar_url: string | null
  created_at: Date
  updated_at: Date
}

export type TargetBusinessGroup = {
  id: number
  name: string
  description: string | null
  created_at: Date
  updated_at: Date
}

export type Ticket = {
  id: number
  ticket_id: string
  ticket_number: number
  title: string
  description: string
  ticket_type: "support" | "requirement"
  status: "open" | "on-hold" | "resolved" | "closed" | "returned" | "deleted"
  priority: "low" | "medium" | "high" | "urgent"
  category: string | null
  subcategory: string | null
  category_id: number | null
  subcategory_id: number | null
  business_unit_group_id: number | null
  initiator_group: string | null
  target_business_group_id: number | null
  assignee_group_id: number | null
  estimated_duration: string | null
  assigned_to: number | null
  created_by: number
  spoc_user_id: number | null
  project_id: number | null
  project_name: string | null
  product_release_name: string | null
  estimated_release_date: string | null
  is_deleted: boolean
  deleted_at: Date | null
  has_attachments: boolean
  hold_by: number | null
  hold_at: Date | null
  closed_by: number | null
  closed_at: Date | null
  resolved_at: Date | null
  created_at: Date
  updated_at: Date
  is_internal: boolean
  redirected_from_business_unit_group_id: number | null
  redirected_from_spoc_user_id: number | null
  redirection_remarks: string | null
  redirected_at: Date | null
}

export type Comment = {
  id: number
  ticket_id: number
  user_id: number
  content: string
  created_at: Date
}

export type Attachment = {
  id: number
  ticket_id: number
  file_name: string
  file_url: string
  file_size: number | null
  uploaded_by: number
  created_at: Date
}