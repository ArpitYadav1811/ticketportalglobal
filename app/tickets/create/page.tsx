"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"
import CreateTicketForm from "@/components/tickets/create-ticket-form"

export default function CreateTicketPage() {
  return (
    <DashboardLayout>
      <div className="p-1 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="px-1 py-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">New Ticket</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Fill in the details below to create a new work ticket</p>
        </div>
        <div className="border-b border-slate-200 dark:border-slate-700 mb-4" />
        <CreateTicketForm />
      </div>
    </DashboardLayout>
  )
}