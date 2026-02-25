# PowerShell script to apply Customer Portal UI styling
# Changes: Smaller fonts, black buttons, less bold text, more compact spacing

Write-Host "Applying Customer Portal UI styling..." -ForegroundColor Cyan

# 1. Update Dashboard Header
Write-Host "`n1. Updating Dashboard Header..." -ForegroundColor Yellow
$file = "components/dashboard/dashboard-header.tsx"
$content = Get-Content $file -Raw

# Reduce header size and boldness
$content = $content -replace 'text-3xl font-bold', 'text-2xl font-semibold'
# Change button from blue to black
$content = $content -replace 'bg-blue-600 hover:bg-blue-700', 'bg-black hover:bg-gray-800'
# Reduce icon container size
$content = $content -replace 'w-14 h-14', 'w-12 h-12'
$content = $content -replace 'w-7 h-7', 'w-6 h-6'
# Remove icon container colors (make it simpler)
$content = $content -replace 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900', 'bg-slate-100 dark:bg-slate-800'
$content = $content -replace 'text-blue-600 dark:text-blue-400', 'text-slate-700 dark:text-slate-300'
# Reduce padding
$content = $content -replace 'px-6 py-3\.5', 'px-5 py-2.5'
# Remove scale effect
$content = $content -replace 'hover:scale-105', ''

Set-Content $file -Value $content -NoNewline
Write-Host "   ✓ Dashboard Header updated" -ForegroundColor Green

# 2. Update Tickets Header
Write-Host "`n2. Updating Tickets Header..." -ForegroundColor Yellow
$file = "components/tickets/tickets-header.tsx"
$content = Get-Content $file -Raw

# Reduce header size and boldness
$content = $content -replace 'text-2xl font-bold', 'text-xl font-semibold'
# Simplify icon container
$content = $content -replace 'w-12 h-12', 'w-10 h-10'
$content = $content -replace 'w-6 h-6', 'w-5 h-5'
$content = $content -replace 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900', 'bg-slate-100 dark:bg-slate-800'
$content = $content -replace 'text-blue-600 dark:text-blue-400', 'text-slate-700 dark:text-slate-300'

Set-Content $file -Value $content -NoNewline
Write-Host "   ✓ Tickets Header updated" -ForegroundColor Green

# 3. Update Horizontal Nav
Write-Host "`n3. Updating Horizontal Navigation..." -ForegroundColor Yellow
$file = "components/layout/horizontal-nav.tsx"
$content = Get-Content $file -Raw

# Reduce logo text size
$content = $content -replace 'font-bold text-slate-900 dark:text-white text-lg', 'font-semibold text-slate-900 dark:text-white text-base'
# Change avatar background from blue to black
$content = $content -replace 'bg-blue-600', 'bg-black'
# Simplify logo container
$content = $content -replace 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900', 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'

Set-Content $file -Value $content -NoNewline
Write-Host "   ✓ Horizontal Navigation updated" -ForegroundColor Green

Write-Host "`n✅ Customer Portal UI styling applied successfully!" -ForegroundColor Green
Write-Host "`nChanges made:" -ForegroundColor Cyan
Write-Host "  • Headers: Reduced from text-3xl/2xl to text-2xl/xl" -ForegroundColor White
Write-Host "  • Font weights: Changed from font-bold to font-semibold" -ForegroundColor White
Write-Host "  • Buttons: Changed from blue (bg-blue-600) to black (bg-black)" -ForegroundColor White
Write-Host "  • Icon containers: Simplified colors, reduced sizes" -ForegroundColor White
Write-Host "  • Spacing: More compact padding" -ForegroundColor White
Write-Host "  • Avatars: Changed from blue to black background" -ForegroundColor White
