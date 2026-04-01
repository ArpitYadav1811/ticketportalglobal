"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import UnifiedMasterDataV2 from "@/components/master-data/unified-master-data-v2"
import MasterDataHeader from "@/components/master-data/master-data-header"
import { subscribeSpocGroupChanged } from "@/lib/utils/spoc-preferred-group"

export default function MasterDataPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<number | "all" | null>("all")

  useEffect(() => {
    const checkAccess = async () => {
      const userData = localStorage.getItem("user")
      if (!userData) {
        router.push("/login")
        return
      }

      const parsedUser = JSON.parse(userData)
      const userRole = parsedUser.role?.toLowerCase()

      // Admins, superadmins, and managers (SPOC) have access
      const allowedRoles = ["admin", "superadmin", "manager"]
      if (allowedRoles.includes(userRole)) {
        setUser(parsedUser)
        setIsLoading(false)
        return
      }

      // Check if user is a SPOC (for any other role)
      const { isUserSpoc } = await import("@/lib/actions/master-data")
      const isSpoc = await isUserSpoc(parsedUser.id)
      
      if (isSpoc) {
        setUser(parsedUser)
        setIsLoading(false)
        return
      }

      // Not allowed - redirect
      router.push("/dashboard")
    }

    checkAccess()
  }, [router])

  // Initialize selected group for non-Super Admin users
  useEffect(() => {
    if (!user || isLoading) return
    
    const userRole = user?.role?.toLowerCase()
    const userGroupId = user?.business_unit_group_id
    const isSuperAdmin = userRole === "superadmin"
    
    if (!isSuperAdmin && userGroupId) {
      setSelectedGroupId(userGroupId)
    }
  }, [user, isLoading])

  useEffect(() => {
    return subscribeSpocGroupChanged(() => {
      const raw = localStorage.getItem("user")
      if (!raw) return
      try {
        const u = JSON.parse(raw)
        setUser(u)
        const role = u.role?.toLowerCase()
        if (role !== "superadmin" && u.business_unit_group_id) {
          setSelectedGroupId(u.business_unit_group_id)
        }
      } catch {
        /* ignore */
      }
    })
  }, [])

  // Show loading or nothing while checking permissions
  if (isLoading || !user) {
    return null
  }

  const userRole = user?.role?.toLowerCase()
  const userGroupId = user?.business_unit_group_id

  return (
    <DashboardLayout>
      <div className="pl-6 pr-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="px-1 py-4">
          <MasterDataHeader 
            userId={user?.id} 
            userRole={userRole} 
            groupName={user?.group_name} 
            userName={user?.full_name}
            userGroupId={userGroupId}
            selectedGroupId={selectedGroupId}
            onGroupChange={setSelectedGroupId}
          />
        </div>
        <div className="border-b border-slate-200 dark:border-slate-700 mb-4" />
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
          <UnifiedMasterDataV2 userId={user.id} userRole={userRole} selectedGroupId={selectedGroupId} hideCardWrapper={true} />
        </div>
      </div>
    </DashboardLayout>
  )
}
