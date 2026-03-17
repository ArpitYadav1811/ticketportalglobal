"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import AnalyticsHeader from "@/components/analytics/analytics-header"
import AnalyticsCharts from "@/components/analytics/analytics-charts"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<number | "all" | null>("all")
  const [activeTab, setActiveTab] = useState<"initiator" | "target">("initiator")

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

  // Initialize selected group for non-Super Admin users
  // This must be before the early return to maintain hook order
  useEffect(() => {
    if (!user || isLoading) return
    
    const userRole = user?.role?.toLowerCase()
    const userGroupId = user?.business_unit_group_id
    const isSuperAdmin = userRole === "superadmin"
    
    if (!isSuperAdmin && userGroupId) {
      setSelectedGroupId(userGroupId)
    }
  }, [user, isLoading])

  // Show loading or nothing while checking auth
  if (isLoading || !user) {
    return null
  }

  const userRole = user?.role?.toLowerCase()
  const userGroupId = user?.business_unit_group_id
  const isSuperAdmin = userRole === "superadmin"

  return (
    <DashboardLayout>
      <div className="pl-6 pr-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "initiator" | "target")} className="w-full">
          <div className="px-1 py-4">
            <AnalyticsHeader 
              userId={user?.id} 
              userRole={userRole} 
              groupName={user?.group_name} 
              userName={user?.full_name}
              userGroupId={userGroupId}
              selectedGroupId={selectedGroupId}
              onGroupChange={setSelectedGroupId}
            />
            <div className="mt-4">
              <TabsList className="inline-flex h-8 w-auto gap-1 p-1 bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="initiator" className="text-xs px-3 py-1 h-6">Tickets By Initiator Group</TabsTrigger>
                <TabsTrigger value="target" className="text-xs px-3 py-1 h-6">Tickets By Target Group</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <div className="border-b border-slate-200 dark:border-slate-700 mb-4" />
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4">
            <TabsContent value="initiator" className="mt-0">
              <AnalyticsCharts 
                userId={user?.id} 
                userRole={userRole} 
                userGroupId={userGroupId}
                selectedGroupId={selectedGroupId}
                filterType="initiator"
              />
            </TabsContent>
            <TabsContent value="target" className="mt-0">
              <AnalyticsCharts 
                userId={user?.id} 
                userRole={userRole} 
                userGroupId={userGroupId}
                selectedGroupId={selectedGroupId}
                filterType="target"
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
