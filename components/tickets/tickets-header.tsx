"use client"

import { List, Filter } from "lucide-react"

export default function TicketsHeader() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900">
          <List className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tickets</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">View and manage all your tickets</p>
        </div>
      </div>
    </div>
  )
}
