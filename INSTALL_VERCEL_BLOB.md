# Install Vercel Blob Package

## Quick Fix

Open your terminal (WSL/Ubuntu) and run:

```bash
npm install @vercel/blob
```

This will install the `@vercel/blob` package and resolve the "Module not found" error.

## After Installation

1. Restart your Next.js dev server if it's running
2. The error should be gone
3. Continue with the Vercel Blob setup from `docs/QUICK_START_VERCEL_BLOB.md`

## Troubleshooting

If you get an `ENOTEMPTY` error, try:

```bash
# Stop your dev server first (Ctrl+C)
rm -rf node_modules/.next-*
npm install @vercel/blob
```

Then restart your dev server:

```bash
npm run dev
```
