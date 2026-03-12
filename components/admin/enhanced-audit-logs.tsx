"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  ScrollText,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSystemAuditLogs } from "@/lib/actions/admin"
import { getAllUsers } from "@/lib/actions/users"
import { adminCache } from "@/lib/utils/admin-cache"

interface EnhancedAuditLogsProps {
  limit?: number
}

export default function EnhancedAuditLogs({ limit = 50 }: EnhancedAuditLogsProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    entityType: "",
    actionType: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
    search: "",
    limit,
    offset: 0,
  })
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table")
  const [allUsers, setAllUsers] = useState<{ id: number; full_name: string; email: string }[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      // Check cache first
      const cacheKey = `audit-logs-${JSON.stringify(filters)}`
      const cached = adminCache.get<{ logs: any[]; total: number }>(cacheKey)
      
      if (cached) {
        setLogs(cached.logs)
        setTotal(cached.total)
        setLoading(false)
      }

      const result = await getSystemAuditLogs({
        entityType: filters.entityType || undefined,
        actionType: filters.actionType || undefined,
        userId: filters.userId ? Number(filters.userId) : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        search: filters.search || undefined,
        limit: filters.limit,
        offset: filters.offset,
      })
      
      if (result.success) {
        setLogs(result.data || [])
        setTotal(result.total || 0)
        adminCache.set(cacheKey, { logs: result.data || [], total: result.total || 0 }, 30000) // Cache for 30 seconds
      } else {
        toast.error(result.error || "Failed to load audit logs")
      }
    } catch (error: any) {
      console.error("Error loading audit logs:", error)
      toast.error("An unexpected error occurred while loading audit logs")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Load users for filter
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true)
      try {
        const cached = adminCache.get<typeof allUsers>("audit-logs-users")
        if (cached) {
          setAllUsers(cached)
          setLoadingUsers(false)
          return
        }

        const result = await getAllUsers({ includeInactive: true })
        if (result.success && result.data) {
          const users = result.data.map((u: any) => ({
            id: u.id,
            full_name: u.full_name || u.email,
            email: u.email,
          }))
          setAllUsers(users)
          adminCache.set("audit-logs-users", users, 300000) // Cache for 5 minutes
        }
      } catch (error) {
        console.error("Error loading users:", error)
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [])

  const entityTypes = [
    "user",
    "functional_area",
    "fa_mapping",
    "business_group",
    "category",
    "subcategory",
    "mapping",
  ]
  const actionTypes = ["create", "update", "delete", "role_change", "spoc_update", "BULK_DELETE", "BULK_ROLE_CHANGE", "BULK_BG_UPDATE"]

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const formatDateShort = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const getActionColor = (actionType: string) => {
    const action = actionType?.toLowerCase()
    if (action.includes("create") || action.includes("add")) {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    }
    if (action.includes("delete") || action.includes("remove")) {
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    }
    if (action.includes("update") || action.includes("change")) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }

  const toggleExpand = (logId: number) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFields, setExportFields] = useState<string[]>([
    "time",
    "action",
    "entity",
    "old_value",
    "new_value",
    "performed_by",
    "notes",
    "entity_id",
  ])

  const handleExport = () => {
    try {
      const fieldMap: Record<string, (log: any) => string> = {
        time: (l) => formatDate(l.created_at),
        action: (l) => l.action_type || "",
        entity: (l) => l.entity_type?.replace(/_/g, " ") || "",
        old_value: (l) => l.old_value || "",
        new_value: (l) => l.new_value || "",
        performed_by: (l) => l.performed_by_name || l.performer_email || "",
        notes: (l) => l.notes || "",
        entity_id: (l) => String(l.entity_id || ""),
        id: (l) => String(l.id || ""),
      }

      const headers = exportFields.map((f) => f.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()))
      const rows = logs.map((log) => exportFields.map((field) => fieldMap[field]?.(log) || ""))

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `audit-logs-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Audit logs exported successfully")
      setShowExportDialog(false)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export audit logs")
    }
  }

  // Group logs by date for timeline view
  const groupedLogs = logs.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(log)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="w-6 h-6" />
            System Audit Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track all system changes and administrative actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "table" ? "timeline" : "table")}>
            {viewMode === "table" ? <Clock className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            {viewMode === "table" ? "Timeline" : "Table"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <select
              value={filters.entityType}
              onChange={(e) => setFilters((p) => ({ ...p, entityType: e.target.value, offset: 0 }))}
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Entities</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              value={filters.actionType}
              onChange={(e) => setFilters((p) => ({ ...p, actionType: e.target.value, offset: 0 }))}
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Actions</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              value={filters.userId}
              onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value, offset: 0 }))}
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loadingUsers}
            >
              <option value="">All Users</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value, offset: 0 }))}
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="From Date"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value, offset: 0 }))}
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="To Date"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, offset: 0 }))}
              placeholder="Search in notes, values, names..."
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {(filters.entityType || filters.actionType || filters.userId || filters.dateFrom || filters.dateTo || filters.search) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ entityType: "", actionType: "", userId: "", dateFrom: "", dateTo: "", search: "", limit, offset: 0 })}
              className="text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm text-muted-foreground">No audit logs found</p>
        </div>
      ) : viewMode === "table" ? (
        <>
          <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id)
                    return (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateShort(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded font-medium ${getActionColor(log.action_type)}`}
                          >
                            {log.action_type?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {log.entity_type?.replace(/_/g, " ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[200px]">
                          {log.notes || (
                            <span className="text-muted-foreground">
                              {log.old_value && log.new_value
                                ? `${log.old_value} → ${log.new_value}`
                                : log.new_value || log.old_value || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {log.performed_by_name || log.performer_email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 bg-muted/30">
                              <div className="space-y-2 text-xs">
                                {log.old_value && (
                                  <div>
                                    <span className="font-medium">Old Value:</span> {log.old_value}
                                  </div>
                                )}
                                {log.new_value && (
                                  <div>
                                    <span className="font-medium">New Value:</span> {log.new_value}
                                  </div>
                                )}
                                {log.notes && (
                                  <div>
                                    <span className="font-medium">Notes:</span> {log.notes}
                                  </div>
                                )}
                                <div className="text-muted-foreground">
                                  Full timestamp: {formatDate(log.created_at)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Showing {filters.offset + 1}–{Math.min(filters.offset + filters.limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={filters.offset === 0}
                onClick={() => setFilters((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={filters.offset + filters.limit >= total}
                onClick={() => setFilters((p) => ({ ...p, offset: p.offset + p.limit }))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dateLogs]) => {
              const logsArray = dateLogs as any[]
              return (
              <div key={date} className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">{date}</h3>
                  <span className="text-xs text-muted-foreground">({logsArray.length} events)</span>
                </div>
                <div className="space-y-3">
                  {logsArray.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className={`mt-1 p-1.5 rounded ${getActionColor(log.action_type)}`}>
                        <Clock className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {log.action_type?.replace(/_/g, " ")} {log.entity_type?.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground mb-1">{log.notes}</p>
                        )}
                        {(log.old_value || log.new_value) && (
                          <p className="text-xs text-muted-foreground">
                            {log.old_value && <span className="line-through">{log.old_value}</span>}
                            {log.old_value && log.new_value && " → "}
                            {log.new_value && <span>{log.new_value}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          by {log.performed_by_name || log.performer_email || "Unknown"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
