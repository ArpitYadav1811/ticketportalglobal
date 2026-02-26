"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { BarChart3, CheckCircle, Clock, AlertCircle, TrendingUp } from "lucide-react"
import { getDashboardStats } from "@/lib/actions/stats"

interface StatCard {
 title: string
 value: string | number
 icon: React.ReactNode
 bgColor: string
 iconColor: string
 borderColor: string
}

export default function QuickStats() {
 const [stats, setStats] = useState({
 open: 0,
 closed: 0,
 hold: 0,
 total: 0,
 })
 const [isLoading, setIsLoading] = useState(true)

 useEffect(() => {
 loadStats()
 // Refresh stats every 30 seconds for real-time updates
 const interval = setInterval(loadStats, 30000)
 return () => clearInterval(interval)
 }, [])

 const loadStats = async () => {
 const result = await getDashboardStats()
 if (result.success) {
 setStats(result.data)
 }
 setIsLoading(false)
 }

 const statCards: StatCard[] = [
 {
 title: "Open Tickets",
 value: isLoading ? "..." : stats.open,
 icon: <Clock className="w-7 h-7" />,
 bgColor: "bg-slate-100 dark:bg-slate-800",
 iconColor: "text-slate-700 dark:text-slate-300",
 borderColor: "border-blue-100 dark:border-blue-900",
 },
 {
 title: "Closed Tickets",
 value: isLoading ? "..." : stats.closed,
 icon: <CheckCircle className="w-7 h-7" />,
 bgColor: "bg-green-50 dark:bg-green-950/30",
 iconColor: "text-green-600 dark:text-green-400",
 borderColor: "border-green-100 dark:border-green-900",
 },
 {
 title: "On Hold",
 value: isLoading ? "..." : stats.hold,
 icon: <AlertCircle className="w-7 h-7" />,
 bgColor: "bg-amber-50 dark:bg-amber-950/30",
 iconColor: "text-amber-600 dark:text-amber-400",
 borderColor: "border-amber-100 dark:border-amber-900",
 },
 {
 title: "Total Tickets",
 value: isLoading ? "..." : stats.total,
 icon: <BarChart3 className="w-7 h-7" />,
 bgColor: "bg-purple-50 dark:bg-purple-950/30",
 iconColor: "text-purple-600 dark:text-purple-400",
 borderColor: "border-purple-100 dark:border-purple-900",
 },
 ]

 return (
 <div className="space-y-6">
 {/* Section Header with Icon */}
 <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
 <TrendingUp className="w-6 h-6 text-slate-700 dark:text-slate-300" />
 </div>
 <div>
 <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
 Statistics Overview
 </h2>
 <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
 Real-time ticket metrics and performance indicators
 </p>
 </div>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
 {statCards.map((stat, idx) => (
 <div
 key={idx}
 className={`${stat.bgColor} ${stat.borderColor} border p-6 rounded-lg transition-all duration-300 cursor-pointer`}
 >
 {/* Icon Container */}
 <div className="flex items-center justify-between mb-4">
 <div className={`${stat.iconColor} transition-transform duration-300 hover:scale-110`}>
 {stat.icon}
 </div>
 </div>

 {/* Stats Content */}
 <div className="space-y-1">
 <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
 {stat.title}
 </p>
 <p className="text-3xl font-semibold text-slate-900 dark:text-white">
 {stat.value}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )
}
