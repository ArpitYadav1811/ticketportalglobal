# Fix Dashboard Page to Match Customer Portal Exactly

Write-Host "Fixing Dashboard Page styling..." -ForegroundColor Cyan

$file = "app/dashboard/page.tsx"
$content = Get-Content $file -Raw

# 1. Remove icon container and decorative elements from header
# 2. Simplify header to just text
# 3. Remove thick borders
# 4. Remove Auto-Fill badge
# 5. Simplify overall structure

$newContent = @'
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import CreateTicketForm from "@/components/tickets/create-ticket-form"

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) {
      router.push("/login")
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) return <div>Loading...</div>

  return (
    <DashboardLayout>
      <div className="p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Simple Header - matching Customer Portal */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              New Ticket
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Fill in the details below to create a new work ticket
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
            <CreateTicketForm />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
'@

Set-Content $file -Value $newContent -NoNewline
Write-Host "Dashboard page updated to match Customer Portal" -ForegroundColor Green
