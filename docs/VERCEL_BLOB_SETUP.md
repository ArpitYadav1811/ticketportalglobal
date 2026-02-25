# Vercel Blob Storage Setup Guide

## Overview

Vercel Blob Storage is the perfect solution for file attachments when deploying on Vercel. It's integrated directly with your Vercel project and requires minimal setup.

## Free Tier

- **1 GB storage** (free forever)
- **10 GB bandwidth/month** (free forever)
- Unlimited files
- Global CDN included
- Automatic optimization

## Setup Steps

### Step 1: Install Vercel Blob Package

```bash
npm install @vercel/blob
```

### Step 2: Enable Blob Storage in Vercel Dashboard

1. Go to your **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your project
3. Go to **Storage** tab (in the left sidebar)
4. Click **Create Database** or **Add Storage**
5. Select **Blob** from the options
6. Click **Create**

### Step 3: Create a Blob Token

1. In the **Storage** tab, click on your Blob store
2. Go to the **Settings** tab
3. Under **Tokens**, click **Create Token**
4. Name it (e.g., "Ticket Attachments")
5. Select **Read and Write** permissions
6. Click **Create**
7. **Copy the token** - you'll need it for environment variables

### Step 4: Add Environment Variable

#### For Local Development

Add to `.env.local`:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

#### For Production (Vercel)

1. Go to your project in Vercel Dashboard
2. Go to **Settings** → **Environment Variables**
3. Add:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Your token from Step 3
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

### Step 5: Deploy

The code is already updated! Just:

```bash
git add .
git commit -m "Switch to Vercel Blob Storage"
git push
```

Vercel will automatically deploy and use the Blob Storage.

## How It Works

1. **Upload**: Files are uploaded to Vercel Blob Storage via the `@vercel/blob` SDK
2. **Storage**: Files are stored in Vercel's global CDN
3. **URL**: Each file gets a public URL automatically
4. **Database**: The URL is stored in your Neon database (metadata only)
5. **Access**: Files are accessible via the public URL

## File Path Structure

Files are stored with this structure:
```
tickets/{ticketId}/{timestamp}-{randomSuffix}-{filename}
```

Example:
```
tickets/123/1703123456789-abc123-document.pdf
```

## Benefits

✅ **No separate account needed** - Uses your Vercel account  
✅ **Integrated billing** - All in one place  
✅ **Global CDN** - Fast file delivery worldwide  
✅ **Simple API** - Easy to use  
✅ **Automatic scaling** - Handles traffic spikes  
✅ **Free tier** - 1 GB storage, 10 GB bandwidth/month  

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN not configured"

**Solution**: Make sure you've:
1. Created a Blob store in Vercel Dashboard
2. Created a token with Read/Write permissions
3. Added the token to environment variables (both local and Vercel)

### Error: "Failed to upload file to storage"

**Possible causes**:
1. Token is invalid or expired - Create a new token
2. Token doesn't have write permissions - Recreate with Read/Write
3. Storage quota exceeded - Check your usage in Vercel Dashboard

### Files not accessible

**Solution**: Make sure files are uploaded with `access: 'public'` (already configured in the code)

## Monitoring Usage

1. Go to Vercel Dashboard → Your Project → Storage
2. Click on your Blob store
3. View:
   - Storage used
   - Bandwidth used
   - Number of files
   - Recent activity

## Cost

**Free Tier** (forever):
- 1 GB storage
- 10 GB bandwidth/month

**Paid** (if you exceed):
- Storage: $0.15/GB/month
- Bandwidth: $0.15/GB

## Migration from R2

If you were using Cloudflare R2:
1. ✅ Code is already updated
2. ✅ Just add the `BLOB_READ_WRITE_TOKEN` environment variable
3. ✅ Deploy to Vercel
4. Old R2 files will remain, but new uploads go to Vercel Blob

## Next Steps

1. Install package: `npm install @vercel/blob`
2. Create Blob store in Vercel Dashboard
3. Create token and add to environment variables
4. Deploy!

That's it! Your attachments will now use Vercel Blob Storage. 🎉
