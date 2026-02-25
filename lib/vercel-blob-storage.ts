/**
 * Vercel Blob Storage Configuration
 * 
 * Vercel Blob Storage is perfect for file attachments when deploying on Vercel.
 * Free tier: 1 GB storage, 10 GB bandwidth/month
 */

import { put, del } from '@vercel/blob'

/**
 * Upload a file to Vercel Blob Storage
 */
export async function uploadToVercelBlob(
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; error?: Error }> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured. Get it from Vercel dashboard → Storage → Blob.')
    }

    const blob = await put(fileName, buffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return { url: blob.url, error: undefined }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown upload error')
    console.error('[Vercel Blob] Upload error:', error)
    return { url: '', error }
  }
}

/**
 * Delete a file from Vercel Blob Storage
 */
export async function deleteFromVercelBlob(fileUrl: string): Promise<{ error?: Error }> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured.')
    }

    await del(fileUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return { error: undefined }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown delete error')
    console.error('[Vercel Blob] Delete error:', error)
    return { error }
  }
}
