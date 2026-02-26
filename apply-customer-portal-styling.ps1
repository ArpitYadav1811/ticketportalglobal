# Apply Customer Portal Styling - Comprehensive Update
# Matches padding, margins, shadows, colors from Customer Portal

Write-Host "Applying Customer Portal styling across Ticket Portal..." -ForegroundColor Cyan

# 1. Update Dashboard Page
Write-Host "`n1. Updating Dashboard Page..." -ForegroundColor Yellow
$file = "app/dashboard/page.tsx"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    # Update container padding and background
    $content = $content -replace 'className="p-8', 'className="p-6'
    $content = $content -replace 'className="space-y-8', 'className="space-y-6'
    $content = $content -replace 'shadow-lg', 'shadow-sm'
    $content = $content -replace 'shadow-xl', 'shadow-sm'
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Dashboard page updated" -ForegroundColor Green
}

# 2. Update Create Ticket Form
Write-Host "`n2. Updating Create Ticket Form..." -ForegroundColor Yellow
$file = "components/tickets/create-ticket-form.tsx"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    # Reduce padding
    $content = $content -replace 'p-8', 'p-6'
    $content = $content -replace 'p-6 md:p-8', 'p-6'
    $content = $content -replace 'px-8', 'px-6'
    $content = $content -replace 'py-8', 'py-6'
    # Reduce spacing
    $content = $content -replace 'space-y-8', 'space-y-6'
    $content = $content -replace 'gap-8', 'gap-6'
    $content = $content -replace 'mb-8', 'mb-6'
    $content = $content -replace 'mt-8', 'mt-6'
    # Reduce shadows
    $content = $content -replace 'shadow-lg', 'shadow-sm'
    $content = $content -replace 'shadow-xl', 'shadow'
    # Update rounded corners
    $content = $content -replace 'rounded-2xl', 'rounded-lg'
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Create Ticket Form updated" -ForegroundColor Green
}

# 3. Update Tickets Table
Write-Host "`n3. Updating Tickets Table..." -ForegroundColor Yellow
$file = "components/tickets/tickets-table.tsx"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'shadow-lg', 'shadow-sm'
    $content = $content -replace 'shadow-xl', 'shadow'
    $content = $content -replace 'rounded-2xl', 'rounded-lg'
    $content = $content -replace 'p-8', 'p-6'
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Tickets Table updated" -ForegroundColor Green
}

# 4. Update Tickets Filter
Write-Host "`n4. Updating Tickets Filter..." -ForegroundColor Yellow
$file = "components/tickets/tickets-filter.tsx"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'shadow-lg', 'shadow-sm'
    $content = $content -replace 'p-8', 'p-6'
    $content = $content -replace 'gap-8', 'gap-6'
    $content = $content -replace 'space-y-8', 'space-y-6'
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Tickets Filter updated" -ForegroundColor Green
}

# 5. Update Dashboard Header
Write-Host "`n5. Updating Dashboard Header..." -ForegroundColor Yellow
$file = "components/dashboard/dashboard-header.tsx"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'shadow-lg', 'shadow-sm'
    $content = $content -replace 'shadow-xl', 'shadow'
    $content = $content -replace 'rounded-xl', 'rounded-lg'
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Dashboard Header updated" -ForegroundColor Green
}

# 6. Update Tickets Header
Write-Host "`n6. Updating Tickets Header..." -ForegroundColor Yellow
$file = "components/tickets/tickets-header.tsx"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'shadow-md', 'shadow-sm'
    $content = $content -replace 'rounded-xl', 'rounded-lg'
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Tickets Header updated" -ForegroundColor Green
}

# 7. Update Quick Stats
Write-Host "`n7. Updating Quick Stats..." -ForegroundColor Yellow
$file = "components/dashboard/quick-stats.tsx"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'shadow-lg', 'shadow-sm'
    $content = $content -replace 'shadow-md', 'shadow-sm'
    $content = $content -replace 'rounded-2xl', 'rounded-lg'
    $content = $content -replace 'p-8', 'p-6'
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Quick Stats updated" -ForegroundColor Green
}

# 8. Update Settings Page
Write-Host "`n8. Updating Settings Page..." -ForegroundColor Yellow
$file = "app/settings/page.tsx"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'shadow-lg', 'shadow-sm'
    $content = $content -replace 'p-8', 'p-6'
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Settings Page updated" -ForegroundColor Green
}

# 9. Update Global CSS for consistent styling
Write-Host "`n9. Updating Global CSS..." -ForegroundColor Yellow
$file = "app/globals.css"
$content = Get-Content $file -Raw

# Update button and input utility classes
$updatedStyles = @"

/* Customer Portal Consistent Styling */
.card-container {
  @apply bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm;
}

.form-section {
  @apply space-y-4 p-6;
}

.page-container {
  @apply p-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen;
}

.section-header {
  @apply text-base font-semibold text-slate-900 dark:text-white mb-4;
}
"@

if ($content -notmatch "Customer Portal Consistent Styling") {
    $content = $content + $updatedStyles
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✓ Global CSS updated" -ForegroundColor Green
} else {
    Write-Host "   ℹ Global CSS already has custom styles" -ForegroundColor Gray
}

Write-Host "`n✅ Customer Portal styling applied successfully!" -ForegroundColor Green
Write-Host "`nChanges applied:" -ForegroundColor Cyan
Write-Host "  • Padding: Reduced from p-8 to p-6 (more compact)" -ForegroundColor White
Write-Host "  • Spacing: Reduced from space-y-8/gap-8 to space-y-6/gap-6" -ForegroundColor White
Write-Host "  • Shadows: Changed from shadow-lg/xl to shadow-sm (subtle)" -ForegroundColor White
Write-Host "  • Rounded: Changed from rounded-2xl to rounded-lg (less rounded)" -ForegroundColor White
Write-Host "  • Margins: Reduced from mb-8/mt-8 to mb-6/mt-6" -ForegroundColor White
Write-Host "  • Background: Light gray (bg-gray-50) for pages" -ForegroundColor White
