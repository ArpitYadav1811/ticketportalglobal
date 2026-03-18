# Quick Fix for PostgreSQL Issues

## Your Current Errors

1. ❌ `Peer authentication failed for user "postgres"`
2. ❌ `Permission denied` on shell script
3. ❌ `role "arpit" does not exist`

---

## Quick Solution (5 minutes)

### Option 1: Create Your PostgreSQL Role (Recommended)

```bash
# Step 1: Create PostgreSQL role for user 'arpit'
sudo -u postgres psql << 'EOF'
CREATE ROLE arpit WITH LOGIN SUPERUSER PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE ticketportal TO arpit;
\c ticketportal
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO arpit;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO arpit;
EOF

# Step 2: Create .pgpass file (for passwordless access)
echo "localhost:5432:ticketportal:arpit:yourpassword" > ~/.pgpass
chmod 600 ~/.pgpass

# Step 3: Test connection
psql -d ticketportal -c "SELECT version();"

# Step 4: Now run migrations
cd ~/work/personal/TicketPortal/ticketportalglobal
pg_dump -d ticketportal > backup_$(date +%Y%m%d).sql
cd scripts/refactoring
./run-all-migrations.sh ticketportal
```

---

### Option 2: Use postgres User (Simpler)

```bash
# Just use sudo for everything
cd ~/work/personal/TicketPortal/ticketportalglobal

# Backup
sudo -u postgres pg_dump -d ticketportal > backup_$(date +%Y%m%d).sql

# Run migrations
cd scripts/refactoring
sudo -u postgres bash ./run-all-migrations.sh ticketportal

# Verify
sudo -u postgres psql -d ticketportal -c "SELECT COUNT(*) FROM ticket_audit_events;"
```

---

## Which Option Should You Choose?

### Choose Option 1 if:
- You want to use your own username
- You want passwordless access (via .pgpass)
- You'll be running migrations frequently

### Choose Option 2 if:
- You want a quick one-time migration
- You don't want to configure PostgreSQL
- You're okay with using sudo

---

## After Setup

Once PostgreSQL is working, run the migrations:

```bash
# 1. Backup
pg_dump -d ticketportal > backup_$(date +%Y%m%d).sql

# 2. Run migrations
cd scripts/refactoring
./run-all-migrations.sh ticketportal

# 3. Verify
psql -d ticketportal -c "SELECT COUNT(*) FROM ticket_audit_events;"
psql -d ticketportal -c "SELECT COUNT(*) FROM business_group_spocs;"
psql -d ticketportal -c "SELECT COUNT(*) FROM ticket_statuses;"
```

---

## One-Liner Setup

Copy and paste this entire block:

```bash
# Setup PostgreSQL role
sudo -u postgres psql -c "CREATE ROLE arpit WITH LOGIN SUPERUSER PASSWORD 'changeme123';" && \
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ticketportal TO arpit;" && \
echo "localhost:5432:ticketportal:arpit:changeme123" > ~/.pgpass && \
chmod 600 ~/.pgpass && \
echo "✓ Setup complete! Test with: psql -d ticketportal -c 'SELECT version();'"
```

Then test:
```bash
psql -d ticketportal -c "SELECT version();"
```

---

## Need More Help?

See `SETUP_POSTGRESQL.md` for detailed troubleshooting.
