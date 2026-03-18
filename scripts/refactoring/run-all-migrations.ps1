# =====================================================
# DATABASE REFACTORING - MASTER EXECUTION SCRIPT (PowerShell)
# =====================================================
# Purpose: Run all refactoring migrations in correct order
# Usage: .\run-all-migrations.ps1 [-DatabaseName "ticketportal"]
# =====================================================

param(
    [string]$DatabaseName = "ticketportal",
    [string]$DatabaseUser = $env:DB_USER ?? "postgres",
    [string]$DatabaseHost = $env:DB_HOST ?? "localhost",
    [string]$DatabasePort = $env:DB_PORT ?? "5432"
)

$ErrorActionPreference = "Stop"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║         DATABASE REFACTORING MIGRATION                    ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "Database: " -ForegroundColor Yellow -NoNewline
Write-Host $DatabaseName
Write-Host "Host: " -ForegroundColor Yellow -NoNewline
Write-Host "$DatabaseHost`:$DatabasePort"
Write-Host "User: " -ForegroundColor Yellow -NoNewline
Write-Host $DatabaseUser
Write-Host ""

# Confirm before proceeding
$confirmation = Read-Host "Have you backed up your database? [y/N]"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Aborting. Please backup your database first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting migration..." -ForegroundColor Yellow
Write-Host ""

# Function to run a SQL script
function Run-SqlScript {
    param(
        [string]$ScriptFile
    )
    
    $ScriptName = Split-Path -Leaf $ScriptFile
    $Timestamp = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$Timestamp] Running " -ForegroundColor Blue -NoNewline
    Write-Host $ScriptName -ForegroundColor Yellow -NoNewline
    Write-Host "..."
    
    try {
        $env:PGPASSWORD = $env:DB_PASSWORD
        psql -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -f $ScriptFile -q
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        Write-Host "$ScriptName completed successfully"
        return $true
    }
    catch {
        Write-Host "✗ " -ForegroundColor Red -NoNewline
        Write-Host "$ScriptName failed!"
        Write-Host "Error details:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Migration scripts in order
$Scripts = @(
    "001-create-ticket-audit-events.sql",
    "002-create-ticket-projects.sql",
    "003-create-ticket-redirections.sql",
    "004-create-ticket-hierarchy.sql",
    "005-create-business-group-spocs.sql",
    "006-create-master-data-entities.sql",
    "007-refactor-tickets-table.sql",
    "008-migrate-ticket-audit-data.sql",
    "009-migrate-ticket-projects-data.sql",
    "010-migrate-ticket-redirections-data.sql",
    "011-migrate-ticket-hierarchy-data.sql",
    "012-migrate-business-group-spocs-data.sql",
    "013-migrate-master-data-references.sql",
    "014-helper-functions.sql"
)

$Total = $Scripts.Count
$Current = 0
$Failed = 0

# Phase 1: Create tables
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "Phase 1: Creating New Entity Tables" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

for ($i = 0; $i -lt 6; $i++) {
    $Current++
    Write-Host "[$Current/$Total]" -ForegroundColor Blue
    
    $ScriptPath = Join-Path $ScriptDir $Scripts[$i]
    if (-not (Run-SqlScript -ScriptFile $ScriptPath)) {
        $Failed++
        Write-Host "Migration failed at $($Scripts[$i])" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Phase 2: Add columns
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "Phase 2: Adding New Columns to Tickets Table" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

$Current++
Write-Host "[$Current/$Total]" -ForegroundColor Blue
$ScriptPath = Join-Path $ScriptDir $Scripts[6]
if (-not (Run-SqlScript -ScriptFile $ScriptPath)) {
    $Failed++
    Write-Host "Migration failed at $($Scripts[6])" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Phase 3: Migrate data
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "Phase 3: Migrating Data to New Tables" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

for ($i = 7; $i -lt 13; $i++) {
    $Current++
    Write-Host "[$Current/$Total]" -ForegroundColor Blue
    
    $ScriptPath = Join-Path $ScriptDir $Scripts[$i]
    if (-not (Run-SqlScript -ScriptFile $ScriptPath)) {
        $Failed++
        Write-Host "Migration failed at $($Scripts[$i])" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Phase 4: Helper functions
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "Phase 4: Creating Helper Functions" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

$Current++
Write-Host "[$Current/$Total]" -ForegroundColor Blue
$ScriptPath = Join-Path $ScriptDir $Scripts[13]
if (-not (Run-SqlScript -ScriptFile $ScriptPath)) {
    $Failed++
    Write-Host "Migration failed at $($Scripts[13])" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "✓ MIGRATION COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""
Write-Host "All $Total scripts executed successfully!" -ForegroundColor Green
Write-Host ""

# Verification
Write-Host "Running verification queries..." -ForegroundColor Yellow
Write-Host ""

$VerificationQuery = @"
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
"@

$env:PGPASSWORD = $env:DB_PASSWORD
psql -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -c $VerificationQuery

Write-Host ""
Write-Host "Verification complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review verification output above"
Write-Host "2. Update application code to use new entity structure"
Write-Host "3. Test thoroughly on staging environment"
Write-Host "4. Deploy to production"
Write-Host "5. After verification, drop legacy columns (see 007-refactor-tickets-table.sql)"
Write-Host ""
Write-Host "For detailed documentation, see:" -ForegroundColor Blue
Write-Host "- DATABASE_REFACTORING_GUIDE.md"
Write-Host "- DATABASE_REFACTORING_SUMMARY.md"
Write-Host "- scripts/refactoring/ENTITY_DIAGRAM.md"
Write-Host ""
