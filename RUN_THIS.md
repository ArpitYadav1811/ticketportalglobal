# 🚀 RUN THIS - Neon Database Migration

## Copy and Paste These Commands

### Step 1: Install WebSocket Package (Required)

```bash
cd ~/work/personal/TicketPortal/ticketportalglobal
npm install ws
```

### Step 2: Run Migration

```bash
node migrate.js
```

That's it! The script will:
- ✅ Connect to your Neon database
- ✅ Create 10 new entity tables
- ✅ Migrate all data
- ✅ Verify everything worked

---

## Expected Output

You should see something like:

```
🚀 NEON DATABASE REFACTORING MIGRATION

[1/14] 001-create-ticket-audit-events.sql
✅ Completed

[2/14] 002-create-ticket-projects.sql
✅ Completed

... (continues for all 14 scripts)

📊 SUMMARY: 14 completed, 0 skipped

🔍 Verifying...

✅ New tables: 10/10

📊 Row counts:
   tickets: 150
   ticket_audit_events: 450
   business_group_spocs: 12
   ticket_statuses: 7

✅ MIGRATION COMPLETE!
```

---

## If You See Errors

### Error: "already exists"

This is GOOD! It means tables were already created. The script will skip and continue.

### Error: "Cannot find module"

```bash
# Install dependencies
npm install

# Try again
node migrate.js
```

### Error: "DATABASE_URL not found"

```bash
# Check .env.local exists
cat .env.local | grep DATABASE_URL

# Should show your Neon connection string
```

---

## After Migration

### Verify It Worked

```bash
# Quick verification
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
(async () => {
  const r = await sql\`SELECT COUNT(*) as count FROM ticket_audit_events\`;
  console.log('✅ Audit events:', r[0].count);
  
  const r2 = await sql\`SELECT COUNT(*) as count FROM business_group_spocs\`;
  console.log('✅ SPOCs:', r2[0].count);
  
  const r3 = await sql\`SELECT COUNT(*) as count FROM ticket_statuses\`;
  console.log('✅ Statuses:', r3[0].count);
  
  console.log('\n✅ Migration successful!');
})().catch(console.error);
"
```

---

## What Changed?

### Before
- `tickets` table: 40+ columns (messy!)
- String-based SPOCs: `spoc_name VARCHAR`
- VARCHAR master data: `status VARCHAR`

### After
- `tickets` table: ~20 columns (clean!)
- FK-based SPOCs: `business_group_spocs` table
- Master data tables: `ticket_statuses`, `ticket_priorities`, `ticket_types`

---

## Next Steps

1. ✅ Run migration: `node migrate.js`
2. ⏳ Update application code (see `lib/actions/entities/README.md`)
3. ⏳ Test thoroughly
4. ⏳ Deploy

---

## Need Help?

- **Detailed guide**: `DATABASE_REFACTORING_GUIDE.md`
- **Visual comparison**: `BEFORE_AFTER_COMPARISON.md`
- **Quick start**: `REFACTORING_QUICK_START.md`

---

## The Command (Copy This)

```bash
cd ~/work/personal/TicketPortal/ticketportalglobal && node migrate.js
```

**That's all you need to run!**
