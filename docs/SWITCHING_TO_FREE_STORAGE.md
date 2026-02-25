# Quick Guide: Switching to Free File Storage

## Option 1: Use Local Storage (Easiest - Development Only)

**No setup required!** Just update the attachments route.

### Steps:

1. **Update `app/api/attachments/route.ts`**:

Replace the R2 imports and upload/delete logic with local storage:

```typescript
// Replace this:
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2"

// With this:
import { saveFileLocal, deleteFileLocal, STORAGE_PUBLIC_URL } from "@/lib/local-storage"
```

2. **In POST handler**, replace:
```typescript
// OLD (R2):
await r2Client.send(
  new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
    ContentLength: file.size,
  })
)
const fileUrl = `${R2_PUBLIC_URL}/${fileName}`

// NEW (Local):
const fileUrl = await saveFileLocal(fileName, buffer)
```

3. **In DELETE handler**, replace:
```typescript
// OLD (R2):
await r2Client.send(
  new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
  })
)

// NEW (Local):
await deleteFileLocal(fileName)
```

**That's it!** Files will be stored in `public/uploads/attachments/`

## Option 2: Use Supabase Storage (Recommended for Production)

### Step 1: Sign up for Supabase

1. Go to https://supabase.com
2. Sign up (free tier available)
3. Create a new project
4. Wait for project to initialize (~2 minutes)

### Step 2: Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name: `ticket-attachments`
4. Make it **Public** (so files can be accessed via URL)
5. Click **Create bucket**

### Step 3: Get Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key

### Step 4: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 5: Add Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=ticket-attachments
```

### Step 6: Update Attachments Route

Replace R2 code with Supabase:

```typescript
// Replace:
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2"

// With:
import { uploadToSupabase, deleteFromSupabase, STORAGE_PUBLIC_URL } from "@/lib/supabase-storage"
```

In POST handler:
```typescript
const { url: fileUrl, error } = await uploadToSupabase(fileName, buffer, file.type)
if (error) {
  return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
}
```

In DELETE handler:
```typescript
const { error } = await deleteFromSupabase(fileName)
if (error) {
  console.error("Error deleting from Supabase:", error)
}
```

## Quick Comparison

| Feature | Local Storage | Supabase Storage |
|---------|--------------|------------------|
| **Setup Time** | 2 minutes | 10 minutes |
| **Free Tier** | Unlimited | 1 GB storage |
| **Best For** | Development | Production |
| **Requires Account** | No | Yes |
| **Public URLs** | Yes | Yes |
| **CDN** | No | Yes |

## Recommendation

- **Right now (Development)**: Use **Local Storage** - it's instant and works immediately
- **Later (Production)**: Switch to **Supabase Storage** - better for production, still free

## Need Help?

The storage utility files are already created:
- `lib/local-storage.ts` - For development
- `lib/supabase-storage.ts` - For production

Just update `app/api/attachments/route.ts` to use one of them!
