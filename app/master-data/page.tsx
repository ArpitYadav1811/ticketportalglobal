"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import UnifiedMasterDataV2 from "@/components/master-data/unified-master-data-v2"

export default function MasterDataPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  // Show loading or nothing while checking permissions
  if (isLoading || !user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-card dark:bg-gray-800 p-4 shadow-lg rounded-md border border-border">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">
            Master Data Management
          </h1>
          <p className="text-foreground-secondary mt-2">
            Manage business groups, categories, subcategories, and ticket classification mappings
          </p>
        </div>

        <UnifiedMasterDataV2 userId={user.id} userRole={user.role?.toLowerCase()} />
      </div>
    </DashboardLayout>
  )
}
