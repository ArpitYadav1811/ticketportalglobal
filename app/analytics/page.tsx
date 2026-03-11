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

  return (
    <DashboardLayout>
      <div className="space-y-4 bg-card dark:bg-gray-800 p-4 shadow-lg rounded-md border border-border">
        <AnalyticsHeader userId={user?.id} userRole={userRole} groupName={user?.group_name} userName={user?.full_name} />
        <AnalyticsCharts userId={user?.id} userRole={userRole} />
      </div>
    </DashboardLayout>
  )
}
