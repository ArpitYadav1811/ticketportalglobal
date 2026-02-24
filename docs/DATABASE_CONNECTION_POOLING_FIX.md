# Database Connection Pooling Fix

## 🐛 Problem

When using Next.js 16 with Fast Refresh (HMR) in development, the database connection was being recreated on every file save. This caused:

- ❌ Unnecessary database reconnections
- ❌ Slower development experience
- ❌ Potential connection limit issues
- ❌ Console spam with connection logs
- ❌ Wasted resources

### Why This Happened

**Before the fix:**
```typescript
// lib/db.ts (OLD)
const databaseUrl = getDatabaseUrl()
const neonClient = neon(databaseUrl)  // ❌ Created on every HMR
```

When Fast Refresh triggered:
1. Module reloads
2. `const neonClient = neon(databaseUrl)` runs again
3. New database connection created
4. Old connection becomes orphaned
5. Repeat on every save

---

## ✅ Solution: Global Singleton Pattern

Implemented the **Global Singleton Pattern** to reuse database connections in development while maintaining proper behavior in production.

### Implementation

```typescript
// lib/db.ts (NEW)

// Extend globalThis to include our database client
declare global {
  // eslint-disable-next-line no-var
  var __neonClient: ReturnType<typeof neon> | undefined
}

// Get or create the Neon client using singleton pattern
function getNeonClient() {
  const databaseUrl = getDatabaseUrl()
  
  // In development, reuse the existing client to avoid reconnecting on HMR
  if (process.env.NODE_ENV !== "production") {
    if (!global.__neonClient) {
      console.log("[DB] Creating new Neon client (development)")
      global.__neonClient = neon(databaseUrl)
    } else {
      console.log("[DB] Reusing existing Neon client (development)")
    }
    return global.__neonClient
  }
  
  // In production, create a new client for each serverless invocation
  return neon(databaseUrl)
}

const neonClient = getNeonClient()
```

---

## 🎯 How It Works

### Development Mode (`NODE_ENV !== "production"`)

**First Load:**
```
1. getNeonClient() called
2. global.__neonClient is undefined
3. Create new Neon client
4. Store in global.__neonClient
5. Log: "[DB] Creating new Neon client (development)"
6. Return client
```

**After Fast Refresh (HMR):**
```
1. Module reloads
2. getNeonClient() called again
3. global.__neonClient exists! ✅
4. Log: "[DB] Reusing existing Neon client (development)"
5. Return existing client (no reconnection!)
```

### Production Mode

**Each Serverless Invocation:**
```
1. getNeonClient() called
2. Skip global check (production mode)
3. Create fresh Neon client
4. Return client
5. Client disposed after invocation completes
```

This is **correct behavior** for serverless - each invocation is isolated.

---

## 📊 Before vs After

### Before Fix

```
Save file → HMR triggers
  ↓
Module reloads
  ↓
const neonClient = neon(url)  ❌ NEW CONNECTION
  ↓
Database reconnects
  ↓
Query runs
  ↓
(Repeat on every save)
```

**Console Output:**
```
[DB] Connecting to database...
[DB] Connecting to database...
[DB] Connecting to database...
[DB] Connecting to database...
```

### After Fix

```
Save file → HMR triggers
  ↓
Module reloads
  ↓
getNeonClient() checks global.__neonClient
  ↓
Existing client found! ✅
  ↓
Reuse connection
  ↓
Query runs instantly
```

**Console Output:**
```
[DB] Creating new Neon client (development)  ← Only once
[DB] Reusing existing Neon client (development)
[DB] Reusing existing Neon client (development)
[DB] Reusing existing Neon client (development)
```

---

## 🔍 Why Use `globalThis`?

### The Problem with Module Scope

```typescript
// ❌ This doesn't survive HMR
let cachedClient: any = null

if (!cachedClient) {
  cachedClient = neon(url)  // Still recreated on HMR
}
```

Module-scoped variables are **reset** when the module reloads during HMR.

### The Solution: `globalThis`

```typescript
// ✅ This DOES survive HMR
declare global {
  var __neonClient: ReturnType<typeof neon> | undefined
}

if (!global.__neonClient) {
  global.__neonClient = neon(url)  // Persists across HMR!
}
```

`globalThis` (or `global` in Node.js) is **not reset** during HMR, making it perfect for caching connections.

---

## 🎯 Key Benefits

| Benefit | Description |
|---------|-------------|
| **🚀 Faster Development** | No reconnection delays on every save |
| **💰 Resource Efficient** | Single connection instead of hundreds |
| **📊 Cleaner Logs** | Clear indication when reusing vs creating |
| **🔒 Production Safe** | Fresh connections per serverless invocation |
| **🐛 Easier Debugging** | Console logs show connection reuse |

---

## 🧪 Testing the Fix

### 1. Start Development Server

```bash
npm run dev
```

### 2. Watch Console Output

**First load:**
```
[DB] Creating new Neon client (development)
```

### 3. Save Any File

**After HMR:**
```
[DB] Reusing existing Neon client (development)
```

### 4. Verify No Reconnections

- ✅ Should see "Reusing" message on every save
- ✅ No connection timeouts
- ✅ Instant database queries
- ✅ No "Creating new" messages after first load

---

## 🔧 Advanced: Connection Lifecycle

### Development Lifecycle

```
Server Start
  ↓
First Request
  ↓
[DB] Creating new Neon client (development)
  ↓
Connection established ✅
  ↓
Save file (HMR)
  ↓
[DB] Reusing existing Neon client (development)
  ↓
Connection reused ✅
  ↓
Save file (HMR)
  ↓
[DB] Reusing existing Neon client (development)
  ↓
Connection reused ✅
  ↓
Server Restart (Ctrl+C)
  ↓
Connection closed
  ↓
Cycle repeats
```

### Production Lifecycle

```
Serverless Function Invocation
  ↓
getNeonClient() called
  ↓
New client created (no global check)
  ↓
Query executed
  ↓
Response sent
  ↓
Function disposed
  ↓
Connection cleaned up
```

---

## 🎓 Pattern Explanation

### Global Singleton Pattern

**Definition:** A design pattern that ensures only one instance of a class/object exists globally, and provides a global point of access to it.

**Use Cases:**
- ✅ Database connections
- ✅ Cache instances
- ✅ Configuration objects
- ✅ Logger instances
- ✅ API clients

**Next.js Specific:**
- Required for development HMR
- Prevents resource leaks
- Standard practice in Next.js projects

### TypeScript Declaration

```typescript
declare global {
  var __neonClient: ReturnType<typeof neon> | undefined
}
```

**Why `var` and not `let`/`const`?**
- Global declarations require `var`
- TypeScript enforces this for `declare global`
- eslint-disable comment suppresses the warning

**Why the double underscore `__`?**
- Convention for "private" global variables
- Indicates internal use only
- Prevents accidental conflicts

---

## 📚 References

### Next.js Documentation
- [Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh)
- [Database Connections](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating#connection-pooling)

### Neon Documentation
- [@neondatabase/serverless](https://neon.tech/docs/serverless/serverless-driver)
- [Connection Pooling](https://neon.tech/docs/connect/connection-pooling)

### Related Patterns
- [Singleton Pattern](https://refactoring.guru/design-patterns/singleton)
- [Module Pattern](https://www.patterns.dev/posts/module-pattern)

---

## 🐛 Troubleshooting

### Issue: Still Seeing Multiple "Creating" Messages

**Possible Causes:**
1. Server is restarting (not HMR)
2. Multiple entry points importing `lib/db.ts`
3. Environment variable not set correctly

**Solution:**
```bash
# Check NODE_ENV
echo $NODE_ENV

# Should be empty or "development" in dev mode
# If it's "production", the singleton won't work
```

### Issue: Connection Not Working in Production

**Possible Causes:**
1. Global singleton interfering with serverless
2. Environment variable issues

**Solution:**
- The fix is production-safe (bypasses global in production)
- Verify `process.env.NODE_ENV === "production"` in production
- Check Vercel/deployment logs for errors

### Issue: TypeScript Errors

**Error:**
```
Property '__neonClient' does not exist on type 'Global'
```

**Solution:**
- Ensure `declare global` block is present
- TypeScript version should be 5+
- Restart TypeScript server in IDE

---

## ✅ Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Connection per save** | ❌ Yes | ✅ No |
| **Development speed** | 🐌 Slow | ⚡ Fast |
| **Resource usage** | 📈 High | 📉 Low |
| **Production behavior** | ✅ Correct | ✅ Correct |
| **Console logs** | 📢 Spammy | 📊 Informative |

**The Global Singleton Pattern is now protecting your database connections from HMR reconnection issues while maintaining proper serverless behavior in production!** 🎉

---

## 📝 Related Files

- `lib/db.ts` - Main database configuration (modified)
- `lib/utils/db-config.ts` - Database URL configuration
- `docs/TROUBLESHOOTING_DATABASE_CONNECTION.md` - Connection troubleshooting
- `docs/DATABASE_TIMEOUT_TROUBLESHOOTING.md` - Timeout issues

---

## 🚀 Next Steps

1. ✅ Test in development - verify "Reusing" messages
2. ✅ Test in production - verify no issues
3. ✅ Monitor connection counts in Neon dashboard
4. ✅ Consider adding connection health checks
5. ✅ Document any project-specific connection patterns

---

**Last Updated:** 2026-02-24  
**Next.js Version:** 16.0.10  
**Neon Driver:** @neondatabase/serverless 1.0.2
