"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

export default function DashboardHeader() {
 return (
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
 Dashboard
 </h1>
 <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
 Manage and track your work activities
 </p>
 </div>
 <Link
 href="/tickets/create"
 className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
 >
 <Plus className="w-4 h-4" />
 <span>Create Ticket</span>
 </Link>
 </div>
 )
}