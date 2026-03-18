#!/bin/bash

# =====================================================
# DATABASE REFACTORING - MASTER EXECUTION SCRIPT
# =====================================================
# Purpose: Run all refactoring migrations in correct order
# Usage: ./run-all-migrations.sh [database_name]
# =====================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="${1:-ticketportal}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         DATABASE REFACTORING MIGRATION                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Database:${NC} $DB_NAME"
echo -e "${YELLOW}Host:${NC} $DB_HOST:$DB_PORT"
echo -e "${YELLOW}User:${NC} $DB_USER"
echo ""

# Confirm before proceeding
read -p "$(echo -e ${YELLOW}Have you backed up your database? [y/N]:${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborting. Please backup your database first.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Starting migration...${NC}"
echo ""

# Function to run a SQL script
run_script() {
    local script_file=$1
    local script_name=$(basename "$script_file")
    
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Running ${YELLOW}$script_name${NC}..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$script_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $script_name completed successfully"
        return 0
    else
        echo -e "${RED}✗${NC} $script_name failed!"
        echo -e "${RED}Error details:${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$script_file"
        return 1
    fi
}

# Migration scripts in order
SCRIPTS=(
    "001-create-ticket-audit-events.sql"
    "002-create-ticket-projects.sql"
    "003-create-ticket-redirections.sql"
    "004-create-ticket-hierarchy.sql"
    "005-create-business-group-spocs.sql"
    "006-create-master-data-entities.sql"
    "007-refactor-tickets-table.sql"
    "008-migrate-ticket-audit-data.sql"
    "009-migrate-ticket-projects-data.sql"
    "010-migrate-ticket-redirections-data.sql"
    "011-migrate-ticket-hierarchy-data.sql"
    "012-migrate-business-group-spocs-data.sql"
    "013-migrate-master-data-references.sql"
    "014-helper-functions.sql"
)

# Track progress
TOTAL=${#SCRIPTS[@]}
CURRENT=0
FAILED=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 1: Creating New Entity Tables${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Run scripts 001-006 (create tables)
for i in {0..5}; do
    CURRENT=$((CURRENT + 1))
    echo -e "${BLUE}[$CURRENT/$TOTAL]${NC}"
    
    if ! run_script "$SCRIPT_DIR/${SCRIPTS[$i]}"; then
        FAILED=$((FAILED + 1))
        echo -e "${RED}Migration failed at ${SCRIPTS[$i]}${NC}"
        exit 1
    fi
    echo ""
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 2: Adding New Columns to Tickets Table${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Run script 007 (add columns)
CURRENT=$((CURRENT + 1))
echo -e "${BLUE}[$CURRENT/$TOTAL]${NC}"
if ! run_script "$SCRIPT_DIR/${SCRIPTS[6]}"; then
    FAILED=$((FAILED + 1))
    echo -e "${RED}Migration failed at ${SCRIPTS[6]}${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 3: Migrating Data to New Tables${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Run scripts 008-013 (migrate data)
for i in {7..12}; do
    CURRENT=$((CURRENT + 1))
    echo -e "${BLUE}[$CURRENT/$TOTAL]${NC}"
    
    if ! run_script "$SCRIPT_DIR/${SCRIPTS[$i]}"; then
        FAILED=$((FAILED + 1))
        echo -e "${RED}Migration failed at ${SCRIPTS[$i]}${NC}"
        exit 1
    fi
    echo ""
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 4: Creating Helper Functions${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Run script 014 (helper functions)
CURRENT=$((CURRENT + 1))
echo -e "${BLUE}[$CURRENT/$TOTAL]${NC}"
if ! run_script "$SCRIPT_DIR/${SCRIPTS[13]}"; then
    FAILED=$((FAILED + 1))
    echo -e "${RED}Migration failed at ${SCRIPTS[13]}${NC}"
    exit 1
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ MIGRATION COMPLETED SUCCESSFULLY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}All $TOTAL scripts executed successfully!${NC}"
echo ""

# Verification
echo -e "${YELLOW}Running verification queries...${NC}"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Check new tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
  'ticket_audit_events', 'ticket_projects', 'ticket_redirections', 
  'ticket_hierarchy', 'business_group_spocs', 'ticket_statuses', 
  'ticket_priorities', 'ticket_types', 'user_roles', 'user_role_assignments'
)
ORDER BY table_name;

-- Check row counts
SELECT 'tickets' as table_name, COUNT(*) as row_count FROM tickets
UNION ALL SELECT 'ticket_audit_events', COUNT(*) FROM ticket_audit_events
UNION ALL SELECT 'ticket_projects', COUNT(*) FROM ticket_projects
UNION ALL SELECT 'ticket_redirections', COUNT(*) FROM ticket_redirections
UNION ALL SELECT 'ticket_hierarchy', COUNT(*) FROM ticket_hierarchy
UNION ALL SELECT 'business_group_spocs', COUNT(*) FROM business_group_spocs
UNION ALL SELECT 'ticket_statuses', COUNT(*) FROM ticket_statuses
UNION ALL SELECT 'ticket_priorities', COUNT(*) FROM ticket_priorities
UNION ALL SELECT 'ticket_types', COUNT(*) FROM ticket_types
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
ORDER BY table_name;

-- Check for NULL values in critical FK columns
SELECT 
  'tickets.status_id' as column_name,
  COUNT(*) FILTER (WHERE status_id IS NULL) as null_count,
  COUNT(*) as total_count
FROM tickets
UNION ALL
SELECT 
  'tickets.priority_id',
  COUNT(*) FILTER (WHERE priority_id IS NULL),
  COUNT(*)
FROM tickets
UNION ALL
SELECT 
  'tickets.type_id',
  COUNT(*) FILTER (WHERE type_id IS NULL),
  COUNT(*)
FROM tickets;
EOF

echo ""
echo -e "${GREEN}Verification complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review verification output above"
echo "2. Update application code to use new entity structure"
echo "3. Test thoroughly on staging environment"
echo "4. Deploy to production"
echo "5. After verification, drop legacy columns (see 007-refactor-tickets-table.sql)"
echo ""
echo -e "${BLUE}For detailed documentation, see:${NC}"
echo "- DATABASE_REFACTORING_GUIDE.md"
echo "- DATABASE_REFACTORING_SUMMARY.md"
echo "- scripts/refactoring/ENTITY_DIAGRAM.md"
echo ""
