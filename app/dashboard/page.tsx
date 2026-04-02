"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import CreateTicketForm from "@/components/tickets/create-ticket-form"

export default function DashboardPage() {
 const router = useRouter()
 const { status } = useSession()
 const [isLoading, setIsLoading] = useState(true)

 useEffect(() => {
   // Wait for NextAuth to settle first to avoid first-time SSO redirect bounce.
   if (status === "loading") return

   if (status === "authenticated") {
     setIsLoading(false)
     return
   }

   const user = localStorage.getItem("user")
   if (!user) {
     router.push("/login")
     return
   }
   setIsLoading(false)
 }, [router, status])

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