"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import AnalyticsHeader from "@/components/analytics/analytics-header"
import AnalyticsCharts from "@/components/analytics/analytics-charts"

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    setIsLoading(false)
  }, [router])

  // Show loading or nothing while checking auth
  if (isLoading || !user) {
    return null
  }

  const userRole = user?.role?.toLowerCase()
  const userGroupId = user?.business_unit_group_id

  return (
    <DashboardLayout>
      <div className="pl-6 pr-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="px-1 py-4">
          <AnalyticsHeader userId={user?.id} userRole={userRole} groupName={user?.group_name} userName={user?.full_name} />
        </div>
        <div className="border-b border-slate-200 dark:border-slate-700 mb-4" />
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4">
          <AnalyticsCharts userId={user?.id} userRole={userRole} userGroupId={userGroupId} />
        </div>
      </div>
    </DashboardLayout>
  )
}
