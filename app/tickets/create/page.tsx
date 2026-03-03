"use client"

import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import CreateTicketForm from "@/components/tickets/create-ticket-form"

export default function CreateTicketPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-3xl font-bold text-slate-900">New Interaction Log</h1>
            <p className="text-slate-600 text-sm mt-1">Log and track customer interactions</p>
          </div>
        </div>

        <main className="py-8 w-full" style={{ margin: 0, paddingLeft: 0, paddingRight: 0 }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <CreateTicketForm />
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  )
}