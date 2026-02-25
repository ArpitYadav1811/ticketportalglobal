# Update DATABASE_URL with Connection Timeout

## Quick Update Instructions

To fix database connection timeout issues, you need to add `&connect_timeout=30` to your DATABASE_URL in `.env.local`.

## Steps

1. Open your `.env.local` file in the project root

2. Find your `DATABASE_URL`, `DATABASE_URL_DEV`, or `DATABASE_URL_PROD` line(s)

3. Add `&connect_timeout=30` before the end of the URL (if it already has query parameters) or add `?connect_timeout=30` if it's the first parameter

### Examples

**Before:**
```env
DATABASE_URL=postgresql://neondb_owner:password@ep-shiny-hall-a4xsbbt3-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**After:**
```env
DATABASE_URL=postgresql://neondb_owner:password@ep-shiny-hall-a4xsbbt3-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30
```

**If you have multiple URLs:**
```env
DATABASE_URL_DEV=postgresql://user:pass@host:5432/db?sslmode=require&connect_timeout=30
DATABASE_URL_PROD=postgresql://user:pass@host:5432/db?sslmode=require&connect_timeout=30
```

## What This Does

The `connect_timeout=30` parameter tells the database client to wait up to 30 seconds when establishing a connection. This helps with:

- **Neon Cold Starts**: Gives the database time to wake up from scale-to-zero
- **Network Latency**: Accommodates slower network connections
- **WSL Networking**: Helps with Windows Subsystem for Linux network delays

## Verification

After updating, restart your development server:
```bash
npm run dev
```

You should see improved connection reliability, especially after periods of inactivity.
