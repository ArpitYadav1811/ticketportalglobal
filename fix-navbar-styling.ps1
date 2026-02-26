# Fix Navbar to Match Customer Portal

Write-Host "Fixing navbar styling..." -ForegroundColor Cyan

$file = "components/layout/horizontal-nav.tsx"
$content = Get-Content $file -Raw

# 1. Remove logo container background - logo should be direct
$content = $content -replace '<div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700[^>]*>', ''
$content = $content -replace '</div>\s*</div>\s*<div className="hidden sm:block">', '</div><div className="hidden sm:block">'

# 2. Increase navbar height (py-2 -> py-4)
$content = $content -replace 'className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"', 'className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"'
$content = $content -replace 'px-4 py-2', 'px-4 py-4'
$content = $content -replace 'px-6 py-2', 'px-6 py-4'

# 3. Reduce title font size (text-base -> text-sm)
$content = $content -replace 'font-semibold text-slate-900 dark:text-white text-base', 'font-medium text-slate-900 dark:text-white text-sm'

# 4. Reduce menu item font size
$content = $content -replace 'text-sm font-medium', 'text-xs font-medium'

Set-Content $file -Value $content -NoNewline
Write-Host "Navbar styling fixed!" -ForegroundColor Green
