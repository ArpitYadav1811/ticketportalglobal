# PostgreSQL Setup Guide for Migration

## Common Issues and Solutions

### Issue 1: Peer Authentication Failed

**Error**: `FATAL: Peer authentication failed for user "postgres"`

**Cause**: PostgreSQL is configured to use "peer" authentication, which requires the OS user to match the database user.

**Solution**: Use password authentication or switch to the postgres OS user.

#### Option A: Use Password Authentication (Recommended)

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Find this line:
# local   all             postgres                                peer

# Change to:
local   all             postgres                                md5

# Save and restart PostgreSQL
sudo systemctl restart postgresql
```

#### Option B: Switch to postgres OS user

```bash
# Switch to postgres user
sudo -u postgres psql

# Or run commands as postgres user
sudo -u postgres pg_dump -d ticketportal > backup.sql
sudo -u postgres psql -d ticketportal -f script.sql
```

#### Option C: Create PostgreSQL role for your OS user

```bash
# Switch to postgres user
sudo -u postgres psql

# Create role for your OS user
CREATE ROLE arpit WITH LOGIN SUPERUSER PASSWORD 'your_password';

# Exit psql
\q

# Now you can use your OS username
psql -d ticketportal -c "SELECT version();"
```

---

### Issue 2: Permission Denied on Shell Script

**Error**: `./run-all-migrations.sh: Permission denied`

**Cause**: Shell script doesn't have execute permissions.

**Solution**:

```bash
# Add execute permission
chmod +x run-all-migrations.sh

# Verify
ls -la run-all-migrations.sh

# Now run it
./run-all-migrations.sh ticketportal
```

---

### Issue 3: Role Does Not Exist

**Error**: `FATAL: role "arpit" does not exist`

**Cause**: PostgreSQL doesn't have a role/user for your OS username.

**Solution**:

```bash
# Option 1: Create role as postgres user
sudo -u postgres psql -c "CREATE ROLE arpit WITH LOGIN SUPERUSER PASSWORD 'your_password';"

# Option 2: Use postgres user for all operations
sudo -u postgres psql -d ticketportal

# Option 3: Specify postgres user in commands
psql -U postgres -d ticketportal
```

---

## Quick Setup (Recommended)

### Step 1: Create Your PostgreSQL Role

```bash
# Create role with your OS username
sudo -u postgres psql << EOF
CREATE ROLE arpit WITH LOGIN SUPERUSER PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ticketportal TO arpit;
EOF
```

### Step 2: Configure Password Authentication

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add this line at the top (before other rules):
local   all             arpit                                   md5

# Save and restart
sudo systemctl restart postgresql
```

### Step 3: Set Password Environment Variable

```bash
# Add to ~/.bashrc or ~/.zshrc
export PGPASSWORD='your_secure_password'

# Or create .pgpass file (more secure)
echo "localhost:5432:ticketportal:arpit:your_secure_password" > ~/.pgpass
chmod 600 ~/.pgpass
```

### Step 4: Fix Script Permissions

```bash
cd scripts/refactoring
chmod +x run-all-migrations.sh
```

### Step 5: Test Connection

```bash
# Test connection
psql -d ticketportal -c "SELECT version();"

# Should work without errors
```

---

## Alternative: Use postgres User for Migration

If you don't want to create a new role, use the postgres user:

```bash
# 1. Backup (as postgres user)
sudo -u postgres pg_dump -d ticketportal > backup_$(date +%Y%m%d).sql

# 2. Fix script permissions
chmod +x scripts/refactoring/run-all-migrations.sh

# 3. Run migrations (as postgres user)
sudo -u postgres bash scripts/refactoring/run-all-migrations.sh ticketportal

# 4. Verify
sudo -u postgres psql -d ticketportal -c "SELECT COUNT(*) FROM ticket_audit_events;"
```

---

## Recommended Approach for Your Situation

Based on your errors, here's what I recommend:

```bash
# 1. Create your PostgreSQL role
sudo -u postgres psql -c "CREATE ROLE arpit WITH LOGIN SUPERUSER PASSWORD 'yourpassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ticketportal TO arpit;"

# 2. Set password environment variable
export PGPASSWORD='yourpassword'

# 3. Fix script permissions
cd ~/work/personal/TicketPortal/ticketportalglobal/scripts/refactoring
chmod +x run-all-migrations.sh

# 4. Test connection
psql -d ticketportal -c "SELECT version();"

# 5. Backup database
cd ~/work/personal/TicketPortal/ticketportalglobal
pg_dump -d ticketportal > backup_$(date +%Y%m%d).sql

# 6. Run migrations
cd scripts/refactoring
./run-all-migrations.sh ticketportal

# 7. Verify
psql -d ticketportal -c "SELECT COUNT(*) FROM ticket_audit_events;"
```

---

## Troubleshooting

### Find PostgreSQL Config Files

```bash
# Find pg_hba.conf location
sudo -u postgres psql -c "SHOW hba_file;"

# Find postgresql.conf location
sudo -u postgres psql -c "SHOW config_file;"
```

### Check PostgreSQL Status

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### List Existing Roles

```bash
# List all PostgreSQL roles
sudo -u postgres psql -c "\du"
```

### Check Database Ownership

```bash
# Check database owner
sudo -u postgres psql -c "\l ticketportal"
```

---

## Security Notes

1. **Never commit passwords** to version control
2. **Use strong passwords** for database roles
3. **Restrict .pgpass permissions** to 600 (owner read/write only)
4. **Use environment variables** for sensitive data
5. **Rotate passwords** regularly

---

## After Setup

Once PostgreSQL is configured correctly, you can proceed with the migration:

1. ✅ Backup database
2. ✅ Run migrations
3. ✅ Verify data
4. ⏳ Update application code
5. ⏳ Test thoroughly
6. ⏳ Deploy

---

## Quick Reference

### Common Commands

```bash
# Connect to database
psql -d ticketportal

# Connect as specific user
psql -U postgres -d ticketportal

# Run SQL file
psql -d ticketportal -f script.sql

# Run SQL command
psql -d ticketportal -c "SELECT COUNT(*) FROM tickets;"

# Backup database
pg_dump -d ticketportal > backup.sql

# Restore database
psql -d ticketportal < backup.sql
```

### Environment Variables

```bash
# Set in ~/.bashrc or ~/.zshrc
export PGDATABASE=ticketportal
export PGUSER=arpit
export PGPASSWORD=yourpassword
export PGHOST=localhost
export PGPORT=5432
```

---

Need more help? Check the PostgreSQL documentation or let me know what specific error you're encountering.
