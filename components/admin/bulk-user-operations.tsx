"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import {
  Upload,
  Download,
  Users,
  Key,
  Building2,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  bulkUpdateUserRoles,
  bulkUpdateUserBusinessGroups,
  bulkActivateUsers,
  bulkDeactivateUsers,
} from "@/lib/actions/admin"
import { getAllUsers } from "@/lib/actions/users"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { getUserRoles } from "@/lib/actions/users"

interface BulkUserOperationsProps {
  onRefresh?: () => void
}

export default function BulkUserOperations({ onRefresh }: BulkUserOperationsProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [bulkRole, setBulkRole] = useState("")
  const [bulkBusinessGroup, setBulkBusinessGroup] = useState<string>("")
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([])
  const [businessGroups, setBusinessGroups] = useState<{ id: number; name: string }[]>([])
  const [progress, setProgress] = useState<{ current: number; total: number; operation: string } | null>(null)
  const [exportFields, setExportFields] = useState<string[]>([
    "email",
    "full_name",
    "role",
    "business_group",
    "active",
    "created_at",
  ])
  const [showExportDialog, setShowExportDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load roles and business groups with caching
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check cache first
        const { adminCache } = await import("@/lib/utils/admin-cache")
        const cachedRoles = adminCache.get<typeof roles>("bulk-ops-roles")
        const cachedBGs = adminCache.get<typeof businessGroups>("bulk-ops-business-groups")

        if (cachedRoles && cachedBGs) {
          setRoles(cachedRoles)
          setBusinessGroups(cachedBGs)
        }

        const [rolesResult, bgResult] = await Promise.all([
          getUserRoles(true),
          getBusinessUnitGroups(),
        ])

        if (rolesResult.success && rolesResult.data) {
          setRoles(rolesResult.data)
          adminCache.set("bulk-ops-roles", rolesResult.data, 300000) // Cache for 5 minutes
        }

        if (bgResult.success && bgResult.data) {
          const bgData = bgResult.data.map((bg: any) => ({ id: bg.id, name: bg.name }))
          setBusinessGroups(bgData)
          adminCache.set("bulk-ops-business-groups", bgData, 300000)
        }
      } catch (error) {
        console.error("Error loading bulk operations data:", error)
        toast.error("Failed to load roles and business groups")
      }
    }
    loadData()
  }, [])

  const handleSelectAll = async () => {
    const result = await getAllUsers({ includeInactive: true })
    if (result.success && result.data) {
      setSelectedUserIds(result.data.map((u: any) => u.id))
    }
  }

  const handleClearSelection = () => {
    setSelectedUserIds([])
  }

  const handleBulkRoleChange = async () => {
    if (!bulkRole || selectedUserIds.length === 0) {
      toast.error("Please select a role and at least one user")
      return
    }

    setLoading(true)
    setProgress({ current: 0, total: selectedUserIds.length, operation: "Updating roles" })

    try {
      // Simulate progress (since bulk operation is atomic, we'll show progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (!prev) return null
          const next = Math.min(prev.current + Math.ceil(prev.total / 10), prev.total)
          return { ...prev, current: next }
        })
      }, 100)

      const result = await bulkUpdateUserRoles(selectedUserIds, bulkRole)

      clearInterval(progressInterval)
      setProgress({ current: selectedUserIds.length, total: selectedUserIds.length, operation: "Updating roles" })

      if (result.success) {
        toast.success(result.message)
        setSelectedUserIds([])
        setBulkRole("")
        onRefresh?.()
      } else {
        toast.error(result.error || "Failed to update roles")
      }
    } catch (error: any) {
      console.error("Bulk role change error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(null), 500)
    }
  }

  const handleBulkBGChange = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user")
      return
    }

    setLoading(true)
    setProgress({ current: 0, total: selectedUserIds.length, operation: "Updating business groups" })

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (!prev) return null
          const next = Math.min(prev.current + Math.ceil(prev.total / 10), prev.total)
          return { ...prev, current: next }
        })
      }, 100)

      const bgId = bulkBusinessGroup === "none" ? null : Number(bulkBusinessGroup)
      const result = await bulkUpdateUserBusinessGroups(selectedUserIds, bgId)

      clearInterval(progressInterval)
      setProgress({ current: selectedUserIds.length, total: selectedUserIds.length, operation: "Updating business groups" })

      if (result.success) {
        toast.success(result.message)
        setSelectedUserIds([])
        setBulkBusinessGroup("")
        onRefresh?.()
      } else {
        toast.error(result.error || "Failed to update business groups")
      }
    } catch (error: any) {
      console.error("Bulk BG change error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(null), 500)
    }
  }

  const handleBulkActivate = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user")
      return
    }

    setLoading(true)
    setProgress({ current: 0, total: selectedUserIds.length, operation: "Activating users" })

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (!prev) return null
          const next = Math.min(prev.current + Math.ceil(prev.total / 10), prev.total)
          return { ...prev, current: next }
        })
      }, 100)

      const result = await bulkActivateUsers(selectedUserIds)

      clearInterval(progressInterval)
      setProgress({ current: selectedUserIds.length, total: selectedUserIds.length, operation: "Activating users" })

      if (result.success) {
        toast.success(result.message)
        setSelectedUserIds([])
        onRefresh?.()
      } else {
        toast.error(result.error || "Failed to activate users")
      }
    } catch (error: any) {
      console.error("Bulk activate error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(null), 500)
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user")
      return
    }

    if (!confirm(`Deactivate ${selectedUserIds.length} user(s)?`)) {
      return
    }

    setLoading(true)
    setProgress({ current: 0, total: selectedUserIds.length, operation: "Deactivating users" })

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (!prev) return null
          const next = Math.min(prev.current + Math.ceil(prev.total / 10), prev.total)
          return { ...prev, current: next }
        })
      }, 100)

      const result = await bulkDeactivateUsers(selectedUserIds)

      clearInterval(progressInterval)
      setProgress({ current: selectedUserIds.length, total: selectedUserIds.length, operation: "Deactivating users" })

      if (result.success) {
        toast.success(result.message)
        setSelectedUserIds([])
        onRefresh?.()
      } else {
        toast.error(result.error || "Failed to deactivate users")
      }
    } catch (error: any) {
      console.error("Bulk deactivate error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(null), 500)
    }
  }

  const handleExportCSV = async () => {
    try {
      const result = await getAllUsers({ includeInactive: true })
      if (!result.success || !result.data) {
        toast.error("Failed to fetch users")
        return
      }

      // Field mapping
      const fieldMap: Record<string, (user: any) => string> = {
        email: (u) => u.email || "",
        full_name: (u) => u.full_name || "",
        role: (u) => u.role || "",
        business_group: (u) => u.business_group_name || "",
        active: (u) => (u.is_active !== false ? "Yes" : "No"),
        created_at: (u) => new Date(u.created_at).toLocaleDateString(),
        ticket_count: (u) => String(u.ticket_count || 0),
        team_names: (u) => u.team_names || "",
      }

      const headers = exportFields.map((f) => f.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()))
      const rows = result.data.map((user: any) => exportFields.map((field) => fieldMap[field]?.(user) || ""))

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Users exported successfully")
      setShowExportDialog(false)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export users")
    }
  }

  const handleImportCSV = () => {
    // This would open a file picker and process CSV
    // For now, we'll show a message that this feature needs an API endpoint
    toast.info("CSV import feature requires API endpoint. Please use the Create User form for now.")
    // fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Enhanced Header */}
      <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-500 overflow-hidden group">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Floating particles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2 mb-1">
                <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg shadow-sm">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Bulk User Operations
                </span>
              </h3>
              <p className="text-xs text-muted-foreground font-medium ml-12">
                Select users from the Users tab, then perform bulk operations here
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowExportDialog(true)}
                className="shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 border-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleImportCSV}
                className="shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 border-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>

          {/* Enhanced Selection Alert */}
          <div className="relative bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-50 dark:from-amber-900/20 dark:via-amber-900/15 dark:to-amber-900/20 border-2 border-amber-300 dark:border-amber-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 to-transparent"></div>
            <div className="relative flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-amber-900 dark:text-amber-200 font-bold mb-1">
                  Selection Required
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  Go to the Users tab to select users, then return here to perform bulk operations.
                  {selectedUserIds.length > 0 && (
                    <span className="block mt-2 px-3 py-1.5 bg-amber-500/20 dark:bg-amber-500/10 rounded-lg font-bold text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-700">
                      {selectedUserIds.length} user(s) selected
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Progress Indicator */}
        {progress && (
          <div className="relative bg-gradient-to-r from-blue-50 via-blue-50/80 to-blue-50 dark:from-blue-900/20 dark:via-blue-900/15 dark:to-blue-900/20 border-2 border-blue-300 dark:border-blue-800 rounded-xl p-4 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-blue-900 dark:text-blue-200">{progress.operation}...</span>
                </div>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 px-2 py-1 bg-blue-500/20 rounded-lg">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200/50 dark:bg-blue-900/50 rounded-full h-3 shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 h-3 rounded-full transition-all duration-300 shadow-md relative overflow-hidden"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Enhanced Bulk Role Change */}
          <div className="relative bg-card/80 backdrop-blur-sm border-2 border-border/50 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Bulk Role Change</h4>
              </div>
              <div className="flex gap-2">
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                  className="flex-1 px-3 py-2.5 border-2 border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 bg-background/90 backdrop-blur-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                  disabled={loading || selectedUserIds.length === 0}
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleBulkRoleChange}
                  disabled={loading || !bulkRole || selectedUserIds.length === 0}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Apply Role Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Bulk Business Group Assignment */}
          <div className="relative bg-card/80 backdrop-blur-sm border-2 border-border/50 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Bulk Business Group Assignment</h4>
              </div>
              <div className="flex gap-2">
                <select
                  value={bulkBusinessGroup}
                  onChange={(e) => setBulkBusinessGroup(e.target.value)}
                  className="flex-1 px-3 py-2.5 border-2 border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 bg-background/90 backdrop-blur-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                  disabled={loading || selectedUserIds.length === 0}
                >
                  <option value="">Select Business Group</option>
                  <option value="none">None (Remove Assignment)</option>
                  {businessGroups.map((bg) => (
                    <option key={bg.id} value={bg.id.toString()}>
                      {bg.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleBulkBGChange}
                  disabled={loading || !bulkBusinessGroup || selectedUserIds.length === 0}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Apply Business Group Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Bulk Activate/Deactivate */}
          <div className="relative bg-card/80 backdrop-blur-sm border-2 border-border/50 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-500/10 rounded-lg">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Bulk Status Change</h4>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkActivate}
                  disabled={loading || selectedUserIds.length === 0}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-green-400"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate Selected
                </Button>
                <Button
                  onClick={handleBulkDeactivate}
                  disabled={loading || selectedUserIds.length === 0}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-red-400"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deactivate Selected
                </Button>
              </div>
            </div>
          </div>
        </div>

        {selectedUserIds.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              className="w-full border-2 hover:bg-muted/50 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-300 font-semibold"
            >
              Clear Selection ({selectedUserIds.length} selected)
            </Button>
          </div>
        )}
      </div>

      {/* Export Configuration Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Export Configuration</h3>
              <button onClick={() => setShowExportDialog(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select fields to include in export:</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {[
                  { key: "email", label: "Email" },
                  { key: "full_name", label: "Full Name" },
                  { key: "role", label: "Role" },
                  { key: "business_group", label: "Business Group" },
                  { key: "active", label: "Active Status" },
                  { key: "created_at", label: "Created At" },
                  { key: "ticket_count", label: "Ticket Count" },
                  { key: "team_names", label: "Team Names" },
                ].map((field) => (
                  <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportFields.includes(field.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExportFields([...exportFields, field.key])
                        } else {
                          setExportFields(exportFields.filter((f) => f !== field.key))
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{field.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExportCSV} disabled={exportFields.length === 0} className="bg-black hover:bg-gray-800">
                  <Download className="w-4 h-4 mr-2" />
                  Export ({exportFields.length} fields)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportCSV}
      />
    </div>
  )
}
