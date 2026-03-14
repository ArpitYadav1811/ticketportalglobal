"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Edit, Trash2, Key, CheckCircle, XCircle, AlertTriangle, Circle, X, Users, Building2 } from "lucide-react"
import { toast } from "sonner"
import { deactivateUser, activateUser, deleteUser, resetUserPassword, getUserRoles, updateUserPasswordAsAdmin } from "@/lib/actions/users"
import { updateUserRole, updateUserBusinessGroup } from "@/lib/actions/admin"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface User {
  id: number
  email: string
  full_name: string
  role: string
  avatar_url: string | null
  created_at: string
  is_active: boolean
  ticket_count: number
  ticket_count_open: number
  ticket_count_on_hold: number
  ticket_count_resolved: number
  ticket_count_closed: number
  ticket_count_returned: number
  ticket_count_deleted: number
  team_count: number
  business_unit_group_id: number | null
  business_group_name: string | null
  team_names: string | null
}

interface UsersTableProps {
  users: User[]
  loading: boolean
  onEditUser: (user: User) => void
  onRefresh: () => void
  isSuperAdmin?: boolean
  currentUserId?: number
}

export default function UsersTable({ users, loading, onEditUser, onRefresh, isSuperAdmin = false, currentUserId }: UsersTableProps) {
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [roleChangingId, setRoleChangingId] = useState<number | null>(null)
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([])
  const [businessGroups, setBusinessGroups] = useState<{ id: number; name: string }[]>([])
  const [bgChangingId, setBgChangingId] = useState<number | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) {
      getUserRoles(true).then((res) => {
        if (res.success && res.data) setRoles(res.data)
      })

      // Load business groups for inline editing
      getBusinessUnitGroups().then((res: any) => {
        if (res?.success && Array.isArray(res.data)) {
          setBusinessGroups(
            res.data.map((bg: any) => ({
              id: bg.id,
              name: bg.name,
            })),
          )
        }
      })
    }
  }, [isSuperAdmin])

  const handleDeactivate = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate ${user.full_name}? They will not be able to log in.`)) {
      return
    }
    setProcessingId(user.id)
    const result = await deactivateUser(user.id)
    if (result.success) {
      toast.success(`${user.full_name} deactivated successfully`)
      onRefresh()
    } else {
      toast.error(result.error || "Failed to deactivate user")
    }
    setProcessingId(null)
  }

  const handleActivate = async (user: User) => {
    setProcessingId(user.id)
    const result = await activateUser(user.id)
    if (result.success) {
      toast.success(`${user.full_name} activated successfully`)
      onRefresh()
    } else {
      toast.error(result.error || "Failed to activate user")
    }
    setProcessingId(null)
  }

  const handleDelete = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${user.full_name}? This action cannot be undone.\n\nNote: Users with assigned or created tickets cannot be deleted.`
      )
    ) {
      return
    }
    setProcessingId(user.id)
    const result = await deleteUser(user.id)
    if (result.success) {
      toast.success(`${user.full_name} deleted successfully`)
      onRefresh()
    } else {
      toast.error(result.error || "Failed to delete user")
    }
    setProcessingId(null)
  }

  const handleResetPassword = (user: User, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setSelectedUser(user)
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError("")
    setPasswordDialogOpen(true)
  }

  const handleUpdatePassword = async () => {
    // Reset error
    setPasswordError("")

    // Validate passwords
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    if (!selectedUser) return

    setIsUpdatingPassword(true)
    const result = await updateUserPasswordAsAdmin(selectedUser.id, newPassword)
    
    if (result.success) {
      setPasswordDialogOpen(false)
      setNewPassword("")
      setConfirmPassword("")
      const userName = selectedUser.full_name
      setSelectedUser(null)
      toast.success(`Password updated successfully for ${userName}`)
      onRefresh()
    } else {
      setPasswordError(result.error || "Failed to update password")
    }
    
    setIsUpdatingPassword(false)
  }

  const handleCancelPasswordDialog = () => {
    setPasswordDialogOpen(false)
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError("")
    setSelectedUser(null)
  }

  const handleInlineRoleChange = async (userId: number, newRole: string, userName: string) => {
    if (userId === currentUserId) {
      toast.error("Cannot change your own role")
      return
    }
    if (!confirm(`Change ${userName}'s role to "${formatRoleName(newRole)}"?`)) return

    setRoleChangingId(userId)
    const result = await updateUserRole(userId, newRole)
    if (result.success) {
      toast.success(`${userName}'s role updated to ${formatRoleName(newRole)}`)
      onRefresh()
    } else {
      toast.error(result.error || "Failed to update role")
    }
    setRoleChangingId(null)
  }

  const handleInlineBusinessGroupChange = async (
    userId: number,
    newBusinessGroupId: number | null,
    userName: string,
  ) => {
    if (!confirm(`Change ${userName}'s Business Group?`)) return

    setBgChangingId(userId)
    const result = await updateUserBusinessGroup(userId, newBusinessGroupId)
    if (result.success) {
      toast.success(`${userName}'s business group updated successfully`)
      onRefresh()
    } else {
      toast.error(result.error || "Failed to update business group")
    }
    setBgChangingId(null)
  }

  const getRoleBadgeColor = (role: string) => {
    const roleColors: Record<string, string> = {
      superadmin: "bg-amber-100 text-amber-800",
      admin: "bg-red-100 text-red-700",
      manager: "bg-purple-100 text-purple-700",
      team_lead: "bg-blue-100 text-blue-700",
      support_agent: "bg-green-100 text-green-700",
      developer: "bg-orange-100 text-orange-700",
      qa_engineer: "bg-teal-100 text-teal-700",
      designer: "bg-pink-100 text-pink-700",
      analyst: "bg-indigo-100 text-indigo-700",
    }
    return roleColors[role] || "bg-slate-100 text-slate-700"
  }

  const formatRoleName = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-lg"></div>
        <p className="text-xs font-medium text-muted-foreground">Loading users...</p>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-xs font-semibold text-foreground mb-1">No users found</p>
        <p className="text-[10px] text-muted-foreground">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <>
      <div className="h-full overflow-x-auto overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border-b border-border/50 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">User</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">Email</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">Role</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">Business Group</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">Teams</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">Tickets</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">Status</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">Created</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
          {users.map((user, idx) => (
            <tr
              key={user.id}
              className={`group/row hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20 transition-all duration-300 ${
                user.is_active === false ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/20" : ""
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {user.avatar_url ? (
                      <div className="relative group/avatar">
                        <img 
                          src={user.avatar_url} 
                          alt={user.full_name} 
                          className="w-7 h-7 rounded-full ring-2 ring-border group-hover/row:ring-primary/50 transition-all duration-300 shadow-sm group-hover/row:shadow-md group-hover/row:scale-110" 
                        />
                        {user.is_active === false && (
                          <div className="absolute inset-0 rounded-full bg-red-500/20 border-2 border-red-500/50"></div>
                        )}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 ring-2 ring-border group-hover/row:ring-primary/50 transition-all duration-300 shadow-sm group-hover/row:shadow-md group-hover/row:scale-110">
                        <span className="text-primary font-bold text-[10px]">
                          {user.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-xs text-foreground group-hover/row:text-primary transition-colors">
                        {user.full_name}
                      </div>
                      {user.is_active === false && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-red-600 font-semibold bg-red-50 dark:bg-red-900/20">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground group-hover/row:text-foreground transition-colors">{user.email}</span>
                </td>
                <td className="px-3 py-2">
                  {isSuperAdmin && user.id !== currentUserId ? (
                    <div className="relative inline-flex max-w-[160px]">
                      {roleChangingId === user.id ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleInlineRoleChange(user.id, value, user.full_name)}
                        >
                          <SelectTrigger className={`w-full pl-3 pr-7 py-1.5 rounded-full text-[11px] font-medium border border-border bg-white dark:bg-slate-800 text-foreground cursor-pointer shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 focus:ring-2 focus:ring-primary/60 focus:border-primary/60 ${getRoleBadgeColor(user.role)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-primary/30 rounded-xl shadow-2xl">
                            {roles.map((r) => (
                              <SelectItem 
                                key={r.value} 
                                value={r.value}
                                className="text-xs font-semibold cursor-pointer hover:bg-primary/20 focus:bg-primary/20 rounded-lg my-1"
                              >
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${getRoleBadgeColor(user.role)}`}>
                      <Key className="w-2.5 h-2.5" />
                      {formatRoleName(user.role)}
                      {user.id === currentUserId && (
                        <span className="ml-1 px-1 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold">You</span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isSuperAdmin ? (
                    <div className="flex items-center gap-1 max-w-[180px]">
                      {bgChangingId === user.id ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Select
                          value={user.business_unit_group_id?.toString() ?? "none"}
                          onValueChange={(value) =>
                            handleInlineBusinessGroupChange(
                              user.id,
                              value && value !== "none" ? Number(value) : null,
                              user.full_name,
                            )
                          }
                        >
                          <SelectTrigger className="w-full pl-3 pr-7 py-1.5 rounded-full text-[11px] font-medium border border-border bg-white dark:bg-slate-800 text-foreground cursor-pointer shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 focus:ring-2 focus:ring-primary/60 focus:border-primary/60">
                            <SelectValue placeholder="No Group" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-primary/30 rounded-xl shadow-2xl">
                            <SelectItem 
                              value="none"
                              className="text-xs font-semibold cursor-pointer hover:bg-primary/20 focus:bg-primary/20 rounded-lg my-1"
                            >
                              No Group
                            </SelectItem>
                            {businessGroups.map((bg) => (
                              <SelectItem 
                                key={bg.id} 
                                value={bg.id.toString()}
                                className="text-xs font-semibold cursor-pointer hover:bg-primary/20 focus:bg-primary/20 rounded-lg my-1"
                              >
                                {bg.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ) : user.business_group_name ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold shadow-sm border border-blue-200 dark:border-blue-800">
                      <Building2 className="w-2.5 h-2.5" />
                      {user.business_group_name}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground font-medium">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {user.team_names ? (
                    <div className="flex flex-wrap gap-1">
                      {user.team_names.split(", ").map((team, i) => (
                        <span 
                          key={i} 
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-700 dark:text-purple-300 text-[10px] font-semibold shadow-sm border border-purple-200 dark:border-purple-800"
                        >
                          <Users className="w-2.5 h-2.5" />
                          {team}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground font-medium">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {user.ticket_count > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col gap-0.5 cursor-pointer">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-foreground">Total: {user.ticket_count}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {user.ticket_count_resolved > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[9px] font-medium">
                                <CheckCircle className="w-2.5 h-2.5" />
                                Resolved: {user.ticket_count_resolved}
                              </span>
                            )}
                            {user.ticket_count_on_hold > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-medium">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Hold: {user.ticket_count_on_hold}
                              </span>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-white dark:bg-slate-800 border border-border shadow-lg p-3 max-w-xs">
                        <div className="space-y-2">
                          <div className="font-semibold text-sm text-foreground mb-2 pb-2 border-b border-border">
                            Ticket Status Breakdown
                          </div>
                          <div className="space-y-1.5 text-xs">
                            {user.ticket_count_open > 0 && (
                              <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2">
                                  <Circle className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                                  <span className="text-foreground font-semibold">Open</span>
                                </div>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{user.ticket_count_open}</span>
                              </div>
                            )}
                            {user.ticket_count_on_hold > 0 && (
                              <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                                  <span className="text-foreground font-semibold">On Hold</span>
                                </div>
                                <span className="font-bold text-amber-600 dark:text-amber-400">{user.ticket_count_on_hold}</span>
                              </div>
                            )}
                            {user.ticket_count_resolved > 0 && (
                              <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-green-50/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600 fill-green-600" />
                                  <span className="text-foreground font-semibold">Resolved</span>
                                </div>
                                <span className="font-bold text-green-600 dark:text-green-400">{user.ticket_count_resolved}</span>
                              </div>
                            )}
                            {user.ticket_count_closed > 0 && (
                              <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-3.5 h-3.5 text-slate-600 fill-slate-600" />
                                  <span className="text-foreground font-semibold">Closed</span>
                                </div>
                                <span className="font-bold text-slate-600 dark:text-slate-400">{user.ticket_count_closed}</span>
                              </div>
                            )}
                            {user.ticket_count_returned > 0 && (
                              <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-purple-50/50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-2">
                                  <Circle className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                                  <span className="text-foreground font-semibold">Returned</span>
                                </div>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{user.ticket_count_returned}</span>
                              </div>
                            )}
                            {user.ticket_count_deleted > 0 && (
                              <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-red-50/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2">
                                  <X className="w-3.5 h-3.5 text-red-600" />
                                  <span className="text-foreground font-semibold">Deleted</span>
                                </div>
                                <span className="font-bold text-red-600 dark:text-red-400">{user.ticket_count_deleted}</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-3 mt-3 border-t-2 border-border/50 bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold text-foreground">Total</span>
                              <span className="font-extrabold text-primary text-lg">{user.ticket_count}</span>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {user.is_active === false ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-red-700 dark:text-red-400 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-800 shadow-sm">
                      <XCircle className="w-2.5 h-2.5" />
                      Inactive
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-green-700 dark:text-green-400 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800 shadow-sm">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Active
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground group-hover/row:text-foreground transition-colors">
                    {format(new Date(user.created_at), "MMM dd, yyyy")}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1.5 hover:bg-primary/10 rounded-md transition-all duration-300 hover:scale-110 hover:shadow-md group/btn"
                          title="Edit User"
                          onClick={() => onEditUser(user)}
                          disabled={processingId === user.id}
                        >
                          <Edit className="w-3.5 h-3.5 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Edit User</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="p-1.5 hover:bg-blue-500/10 rounded-md transition-all duration-300 hover:scale-110 hover:shadow-md group/btn"
                          title="Reset Password"
                          onClick={(e) => handleResetPassword(user, e)}
                          disabled={processingId === user.id}
                        >
                          <Key className="w-3.5 h-3.5 text-blue-600 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Reset Password</TooltipContent>
                    </Tooltip>
                    {user.is_active === false ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="p-1.5 hover:bg-green-500/10 rounded-md transition-all duration-300 hover:scale-110 hover:shadow-md group/btn"
                            title="Activate User"
                            onClick={() => handleActivate(user)}
                            disabled={processingId === user.id}
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Activate User</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="p-1.5 hover:bg-yellow-500/10 rounded-md transition-all duration-300 hover:scale-110 hover:shadow-md group/btn"
                            title="Deactivate User"
                            onClick={() => handleDeactivate(user)}
                            disabled={processingId === user.id}
                          >
                            <XCircle className="w-3.5 h-3.5 text-yellow-600 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Deactivate User</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1.5 hover:bg-red-500/10 rounded-md transition-all duration-300 hover:scale-110 hover:shadow-md group/btn"
                          title="Delete User"
                          onClick={() => handleDelete(user)}
                          disabled={processingId === user.id}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Delete User</TooltipContent>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t-2 border-border/50 flex items-center justify-between bg-muted/20">
        <p className="text-sm font-semibold text-foreground">
          Showing {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.full_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setPasswordError("")
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                placeholder="Enter new password"
                disabled={isUpdatingPassword}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordError("")
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                placeholder="Confirm new password"
                disabled={isUpdatingPassword}
              />
            </div>

            {passwordError && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
                {passwordError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelPasswordDialog}
              disabled={isUpdatingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword || !newPassword || !confirmPassword}
            >
              {isUpdatingPassword ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
