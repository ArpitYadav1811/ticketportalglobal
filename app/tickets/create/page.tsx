"use client"

import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import CreateTicketForm from "@/components/tickets/create-ticket-form"

export default function CreateTicketPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="bg-slate-50" style={{ overflow: 'visible' }}>
        <div className="border-b border-slate-200 bg-white">
          <div className="w-full px-2 py-4">
            <h1 className="text-3xl font-bold text-slate-900">New Interaction Log</h1>
            <p className="text-slate-600 text-sm mt-1">Log and track customer interactions</p>
          </div>
        </div>

        <div className="py-4 w-full" style={{ overflow: 'visible' }}>
          <div className="w-full px-2">
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <CreateTicketForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}