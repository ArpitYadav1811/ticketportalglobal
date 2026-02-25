# Free File Storage Alternatives for Attachments

## Important Note

**Neon is a PostgreSQL database** - it stores metadata (file names, URLs, sizes) but **NOT the actual files**. You need a separate object storage service for files.

## Recommended Free Options

### 1. **Supabase Storage** (⭐ Best Choice - Recommended)

**Free Tier:**
- 1 GB storage
- 2 GB bandwidth/month
- Unlimited files
- S3-compatible API

**Why it's great:**
- Easy setup
- Good free tier
- Built-in CDN
- Automatic image optimization
- Simple authentication

**Setup:**
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Storage → Create bucket
4. Get your project URL and anon key

### 2. **Vercel Blob Storage** (If deploying on Vercel)

**Free Tier:**
- 1 GB storage
- 10 GB bandwidth/month
- Simple API

**Why it's great:**
- Native Vercel integration
- Easy setup if already on Vercel
- No additional account needed

### 3. **AWS S3 Free Tier**

**Free Tier:**
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests
- Valid for 12 months

**Why it's great:**
- Generous free tier
- Industry standard
- Reliable

### 4. **Backblaze B2**

**Free Tier:**
- 10 GB storage (forever)
- 1 GB download/day
- Unlimited uploads

**Why it's great:**
- Most generous free tier
- S3-compatible
- Good for long-term storage

### 5. **Local File Storage** (Development Only)

**Free Tier:**
- Unlimited (your disk space)

**Why it's great:**
- No setup needed
- Perfect for development
- No API limits

**⚠️ Warning:** Only for development! Not suitable for production.

## Implementation Guide: Supabase Storage

### Step 1: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Storage Client

Create `lib/supabase-storage.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const STORAGE_BUCKET_NAME = 'ticket-attachments'
export const STORAGE_PUBLIC_URL = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET_NAME}`
```

### Step 3: Update Environment Variables

Add to `.env.local`:

```env
# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Update Attachment API

Replace `app/api/attachments/route.ts` upload logic:

```typescript
import { supabase, STORAGE_BUCKET_NAME, STORAGE_PUBLIC_URL } from "@/lib/supabase-storage"

// In POST handler, replace R2 upload with:
const fileName = `tickets/${ticketIdNum}/${timestamp}-${randomSuffix}-${sanitizedName}`

const { data, error } = await supabase.storage
  .from(STORAGE_BUCKET_NAME)
  .upload(fileName, buffer, {
    contentType: file.type,
    upsert: false
  })

if (error) {
  return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
}

const fileUrl = `${STORAGE_PUBLIC_URL}/${fileName}`
```

### Step 5: Update Delete Logic

```typescript
// Replace R2 delete with:
const { error } = await supabase.storage
  .from(STORAGE_BUCKET_NAME)
  .remove([fileName])

if (error) {
  console.error("Error deleting from Supabase:", error)
}
```

## Implementation Guide: Local File Storage (Development)

### Step 1: Create Local Storage Utility

Create `lib/local-storage.ts`:

```typescript
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'attachments')
const PUBLIC_URL = '/uploads/attachments'

export async function saveFileLocal(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  // Ensure directory exists
  const filePath = join(UPLOAD_DIR, fileName)
  const dirPath = join(UPLOAD_DIR, fileName.split('/').slice(0, -1).join('/'))
  
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true })
  }
  
  await writeFile(filePath, buffer)
  return `${PUBLIC_URL}/${fileName}`
}

export async function deleteFileLocal(fileName: string): Promise<void> {
  const filePath = join(UPLOAD_DIR, fileName)
  if (existsSync(filePath)) {
    await unlink(filePath)
  }
}

export const STORAGE_PUBLIC_URL = PUBLIC_URL
```

### Step 2: Update Attachment API

```typescript
import { saveFileLocal, deleteFileLocal } from "@/lib/local-storage"

// In POST handler:
const fileUrl = await saveFileLocal(fileName, buffer)

// In DELETE handler:
await deleteFileLocal(fileName)
```

### Step 3: Add to .gitignore

```
public/uploads/
```

## Quick Comparison

| Service | Free Storage | Free Bandwidth | Setup Difficulty | Best For |
|---------|-------------|----------------|------------------|----------|
| **Supabase** | 1 GB | 2 GB/month | ⭐ Easy | Most projects |
| **Vercel Blob** | 1 GB | 10 GB/month | ⭐ Easy | Vercel deployments |
| **AWS S3** | 5 GB | Limited | ⭐⭐ Medium | Production apps |
| **Backblaze B2** | 10 GB | 1 GB/day | ⭐⭐ Medium | Long-term storage |
| **Local** | Unlimited | Unlimited | ⭐⭐⭐ Very Easy | Development only |

## Recommendation

**For your use case, I recommend:**

1. **Development**: Use **Local File Storage** (easiest, no setup)
2. **Production**: Use **Supabase Storage** (best free tier, easy setup)

Would you like me to implement one of these solutions for you?
