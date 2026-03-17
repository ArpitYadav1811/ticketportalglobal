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
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ScrollText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              System Audit Logs
            </h2>
            <p className="text-xs text-muted-foreground">
              Track all system changes and administrative actions
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode(viewMode === "table" ? "timeline" : "table")}
            className="gap-1.5 h-8 text-xs"
          >
            {viewMode === "table" ? <Clock className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            {viewMode === "table" ? "Timeline" : "Table"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowExportDialog(true)} 
            disabled={logs.length === 0}
            className="gap-1.5 h-8 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadLogs} 
            disabled={loading}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-foreground">Filters</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {total} records
              </span>
              {(filters.entityType || filters.actionType || filters.userId || filters.dateFrom || filters.dateTo || filters.search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ entityType: "", actionType: "", userId: "", dateFrom: "", dateTo: "", search: "", limit, offset: 0 })}
                  className="h-7 px-2 text-xs gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            <select
              value={filters.entityType}
              onChange={(e) => setFilters((p) => ({ ...p, entityType: e.target.value, offset: 0 }))}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:border-slate-300 dark:hover:border-slate-600"
            >
              <option value="">All Entities</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
            <select
              value={filters.actionType}
              onChange={(e) => setFilters((p) => ({ ...p, actionType: e.target.value, offset: 0 }))}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:border-slate-300 dark:hover:border-slate-600"
            >
              <option value="">All Actions</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
            <select
              value={filters.userId}
              onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value, offset: 0 }))}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:border-slate-300 dark:hover:border-slate-600"
              disabled={loadingUsers}
            >
              <option value="">All Users</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value, offset: 0 }))}
              placeholder="From Date"
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:border-slate-300 dark:hover:border-slate-600"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value, offset: 0 }))}
              placeholder="To Date"
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:border-slate-300 dark:hover:border-slate-600"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, offset: 0 }))}
              placeholder="Search..."
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:border-slate-300 dark:hover:border-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-full w-fit mx-auto mb-3">
            <ScrollText className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No audit logs found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your filters or check back later</p>
        </div>
      ) : viewMode === "table" ? (
        <>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Performed By</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {logs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id)
                    return (
                      <>
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap font-mono">
                            {formatDateShort(log.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 text-xs rounded-md font-semibold ${getActionColor(log.action_type)}`}
                            >
                              {log.action_type?.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {log.entity_type?.replace(/_/g, " ").split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground max-w-[300px] truncate">
                            {log.notes || (
                              <span className="text-muted-foreground">
                                {log.old_value && log.new_value
                                  ? `${log.old_value} → ${log.new_value}`
                                  : log.new_value || log.old_value || "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5" />
                              {log.performed_by_name || log.performer_email || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                              title={isExpanded ? "Collapse details" : "Expand details"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${log.id}-details`}>
                            <td colSpan={6} className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                              <div className="space-y-3 text-sm max-w-4xl">
                                {log.old_value && (
                                  <div className="flex gap-2">
                                    <span className="font-semibold text-foreground min-w-[100px]">Old Value:</span>
                                    <span className="text-muted-foreground flex-1">{log.old_value}</span>
                                  </div>
                                )}
                                {log.new_value && (
                                  <div className="flex gap-2">
                                    <span className="font-semibold text-foreground min-w-[100px]">New Value:</span>
                                    <span className="text-foreground flex-1">{log.new_value}</span>
                                  </div>
                                )}
                                {log.notes && (
                                  <div className="flex gap-2">
                                    <span className="font-semibold text-foreground min-w-[100px]">Notes:</span>
                                    <span className="text-muted-foreground flex-1">{log.notes}</span>
                                  </div>
                                )}
                                <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                                  <span className="text-xs text-muted-foreground">
                                    Full timestamp: {formatDate(log.created_at)}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filters.offset + 1}</span>-<span className="font-semibold text-foreground">{Math.min(filters.offset + filters.limit, total)}</span> of{" "}
              <span className="font-semibold text-foreground">{total}</span>
            </p>
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                variant="outline"
                disabled={filters.offset === 0}
                onClick={() => setFilters((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
                className="h-7 px-3 text-xs"
              >
                Previous
              </Button>
              <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-foreground">
                {Math.floor(filters.offset / filters.limit) + 1} / {Math.ceil(total / filters.limit)}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={filters.offset + filters.limit >= total}
                onClick={() => setFilters((p) => ({ ...p, offset: p.offset + p.limit }))}
                className="h-7 px-3 text-xs"
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
              <div key={date} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">{date}</h3>
                    <span className="text-xs text-muted-foreground">{logsArray.length} event{logsArray.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {logsArray.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className={`mt-1 p-2 rounded-lg ${getActionColor(log.action_type)}`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-foreground">
                            {log.action_type?.replace(/_/g, " ").toUpperCase()} {log.entity_type?.replace(/_/g, " ").split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(log.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-foreground mb-2">{log.notes}</p>
                        )}
                        {(log.old_value || log.new_value) && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {log.old_value && <span className="line-through opacity-75">{log.old_value}</span>}
                            {log.old_value && log.new_value && <span className="mx-2">→</span>}
                            {log.new_value && <span className="font-medium text-foreground">{log.new_value}</span>}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3.5 h-3.5" />
                          <span>by {log.performed_by_name || log.performer_email || "Unknown"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )
            })}
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExportDialog(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Export Audit Logs
              </h3>
              <button
                onClick={() => setShowExportDialog(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select the fields you want to include in the CSV export:
            </p>
            <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto">
              {[
                { value: "time", label: "Time" },
                { value: "action", label: "Action" },
                { value: "entity", label: "Entity" },
                { value: "old_value", label: "Old Value" },
                { value: "new_value", label: "New Value" },
                { value: "performed_by", label: "Performed By" },
                { value: "notes", label: "Notes" },
                { value: "entity_id", label: "Entity ID" },
              ].map((field) => (
                <label key={field.value} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportFields.includes(field.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportFields([...exportFields, field.value])
                      } else {
                        setExportFields(exportFields.filter((f) => f !== field.value))
                      }
                    }}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{field.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowExportDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={exportFields.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
