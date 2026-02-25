"use client"

import Link from "next/link"
import { Plus, LayoutDashboard, Activity } from "lucide-react"

export default function DashboardHeader() {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left Section - Title with Icon */}
        <div className="flex items-start gap-4">
          {/* Icon Container */}
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900">
            <LayoutDashboard className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          
          {/* Title and Description */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Ticket Dashboard
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-full">
                <Activity className="w-3.5 h-3.5 text-green-600 dark:text-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">Live</span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Manage and track your work activities in real-time
            </p>
          </div>
        </div>

        {/* Right Section - Action Button */}
        <Link
          href="/tickets/create"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>Create Ticket</span>
        </Link>
      </div>
    </div>
  )
}
