"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import CreateTicketForm from "@/components/tickets/create-ticket-form"
import { FileText, Sparkles } from "lucide-react"

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
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          {/* Enhanced Header Section */}
          <div className="mb-8 pb-6 border-b-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              {/* Icon Container */}
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900 flex-shrink-0">
                <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              
              {/* Title and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    New Ticket
                  </h1>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Auto-Fill</span>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">
                  Fill in the details below to create a new work ticket. Fields will auto-populate based on your selections.
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <CreateTicketForm />
        </div>
      </div>
    </DashboardLayout>
  )
}
