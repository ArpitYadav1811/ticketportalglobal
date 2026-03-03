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
 <div className=" h-full">
 <div className="max-w-8xl mx-auto px-20">
 {/* Simple Header - matching Customer Portal */}
 <div className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4 ">
 <h1 className="text-3xl font-bold text-slate-900 dark:text-white max-w-6xl mx-auto pt-2">
 New Ticket
 </h1>
 <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-6xl mx-auto">
 Fill in the details below to create a new work ticket
 </p>
 </div>

 {/* Form Container */}
 <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg max-w-6xl mx-auto">
 <CreateTicketForm />
 </div>
 </div>
 </div>
 </DashboardLayout>
 )
}