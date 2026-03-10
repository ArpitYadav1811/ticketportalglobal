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
 <div className="pl-6 pr-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
 <div className="px-1 py-4">
 <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
 New Ticket
 </h1>
 <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
 Fill in the details below to create a new work ticket
 </p>
 </div>
 <div className="border-b border-slate-200 dark:border-slate-700 mb-4" />
 <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"><CreateTicketForm /></div>
 </div>
 </DashboardLayout>
 )
}