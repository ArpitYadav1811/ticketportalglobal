"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import DashboardLayout from "@/components/layout/dashboard-layout"
import AdminSidebar from "@/components/admin/admin-sidebar"
import OverviewDashboard from "@/components/admin/overview-dashboard"
import BulkUserOperations from "@/components/admin/bulk-user-operations"
import FAMappingsVisual from "@/components/admin/fa-mappings-visual"
import EnhancedAuditLogs from "@/components/admin/enhanced-audit-logs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Shield,
  Users,
  Building2,
  FolderTree,
  Link2,
  ScrollText,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  X,
  ChevronRight,
  Lock,
  RefreshCw,
  Save,
  AlertTriangle,
  Key,
  Database,
  Download,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ConfirmationDialog, { ChangeDetail } from "@/components/ui/confirmation-dialog"

// User Management imports
import { getAllUsers, getUserRoles } from "@/lib/actions/users"
import UsersTable from "@/components/users/users-table"
import EditUserModal from "@/components/users/edit-user-modal"
import CreateUserModal from "@/components/teams/create-user-modal"

// Master Data imports
import UnifiedMasterDataV2 from "@/components/master-data/unified-master-data-v2"

// Teams imports
import { getTeams, createTeam, updateTeam, deleteTeam } from "@/lib/actions/teams"

// Role Permissions imports
import RolePermissionsManager from "@/components/admin/role-permissions-manager"

// Admin-only imports
import {
  getFunctionalAreas,
  getFunctionalAreaMappings,
  createFunctionalArea,
  updateFunctionalArea,
  deleteFunctionalArea,
  addFunctionalAreaMapping,
  removeFunctionalAreaMapping,
  getSystemAuditLogs,
  updateBusinessGroupSpoc,
  updateFunctionalAreaMapping,
  bulkDeleteAllUsers,
  bulkDeleteAllTickets,
  bulkDeleteAllBusinessGroups,
  bulkDeleteAllFunctionalAreas,
  bulkDeleteAllMasterData,
} from "@/lib/actions/admin"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { getUsers } from "@/lib/actions/tickets"
import { AdminErrorBoundary } from "@/components/admin/error-boundary"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState("overview")

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "1",
      ctrl: true,
      action: () => setActiveSection("overview"),
      description: "Go to Overview (Ctrl+1)",
    },
    {
      key: "2",
      ctrl: true,
      action: () => setActiveSection("users"),
      description: "Go to Users (Ctrl+2)",
    },
    {
      key: "3",
      ctrl: true,
      action: () => setActiveSection("audit-logs"),
      description: "Go to Audit Logs (Ctrl+3)",
    },
  ])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }
    const parsedUser = JSON.parse(userData)
    const role = parsedUser.role?.toLowerCase()

    if (role !== "superadmin") {
      router.push("/dashboard")
      return
    }

    setUser(parsedUser)
    setIsLoading(false)
  }, [router])

  if (isLoading || !user) return null

  const isSuperAdmin = user.role?.toLowerCase() === "superadmin"
  const userRole = user.role?.toLowerCase()


  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewDashboard onNavigate={setActiveSection} />

      case "users":
        return <UserManagementTab userRole={userRole} userId={user.id} />

      case "roles":
  return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <RolePermissionsManager />
          </div>
          </div>
        )

      case "bulk-users":
        return <BulkUserOperations onRefresh={() => {}} />

      case "business-groups":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <UnifiedMasterDataV2 userId={user.id} userRole={userRole} />
        </div>
          </div>
        )

      case "functional-areas":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <FAMappingsVisual currentUser={user} />
            </div>
          </div>
        )

      case "fa-mappings":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <FAMappingsVisual currentUser={user} />
            </div>
          </div>
        )

      case "teams":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <TeamsTab />
            </div>
          </div>
        )

      case "categories":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <UnifiedMasterDataV2 userId={user.id} userRole={userRole} />
            </div>
          </div>
        )

      case "projects":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <UnifiedMasterDataV2 userId={user.id} userRole={userRole} />
            </div>
          </div>
        )

      case "import-export":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <UnifiedMasterDataV2 userId={user.id} userRole={userRole} />
                </div>
          </div>
        )

      case "system-management":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-red-500/30 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
                <SystemManagementTab />
            </div>
          </div>
        )

      case "audit-logs":
        return (
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-slate-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <EnhancedAuditLogs />
            </div>
          </div>
        )

      default:
        return <OverviewDashboard onNavigate={setActiveSection} />
    }
  }

  return (
    <DashboardLayout>
      <AdminErrorBoundary>
        <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-muted/20">
          {/* Sidebar */}
          <AdminSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isSuperAdmin={isSuperAdmin}
          />

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto lg:ml-0">
            <div className="space-y-4 p-3 lg:p-4">
              {/* Header with gradient background */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/15 via-primary/8 to-primary/5 border-2 border-primary/30 p-4 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-500 group">
                {/* Animated grid pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-5 group-hover:opacity-10 transition-opacity duration-500"></div>
                
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <Shield className="w-5 h-5 text-primary-foreground drop-shadow-sm" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-foreground bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text drop-shadow-sm">
                        Super Admin Dashboard
                      </h1>
                      <p className="text-xs text-muted-foreground font-medium">
                        Full access to all system modules and configurations
                      </p>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/25 to-amber-600/25 backdrop-blur-sm border-2 border-amber-400/40 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-sm shadow-amber-500/50"></div>
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Super Admin</span>
                    </div>
                  )}
      </div>
              </div>


              {/* Content */}
              <AdminErrorBoundary>{renderContent()}</AdminErrorBoundary>
            </div>
          </div>
        </div>
      </AdminErrorBoundary>
    </DashboardLayout>
  )
}

// ==================== USER MANAGEMENT TAB ====================
function UserManagementTab({ userRole, userId }: { userRole: string; userId: number }) {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [filters, setFilters] = useState({ role: "all", search: "", includeInactive: false })

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const result = await getAllUsers(filters)
    if (result.success && result.data) setUsers(result.data)
    else setUsers([])
    setLoading(false)
  }, [filters])

  const loadRoles = async () => {
    const isSuperAdmin = userRole === "superadmin"
    const result = await getUserRoles(isSuperAdmin)
    if (result.success && result.data) setRoles(result.data)
  }

  useEffect(() => {
    loadRoles()
  }, [])
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Enhanced Header with Filters */}
      <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Floating particles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-extrabold text-foreground mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                User Management
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Manage users, roles, and permissions
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)} 
              size="sm" 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create User
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full group/search">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-primary/5 group-focus-within/search:bg-primary/10 transition-all duration-300">
                <Search className="w-4 h-4 text-muted-foreground group-focus-within/search:text-primary group-focus-within/search:scale-110 transition-all duration-300" />
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="w-full pl-11 pr-4 py-2.5 border-2 border-border/50 rounded-lg bg-background/90 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium"
              />
            </div>
            <div className="relative min-w-[180px] group/filter">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md bg-primary/5 pointer-events-none">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </div>
              <Select
                value={filters.role}
                onValueChange={(value) => setFilters((p) => ({ ...p, role: value }))}
              >
                <SelectTrigger className="w-full pl-11 pr-4 py-2.5 border-2 border-border/50 rounded-lg bg-background/90 backdrop-blur-sm text-sm shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary/50">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-primary/30 rounded-xl shadow-2xl">
                  <SelectItem value="all" className="text-sm font-semibold cursor-pointer hover:bg-primary/20 focus:bg-primary/20 rounded-lg my-1">
                    All Roles
                  </SelectItem>
                  {roles.map((r: any) => (
                    <SelectItem 
                      key={r.value} 
                      value={r.value}
                      className="text-sm font-semibold cursor-pointer hover:bg-primary/20 focus:bg-primary/20 rounded-lg my-1"
                    >
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-border/50 rounded-lg hover:bg-muted/50 hover:border-primary/30 text-sm whitespace-nowrap font-medium shadow-sm hover:shadow-md transition-all duration-300 bg-background/90 backdrop-blur-sm">
              <input
                type="checkbox"
                checked={filters.includeInactive}
                onChange={(e) => setFilters((p) => ({ ...p, includeInactive: e.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              Show Inactive
            </label>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </span>
                ) : (
                  `Showing ${users.length} user${users.length !== 1 ? "s" : ""}`
                )}
              </span>
            </div>
            {users.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={loadUsers}
                className="h-7 px-2 text-xs hover:bg-muted/50"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
          </Button>
            )}
        </div>
        </div>
      </div>

      {/* Enhanced Users Table Container */}
      <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg overflow-hidden group">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-blue-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative z-10">
          <UsersTable
            users={users}
            loading={loading}
            onEditUser={(u: any) => {
              setSelectedUser(u)
              setShowEditModal(true)
            }}
            onRefresh={loadUsers}
            isSuperAdmin={userRole === "superadmin"}
            currentUserId={userId}
          />
        </div>
      </div>

      {showCreateModal && (
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadUsers()
          }}
        />
      )}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setShowEditModal(false)}
          onUserUpdated={() => {
            setShowEditModal(false)
            setSelectedUser(null)
            loadUsers()
          }}
        />
      )}
    </div>
  )
}

// ==================== TEAMS TAB ====================
function TeamsTab() {
 const [teams, setTeams] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
 const [editTeam, setEditTeam] = useState<any>(null)
  const [formData, setFormData] = useState({ name: "", description: "" })
 const [saving, setSaving] = useState(false)

 const loadTeams = async () => {
 setLoading(true)
 const result = await getTeams()
    if (result.success && result.data) setTeams(result.data)
    else setTeams([])
 setLoading(false)
 }

  useEffect(() => {
    loadTeams()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
 e.preventDefault()
 setSaving(true)
 try {
      const result = editTeam
        ? await updateTeam(editTeam.id, formData.name, formData.description)
        : await createTeam(formData.name, formData.description)
      if (result.success) { 
        await loadTeams()
        setShowModal(false)
        toast.success("Team saved successfully")
      } else {
        toast.error(result.error || "Failed to save team")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Delete team "${name}"?`)) {
      const result = await deleteTeam(id)
      if (result.success) {
        loadTeams()
        toast.success("Team deleted successfully")
      } else {
        toast.error(result.error || "Failed to delete team")
      }
 }
 }

 return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Enhanced Header */}
      <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-500 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="relative z-10 flex justify-between items-center">
              <div>
            <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2 mb-1">
              <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-indigo-500/10 rounded-lg shadow-sm">
                <FolderTree className="w-5 h-5 text-indigo-600" />
 </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Teams Management
              </span>
            </h3>
            <p className="text-xs text-muted-foreground font-medium ml-12">
              Create and manage teams for organizing users
        </p>
 </div>
            <Button 
              size="sm" 
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            onClick={() => {
              setEditTeam(null)
              setFormData({ name: "", description: "" })
              setShowModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Team
 </Button>
 </div>
 </div>

        {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-lg"></div>
          <p className="text-sm font-semibold text-muted-foreground">Loading teams...</p>
 </div>
      ) : teams.length === 0 ? (
        <div className="relative bg-card/80 backdrop-blur-sm border-2 border-dashed border-border/50 rounded-xl p-12 text-center overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderTree className="w-8 h-8 text-muted-foreground" />
 </div>
            <p className="text-sm font-semibold text-foreground mb-1">No teams yet</p>
            <p className="text-xs text-muted-foreground">Create your first team to get started</p>
              </div>
              </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="relative bg-card/90 backdrop-blur-sm border-2 border-border/50 rounded-xl p-4 hover:shadow-lg transition-all duration-300 overflow-hidden group/team"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover/team:opacity-100 transition-opacity duration-500"></div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover/team:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              <div className="relative z-10 flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-indigo-500/10 rounded-lg shadow-sm group-hover/team:scale-110 transition-transform duration-300">
                      <Users className="w-4 h-4 text-indigo-600" />
 </div>
                    <h4 className="font-bold text-sm text-foreground group-hover/team:text-indigo-600 transition-colors">
                      {team.name}
                    </h4>
                    <span className="px-2.5 py-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-300 dark:border-indigo-700 shadow-sm">
                      {team.member_count || 0} members
                    </span>
 </div>
                  <p className="text-xs text-muted-foreground font-medium ml-11">
                    {team.description || "No description"}
        </p>
      </div>
                <div className="flex gap-1.5 opacity-0 group-hover/team:opacity-100 transition-opacity duration-300">
            <Button 
                    variant="ghost"
              size="sm" 
                    onClick={() => {
                      setEditTeam(team)
                      setFormData({ name: team.name, description: team.description || "" })
                      setShowModal(true)
                    }}
                    className="p-2 hover:bg-primary/10 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md"
                  >
                    <Edit className="w-4 h-4 text-primary" />
            </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(team.id, team.name)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
 </div>
 </div>
 </div>
                ))}
          </div>
        )}

      {/* Enhanced Team Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="relative bg-card/95 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {editTeam ? "Edit Team" : "Create Team"}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md"
                >
                  <X className="w-5 h-5" />
                      </button>
 </div>
              <form onSubmit={handleSave} className="space-y-4">
 <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Team Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border-2 border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 bg-background/90 backdrop-blur-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                  />
 </div>
 <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 border-2 border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 bg-background/90 backdrop-blur-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 resize-none"
                  />
 </div>
                <div className="flex gap-2 justify-end pt-4 border-t-2 border-border/50">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="border-2 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                  >
                    Cancel
 </Button>
                  <Button 
                    type="submit"
                    disabled={saving || !formData.name.trim()}
                    className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : editTeam ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                      </>
                    )}
 </Button>
 </div>
 </form>
            </div>
 </div>
 </div>
 )}
    </div>
  )
}

// ==================== SYSTEM MANAGEMENT TAB (SUPERADMIN ONLY) ====================
function ImportCategoriesSection() {
  const [file, setFile] = useState<File | null>(null)
  const [businessGroupId, setBusinessGroupId] = useState<string>("")
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadBusinessGroups()
  }, [])

  const loadBusinessGroups = async () => {
    try {
      const { getBusinessUnitGroups } = await import("@/lib/actions/master-data")
      const result = await getBusinessUnitGroups()
      if (result.success && result.data) {
        setBusinessGroups(result.data)
      }
    } catch (error) {
      console.error("Error loading business groups:", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file || !businessGroupId) {
      toast.error("Please select both a file and a business group")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("businessGroupId", businessGroupId)

      const response = await fetch("/api/import/categories-excel", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const s = result.summary
        if (s.categoriesCreated === 0 && s.subcategoriesCreated === 0 && s.mappingsCreated === 0) {
          toast.info(
            `Import completed! All ${s.categoriesProcessed} categories and ${s.subcategoriesProcessed} subcategories already exist. No new items created.`
          )
        } else {
          toast.success(
            `Import successful! Created ${s.categoriesCreated} new categories, ${s.subcategoriesCreated} new subcategories, ${s.mappingsCreated} new mappings. (${s.categoriesProcessed} categories, ${s.subcategoriesProcessed} subcategories processed)`
          )
        }
        setFile(null)
        setBusinessGroupId("")
        const fileInput = document.getElementById("excel-file-input") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        toast.error(result.error || "Import failed")
      }
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Failed to import categories")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative group">
          <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wide">
            Select Business Group
          </label>
          <select
            value={businessGroupId}
            onChange={(e) => setBusinessGroupId(e.target.value)}
            className="w-full px-3 py-2.5 border-2 border-border/50 rounded-lg bg-background/90 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 font-medium shadow-sm hover:shadow-md transition-all duration-300"
            disabled={uploading}
          >
            <option value="">-- Select Business Group --</option>
            {businessGroups.map((bg) => (
              <option key={bg.id} value={bg.id}>
                {bg.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative group">
          <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wide">Select Excel File</label>
          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full px-3 py-2.5 border-2 border-border/50 rounded-lg bg-background/90 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 font-medium shadow-sm hover:shadow-md transition-all duration-300 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            disabled={uploading}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleImport}
          disabled={!file || !businessGroupId || uploading}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          {uploading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Import Categories
            </>
          )}
        </Button>
        {file && (
          <span className="text-sm font-semibold text-foreground px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
            Selected: <span className="text-primary">{file.name}</span>
          </span>
        )}
      </div>

      <div className="relative bg-gradient-to-r from-blue-50 via-blue-50/80 to-blue-50 dark:from-blue-900/20 dark:via-blue-900/15 dark:to-blue-900/20 border-2 border-blue-300 dark:border-blue-800 rounded-xl p-4 shadow-md overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-transparent"></div>
        <div className="relative z-10">
          <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-1">
          <strong>Excel Format:</strong> Category | Sub Category | Input (Description) | Estimated hrs
        </p>
          <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
            See <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">docs/IMPORT_TD_BM_CATEGORIES.md</code> for
            detailed instructions.
        </p>
        </div>
      </div>
    </div>
  )
}

function SystemManagementTab() {
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [deleteAction, setDeleteAction] = useState<{
    type: string
    title: string
    description: string
    action: () => Promise<any>
  } | null>(null)

  const handleBulkDelete = async () => {
    if (!deleteAction) return

    setLoading(true)
    try {
      const result = await deleteAction.action()
      if (result.success) {
        toast.success(result.message || "Operation completed successfully")
      } else {
        toast.error(result.error || "Operation failed")
      }
    } catch (error) {
      console.error("Bulk delete error:", error)
      toast.error("An error occurred during the operation")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setDeleteAction(null)
    }
  }

  const confirmDelete = (type: string, title: string, description: string, action: () => Promise<any>) => {
    setDeleteAction({ type, title, description, action })
    setShowConfirmDialog(true)
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Enhanced Header */}
      <div className="relative bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-2 border-red-500/30 rounded-xl shadow-lg p-5 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-red-500/20 rounded-lg shadow-md">
              <Database className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          System Management
                <span className="px-3 py-1 bg-gradient-to-r from-red-500/30 to-red-600/30 backdrop-blur-sm border-2 border-red-500/50 text-red-700 dark:text-red-400 text-xs font-bold rounded-full shadow-md animate-pulse">
                  ⚠️ DANGER ZONE
          </span>
        </h2>
              <p className="text-sm text-muted-foreground font-medium mt-1">
          Bulk delete operations for system data. These actions are irreversible and should be used with extreme caution.
        </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Import Section */}
      <div className="relative bg-gradient-to-r from-blue-50 via-blue-50/80 to-blue-50 dark:from-blue-900/20 dark:via-blue-900/15 dark:to-blue-900/20 border-2 border-blue-300 dark:border-blue-800 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden group mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <Download className="w-4 h-4 text-blue-600" />
                </div>
              Import Categories from Excel
            </h3>
              <p className="text-xs text-muted-foreground font-medium ml-7">
              Upload an Excel file to import categories and subcategories for a specific Business Group.
            </p>
          </div>
        </div>
        <ImportCategoriesSection />
        </div>
      </div>

      <div className="space-y-3">
        {/* Enhanced Delete All Users */}
        <div className="relative bg-gradient-to-r from-red-50 via-red-50/80 to-red-50 dark:from-red-900/20 dark:via-red-900/15 dark:to-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-500 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-200/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-red-500/20 rounded-lg">
                <Users className="w-4 h-4 text-red-600" />
                </div>
                Delete All Users
              </h3>
              <p className="text-xs text-muted-foreground font-medium ml-7">
                Permanently delete all users except yourself. This will remove all user accounts and their associated data.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                confirmDelete("users", "Delete All Users", "This will permanently delete ALL users except yourself. This action cannot be undone.", bulkDeleteAllUsers)
              }
              disabled={loading}
              className="ml-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All Users
            </Button>
          </div>
        </div>

        {/* Enhanced Delete All Tickets */}
        <div className="relative bg-gradient-to-r from-red-50 via-red-50/80 to-red-50 dark:from-red-900/20 dark:via-red-900/15 dark:to-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-500 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-200/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-red-500/20 rounded-lg">
                <ScrollText className="w-4 h-4 text-red-600" />
                </div>
                Delete All Tickets
              </h3>
              <p className="text-xs text-muted-foreground font-medium ml-7">
                Permanently delete all tickets, comments, attachments, and audit logs. This will clear the entire ticket history.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                confirmDelete(
                "tickets",
                "Delete All Tickets",
                "This will permanently delete ALL tickets and all related data (comments, attachments, audit logs). This action cannot be undone.",
                bulkDeleteAllTickets
                )
              }
              disabled={loading}
              className="ml-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All Tickets
            </Button>
          </div>
        </div>

        {/* Enhanced Delete All Business Groups */}
        <div className="relative bg-gradient-to-r from-red-50 via-red-50/80 to-red-50 dark:from-red-900/20 dark:via-red-900/15 dark:to-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-500 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-200/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-red-500/20 rounded-lg">
                <Building2 className="w-4 h-4 text-red-600" />
                </div>
                Delete All Business Groups
              </h3>
              <p className="text-xs text-muted-foreground font-medium ml-7">
                Permanently delete all business groups and related mappings. User and ticket references will be set to NULL.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                confirmDelete(
                "business-groups",
                "Delete All Business Groups",
                "This will permanently delete ALL business groups, classification mappings, and functional area mappings. User and ticket references will be cleared. This action cannot be undone.",
                bulkDeleteAllBusinessGroups
                )
              }
              disabled={loading}
              className="ml-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All Groups
            </Button>
          </div>
        </div>

        {/* Enhanced Delete All Functional Areas */}
        <div className="relative bg-gradient-to-r from-red-50 via-red-50/80 to-red-50 dark:from-red-900/20 dark:via-red-900/15 dark:to-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-500 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-200/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-red-500/20 rounded-lg">
                <FolderTree className="w-4 h-4 text-red-600" />
                </div>
                Delete All Functional Areas
              </h3>
              <p className="text-xs text-muted-foreground font-medium ml-7">
                Permanently delete all functional areas (organizations) and their business group mappings.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                confirmDelete(
                "functional-areas",
                "Delete All Functional Areas",
                "This will permanently delete ALL functional areas and their business group mappings. This action cannot be undone.",
                bulkDeleteAllFunctionalAreas
                )
              }
              disabled={loading}
              className="ml-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All FAs
            </Button>
          </div>
        </div>

        {/* Enhanced Delete All Master Data */}
        <div className="relative bg-gradient-to-r from-red-50 via-red-50/80 to-red-50 dark:from-red-900/20 dark:via-red-900/15 dark:to-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-500 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-200/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-red-500/20 rounded-lg">
                <Database className="w-4 h-4 text-red-600" />
                </div>
                Delete All Categories & Subcategories
              </h3>
              <p className="text-xs text-muted-foreground font-medium ml-7">
                Permanently delete all categories, subcategories, and ticket classification mappings.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                confirmDelete(
                "master-data",
                "Delete All Categories & Subcategories",
                "This will permanently delete ALL categories, subcategories, and ticket classification mappings. This action cannot be undone.",
                bulkDeleteAllMasterData
                )
              }
              disabled={loading}
              className="ml-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All Master Data
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Warning Banner */}
      <div className="relative mt-6 p-5 bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-50 dark:from-amber-900/20 dark:via-amber-900/15 dark:to-amber-900/20 border-2 border-amber-300 dark:border-amber-800 rounded-xl shadow-lg overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">Important Warning</h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              All bulk delete operations are <strong className="font-extrabold">permanent and irreversible</strong>. Make sure you have a
              database backup before performing any of these operations. These actions will be logged in the audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Confirmation Dialog */}
      {showConfirmDialog && deleteAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="relative bg-card/95 backdrop-blur-md border-2 border-red-500/30 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500/30 to-red-600/20 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{deleteAction.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{deleteAction.description}</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                ⚠️ This action is permanent and cannot be undone. Please confirm that you want to proceed.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false)
                  setDeleteAction(null)
                }}
                disabled={loading}
                  className="border-2 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-red-400"
                >
        {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Yes, Delete Permanently"
                  )}
                </Button>
              </div>
            </div>
      </div>
        </div>
      )}
    </div>
 )
}
