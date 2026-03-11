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
    : isSpoc
      ? "Analytics for your Business Group"
      : "Analytics for your tickets"

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-poppins font-bold text-foreground">Ticket Analytics</h1>
        <p className="text-xs text-foreground-secondary mt-0.5">{subtitle}</p>
        {isSpoc && (spocGroupName || groupName) && (
          <div className="flex items-center gap-1 mt-1 text-xs text-primary font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span>{spocGroupName || groupName}</span>
          </div>
        )}
        {!isAdmin && !isSpoc && userName && (
          <div className="flex items-center gap-1 mt-1 text-xs text-primary font-medium">
            <User className="w-3.5 h-3.5" />
            <span>{userName}</span>
          </div>
        )}
      </div>
    </div>
  )
}
