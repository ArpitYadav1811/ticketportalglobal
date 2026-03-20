"use client"

import { useEffect, useState, useCallback } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { getAnalyticsData } from "@/lib/actions/stats"
import { getBusinessGroupsForSpoc, isUserSpoc } from "@/lib/actions/master-data"

/* ── Palette ─────────────────────────────────────────────────── */
const CHART_COLORS = {
  primary: "#6366f1",   // indigo
  secondary: "#a855f7", // purple
  accent: "#3b82f6",    // blue
  success: "#10b981",   // emerald
  warning: "#f59e0b",   // amber
  danger: "#ef4444",    // red
  pink: "#ec4899",
  teal: "#14b8a6",
}
const PIE_COLORS = ["#6366f1", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"]
const GRADIENT_BAR = ["#6366f1", "#a855f7", "#3b82f6", "#10b981", "#f59e0b"]

/* ── Duration filter options (matches reference image) ─────── */
const DURATION_OPTIONS = [
  { label: "Last Day", value: 1 },
  { label: "1 Week", value: 7 },
  { label: "1 Month", value: 30 },
  { label: "3 Months", value: 90 },
  { label: "All", value: 0 },
]

/* ── Shared custom tooltip ─────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-foreground-secondary">{entry.name || entry.dataKey}:</span>
          <span className="font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Custom legend ─────────────────────────────────────────── */
const CustomLegend = ({ payload }: any) => {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-foreground-secondary">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Pie tooltip ───────────────────────────────────────────── */
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white dark:bg-slate-800 border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.payload?.fill }} />
        <span className="text-foreground-secondary">{d.name}:</span>
        <span className="font-semibold text-foreground">{d.value}</span>
      </div>
    </div>
  )
}

/* ── Shared grid / axis styles ─────────────────────────────── */
const GRID = { strokeDasharray: "3 3", stroke: "#e2e8f0", strokeOpacity: 0.6 }
const AXIS_TICK = { fontSize: 11, fill: "#94a3b8" }
const AXIS_TICK_SM = { fontSize: 10, fill: "#94a3b8" }

/* ── Card wrapper ──────────────────────────────────────────── */
const ChartCard = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-slate-800 border border-border rounded-xl p-4 ${className}`}>
    <h3 className="text-[13px] font-poppins font-semibold text-foreground mb-3">{title}</h3>
    {children}
  </div>
)

/* ── Status Colors ─────────────────────────────────────────── */
const STATUS_COLORS = {
  total: "#6366f1",    // indigo
  open: "#ef4444",     // red
  resolved: "#10b981", // green
  on_hold: "#f59e0b",  // amber
  closed: "#64748b",   // slate
}

/* ════════════════════════════════════════════════════════════ */

interface AnalyticsChartsProps {
  userId?: number
  userRole?: string
  userGroupId?: number
  selectedGroupId?: number | "all" | null
  filterType?: "initiator" | "target"
}

export default function AnalyticsCharts({ userId, userRole, userGroupId, selectedGroupId, filterType = "target" }: AnalyticsChartsProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(30)
  const [businessGroupIds, setBusinessGroupIds] = useState<number[] | undefined>(undefined)
  const [filtersReady, setFiltersReady] = useState(false)

  const isAdmin = userRole === "admin" || userRole === "superadmin"
  const isSuperAdmin = userRole === "superadmin"

  // Load business groups for filtering
  useEffect(() => {
    const loadBusinessGroups = async () => {
      // For Super Admin, use selectedGroupId from dropdown
      if (isSuperAdmin) {
        if (selectedGroupId === "all" || selectedGroupId === null) {
          setBusinessGroupIds(undefined) // Show all tickets
        } else {
          setBusinessGroupIds([selectedGroupId as number]) // Filter by selected group
        }
        setFiltersReady(true)
        return
      }

      if (isAdmin) {
        setFiltersReady(true)
        return
      }

      if (!userId) {
        setFiltersReady(true)
        return
      }

      // First, check if user is a SPOC (manages multiple groups)
      const roleIsManager = userRole === "manager"
      const spocCheck = await isUserSpoc(userId)
      const userIsSpoc = roleIsManager || spocCheck

      if (userIsSpoc) {
        // SPOC: Get all groups they manage
        const result = await getBusinessGroupsForSpoc(userId)
        if (result.success && result.data && result.data.length > 0) {
          setBusinessGroupIds(result.data.map((bg: any) => bg.id))
        } else {
          setBusinessGroupIds([])
        }
        setFiltersReady(true)
      } else if (userGroupId) {
        // Regular User: Use their assigned business group
        setBusinessGroupIds([userGroupId])
        setFiltersReady(true)
      } else {
        setBusinessGroupIds([])
        setFiltersReady(true)
      }
    }
    loadBusinessGroups()
  }, [userId, userRole, userGroupId, isAdmin, isSuperAdmin, selectedGroupId])

  const loadData = useCallback(async () => {
    setLoading(true)
    // For Super Admin with selected group, filter by that group
    // For regular users and SPOC (not admin), pass businessGroupIds
    // filterType determines whether to filter by initiator group or target group
    const options = (isSuperAdmin && selectedGroupId !== "all" && selectedGroupId !== null)
      ? { businessGroupIds: [selectedGroupId as number], filterType }
      : (!isAdmin && businessGroupIds && businessGroupIds.length > 0)
        ? { businessGroupIds, filterType }
        : { filterType }
    const result = await getAnalyticsData(daysFilter, options)
    if (result.success) {
      setData(result.data)
    } else {
      // Keep rendering with empty datasets instead of hiding whole page
      setData(result.data || {})
    }
    setLoading(false)
  }, [daysFilter, isAdmin, isSuperAdmin, businessGroupIds, selectedGroupId, filterType])

  useEffect(() => {
    if (!filtersReady) return
    loadData()
  }, [filtersReady, loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-8 text-foreground-secondary">No analytics data available</div>
  }

  /* ── Summary values ──────────────────────────────── */
  const total = Number(data.summaryStats?.total || 0)
  const open = Number(data.summaryStats?.open || 0)
  const resolved = Number(data.summaryStats?.resolved || 0)
  const closed = Number(data.summaryStats?.closed || 0)
  const onHold = Number(data.summaryStats?.on_hold || 0)
  const pctOpen = total > 0 ? (open / total) * 100 : 0
  const pctResolved = total > 0 ? (resolved / total) * 100 : 0
  const pctClosed = total > 0 ? (closed / total) * 100 : 0
  const pctHold = total > 0 ? (onHold / total) * 100 : 0

  const statItems = [
    { label: "Open", value: open, pct: pctOpen, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
    { label: "Resolved", value: resolved, pct: pctResolved, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    { label: "Closed", value: closed, pct: pctClosed, color: "bg-slate-400 dark:bg-slate-500", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400 dark:bg-slate-500" },
    { label: "On-Hold", value: onHold, pct: pctHold, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  ]

  const durationLabel = daysFilter === 0 ? "All Time" : (DURATION_OPTIONS.find(o => o.value === daysFilter)?.label || `${daysFilter}d`)

  return (
    <div className="space-y-4">
      {/* ── Duration Filter (button group like reference) ───── */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-foreground-secondary tracking-wide">Duration:</span>
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDaysFilter(opt.value)}
              className={`px-4 py-1.5 text-xs font-medium transition-all
                ${daysFilter === opt.value
                  ? "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 text-foreground-secondary hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }
                border-r border-border last:border-r-0`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Unified Ticket Overview Card ────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Total */}
          <div className="flex-shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-foreground-secondary mb-0.5">Total Tickets</p>
            <p className="text-3xl font-poppins font-bold text-foreground leading-none">{total}</p>
          </div>

          <div className="hidden md:block w-px h-12 bg-border" />

          {/* Breakdown */}
          <div className="flex-1 min-w-0">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mb-3">
              {statItems.map((item) =>
                item.pct > 0 ? (
                  <div
                    key={item.label}
                    className={`${item.color} transition-all duration-500 relative group`}
                    style={{ width: `${item.pct}%` }}
                  >
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {item.label}: {item.value} ({item.pct.toFixed(0)}%)
                    </span>
                  </div>
                ) : null
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {statItems.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                  <span className={`text-sm font-semibold font-poppins ${item.text}`}>{item.value}</span>
                  <span className="text-[11px] text-foreground-secondary">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-border" />

          {/* Key Metrics */}
          {isAdmin && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 flex-shrink-0">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-secondary mb-0.5">Business Units</p>
                <p className="text-base font-poppins font-bold text-foreground">{data.ticketsByBU.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 1: Category + Initiators (2-col) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tickets by Initiator Category */}
        <ChartCard title="Tickets by Initiator Category">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.ticketsByCategory?.slice(0, 10) || []} margin={{ left: 20, right: 20, bottom: 20 }} barSize={40}>
              <defs>
                <linearGradient id="catGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="category" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="ticket_count" fill="url(#catGrad)" radius={[4, 4, 0, 0]} name="Tickets" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tickets by Initiators */}
        <ChartCard title="Tickets by Initiators">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.ticketsByInitiators?.slice(0, 10) || []} margin={{ left: 20, right: 20, bottom: 20 }} barSize={30}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="initiator" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="total" fill={STATUS_COLORS.total} name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="open" fill={STATUS_COLORS.open} name="Open" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill={STATUS_COLORS.resolved} name="Resolved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>


      {/* ── Charts (vertical stack) ────────────────────────────── */}
      <div className="space-y-4">

      {/* ── Row: Target Group Category + Business Unit (Total) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tickets by Target Group Category */}
        {data.ticketsByInitiatorGroup?.length > 0 ? (
          <ChartCard title="Tickets by Target Group Category">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.ticketsByInitiatorGroup?.slice(0, 10) || []} margin={{ left: 20, right: 20, bottom: 20 }} barSize={40}>
                <defs>
                  <linearGradient id="initiatorGroupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="initiator_group" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
                <Bar dataKey="ticket_count" fill="url(#initiatorGroupGrad)" radius={[4, 4, 0, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <div />
        )}


      </div>

      {/* Tickets by Business Unit (Open & Resolved) */}
      {!!data.ticketsByBUStatus?.length && (
        <ChartCard title="Tickets by Business Unit (Open & Resolved)">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.ticketsByBUStatus?.slice(0, 10) || []} margin={{ left: 20, right: 20, bottom: 20 }} barSize={30}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="business_unit" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="total" fill={STATUS_COLORS.total} name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="open" fill={STATUS_COLORS.open} name="Open" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill={STATUS_COLORS.resolved} name="Resolved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Detailed SPOC & Assignee Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Tickets by SPOC - All Status */}
        <ChartCard title="Tickets by SPOC">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.ticketsBySpocDetailed?.slice(0, 10) || []} margin={{ left: 20, right: 20, bottom: 20 }} barSize={25}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="spoc" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="total" fill={STATUS_COLORS.total} name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="open" fill={STATUS_COLORS.open} name="Open" radius={[4, 4, 0, 0]} />
              <Bar dataKey="on_hold" fill={STATUS_COLORS.on_hold} name="On-Hold" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill={STATUS_COLORS.resolved} name="Resolved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tickets by Assignee - All Status */}
        <ChartCard title="Tickets by Assignee">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.ticketsByAssignee?.slice(0, 10) || []} margin={{ left: 20, right: 20, bottom: 20 }} barSize={25}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="assignee" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="total" fill={STATUS_COLORS.total} name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="open" fill={STATUS_COLORS.open} name="Open" radius={[4, 4, 0, 0]} />
              <Bar dataKey="on_hold" fill={STATUS_COLORS.on_hold} name="On-Hold" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill={STATUS_COLORS.resolved} name="Resolved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Ticket Trend Chart (responds to Duration filter) — last row ──────────────────────────────── */}
      <ChartCard title={`Ticket Trend (${durationLabel})`}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.ticketTrend || []} margin={{ left: 20, right: 20, bottom: 20 }} barSize={40}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.9} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey="count" fill="url(#trendGrad)" radius={[4, 4, 0, 0]} name="Tickets Created" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      </div>
    </div>
  )
}
