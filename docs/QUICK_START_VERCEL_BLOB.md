# Quick Start: Vercel Blob Storage

## ✅ Code is Already Updated!

The code has been updated to use Vercel Blob Storage. You just need to:

## Step 1: Install Package

Run this command in your terminal:

```bash
npm install @vercel/blob
```

## Step 2: Enable Blob Storage in Vercel

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your project
3. Click **Storage** tab (left sidebar)
4. Click **Create Database** or **Add Storage**
5. Select **Blob**
6. Click **Create**

## Step 3: Create Token

1. In Storage tab, click your Blob store
2. Go to **Settings** tab
3. Under **Tokens**, click **Create Token**
4. Name: "Ticket Attachments"
5. Permissions: **Read and Write**
6. Click **Create**
7. **Copy the token** (starts with `vercel_blob_rw_...`)

## Step 4: Add Environment Variable

### For Local Development

Add to `.env.local`:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

### For Production (Vercel)

1. Vercel Dashboard → Your Project
2. **Settings** → **Environment Variables**
3. Add:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Your token
   - **Environments**: Production, Preview, Development (all)
4. Click **Save**

## Step 5: Deploy

```bash
git add .
git commit -m "Switch to Vercel Blob Storage"
git push
```

That's it! 🎉

## What Changed

- ✅ `app/api/attachments/route.ts` - Now uses Vercel Blob
- ✅ `lib/vercel-blob-storage.ts` - New utility file
- ✅ `env.example` - Updated with Vercel Blob config

## Free Tier

- **1 GB storage** (free forever)
- **10 GB bandwidth/month** (free forever)
- Global CDN included

## Need Help?

See full guide: `docs/VERCEL_BLOB_SETUP.md`
