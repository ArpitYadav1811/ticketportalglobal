"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import TicketsHeader from "@/components/tickets/tickets-header"
import TicketsFilter from "@/components/tickets/tickets-filter"
import TicketsTable from "@/components/tickets/tickets-table"
import { CheckCircle } from "lucide-react"

export default function TicketsPage() {
 const router = useRouter()
 const searchParams = useSearchParams()
 const [showSuccess, setShowSuccess] = useState(!!searchParams.get("created"))
 const [filters, setFilters] = useState({})
 const [exportFn, setExportFn] = useState<(() => void) | null>(null)
 const [currentTickets, setCurrentTickets] = useState<any[]>([])

 useEffect(() => {
 if (showSuccess) {
 setTimeout(() => setShowSuccess(false), 3000)
 }
 }, [showSuccess])

 const handleExportReady = (fn: () => void) => {
 setExportFn(() => fn)
 }

 const handleFilterChange = (newFilters: any) => {
 // If myTeam is false, explicitly clear team-related fields
 const cleanedFilters = {
 ...newFilters,
 // Clear team-related fields when myTeam is false
 ...(newFilters.myTeam === false && {
 userId: undefined,
 teamMemberIds: undefined,
 }),
 }
 setFilters(cleanedFilters)
 }

 return (
 <DashboardLayout>
 <div className="p-1 bg-gray-50 dark:bg-slate-900 min-h-screen">
 {showSuccess && (
 <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top">
 <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
 <p className="text-green-700 dark:text-green-300 text-sm">Ticket created successfully: {searchParams.get("created")}</p>
 </div>
 )}
 <TicketsHeader
  />
 <div className="border-b border-slate-200 dark:border-slate-700 my-4" />
 
 <div className="space-y-4">
 <TicketsFilter 
 onFilterChange={handleFilterChange} 
 onExport={exportFn || undefined}
 isInternal={false}
 tickets={currentTickets}
 />
 <TicketsTable 
 filters={filters} 
 onExportReady={handleExportReady}
 onTicketsChange={setCurrentTickets}
 />
 </div>
 </div>
 </DashboardLayout>
 )
}
