import { createClient } from '@supabase/supabase-js'

// Supabase Storage Configuration
// Alternative to Cloudflare R2 for file storage

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Storage] Supabase credentials not found. File uploads will fail.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const STORAGE_BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'ticket-attachments'
export const STORAGE_PUBLIC_URL = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET_NAME}`
  : ''

/**
 * Upload a file to Supabase Storage
 */
export async function uploadToSupabase(
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; error?: Error }> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.')
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      })

    if (error) {
      console.error('[Storage] Upload error:', error)
      return { url: '', error }
    }

    const url = `${STORAGE_PUBLIC_URL}/${fileName}`
    return { url, error: undefined }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown upload error')
    console.error('[Storage] Upload exception:', error)
    return { url: '', error }
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromSupabase(fileName: string): Promise<{ error?: Error }> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.')
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .remove([fileName])

    if (error) {
      console.error('[Storage] Delete error:', error)
      return { error }
    }

    return { error: undefined }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown delete error')
    console.error('[Storage] Delete exception:', error)
    return { error }
  }
}
