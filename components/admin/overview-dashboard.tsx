"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Users,
  Ticket,
  Building2,
  FolderTree,
  FileText,
  RefreshCw,
  Plus,
  Upload,
  Download,
  ScrollText,
  TrendingUp,
  Activity,
  AlertTriangle,
  Search,
  X,
  Calendar,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Maximize2,
} from "lucide-react"
// Chart imports removed - only showing list view now
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getSystemHealthStats, getTicketCreationHistory } from "@/lib/actions/admin"
import { adminCache } from "@/lib/utils/admin-cache"

interface OverviewDashboardProps {
  onNavigate: (section: string) => void
}

export default function OverviewDashboard({ onNavigate }: OverviewDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTickets: 0,
    openTickets: 0,
    businessGroups: 0,
    functionalAreas: 0,
    categories: 0,
    teams: 0,
  })
  interface TicketHistoryItem {
    id: number
    ticket_id: string
    title: string
    description: string | null
    status: string
    created_at: string
    created_by: number | null
    creator_name: string | null
    creator_email: string | null
    assignee_name: string | null
    spoc_name: string | null
    category_name: string | null
    business_group_name: string | null
    target_business_group_name: string | null
  }
  const [ticketHistory, setTicketHistory] = useState<TicketHistoryItem[]>([])
  const [filteredTicketHistory, setFilteredTicketHistory] = useState<TicketHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [timeFilter, setTimeFilter] = useState<"today" | "7days" | "30days" | "90days" | "overall">("30days")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ stats?: string; history?: string } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [sortOrder, setSortOrder] = useState<"date-desc" | "date-asc" | "title-asc" | "title-desc">("date-desc")

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first (unless force refresh)
      const cacheKey = "overview-dashboard"
      if (!forceRefresh) {
        const cachedStats = adminCache.get<typeof stats>(`${cacheKey}-stats`)
        const cachedHistory = adminCache.get<TicketHistoryItem[]>(`${cacheKey}-history`)

        if (cachedStats && cachedHistory) {
          setStats(cachedStats)
          setTicketHistory(cachedHistory)
          setFilteredTicketHistory(cachedHistory)
          setLoading(false)
          // Still fetch in background for fresh data
        }
      }

      // Calculate days based on filter
      let days = 30
      if (timeFilter === "today") days = 1
      else if (timeFilter === "7days") days = 7
      else if (timeFilter === "30days") days = 30
      else if (timeFilter === "90days") days = 90
      else if (timeFilter === "overall") days = 3650 // 10 years for "overall"

      const [statsResult, historyResult] = await Promise.all([
        getSystemHealthStats(),
        getTicketCreationHistory(days),
      ])

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
        adminCache.set(`${cacheKey}-stats`, statsResult.data, 30000) // Cache for 30 seconds
        setError((prev) => (prev ? { ...prev, stats: undefined } : null))
      } else {
        setError((prev) => ({ ...prev, stats: statsResult.error || "Failed to load system stats" }))
        toast.error("Failed to load system statistics")
      }

      if (historyResult.success && historyResult.data) {
        const historyData = (historyResult.data || []).map((item: any) => ({
          id: item.id || 0,
          ticket_id: item.ticket_id || "",
          title: item.title || "",
          description: item.description || null,
          status: item.status || "",
          created_at: item.created_at || "",
          created_by: item.created_by || null,
          creator_name: item.creator_name || null,
          creator_email: item.creator_email || null,
          assignee_name: item.assignee_name || null,
          spoc_name: item.spoc_name || null,
          category_name: item.category_name || null,
          business_group_name: item.business_group_name || null,
          target_business_group_name: item.target_business_group_name || null,
        }))
        setTicketHistory(historyData)
        setFilteredTicketHistory(historyData)
        adminCache.set(`${cacheKey}-history`, historyData, 30000)
        setError((prev) => (prev ? { ...prev, history: undefined } : null))
      } else {
        setError((prev) => ({ ...prev, history: historyResult.error || "Failed to load ticket history" }))
        if (!statsResult.success) {
          // Only show toast if both fail
          toast.error("Failed to load ticket history")
        }
      }

      setRetryCount(0) // Reset retry count on success
    } catch (err: any) {
      console.error("Error loading overview data:", err)
      setError({
        stats: "An unexpected error occurred",
        history: "An unexpected error occurred",
      })
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [timeFilter])

  useEffect(() => {
    loadData(true)
  }, [timeFilter]) // Reload when time filter changes

  useEffect(() => {
    // Only set up interval if no errors (pause on repeated errors)
    let interval: NodeJS.Timeout | null = null
    if (!error || retryCount < 3) {
      interval = setInterval(() => loadData(false), 60000) // Refresh every minute
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [loadData, error, retryCount])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    loadData(true)
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  // Filter and sort ticket history based on search query and sort order
  useEffect(() => {
    let filtered = ticketHistory
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = ticketHistory.filter((item) => {
        const searchLower = searchQuery.toLowerCase()
        const title = (item.title || "").toLowerCase()
        const ticketId = (item.ticket_id || "").toLowerCase()
        const creator = (item.creator_name || "").toLowerCase()
        const category = (item.category_name || "").toLowerCase()
        const dateStr = formatDate(item.created_at).toLowerCase()
        return title.includes(searchLower) || 
               ticketId.includes(searchLower) || 
               creator.includes(searchLower) || 
               category.includes(searchLower) ||
               dateStr.includes(searchLower)
      })
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === "date-asc") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortOrder === "date-desc") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortOrder === "title-asc") {
        return (a.title || "").localeCompare(b.title || "")
      } else {
        return (b.title || "").localeCompare(a.title || "")
      }
    })
    
    setFilteredTicketHistory(sorted)
  }, [searchQuery, ticketHistory, sortOrder])

  // Calculate additional statistics
  const historyStats = filteredTicketHistory.length > 0 ? {
    totalTickets: filteredTicketHistory.length,
    averagePerDay: Math.round(filteredTicketHistory.length / (timeFilter === "today" ? 1 : timeFilter === "7days" ? 7 : timeFilter === "30days" ? 30 : timeFilter === "90days" ? 90 : 365)),
    peakDay: { date: filteredTicketHistory[0]?.created_at || "", count: 1 }, // Just show first ticket date
    trend: 0, // Not applicable for individual tickets
  } : null

  // Chart data removed - only showing list view now

  // Export functionality
  const handleExport = () => {
    const csv = [
      ["Ticket ID", "Title", "Creator", "Status", "Category", "Created At", "Assignee", "SPOC"],
      ...filteredTicketHistory.map(item => [
        item.ticket_id || "",
        (item.title || "").replace(/,/g, ";"),
        item.creator_name || "",
        item.status || "",
        item.category_name || "",
        formatDate(item.created_at),
        item.assignee_name || "Unassigned",
        item.spoc_name || "Unassigned"
      ])
    ].map(row => row.join(",")).join("\n")
    
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ticket-history-${timeFilter}-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.success("Ticket history exported successfully")
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      active: stats.activeUsers,
      icon: <Users className="w-5 h-5" />,
      color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      onClick: () => onNavigate("users"),
    },
    {
      label: "Total Tickets",
      value: stats.totalTickets,
      active: stats.openTickets,
      activeLabel: "Open",
      icon: <Ticket className="w-5 h-5" />,
      color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Business Groups",
      value: stats.businessGroups,
      icon: <Building2 className="w-5 h-5" />,
      color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
      iconColor: "text-green-600 dark:text-green-400",
      onClick: () => onNavigate("business-groups"),
    },
    {
      label: "Functional Areas",
      value: stats.functionalAreas,
      icon: <FolderTree className="w-5 h-5" />,
      color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
      iconColor: "text-amber-600 dark:text-amber-400",
      onClick: () => onNavigate("functional-areas"),
    },
    {
      label: "Categories",
      value: stats.categories,
      icon: <FileText className="w-5 h-5" />,
      color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      onClick: () => onNavigate("categories"),
    },
    {
      label: "Teams",
      value: stats.teams,
      icon: <FolderTree className="w-5 h-5" />,
      color: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      onClick: () => onNavigate("teams"),
    },
    {
      label: "System Health",
      value: stats.totalUsers > 0 && stats.totalTickets > 0 ? "Healthy" : "Initializing",
      isText: true,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
      iconColor: "text-green-600 dark:text-green-400",
    },
  ]

  const quickActions = [
    {
      label: "Create User",
      icon: <Plus className="w-4 h-4" />,
      onClick: () => onNavigate("users"),
      color: "bg-primary hover:bg-primary/90 text-primary-foreground",
    },
    {
      label: "Import Data",
      icon: <Upload className="w-4 h-4" />,
      onClick: () => onNavigate("import-export"),
      color: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      label: "View Logs",
      icon: <ScrollText className="w-4 h-4" />,
      onClick: () => onNavigate("audit-logs"),
      color: "bg-gray-600 hover:bg-gray-700 text-white",
    },
    {
      label: "Export Data",
      icon: <Download className="w-4 h-4" />,
      onClick: () => onNavigate("import-export"),
      color: "bg-green-600 hover:bg-green-700 text-white",
    },
  ]

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            System Overview
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Monitor system health and access quick actions
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadData(true)} 
          disabled={loading}
          className="shadow-sm hover:shadow-md transition-all h-7 px-2.5 text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (error.stats || error.history) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-red-900 dark:text-red-200 mb-1">Failed to Load Data</h4>
              <ul className="text-[11px] text-red-800 dark:text-red-300 space-y-0.5 mb-2">
                {error.stats && <li>• System Statistics: {error.stats}</li>}
                {error.history && <li>• Ticket History: {error.history}</li>}
              </ul>
              <Button onClick={handleRetry} size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 h-7 px-2.5 text-xs">
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* System Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            onClick={card.onClick}
            className={`group relative ${card.color} border-2 rounded-xl p-4 ${card.onClick ? "cursor-pointer" : ""} transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 ${
              card.onClick ? "hover:scale-[1.02] hover:-translate-y-1 hover:border-primary/30" : ""
            } overflow-hidden backdrop-blur-sm`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className={`${card.iconColor} p-2.5 rounded-xl bg-white/70 dark:bg-black/40 shadow-md group-hover:shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {card.icon}
                </div>
                {card.active !== undefined && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/60 dark:bg-black/30 backdrop-blur-sm border border-white/20 text-muted-foreground shadow-sm">
                    {card.activeLabel || "Active"}: <span className="font-bold">{card.active}</span>
                  </span>
                )}
              </div>
              <div className="mt-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-extrabold text-foreground">
                  {loading && !error?.stats ? (
                    <span className="inline-block w-12 h-6 bg-muted/50 animate-pulse rounded-lg" />
                  ) : error?.stats ? (
                    <span className="text-red-500 text-xs">Error</span>
                  ) : card.isText ? (
                    <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent drop-shadow-sm text-lg">
                      {card.value}
                    </span>
                  ) : (
                    <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent drop-shadow-sm">
                      {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Panel - Full Width Single Row */}
      <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-lg shadow-lg p-3 hover:shadow-xl hover:border-primary/30 transition-all duration-500 overflow-hidden group">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Floating particles effect */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
              <Activity className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Quick Actions</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                onClick={action.onClick}
                className={`${action.color} h-auto py-2 flex flex-col items-center gap-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 relative overflow-hidden group/btn`}
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <div className="relative z-10">{action.icon}</div>
                <span className="text-[11px] font-semibold relative z-10">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket Created History - Full Width with Enhanced Styling */}
      <div className="relative bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-2 border-purple-500/20 rounded-xl shadow-2xl px-4 pt-3 pb-4 hover:shadow-purple-500/20 hover:border-purple-500/40 transition-all duration-700 overflow-hidden group">
         {/* Animated background gradient */}
         <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-purple-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
         
         {/* Animated grid pattern overlay */}
         <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-700"></div>
         
         {/* Floating particles effect */}
         <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
         <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-500/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 rounded-full blur-3xl"></div>
         
         {/* Shimmer effect */}
         <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
         
         <div className="relative z-10">
           {/* Enhanced Header */}
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2.5">
             <div className="flex items-center gap-2.5">
               <div className="relative">
                 <div className="p-2 bg-gradient-to-br from-purple-500/30 via-purple-500/20 to-indigo-500/20 rounded-lg shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-purple-400/30">
                   <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                 </div>
                 <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card animate-pulse"></div>
               </div>
               <div>
                 <h3 className="text-base font-extrabold text-foreground bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                   Ticket Created History
                 </h3>
                 <p className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5">
                   <Calendar className="w-3 h-3" />
                   {timeFilter === "today" ? "Today" : 
                    timeFilter === "7days" ? "Last 7 Days" :
                    timeFilter === "30days" ? "Last 30 Days" :
                    timeFilter === "90days" ? "Last 90 Days" :
                    "Overall"}
                 </p>
               </div>
             </div>
           </div>
           
           {/* Controls Row */}
           <div className="flex flex-col gap-2.5 mb-3">
               {/* First Row: Time Filter, Search, View Toggle */}
               <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                 {/* Time Period Filter - Enhanced with Custom Select */}
                 <div className="relative group/filter">
                   <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-indigo-500/30 rounded-xl blur-xl opacity-0 group-hover/filter:opacity-100 transition-opacity duration-500"></div>
                   <div className="relative flex items-center gap-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-2 border-indigo-500/40 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 hover:border-indigo-500/60 hover:scale-[1.02] transition-all duration-300">
                     <div className="p-1.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg">
                       <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                     </div>
                     <Select
                       value={timeFilter}
                       onValueChange={(value) => {
                         setTimeFilter(value as typeof timeFilter)
                         loadData(true)
                       }}
                     >
                       <SelectTrigger className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-foreground cursor-pointer shadow-none focus:ring-0 focus:ring-offset-0 h-auto py-0 px-0 pr-6 [&>svg]:hidden">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-indigo-500/30 rounded-xl shadow-2xl p-2">
                         <SelectItem value="today" className="text-sm font-semibold cursor-pointer hover:bg-indigo-500/20 focus:bg-indigo-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Today
                         </SelectItem>
                         <SelectItem value="7days" className="text-sm font-semibold cursor-pointer hover:bg-indigo-500/20 focus:bg-indigo-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Last 7 Days
                         </SelectItem>
                         <SelectItem value="30days" className="text-sm font-semibold cursor-pointer hover:bg-indigo-500/20 focus:bg-indigo-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Last 30 Days
                         </SelectItem>
                         <SelectItem value="90days" className="text-sm font-semibold cursor-pointer hover:bg-indigo-500/20 focus:bg-indigo-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Last 90 Days
                         </SelectItem>
                         <SelectItem value="overall" className="text-sm font-semibold cursor-pointer hover:bg-indigo-500/20 focus:bg-indigo-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Overall
                         </SelectItem>
                       </SelectContent>
                     </Select>
                     <div className="absolute right-3 pointer-events-none">
                       <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-indigo-600 dark:border-t-indigo-400"></div>
                     </div>
                   </div>
                 </div>
                 
                 {/* Enhanced Search Bar */}
                 <div className="relative flex-1 sm:min-w-[300px] group/search">
                   <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-indigo-500/20 to-purple-500/30 rounded-xl blur-xl opacity-0 group-hover/search:opacity-100 transition-opacity duration-500"></div>
                   <div className="relative flex items-center gap-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-2 border-purple-500/40 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/60 hover:scale-[1.02] transition-all duration-300">
                     <div className="p-1.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg">
                       <Search className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                     </div>
                     <input
                       type="text"
                       placeholder="Search by ticket ID, title, creator, or category..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:ring-0"
                     />
                     {searchQuery && (
                       <button
                         onClick={() => setSearchQuery("")}
                         className="p-1.5 hover:bg-purple-500/20 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95"
                       >
                         <X className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                       </button>
                     )}
                   </div>
                 </div>

               </div>

               {/* Second Row: Sort and Export - Enhanced */}
               <div className="flex flex-wrap items-center gap-3">
                 {/* Sort Dropdown - Enhanced with Custom Select */}
                 <div className="relative group/sort">
                   <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-indigo-500/20 to-purple-500/30 rounded-xl blur-xl opacity-0 group-hover/sort:opacity-100 transition-opacity duration-500"></div>
                   <div className="relative flex items-center gap-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-2 border-purple-500/40 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/60 hover:scale-[1.02] transition-all duration-300 min-w-[200px]">
                     <div className="p-1.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg">
                       <ArrowUpDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                     </div>
                     <Select
                       value={sortOrder}
                       onValueChange={(value) => setSortOrder(value as typeof sortOrder)}
                     >
                       <SelectTrigger className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-foreground cursor-pointer shadow-none focus:ring-0 focus:ring-offset-0 h-auto py-0 px-0 pr-7 [&>svg]:hidden">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-purple-500/30 rounded-xl shadow-2xl p-2">
                         <SelectItem value="date-desc" className="text-sm font-semibold cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Date (Newest First)
                         </SelectItem>
                         <SelectItem value="date-asc" className="text-sm font-semibold cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Date (Oldest First)
                         </SelectItem>
                         <SelectItem value="title-asc" className="text-sm font-semibold cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Title (A-Z)
                         </SelectItem>
                         <SelectItem value="title-desc" className="text-sm font-semibold cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20 rounded-lg my-0.5 px-3 py-2.5 transition-colors">
                           Title (Z-A)
                         </SelectItem>
                       </SelectContent>
                     </Select>
                     <div className="absolute right-3 pointer-events-none">
                       <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-purple-600 dark:border-t-purple-400"></div>
                     </div>
                   </div>
                 </div>

                 {/* Export Button - Enhanced */}
                 <button
                   onClick={handleExport}
                   className="relative group/export flex items-center gap-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-2 border-green-500/40 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl hover:shadow-green-500/20 hover:border-green-500/60 hover:scale-[1.02] transition-all duration-300"
                 >
                   <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 via-green-500/20 to-green-500/30 rounded-xl blur-xl opacity-0 group-hover/export:opacity-100 transition-opacity duration-500"></div>
                   <div className="p-1.5 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg relative z-10">
                     <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                   </div>
                   <span className="text-sm font-bold text-green-700 dark:text-green-300 relative z-10">Export CSV</span>
                 </button>
               </div>
             </div>

           {/* Enhanced Stats Summary */}
           {!loading && historyStats && (
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
               <div className="relative bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent border border-purple-500/30 rounded-lg p-2.5 backdrop-blur-sm overflow-hidden group/stat">
                 <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300"></div>
                 <div className="relative z-10">
                   <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Total Tickets</p>
                   <p className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                     {historyStats.totalTickets.toLocaleString()}
                   </p>
                 </div>
               </div>
               <div className="relative bg-gradient-to-br from-indigo-500/20 via-indigo-500/10 to-transparent border border-indigo-500/30 rounded-lg p-2.5 backdrop-blur-sm overflow-hidden group/stat">
                 <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300"></div>
                 <div className="relative z-10">
                   <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Avg. Per Day</p>
                   <p className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                     {historyStats.averagePerDay}
                   </p>
                 </div>
               </div>
               <div className="relative bg-gradient-to-br from-green-500/20 via-green-500/10 to-transparent border border-green-500/30 rounded-lg p-2.5 backdrop-blur-sm overflow-hidden group/stat">
                 <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300"></div>
                 <div className="relative z-10">
                   <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Showing</p>
                   <p className="text-xl font-extrabold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                     {filteredTicketHistory.length}
                   </p>
                 </div>
               </div>
             </div>
           )}

           {/* Enhanced History List with Detailed Ticket Information */}
           {
             <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
               {loading ? (
               <div className="text-center py-12">
                 <div className="relative w-12 h-12 mx-auto mb-4">
                   <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
                 <p className="text-sm font-bold text-foreground mb-1">Loading ticket history...</p>
                 <p className="text-xs text-muted-foreground">Please wait while we fetch the data</p>
               </div>
             ) : ticketHistory.length === 0 ? (
               <div className="text-center py-12">
                 <div className="relative w-20 h-20 mx-auto mb-5">
                   <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full blur-xl"></div>
                   <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full flex items-center justify-center border-2 border-purple-500/30">
                     <Ticket className="w-10 h-10 text-purple-600/60" />
                   </div>
                 </div>
                 <p className="text-base font-bold text-foreground mb-1">No tickets found</p>
                 <p className="text-xs text-muted-foreground">Ticket creation history will appear here</p>
               </div>
             ) : error?.history ? (
               <div className="text-center py-12">
                 <div className="relative w-16 h-16 mx-auto mb-4">
                   <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl"></div>
                   <AlertTriangle className="relative w-16 h-16 text-red-500" />
                 </div>
                 <p className="text-sm font-bold text-foreground mb-2">Failed to load ticket history</p>
                 <Button 
                   onClick={handleRetry} 
                   size="sm" 
                   variant="outline" 
                   className="h-8 px-4 text-xs border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400"
                 >
                   <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                   Retry
                 </Button>
               </div>
             ) : filteredTicketHistory.length === 0 ? (
               <div className="text-center py-12">
                 <div className="relative w-20 h-20 mx-auto mb-5">
                   <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full blur-xl"></div>
                   <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full flex items-center justify-center border-2 border-purple-500/30">
                     <Search className="w-10 h-10 text-purple-600/60" />
                   </div>
                 </div>
                 <p className="text-base font-bold text-foreground mb-1">No results found</p>
                 <p className="text-xs text-muted-foreground">Try adjusting your search query</p>
                 <Button
                   onClick={() => setSearchQuery("")}
                   variant="ghost"
                   size="sm"
                   className="mt-3 h-7 px-3 text-xs"
                 >
                   Clear search
                 </Button>
               </div>
             ) : (
               filteredTicketHistory.map((item, idx) => {
                 const createdDate = new Date(item.created_at)
                 const timeStr = createdDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                 
                 return (
                   <div
                     key={item.id || idx}
                     className="group/item relative bg-gradient-to-r from-background/60 via-background/40 to-background/60 backdrop-blur-sm border-2 border-purple-500/20 rounded-lg p-3 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-500 overflow-hidden"
                     style={{ animationDelay: `${idx * 50}ms` }}
                   >
                     {/* Animated background gradient */}
                     <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500"></div>
                     
                     {/* Hover shine effect */}
                     <div className="absolute inset-0 -translate-x-full group-hover/item:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                     
                     {/* Left border accent with glow */}
                     <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-500 via-indigo-500 to-purple-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 shadow-lg shadow-purple-500/50"></div>
                     
                     <div className="relative z-10 flex items-start gap-4">
                       <div className="relative flex-shrink-0">
                         <div className="p-2.5 bg-gradient-to-br from-purple-500/30 via-purple-500/20 to-indigo-500/20 rounded-xl shadow-md group-hover/item:shadow-lg group-hover/item:scale-110 group-hover/item:rotate-3 transition-all duration-500 border border-purple-400/30">
                           <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                         </div>
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-start justify-between gap-3 mb-2">
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                                 {item.ticket_id || `#${item.id}`}
                               </span>
                               <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                 item.status === "open" ? "bg-blue-500/20 text-blue-700 dark:text-blue-300" :
                                 item.status === "resolved" ? "bg-green-500/20 text-green-700 dark:text-green-300" :
                                 item.status === "closed" ? "bg-gray-500/20 text-gray-700 dark:text-gray-300" :
                                 "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                               }`}>
                                 {item.status || "open"}
                               </span>
                             </div>
                             <p className="text-sm font-bold text-foreground mb-1 line-clamp-2 group-hover/item:text-purple-600 transition-colors">
                               {item.title || "No title"}
                             </p>
                             {item.description && (
                               <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                 {item.description}
                               </p>
                             )}
                           </div>
                         </div>
                         <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                           <div className="flex items-center gap-1.5">
                             <Calendar className="w-3.5 h-3.5 text-purple-600/60" />
                             <span className="font-semibold">{formatDate(item.created_at)}</span>
                             <span className="text-muted-foreground/60">at {timeStr}</span>
                           </div>
                           {item.creator_name && (
                             <>
                               <span className="text-muted-foreground/60">•</span>
                               <div className="flex items-center gap-1.5">
                                 <Users className="w-3.5 h-3.5 text-indigo-600/60" />
                                 <span className="font-semibold">Created by: <span className="text-foreground font-bold">{item.creator_name}</span></span>
                               </div>
                             </>
                           )}
                           {item.category_name && (
                             <>
                               <span className="text-muted-foreground/60">•</span>
                               <span className="font-semibold">Category: <span className="text-foreground font-bold">{item.category_name}</span></span>
                             </>
                           )}
                           {item.assignee_name && (
                             <>
                               <span className="text-muted-foreground/60">•</span>
                               <span className="font-semibold">Assignee: <span className="text-foreground font-bold">{item.assignee_name}</span></span>
                             </>
                           )}
                           {item.spoc_name && (
                             <>
                               <span className="text-muted-foreground/60">•</span>
                               <span className="font-semibold">SPOC: <span className="text-foreground font-bold">{item.spoc_name}</span></span>
                             </>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                 )
               })
             )}
             </div>
           }
         </div>
       </div>

    </div>
  )
}
