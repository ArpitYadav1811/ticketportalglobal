# Fix ALL buttons to use consistent black color

Write-Host "Fixing all buttons to use black color..." -ForegroundColor Cyan

$files = @(
    "components/layout/horizontal-nav.tsx",
    "components/teams/teams-header.tsx",
    "components/master-data/unified-master-data-v2.tsx",
    "components/master-data/business-unit-groups-tab.tsx",
    "components/master-data/subcategories-tab.tsx",
    "components/master-data/project-names-tab.tsx",
    "components/master-data/categories-tab.tsx",
    "components/master-data/target-business-group-mappings-tab.tsx",
    "components/settings/add-team-member-modal.tsx",
    "components/teams/add-team-member-modal.tsx",
    "components/teams/create-user-modal.tsx",
    "components/users/edit-user-modal.tsx",
    "app/admin/page.tsx",
    "components/error-boundary.tsx",
    "components/auth/login-form.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Replace gradient buttons with black
        $content = $content -replace 'bg-gradient-to-r from-primary to-secondary', 'bg-black hover:bg-gray-800'
        
        # Replace primary color buttons with black
        $content = $content -replace 'bg-primary([^/])', 'bg-black$1'
        $content = $content -replace 'hover:bg-primary/90', 'hover:bg-gray-800'
        
        # Replace blue buttons with black
        $content = $content -replace 'bg-blue-600', 'bg-black'
        $content = $content -replace 'bg-blue-500', 'bg-black'
        $content = $content -replace 'hover:bg-blue-600', 'hover:bg-gray-800'
        $content = $content -replace 'hover:bg-blue-700', 'hover:bg-gray-800'
        
        # Fix navbar logo container (remove blue background)
        $content = $content -replace 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900', 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
        
        # Fix avatar backgrounds (keep black)
        # Already black, no change needed
        
        # Fix badge backgrounds
        $content = $content -replace 'bg-blue-50 text-blue-700', 'bg-slate-100 text-slate-700'
        
        # Fix primary color text
        $content = $content -replace 'text-primary border border-primary', 'text-black border border-black'
        $content = $content -replace 'hover:bg-primary hover:text-white', 'hover:bg-black hover:text-white'
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "  ✓ $file" -ForegroundColor Green
    }
}

Write-Host "`n✅ All buttons updated to black!" -ForegroundColor Green
