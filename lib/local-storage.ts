import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Local File Storage for Development
 * 
 * ⚠️ WARNING: Only use this for development!
 * For production, use Supabase Storage, AWS S3, or similar cloud storage.
 */

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'attachments')
const PUBLIC_URL = '/uploads/attachments'

/**
 * Save a file to local filesystem
 */
export async function saveFileLocal(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  try {
    // Ensure directory exists
    const fullPath = join(UPLOAD_DIR, fileName)
    const dirPath = join(fullPath, '..')
    
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true })
    }
    
    await writeFile(fullPath, buffer)
    return `${PUBLIC_URL}/${fileName}`
  } catch (error) {
    console.error('[Local Storage] Save error:', error)
    throw error
  }
}

/**
 * Delete a file from local filesystem
 */
export async function deleteFileLocal(fileName: string): Promise<void> {
  try {
    const fullPath = join(UPLOAD_DIR, fileName)
    if (existsSync(fullPath)) {
      await unlink(fullPath)
    }
  } catch (error) {
    console.error('[Local Storage] Delete error:', error)
    // Don't throw - file might already be deleted
  }
}

export const STORAGE_PUBLIC_URL = PUBLIC_URL
export const STORAGE_BUCKET_NAME = 'local' // Not used for local storage
