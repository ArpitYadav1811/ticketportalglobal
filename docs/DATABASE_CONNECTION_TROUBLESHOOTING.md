# Database Connection Troubleshooting Guide

## Overview
This guide helps resolve database connection timeout errors, especially common in WSL environments and with Neon serverless databases.

## Common Error Messages

### ETIMEDOUT Errors
```
Error [NeonDbError]: Error connecting to database: TypeError: fetch failed
[cause]: [AggregateError: ] { code: 'ETIMEDOUT' }
```

### Symptoms
- Connection timeouts during authentication (SSO login)
- "Database cold start" messages in logs
- All retry attempts failing
- Errors occurring in WSL environments

## Automatic Optimizations

The system automatically applies optimizations based on your environment:

### WSL Detection
- Automatically detects Windows Subsystem for Linux (WSL)
- Applies network optimizations:
  - DNS preference: IPv4 first (`--dns-result-order=ipv4first`)
  - Increased timeout: 60 seconds (vs 45 seconds for non-WSL)
  - Extra retry attempt: 6 attempts (vs 5 for non-WSL)
  - Longer initial delay: 3 seconds (vs 2 seconds)

### Retry Logic
- **Automatic retries**: Up to 5-6 attempts with exponential backoff
- **Timeout**: 30-60 seconds per attempt (depending on environment)
- **Backoff pattern**: 2s → 4s → 8s → 16s → 32s (with jitter)

## Manual Fixes

### 1. Check Database Status
**Neon Database:**
1. Go to [Neon Dashboard](https://console.neon.tech)
2. Check if database is **suspended** (free tier auto-suspends after inactivity)
3. If suspended, click "Resume" or make a query to wake it up

### 2. Verify DATABASE_URL
Check your `.env.local` file:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require&connect_timeout=30
```

**Required parameters:**
- `sslmode=require` - Required for cloud databases
- `connect_timeout=30` - Helps with cold starts (auto-added if missing)

### 3. WSL-Specific Fixes

#### Restart WSL
```bash
# In Windows PowerShell (as Administrator)
wsl --shutdown

# Then restart your WSL distribution
wsl
```

#### Check Network Connectivity
```bash
# Test DNS resolution
nslookup your-database-host.neon.tech

# Test connectivity
ping your-database-host.neon.tech
```

#### Windows Firewall
- Ensure Windows Firewall isn't blocking Node.js
- Check if antivirus is interfering

#### WSL Network Reset
```bash
# In WSL
sudo service networking restart
```

### 4. Increase Timeout (if needed)
If timeouts persist, you can manually increase the timeout in `lib/db.ts`:

```typescript
const fetchTimeout = isWSL ? 90000 : 60000 // 90s for WSL, 60s for others
```

### 5. Check Environment Variables
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Check for special characters in password
# Special chars must be URL-encoded: @ → %40, # → %23, etc.
```

## Error Handling Improvements

### Recent Updates
1. **Increased timeouts for WSL**: 60 seconds (was 30 seconds)
2. **Extra retry for WSL**: 6 attempts (was 5)
3. **Better error messages**: More specific guidance based on environment
4. **Improved retry logic**: Exponential backoff with jitter

### Error Propagation
- Database errors now properly propagate through retry logic
- Auth functions re-throw errors to allow retry mechanism to work
- Final failures provide clear error messages

## Testing Connection

### Quick Test
```bash
# Test database connection
npm run dev
# Try logging in - if it works, connection is fine
```

### Manual Test Script
Create `test-db.js`:
```javascript
import { sql } from './lib/db.js'

async function test() {
  try {
    const result = await sql`SELECT 1 as test`
    console.log('✅ Database connection successful!', result)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  }
}

test()
```

## Prevention

### Keep Database Active
- **Neon Free Tier**: Database suspends after ~5 minutes of inactivity
- **Solution**: Use a cron job or monitoring service to ping database every 4 minutes
- **Alternative**: Upgrade to paid tier for always-on database

### Connection Pooling
- The system uses Neon's built-in connection pooling
- Singleton pattern prevents connection exhaustion in development
- Each serverless function gets its own connection pool (production)

## Monitoring

### Log Messages to Watch
- `[DB] WSL environment detected` - WSL optimizations applied
- `[DB Retry] Cold start detected` - Database waking up
- `[DB Retry] All X attempts failed` - Connection issue persists

### Success Indicators
- `✅ Database connection successful!`
- No timeout errors in logs
- Authentication works smoothly

## Still Having Issues?

1. **Check Neon Dashboard**: Verify database is running and not suspended
2. **Network Diagnostics**: Run connectivity tests from WSL
3. **Environment Check**: Verify all environment variables are set correctly
4. **Logs Review**: Check server logs for specific error patterns
5. **Database URL**: Ensure password special characters are URL-encoded

## Support Resources

- [Neon Documentation](https://neon.tech/docs)
- [WSL Networking Issues](https://learn.microsoft.com/en-us/windows/wsl/networking)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
