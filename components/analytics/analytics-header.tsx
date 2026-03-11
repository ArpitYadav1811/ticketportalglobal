"use client"

import { useEffect, useState } from "react"
import { Building2, User } from "lucide-react"
import { isUserSpoc, getBusinessGroupsForSpoc } from "@/lib/actions/master-data"

interface AnalyticsHeaderProps {
  userId?: number
  userRole?: string
  groupName?: string
  userName?: string
}

export default function AnalyticsHeader({ userId, userRole, groupName, userName }: AnalyticsHeaderProps) {
  const isAdmin = userRole === "admin" || userRole === "superadmin"
  const isManagerRole = userRole === "manager"
  const [isSpoc, setIsSpoc] = useState(isManagerRole)
  const [spocGroupName, setSpocGroupName] = useState(groupName || "")

  // Detect SPOC status from DB for non-admin, non-manager users
  useEffect(() => {
    const checkSpoc = async () => {
      if (isAdmin || isManagerRole || !userId) return
      const spocCheck = await isUserSpoc(userId)
      if (spocCheck) {
        setIsSpoc(true)
        const result = await getBusinessGroupsForSpoc(userId)
        if (result.success && result.data && result.data.length > 0) {
          setSpocGroupName(result.data.map((bg: any) => bg.name).join(", "))
        }
      }
    }
    checkSpoc()
  }, [userId, isAdmin, isManagerRole])

  const subtitle = isAdmin
    ? "All tickets across all Business Groups"
    : "Analytics for your Business Group"

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        Ticket Analytics
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
        {subtitle}
      </p>
      {!isAdmin && (spocGroupName || groupName) && (
        <div className="flex items-center gap-1.5 mt-2 text-sm text-blue-700 font-medium">
          <Building2 className="w-4 h-4" />
          <span>{spocGroupName || groupName}</span>
        </div>
      )}
    </>
  )
}
