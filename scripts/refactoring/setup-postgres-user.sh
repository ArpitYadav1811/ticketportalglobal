#!/bin/bash

# =====================================================
# POSTGRESQL USER SETUP SCRIPT
# =====================================================
# Purpose: Create PostgreSQL role for current OS user
# Usage: ./setup-postgres-user.sh
# =====================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PostgreSQL User Setup                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get current OS username
CURRENT_USER=$(whoami)
DB_NAME="ticketportal"

echo -e "${YELLOW}Current OS user:${NC} $CURRENT_USER"
echo -e "${YELLOW}Database:${NC} $DB_NAME"
echo ""

# Prompt for password
echo -e "${YELLOW}Enter password for PostgreSQL user '$CURRENT_USER':${NC}"
read -s PASSWORD
echo ""

# Confirm password
echo -e "${YELLOW}Confirm password:${NC}"
read -s PASSWORD_CONFIRM
echo ""

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
    echo -e "${RED}Passwords don't match. Aborting.${NC}"
    exit 1
fi

echo -e "${BLUE}Creating PostgreSQL role...${NC}"

# Create role
sudo -u postgres psql << EOF
-- Drop role if exists (for idempotency)
DROP ROLE IF EXISTS $CURRENT_USER;

-- Create role with superuser privileges
CREATE ROLE $CURRENT_USER WITH LOGIN SUPERUSER PASSWORD '$PASSWORD';

-- Grant privileges on database
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $CURRENT_USER;

-- Grant privileges on all tables
\c $DB_NAME
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $CURRENT_USER;

-- Show created role
\du $CURRENT_USER
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PostgreSQL role created successfully!${NC}"
    echo ""
    
    # Create .pgpass file
    echo -e "${BLUE}Creating .pgpass file for passwordless access...${NC}"
    PGPASS_FILE="$HOME/.pgpass"
    echo "localhost:5432:$DB_NAME:$CURRENT_USER:$PASSWORD" > $PGPASS_FILE
    chmod 600 $PGPASS_FILE
    echo -e "${GREEN}✓ .pgpass file created${NC}"
    echo ""
    
    # Test connection
    echo -e "${BLUE}Testing connection...${NC}"
    if psql -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connection successful!${NC}"
        echo ""
        echo -e "${GREEN}Setup complete! You can now run:${NC}"
        echo -e "  ${YELLOW}pg_dump -d ticketportal > backup.sql${NC}"
        echo -e "  ${YELLOW}./run-all-migrations.sh ticketportal${NC}"
    else
        echo -e "${YELLOW}⚠ Connection test failed. You may need to configure pg_hba.conf${NC}"
        echo ""
        echo -e "${YELLOW}See SETUP_POSTGRESQL.md for detailed instructions${NC}"
    fi
else
    echo -e "${RED}✗ Failed to create role${NC}"
    exit 1
fi
