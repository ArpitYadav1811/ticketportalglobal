"use client"

import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { isUserSpoc, getBusinessGroupsForSpoc } from "@/lib/actions/master-data"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"

interface MasterDataHeaderProps {
  userId?: number
  userRole?: string
  groupName?: string
  userName?: string
  userGroupId?: number
  selectedGroupId?: number | "all" | null
  onGroupChange?: (groupId: number | "all" | null) => void
}

export default function MasterDataHeader({ 
  userId, 
  userRole, 
  groupName, 
  userName,
  userGroupId,
  selectedGroupId,
  onGroupChange 
}: MasterDataHeaderProps) {
  const isSuperAdmin = userRole === "superadmin"
  const isAdmin = userRole === "admin" || isSuperAdmin
  const isManagerRole = userRole === "manager"
  const [isSpoc, setIsSpoc] = useState(isManagerRole)
  const [spocGroupName, setSpocGroupName] = useState(groupName || "")
  const [spocGroupIds, setSpocGroupIds] = useState<number[]>([])
  const [allBusinessGroups, setAllBusinessGroups] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Track mount state to prevent hydration mismatches
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load all business groups for dropdown
  useEffect(() => {
    const loadBusinessGroups = async () => {
      if (!mounted) return
      setLoading(true)
      try {
        const result = await getBusinessUnitGroups()
        if (result.success && result.data) {
          setAllBusinessGroups(result.data.map((bg: any) => ({ id: bg.id, name: bg.name })))
        }
      } catch (error) {
        console.error("Error loading business groups:", error)
      } finally {
        setLoading(false)
      }
    }
    loadBusinessGroups()
  }, [mounted])

  // Load SPOC groups for non-Super Admin users
  useEffect(() => {
    const loadSpocGroups = async () => {
      if (isSuperAdmin || !userId) return
      
      // For managers, always check SPOC status
      if (isManagerRole) {
        setIsSpoc(true)
        const result = await getBusinessGroupsForSpoc(userId)
        if (result.success && result.data && result.data.length > 0) {
          const groupIds = result.data.map((bg: any) => bg.id)
          setSpocGroupIds(groupIds)
        }
        return
      }
      
      // For other users, check if they are SPOC
      const spocCheck = await isUserSpoc(userId)
      if (spocCheck) {
        setIsSpoc(true)
        const result = await getBusinessGroupsForSpoc(userId)
        if (result.success && result.data && result.data.length > 0) {
          const groupIds = result.data.map((bg: any) => bg.id)
          setSpocGroupIds(groupIds)
        }
      }
    }
    loadSpocGroups()
  }, [userId, isSuperAdmin, isManagerRole])

  const subtitle = isAdmin
    ? "Manage business groups, categories, subcategories, and ticket classification mappings"
    : "Manage master data for your Business Group"

  // Get display value for dropdown
  const getDisplayValue = () => {
    if (isSuperAdmin) {
      if (selectedGroupId === "all" || selectedGroupId === null) {
        return "All Groups"
      }
      const selectedGroup = allBusinessGroups.find(bg => bg.id === selectedGroupId)
      return selectedGroup?.name || "All Groups"
    } else {
      return spocGroupName || groupName || "N/A"
    }
  }

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === "all") {
      onGroupChange?.("all")
    } else if (value) {
      onGroupChange?.(Number(value))
    } else {
      onGroupChange?.(null)
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        Master Data Management
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
        {subtitle}
      </p>
      {mounted && (
        <div className="flex items-center gap-2 mt-3">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div className="relative">
            <select
              value={isSuperAdmin 
                ? (selectedGroupId === "all" || selectedGroupId === null ? "all" : selectedGroupId?.toString() || "all")
                : (selectedGroupId?.toString() || (spocGroupIds.length > 0 ? spocGroupIds[0]?.toString() : (userGroupId?.toString() || "")))
              }
              onChange={handleGroupChange}
              disabled={loading || (spocGroupIds.length === 0 && !userGroupId && !isSuperAdmin)}
              className={`
                appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 
                rounded-lg px-4 py-2 pr-10 text-sm font-medium min-w-[180px]
                text-slate-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all duration-200
                ${!loading && (isSuperAdmin || spocGroupIds.length > 1)
                  ? "cursor-pointer hover:border-primary/50 shadow-sm hover:shadow-md"
                  : spocGroupIds.length === 1 || userGroupId
                    ? "cursor-default"
                    : "cursor-not-allowed opacity-70"
                }
              `}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.25em 1.25em",
              }}
            >
              {isSuperAdmin ? (
                <>
                  <option value="all">All Groups</option>
                  {allBusinessGroups.map((bg) => (
                    <option key={bg.id} value={bg.id}>
                      {bg.name}
                    </option>
                  ))}
                </>
              ) : spocGroupIds.length > 0 ? (
                <>
                  {spocGroupIds.map((id) => {
                    const group = allBusinessGroups.find(bg => bg.id === id)
                    return (
                      <option key={id} value={id}>
                        {group?.name || `Group ${id}`}
                      </option>
                    )
                  })}
                </>
              ) : (
                <option value={userGroupId?.toString() || ""}>{groupName || "N/A"}</option>
              )}
            </select>
          </div>
        </div>
      )}
    </>
  )
}
