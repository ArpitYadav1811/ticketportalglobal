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

/* ════════════════════════════════════════════════════════════ */

interface AnalyticsChartsProps {
  userId?: number
  userRole?: string
}

export default function AnalyticsCharts({ userId, userRole }: AnalyticsChartsProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(30)
  const [spocGroupIds, setSpocGroupIds] = useState<number[] | undefined>(undefined)
  const [isSpoc, setIsSpoc] = useState(false)
  const [filtersReady, setFiltersReady] = useState(false)

  const isAdmin = userRole === "admin" || userRole === "superadmin"

  // Load SPOC business groups — check both role AND DB mapping
  useEffect(() => {
    const loadSpocGroups = async () => {
      if (isAdmin || !userId) {
        setFiltersReady(true)
        return
      }
      const roleIsManager = userRole === "manager"
      const spocCheck = await isUserSpoc(userId)
      const userIsSpoc = roleIsManager || spocCheck

      if (userIsSpoc) {
        setIsSpoc(true)
        const result = await getBusinessGroupsForSpoc(userId)
        if (result.success && result.data && result.data.length > 0) {
          setSpocGroupIds(result.data.map((bg: any) => bg.id))
        } else {
          setSpocGroupIds([])
        }
      }
      setFiltersReady(true)
    }
    loadSpocGroups()
  }, [userId, userRole, isAdmin])

  const isRegularUser = !isAdmin && !isSpoc

  const loadData = useCallback(async () => {
    setLoading(true)
    const options = isSpoc && spocGroupIds && spocGroupIds.length > 0
      ? { businessGroupIds: spocGroupIds }
      : isRegularUser && userId
        ? { userId }
        : undefined
    const result = await getAnalyticsData(daysFilter, options)
    if (result.success) setData(result.data)
    setLoading(false)
  }, [daysFilter, isSpoc, spocGroupIds, isRegularUser, userId])

  useEffect(() => {
    if (!filtersReady) return
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
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
          <div className="flex flex-wrap gap-x-5 gap-y-2 flex-shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-foreground-secondary mb-0.5">Avg Resolution</p>
              <p className="text-base font-poppins font-bold text-foreground">{data.avgResolutionTime}h</p>
            </div>
            {isAdmin && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-secondary mb-0.5">Business Units</p>
                <p className="text-base font-poppins font-bold text-foreground">{data.ticketsByBU.length}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Grid (2-col) ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tickets by Business Unit — admin only */}
        {isAdmin && (
          <ChartCard title="Tickets by Business Unit">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={data.ticketsByBU} barSize={28}>
                <defs>
                  <linearGradient id="buGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="business_unit" textAnchor="end" height={80} tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                <Bar dataKey="ticket_count" fill="url(#buGrad)" radius={[4, 4, 0, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Tickets by Category */}
        <ChartCard title="Tickets by Category">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.ticketsByCategory} barSize={28}>
              <defs>
                <linearGradient id="catGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="category" angle={-40} textAnchor="end" height={80} tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(168,85,247,0.06)" }} />
              <Bar dataKey="ticket_count" fill="url(#catGrad)" radius={[4, 4, 0, 0]} name="Tickets" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Team Member Status Breakdown */}
        <ChartCard title="Team Member Status Breakdown (Top 10)">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.teamMemberStatusBreakdown} barSize={18} barGap={1}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="member" angle={-35} textAnchor="end" height={90} tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="open" stackId="status" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Open" />
              <Bar dataKey="resolved" stackId="status" fill="#10b981" radius={[0, 0, 0, 0]} name="Resolved" />
              <Bar dataKey="closed" stackId="status" fill="#94a3b8" radius={[0, 0, 0, 0]} name="Closed" />
              <Bar dataKey="on_hold" stackId="status" fill="#f59e0b" radius={[3, 3, 0, 0]} name="On-Hold" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status Distribution */}
        <ChartCard title="Status Distribution">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={data.ticketsByStatus}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                nameKey="status"
                stroke="none"
              >
                {data.ticketsByStatus.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Ticket Type Distribution */}
        <ChartCard title="Ticket Type Distribution">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={data.ticketsByType}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                nameKey="ticket_type"
                stroke="none"
              >
                {data.ticketsByType.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Priority Distribution */}
        <ChartCard title="Priority Distribution">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.ticketsByPriority} barSize={32}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="priority" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(16,185,129,0.06)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tickets">
                {data.ticketsByPriority.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={GRADIENT_BAR[index % GRADIENT_BAR.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Full Width Charts ──────────────────────────────── */}
      <div className="space-y-4">

        {/* Ticket Trend */}
        <ChartCard title={`Ticket Trend (${durationLabel})`}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.ticketTrend}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "#fff", strokeWidth: 2 }}
                name="Tickets Created"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Team Performance */}
        <ChartCard title="Team Performance (Top 10)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.teamPerformance} barSize={14} barGap={2}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="assignee" textAnchor="end" height={90} tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="closed_count" fill={CHART_COLORS.success} radius={[3, 3, 0, 0]} name="Closed" />
              <Bar dataKey="open_count" fill={CHART_COLORS.accent} radius={[3, 3, 0, 0]} name="Open" />
              <Bar dataKey="total_count" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Initiators & Assignment Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.topInitiators?.length > 0 && (
            <ChartCard title="Top Ticket Initiators">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.topInitiators} layout="vertical" barSize={14}>
                  <CartesianGrid {...GRID} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis dataKey="initiator" type="category" width={110} tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(168,85,247,0.06)" }} />
                  <Bar dataKey="ticket_count" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} name="Tickets Created" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {data.assignmentDistribution?.length > 0 && (
            <ChartCard title="Most Assigned Users">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.assignmentDistribution} layout="vertical" barSize={14}>
                  <CartesianGrid {...GRID} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis dataKey="assignee" type="category" width={110} tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                  <Bar dataKey="ticket_count" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} name="Tickets Assigned" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* Monthly Trend */}
        <ChartCard title="Monthly Ticket Trend (Last 12 Months)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.ticketsByMonth}>
              <defs>
                <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="month" textAnchor="end" height={60} tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={CHART_COLORS.secondary}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CHART_COLORS.secondary, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CHART_COLORS.secondary, stroke: "#fff", strokeWidth: 2 }}
                name="Tickets"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
