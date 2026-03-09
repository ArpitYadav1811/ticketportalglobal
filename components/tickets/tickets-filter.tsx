"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Users, X, FileDown, RefreshCw } from "lucide-react"
import { getUsers } from "@/lib/actions/tickets"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { getMyTeamMembers } from "@/lib/actions/my-team"
import { TeamTooltip } from "@/components/ui/team-tooltip"

interface User {
 id: number
 full_name: string
 email: string
}

interface BusinessUnitGroup {
 id: number
 name: string
 description: string | null
}

interface TeamMember {
 id: number
 name: string
 email: string
 business_unit_group_id: number | null
 group_name: string | null
 team_member_id: number
}

interface Ticket {
 id: number
 creator_name: string | null
 initiator_group_name: string | null
 project_name: string | null
}

interface TicketsFilterProps {
 onFilterChange: (filters: any) => void
 onExport?: () => void
 onRefresh?: () => void
 isInternal?: boolean
 tickets?: Ticket[]
}

export default function TicketsFilter({ onFilterChange, onExport, onRefresh, isInternal = false, tickets = [] }: TicketsFilterProps) {
 const [showFilters, setShowFilters] = useState(false)
 const [userId, setUserId] = useState<number | null>(null)
 const [users, setUsers] = useState<User[]>([])
 const [businessUnitGroups, setBusinessUnitGroups] = useState<BusinessUnitGroup[]>([])
 const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
 const [loadingTeam, setLoadingTeam] = useState(false)
 const [filters, setFilters] = useState({
 status: "all",
 dateFrom: "",
 dateTo: "",
 assignee: "",
 spoc: "",
 type: "all",
 search: "",
 myTeam: false,
 targetBusinessGroup: "",
 initiator: "",
 initiatorGroup: "",
 project: "",
 })

 // Extract unique values from current tickets for filter dropdowns
 const uniqueInitiators = Array.from(new Set(tickets.map(t => t.creator_name).filter(Boolean))).sort()
 const uniqueInitiatorGroups = Array.from(new Set(tickets.map(t => t.initiator_group_name).filter(Boolean))).sort()
 const uniqueProjects = Array.from(new Set(tickets.map(t => t.project_name).filter(Boolean))).sort()

 useEffect(() => {
 try {
 const userData = localStorage.getItem("user")
 if (userData) {
 const user = JSON.parse(userData)
 const uid = Number(user.id)
 setUserId(uid)
 // Load team members for this user
 loadTeamMembers(uid)
 }
 } catch (e) {
 console.error("Failed to parse user data:", e)
 }
 loadUsers()
 if (isInternal) {
 loadBusinessUnitGroups()
 }
 }, [isInternal])

 // Reset filters when switching between internal/external tabs
 useEffect(() => {
 const resetFilters = {
 status: "all",
 dateFrom: "",
 dateTo: "",
 assignee: "",
 spoc: "",
 type: "all",
 search: "",
 myTeam: false,
 targetBusinessGroup: "",
 initiator: "",
 initiatorGroup: "",
 project: "",
 }
 setFilters(resetFilters)
 }, [isInternal])

 const loadUsers = async () => {
 const result = await getUsers()
 if (result.success && result.data) {
 setUsers(result.data as User[])
 }
 }

 const loadBusinessUnitGroups = async () => {
 const { getTargetBusinessGroups } = await import("@/lib/actions/master-data")
 const result = await getTargetBusinessGroups()
 if (result.success && result.data) {
 setBusinessUnitGroups(result.data as BusinessUnitGroup[])
 }
 }

 const loadTeamMembers = async (uid: number) => {
 setLoadingTeam(true)
 try {
 const result = await getMyTeamMembers(uid)
 if (result.success && result.data) {
 setTeamMembers(result.data as TeamMember[])
 }
 } catch (error) {
 console.error("Failed to load team members:", error)
 } finally {
 setLoadingTeam(false)
 }
 }

 const handleApplyFilters = () => {
 const teamMemberIds = filters.myTeam && teamMembers.length > 0
 ? teamMembers.map(tm => tm.id)
 : []
 
 onFilterChange({
 ...filters,
 userId: filters.myTeam ? userId : undefined,
 teamMemberIds: teamMemberIds,
 })
 }

 const handleReset = () => {
 const resetFilters = {
 status: "all",
 dateFrom: "",
 dateTo: "",
 assignee: "",
 spoc: "",
 type: "all",
 search: "",
 myTeam: false,
 targetBusinessGroup: "",
 initiator: "",
 initiatorGroup: "",
 project: "",
 }
 setFilters(resetFilters)
 onFilterChange({
 ...resetFilters,
 teamMemberIds: undefined,
 })
 }

 const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, search: value }
    setFilters(newFilters)
    // Apply search filter immediately
    const teamMemberIds = newFilters.myTeam && teamMembers.length > 0
      ? teamMembers.map(tm => tm.id)
      : []
    
    onFilterChange({
      ...newFilters,
      userId: newFilters.myTeam ? userId : undefined,
      teamMemberIds: teamMemberIds,
    })
 }

 const handleSearchSubmit = (e: React.FormEvent) => {
 e.preventDefault()
 handleApplyFilters()
 }

 const handleMyTeamToggle = () => {
 const newMyTeamValue = !filters.myTeam
 const newFilters = { ...filters, myTeam: newMyTeamValue }
 setFilters(newFilters)
 
 if (newMyTeamValue) {
 // Turning ON "My Team" filter
 const teamMemberIds = teamMembers.length > 0
 ? teamMembers.map(tm => tm.id)
 : []
 
 onFilterChange({
 ...newFilters,
 userId: userId,
 teamMemberIds: teamMemberIds,
 })
 } else {
 // Turning OFF "My Team" filter - clear ALL team-related filters
 onFilterChange({
 ...newFilters,
 userId: undefined,
 teamMemberIds: undefined,
 myTeam: false, // Explicitly set to false
 })
 }
 }

 const activeFilterCount = [
 filters.status !== "all",
 filters.type !== "all",
 filters.dateFrom,
 filters.dateTo,
 filters.spoc,
 filters.assignee,
 // filters.myTeam, // Excluded - My Team is a separate filter, not part of the main filter block
 filters.targetBusinessGroup,
 filters.initiator,
 filters.initiatorGroup,
 filters.project,
 ].filter(Boolean).length

 return (
 <div className="space-y-4 w-full">
 {/* Quick Actions Bar */}
 <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
 {/* Universal Search */}
 <form onSubmit={handleSearchSubmit} className="flex-1">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
 <input
 type="text"
 placeholder="Search tickets, descriptions, users, categories..."
 value={filters.search}
 onChange={(e) => handleSearchChange(e.target.value)}
 className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-2 py-1 shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-10 h-9 text-sm"
 />
 {filters.search && (
 <button
 type="button"
 onClick={() => {
                      const newFilters = { ...filters, search: "" }
                      setFilters(newFilters)
                      const teamMemberIds = newFilters.myTeam && teamMembers.length > 0
                        ? teamMembers.map(tm => tm.id)
                        : []
                      onFilterChange({
                        ...newFilters,
                        userId: newFilters.myTeam ? userId : undefined,
                        teamMemberIds: teamMemberIds,
                      })
 }}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 </form>

 {/* Refresh Button */}
 {onRefresh && (
 <button
 onClick={onRefresh}
 className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs bg-transparent"
 title="Refresh tickets"
 >
 <RefreshCw className="w-4 h-4" />
 </button>
 )}

 {/* Export Button */}
 {onExport && (
 <button
 onClick={onExport}
 className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs bg-transparent"
 >
 <FileDown className="w-4 h-4" />
 Export
 </button>
 )}

 {/* Filters Toggle */}
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={`inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs ${
 showFilters || activeFilterCount > 0
 ? "bg-primary text-white hover:bg-primary/90"
 : "hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 bg-transparent"
 }`}
 >
 <Filter className="w-4 h-4" />
 Filters
 {activeFilterCount > 0 && (
 <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-white dark:bg-slate-700 text-primary rounded-full">
 {activeFilterCount}
 </span>
 )}
 </button>

 {/* My Team Toggle */}
 <TeamTooltip
 teamMembers={teamMembers.map(tm => ({
 id: tm.id,
 name: tm.name,
 email: tm.email,
 group: tm.group_name || undefined,
 }))}
 isActive={filters.myTeam}
 >
 <button
 onClick={handleMyTeamToggle}
 disabled={loadingTeam}
 className={`inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs ${
 filters.myTeam
 ? "bg-primary text-white hover:bg-primary/90"
 : "hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 bg-transparent"
 } ${loadingTeam ? "opacity-50 cursor-not-allowed" : ""}`}
 >
 <Users className="w-4 h-4" />
 My Team
 {teamMembers.length > 0 && (
 <span className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${
 filters.myTeam 
 ? "bg-white dark:bg-slate-700 text-primary" 
 : "bg-primary text-white"
 }`}>
 {teamMembers.length}
 </span>
 )}
 </button>
 </TeamTooltip>
 </div>

 {/* Expanded Filters */}
 {showFilters && (
 <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-4 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {/* Status */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">Status</label>
 <select
 value={filters.status}
 onChange={(e) => setFilters({ ...filters, status: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 >
 <option value="all">All Status</option>
 <option value="open">Open</option>
 <option value="closed">Closed</option>
 <option value="hold">On Hold</option>
 </select>
 </div>

 {/* Type */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">Type</label>
 <select
 value={filters.type}
 onChange={(e) => setFilters({ ...filters, type: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 >
 <option value="all">All Types</option>
 <option value="support">Support Issues</option>
 <option value="requirement">New Requirements</option>
 </select>
 </div>

 {/* Date From */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">From Date</label>
 <input
 type="date"
 value={filters.dateFrom}
 onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 />
 </div>

 {/* Date To */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">To Date</label>
 <input
 type="date"
 value={filters.dateTo}
 onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 />
 </div>

 {/* SPOC Filter */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">SPOC</label>
 <select
 value={filters.spoc}
 onChange={(e) => setFilters({ ...filters, spoc: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 >
 <option value="">All SPOCs</option>
 {users.map((user) => (
 <option key={user.id} value={user.full_name}>
 {user.full_name}
 </option>
 ))}
 </select>
 </div>

 {/* Assignee Filter */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">Assignee</label>
 <select
 value={filters.assignee}
 onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 >
 <option value="">All Assignees</option>
 {users.map((user) => (
 <option key={user.id} value={user.full_name}>
 {user.full_name}
 </option>
 ))}
 </select>
 </div>

 {/* Group Filter (Internal Tickets Only) */}
 {isInternal && (
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">Group</label>
 <select
 value={filters.targetBusinessGroup}
 onChange={(e) => setFilters({ ...filters, targetBusinessGroup: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 >
 <option value="">All Groups</option>
 {businessUnitGroups.map((bu) => (
 <option key={bu.id} value={bu.name}>
 {bu.name}
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Initiator Filter */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">Initiator</label>
 <select
 value={filters.initiator}
 onChange={(e) => setFilters({ ...filters, initiator: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 >
 <option value="">All Initiators</option>
 {uniqueInitiators.map((name) => (
 <option key={name} value={name || ""}>
 {name}
 </option>
 ))}
 </select>
 </div>

 {/* Initiator Group Filter */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">Initiator Group</label>
 <select
 value={filters.initiatorGroup}
 onChange={(e) => setFilters({ ...filters, initiatorGroup: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 >
 <option value="">All Groups</option>
 {uniqueInitiatorGroups.map((name) => (
 <option key={name} value={name || ""}>
 {name}
 </option>
 ))}
 </select>
 </div>

 {/* Project Filter */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">Project</label>
 <select
 value={filters.project}
 onChange={(e) => setFilters({ ...filters, project: e.target.value })}
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
 >
 <option value="">All Projects</option>
 {uniqueProjects.map((name) => (
 <option key={name} value={name || ""}>
 {name}
 </option>
 ))}
 </select>
 </div>

 {/* Reset All Button */}
 <div className="flex items-end">
 <button
 onClick={handleReset}
 className="w-full px-4 py-2.5 border border-border rounded-lg text-foreground hover:bg-surface transition-colors text-sm font-medium whitespace-nowrap"
 >
 Reset All
 </button>
 </div>

 {/* Apply Filters Button */}
 <div className="flex items-end">
 <button
 onClick={handleApplyFilters}
 className="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium whitespace-nowrap"
 >
 Apply Filters
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
