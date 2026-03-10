"use client"

import { useState, useEffect } from "react"
import { X, Search, User, Building2, Check } from "lucide-react"
import { getUsers } from "@/lib/actions/tickets"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"

interface User {
  id: number
  full_name: string
  email: string
  role: string
  business_unit_group_id?: number
  group_name?: string
}

interface AssigneeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (userId: number | null) => void
  currentAssigneeId: number | null
  ticketTitle: string
  ticketId?: string | null
  ticketBusinessUnitGroupId?: number | null
  isAdmin?: boolean
}

export default function AssigneeModal({
  isOpen,
  onClose,
  onSelect,
  currentAssigneeId,
  ticketTitle,
  ticketId,
  ticketBusinessUnitGroupId,
  isAdmin = false,
}: AssigneeModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBUGroup, setSelectedBUGroup] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(currentAssigneeId)
  const [showOtherGroups, setShowOtherGroups] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
      setSelectedUserId(currentAssigneeId)
      setSearchTerm("")
      setSelectedBUGroup("all")
      setShowOtherGroups(false)
    }
  }, [isOpen, currentAssigneeId])

  const loadData = async () => {
    setLoading(true)
    const [usersResult, buResult] = await Promise.all([
      getUsers(),
      getBusinessUnitGroups(),
    ])

    if (usersResult.success && usersResult.data) {
      setUsers(usersResult.data as User[])
    }
    if (buResult.success && buResult.data) {
      setBusinessGroups(buResult.data)
    }
    setLoading(false)
  }

  // Separate users by group
  const usersInTargetGroup = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Admin sees all users in target group section if no group specified
    // SPOC only sees users from the ticket's target business group
    if (isAdmin) {
      const isInTargetGroup = ticketBusinessUnitGroupId 
        ? user.business_unit_group_id === ticketBusinessUnitGroupId
        : true
      const isCurrentAssignee = user.id === currentAssigneeId
      return matchesSearch && (isInTargetGroup || isCurrentAssignee)
    } else {
      // SPOC: only show users from ticket's target business group
      if (!ticketBusinessUnitGroupId) return matchesSearch
      const isInTargetGroup = user.business_unit_group_id === ticketBusinessUnitGroupId
      const isCurrentAssignee = user.id === currentAssigneeId
      return matchesSearch && (isInTargetGroup || isCurrentAssignee)
    }
  })

  const usersInOtherGroups = users.filter((user) => {
    // SPOC cannot see users from other groups
    if (!isAdmin) return false

    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // If no ticketBusinessUnitGroupId, don't show "other groups" section
    if (!ticketBusinessUnitGroupId) {
      return false
    }
    
    const isInTargetGroup = user.business_unit_group_id === ticketBusinessUnitGroupId
    
    // Exclude current assignee from other groups (already shown in target group)
    const isCurrentAssignee = user.id === currentAssigneeId
    
    return matchesSearch && !isInTargetGroup && !isCurrentAssignee
  })

  // Filter by selected BU group if filter is applied
  const filteredUsersInTargetGroup = selectedBUGroup === "all" 
    ? usersInTargetGroup
    : usersInTargetGroup.filter(user => user.business_unit_group_id === parseInt(selectedBUGroup))

  const filteredUsersInOtherGroups = selectedBUGroup === "all"
    ? usersInOtherGroups
    : usersInOtherGroups.filter(user => user.business_unit_group_id === parseInt(selectedBUGroup))

  const hasOtherGroupsUsers = filteredUsersInOtherGroups.length > 0

  const handleConfirm = () => {
    onSelect(selectedUserId)
    onClose()
  }

  const handleUnassign = () => {
    onSelect(null)
    onClose()
  }

  if (!isOpen) return null

  const ticketBusinessGroupName =
    ticketBusinessUnitGroupId && businessGroups.length
      ? businessGroups.find((bg) => bg.id === ticketBusinessUnitGroupId)?.name
      : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-foreground">Assign Ticket</h2>
              {ticketId && (
                <span className="text-lg font-semibold text-foreground">
                  #{ticketId.replace(/^TKT-\d{6}-/, '')}
                </span>
              )}
            </div>
            {ticketBusinessUnitGroupId && ticketBusinessGroupName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {ticketBusinessGroupName}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-3 py-2.5 space-y-2 border-b border-border">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-white dark:bg-slate-700 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              autoFocus
            />
          </div>

          {/* BU Group Filter - Only visible for Admin */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedBUGroup}
                onChange={(e) => setSelectedBUGroup(e.target.value)}
                className="flex-1 px-2.5 py-2 border border-border rounded-md bg-white dark:bg-slate-700 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Business Units</option>
                {businessGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[180px] max-h-[260px]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsersInTargetGroup.length === 0 && filteredUsersInOtherGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <User className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No employees found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Users from target group */}
              {filteredUsersInTargetGroup.length > 0 && (
                <>
                  {filteredUsersInTargetGroup.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left ${
                        selectedUserId === user.id
                          ? "bg-primary/10 dark:bg-primary/20 border-2 border-primary"
                          : "hover:bg-surface dark:hover:bg-slate-700 border-2 border-transparent"
                      }`}
                    >
                      <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-medium text-xs">
                        {user.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {user.full_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      {selectedUserId === user.id && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* More... button to show other groups */}
              {hasOtherGroupsUsers && !showOtherGroups && (
                <button
                  onClick={() => setShowOtherGroups(true)}
                  className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-md border-2 border-dashed border-border hover:bg-surface dark:hover:bg-slate-700 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>More...</span>
                  <span className="text-xs">({filteredUsersInOtherGroups.length} from other groups)</span>
                </button>
              )}

              {/* Users from other groups */}
              {showOtherGroups && filteredUsersInOtherGroups.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t border-border dark:border-slate-700 mt-2 pt-2">
                    Other Groups
                  </div>
                  {filteredUsersInOtherGroups.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left ${
                        selectedUserId === user.id
                          ? "bg-primary/10 dark:bg-primary/20 border-2 border-primary"
                          : "hover:bg-surface dark:hover:bg-slate-700 border-2 border-transparent"
                      }`}
                    >
                      <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-medium text-xs">
                        {user.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {user.full_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user.email}
                        </p>
                        {user.group_name && (
                          <p className="text-[11px] text-muted-foreground/70 truncate">
                            {user.group_name}
                          </p>
                        )}
                      </div>
                      {selectedUserId === user.id && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-surface/50 dark:bg-slate-700/50">
          <button
            onClick={handleUnassign}
            className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Remove Assignment
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-md hover:bg-surface dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedUserId === currentAssigneeId}
              className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
