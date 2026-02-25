"use client"

import { useEffect, useState } from "react"
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

const COLORS = ["#530093", "#A21094", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"]

export default function AnalyticsCharts() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(30)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [daysFilter])

  const loadData = async () => {
    setLoading(true)
    const result = await getAnalyticsData(daysFilter)
    if (result.success) {
      setData(result.data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-8 text-foreground-secondary">Loading analytics...</div>
  }

  if (!data) {
    return <div className="text-center py-8 text-foreground-secondary">No analytics data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-foreground">Filter by days:</label>
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={0}>All time</option>
          </select>
        </div>
      </div>

      {/* Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <p className="text-sm text-foreground-secondary mb-2">Total</p>
          <p className="text-3xl font-poppins font-bold text-foreground">
            {data.summaryStats?.total || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <p className="text-sm text-foreground-secondary mb-2">Open</p>
          <p className="text-3xl font-poppins font-bold text-blue-600 dark:text-blue-400">
            {data.summaryStats?.open || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <p className="text-sm text-foreground-secondary mb-2">Resolved</p>
          <p className="text-3xl font-poppins font-bold text-green-600 dark:text-green-400">
            {data.summaryStats?.resolved || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <p className="text-sm text-foreground-secondary mb-2">Closed</p>
          <p className="text-3xl font-poppins font-bold text-gray-600 dark:text-gray-400">
            {data.summaryStats?.closed || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <p className="text-sm text-foreground-secondary mb-2">On-Hold</p>
          <p className="text-3xl font-poppins font-bold text-amber-600 dark:text-amber-400">
            {data.summaryStats?.on_hold || 0}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <p className="text-sm text-foreground-secondary mb-2">Avg Resolution Time</p>
          <p className="text-3xl font-poppins font-bold text-foreground">{data.avgResolutionTime}h</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <p className="text-sm text-foreground-secondary mb-2">Total Tickets ({daysFilter === 0 ? 'All time' : `Last ${daysFilter} days`})</p>
          <p className="text-3xl font-poppins font-bold text-foreground">
            {data.ticketTrend.reduce((sum: number, item: any) => sum + Number(item.count), 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <p className="text-sm text-foreground-secondary mb-2">Active Business Units</p>
          <p className="text-3xl font-poppins font-bold text-foreground">{data.ticketsByBU.length}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Business Unit */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Tickets by Business Unit</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ticketsByBU}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="business_unit" textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="ticket_count" fill="#530093" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tickets by Category */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Tickets by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ticketsByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="ticket_count" fill="#A21094" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tickets by Subcategory (Top 10) */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Top 10 Subcategories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ticketsBySubcategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="subcategory" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="ticket_count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.ticketsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percent }: any) => `${status}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="status"
              >
                {data.ticketsByStatus.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket Type Distribution */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Ticket Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.ticketsByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ ticket_type, percent }: any) => `${ticket_type}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="ticket_type"
              >
                {data.ticketsByType.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ticketsByPriority}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="priority" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Width Charts */}
      <div className="space-y-6">
        {/* Ticket Trend (Last 30 Days) */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Ticket Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.ticketTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#530093" strokeWidth={2} name="Tickets Created" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Team Performance */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Team Performance (Top 10)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.teamPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="assignee" textAnchor="end" height={120} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="closed_count" fill="#10b981" name="Closed" />
              <Bar dataKey="open_count" fill="#3b82f6" name="Open" />
              <Bar dataKey="total_count" fill="#530093" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend (Last 12 Months) */}
        <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
          <h3 className="font-poppins font-bold text-foreground mb-4">Monthly Ticket Trend (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.ticketsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month"  textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#A21094" strokeWidth={2} name="Tickets" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
