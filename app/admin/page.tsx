"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import DashboardLayout from "@/components/layout/dashboard-layout"
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

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("users")

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

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? "Super Admin — Full access to all modules"
                : "Admin — Manage users, teams, and master data"}
            </p>
          </div>
          {isSuperAdmin && (
            <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
              Super Admin
            </span>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="users" className="text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="master-data" className="text-xs gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Master Data
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-xs gap-1.5">
              <FolderTree className="w-3.5 h-3.5" /> Teams
            </TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger value="role-permissions" className="text-xs gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Role Permissions
                  <Lock className="w-3 h-3 text-amber-500" />
                </TabsTrigger>
                <TabsTrigger value="fa-mappings" className="text-xs gap-1.5">
                  <Link2 className="w-3.5 h-3.5" /> FA Mappings
                  <Lock className="w-3 h-3 text-amber-500" />
                </TabsTrigger>
                <TabsTrigger value="system-management" className="text-xs gap-1.5">
                  <Database className="w-3.5 h-3.5" /> System Management
                  <Lock className="w-3 h-3 text-amber-500" />
                </TabsTrigger>
                <TabsTrigger value="audit-logs" className="text-xs gap-1.5">
                  <ScrollText className="w-3.5 h-3.5" /> Audit Logs
                  <Lock className="w-3 h-3 text-amber-500" />
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* ====== TAB: USERS ====== */}
          <TabsContent value="users" className="mt-4">
            <UserManagementTab userRole={userRole} userId={user.id} />
          </TabsContent>

          {/* ====== TAB: MASTER DATA ====== */}
          <TabsContent value="master-data" className="mt-4">
            <div className="bg-card border rounded-lg shadow-sm p-4">
              <UnifiedMasterDataV2 userId={user.id} userRole={userRole} />
            </div>
          </TabsContent>

          {/* ====== TAB: TEAMS ====== */}
          <TabsContent value="teams" className="mt-4">
            <TeamsTab />
          </TabsContent>

          {/* ====== SUPERADMIN TABS ====== */}
          {isSuperAdmin && (
            <>
              <TabsContent value="role-permissions" className="mt-4">
                <div className="bg-card border rounded-lg shadow-sm p-4">
                  <RolePermissionsManager />
                </div>
              </TabsContent>
              <TabsContent value="fa-mappings" className="mt-4">
                <FAMappingsTab currentUser={user} />
              </TabsContent>
              <TabsContent value="system-management" className="mt-4">
                <SystemManagementTab />
              </TabsContent>
              <TabsContent value="audit-logs" className="mt-4">
                <AuditLogsTab />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
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

  useEffect(() => { loadRoles() }, [])
  useEffect(() => { loadUsers() }, [loadUsers])

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="relative min-w-[180px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={filters.role}
                onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Roles</option>
                {roles.map((r: any) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-border rounded-lg hover:bg-muted/30 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={filters.includeInactive}
                onChange={(e) => setFilters((p) => ({ ...p, includeInactive: e.target.checked }))}
                className="w-4 h-4"
              />
              Show Inactive
            </label>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="bg-black hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-1" /> Create User
          </Button>
        </div>
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          {loading ? "Loading..." : `Showing ${users.length} user${users.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-4">
        <UsersTable users={users} loading={loading} onEditUser={(u: any) => { setSelectedUser(u); setShowEditModal(true) }} onRefresh={loadUsers} isSuperAdmin={userRole === "superadmin"} currentUserId={userId} />
      </div>

      {showCreateModal && (
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadUsers() }}
        />
      )}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setShowEditModal(false)}
          onUserUpdated={() => { setShowEditModal(false); setSelectedUser(null); loadUsers() }}
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

  useEffect(() => { loadTeams() }, [])

  const handleSave = async (e: React.FormEvent) => {
 e.preventDefault()
 setSaving(true)
 try {
      const result = editTeam
        ? await updateTeam(editTeam.id, formData.name, formData.description)
        : await createTeam(formData.name, formData.description)
      if (result.success) { 
        await loadTeams(); 
        setShowModal(false)
        toast.success("Team saved successfully")
      } else {
        toast.error(result.error || "Failed to save team")
      }
    } finally { setSaving(false) }
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
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Teams Management</h3>
        <Button size="sm" className="bg-black hover:bg-gray-800" onClick={() => { setEditTeam(null); setFormData({ name: "", description: "" }); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Create Team
 </Button>
 </div>

 {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading teams...</p>
 </div>
 ) : teams.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">No teams yet</p>
 </div>
 ) : (
        <div className="space-y-2">
 {teams.map((team) => (
            <div key={team.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30 group">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{team.name}</h4>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">{team.member_count || 0} members</span>
 </div>
                <p className="text-xs text-muted-foreground mt-0.5">{team.description || "No description"}</p>
 </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => { setEditTeam(team); setFormData({ name: team.name, description: team.description || "" }); setShowModal(true) }}>
 <Edit className="w-4 h-4" />
 </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(team.id, team.name)} className="hover:bg-destructive/10 hover:text-destructive">
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}

      {/* Team Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{editTeam ? "Edit Team" : "Create Team"}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
 </div>
            <form onSubmit={handleSave} className="space-y-4">
 <div>
                <label className="block text-sm font-medium mb-1">Team Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
 </div>
 <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !formData.name.trim()} className="bg-black hover:bg-gray-800">
                  {saving ? "Saving..." : editTeam ? "Update" : "Create"}
                </Button>
              </div>
            </form>
 </div>
 </div>
      )}
    </div>
  )
}

// ==================== FA MAPPINGS TAB (SUPERADMIN ONLY) ====================
function FAMappingsTab({ currentUser }: { currentUser: any }) {
  const [functionalAreas, setFunctionalAreas] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddFA, setShowAddFA] = useState(false)
  const [showAddMapping, setShowAddMapping] = useState(false)
  const [editFA, setEditFA] = useState<any>(null)
  const [faForm, setFaForm] = useState({ name: "", description: "", spocName: "" })
  const [mappingForm, setMappingForm] = useState({ functionalAreaId: "", targetBusinessGroupId: "" })
  const [saving, setSaving] = useState(false)
  const [spocSaving, setSpocSaving] = useState<{ bgId: number; type: "primary" | "secondary" } | null>(null)
  const [mappingSaving, setMappingSaving] = useState<number | null>(null)
  
  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: () => void
    title: string
    description?: string
    actionType: "add" | "delete" | "update" | "remove"
    changes?: ChangeDetail[]
    loading?: boolean
  }>({
    open: false,
    action: () => {},
    title: "",
    actionType: "delete",
  })
  
  const isSuperAdmin = currentUser?.role?.toLowerCase() === "superadmin"
  const isAdmin = currentUser?.role?.toLowerCase() === "admin"
  
  // Helper to check if current user is Primary SPOC for a business group
  const isPrimarySpoc = (mapping: any) => {
    if (isSuperAdmin || isAdmin) return true
    const primarySpocName = mapping.primary_spoc_name || mapping.spoc_name
    if (!primarySpocName) return false
    return currentUser?.full_name && 
           primarySpocName.toLowerCase().trim() === currentUser.full_name.toLowerCase().trim()
  }

  const loadData = async () => {
    setLoading(true)
    const [faRes, mapRes, bgRes, usersRes] = await Promise.all([
      getFunctionalAreas(),
      getFunctionalAreaMappings(),
      getBusinessUnitGroups(),
      getUsers(),
    ])
    if (faRes.success) setFunctionalAreas(faRes.data || [])
    if (mapRes.success) setMappings(mapRes.data || [])
    if (bgRes.success) setBusinessGroups(bgRes.data || [])
    if (usersRes.success) setAllUsers(usersRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleDownloadFunctionalAreas = () => {
    try {
      // Prepare data for export
      const exportData = functionalAreas.map(fa => ({
        id: fa.id,
        name: fa.name,
        description: fa.description || "",
        spoc_name: fa.spoc_name || null,
        created_at: fa.created_at,
        updated_at: fa.updated_at,
        mappings: mappings
          .filter(m => m.functional_area_id === fa.id)
          .map(m => ({
            business_group_id: m.target_business_group_id,
            business_group_name: m.target_business_group_name,
            primary_spoc: m.primary_spoc_name || m.spoc_name || null,
            secondary_spoc: m.secondary_spoc_name || null,
          }))
      }))

      // Create JSON blob
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `functional-areas-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success("Functional areas exported successfully")
    } catch (error) {
      console.error("Error exporting functional areas:", error)
      toast.error("Failed to export functional areas")
    }
  }

  const handleSpocChange = async (bgId: number, bgName: string, newSpocName: string, spocType: "primary" | "secondary") => {
    const spocLabel = spocType === "primary" ? "Primary SPOC" : "Secondary SPOC"
    const currentMapping = mappings.find(m => m.target_business_group_id === bgId)
    const oldSpocName = spocType === "primary" 
      ? (currentMapping?.primary_spoc_name || currentMapping?.spoc_name || "None")
      : (currentMapping?.secondary_spoc_name || "None")
    
    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        setSpocSaving({ bgId, type: spocType })
        const result = await updateBusinessGroupSpoc(bgId, newSpocName, spocType)
        if (result.success) {
          await loadData()
          toast.success(`${spocLabel} updated successfully`)
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "update" })
        } else {
          toast.error(result.error || `Failed to update ${spocLabel}`)
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
        setSpocSaving(null)
      },
      title: `Update ${spocLabel}`,
      description: `Change ${spocLabel} for "${bgName}"?`,
      actionType: "update",
      changes: [{
        label: `${spocLabel} for ${bgName}`,
        oldValue: oldSpocName,
        newValue: newSpocName || "None",
        type: "update"
      }]
    })
  }

  const handleUpdateMapping = async (mappingId: number, field: "fa" | "bg", newValue: string, mapping: any) => {
    const newFaId = field === "fa" ? Number(newValue) : mapping.functional_area_id
    const newBgId = field === "bg" ? Number(newValue) : mapping.target_business_group_id

    const faName = field === "fa" ? functionalAreas.find(f => f.id === Number(newValue))?.name : mapping.functional_area_name
    const bgName = field === "bg" ? businessGroups.find(b => b.id === Number(newValue))?.name : mapping.business_group_name

    const changes: ChangeDetail[] = []
    if (field === "fa") {
      changes.push({
        label: "Functional Area",
        oldValue: mapping.functional_area_name,
        newValue: faName,
        type: "update"
      })
    }
    if (field === "bg") {
      changes.push({
        label: "Business Group",
        oldValue: mapping.business_group_name,
        newValue: bgName,
        type: "update"
      })
    }

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        setMappingSaving(mappingId)
        const result = await updateFunctionalAreaMapping(mappingId, newFaId, newBgId)
        if (result.success) {
          await loadData()
          toast.success("Mapping updated successfully")
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "update" })
        } else {
          toast.error(result.error || "Failed to update mapping")
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
        setMappingSaving(null)
      },
      title: "Update Functional Area Mapping",
      description: `Update mapping to "${faName} → ${bgName}"?`,
      actionType: "update",
      changes
    })
  }

  const handleSaveFA = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const result = editFA
      ? await updateFunctionalArea(editFA.id, faForm.name, faForm.description, faForm.spocName)
      : await createFunctionalArea(faForm.name, faForm.description, faForm.spocName)
    if (result.success) { 
      await loadData(); 
      setShowAddFA(false); 
      setEditFA(null)
      toast.success("Functional Area saved successfully")
    } else {
      toast.error(result.error || "Failed to save")
    }
    setSaving(false)
  }

  const handleDeleteFA = async (id: number, name: string) => {
    const relatedMappings = mappings.filter(m => m.functional_area_id === id)
    const changes: ChangeDetail[] = [{
      label: "Functional Area",
      oldValue: name,
      type: "delete"
    }]
    if (relatedMappings.length > 0) {
      changes.push({
        label: "Related Mappings",
        oldValue: `${relatedMappings.length} mapping(s) will be deleted`,
        type: "delete"
      })
    }

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        const result = await deleteFunctionalArea(id)
        if (result.success) {
          await loadData()
          toast.success("Functional Area deleted successfully")
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "delete" })
        } else {
          toast.error(result.error || "Failed to delete")
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
      },
      title: "Delete Functional Area",
      description: `Delete functional area "${name}" and all its mappings? This action cannot be undone.`,
      actionType: "delete",
      changes
    })
  }

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault()
    const faName = functionalAreas.find(f => f.id === Number(mappingForm.functionalAreaId))?.name
    const bgName = businessGroups.find(b => b.id === Number(mappingForm.targetBusinessGroupId))?.name

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        setSaving(true)
        const result = await addFunctionalAreaMapping(Number(mappingForm.functionalAreaId), Number(mappingForm.targetBusinessGroupId))
        if (result.success) {
          await loadData()
          setShowAddMapping(false)
          setMappingForm({ functionalAreaId: "", targetBusinessGroupId: "" })
          toast.success("Mapping added successfully")
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "add" })
        } else {
          toast.error(result.error || "Failed to add mapping")
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
        setSaving(false)
      },
      title: "Add Functional Area Mapping",
      description: `Add mapping between "${faName}" and "${bgName}"?`,
      actionType: "add",
      changes: [{
        label: "New Mapping",
        newValue: `${faName} → ${bgName}`,
        type: "add"
      }]
    })
  }

  const handleRemoveMapping = async (id: number) => {
    const mapping = mappings.find(m => m.id === id)
    if (!mapping) return

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        const result = await removeFunctionalAreaMapping(id)
        if (result.success) {
          await loadData()
          toast.success("Mapping removed successfully")
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "remove" })
        } else {
          toast.error(result.error || "Failed to remove")
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
      },
      title: "Remove Functional Area Mapping",
      description: "Remove this mapping?",
      actionType: "remove",
      changes: [{
        label: "Mapping",
        oldValue: `${mapping.functional_area_name} → ${mapping.business_group_name}`,
        type: "delete"
      }]
    })
  }

  return (
    <div className="space-y-4">
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.description}
        actionType={confirmDialog.actionType}
        changes={confirmDialog.changes}
        loading={confirmDialog.loading}
        destructive={confirmDialog.actionType === "delete" || confirmDialog.actionType === "remove"}
      />
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Super Admin Only</strong> — Changes here affect how Functional Areas map to Business Groups system-wide.
        </p>
      </div>

      {/* Functional Areas List */}
      <div className="bg-card border rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Functional Areas</h3>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDownloadFunctionalAreas}
              disabled={loading || functionalAreas.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export JSON
            </Button>
            <Button size="sm" variant="outline" onClick={loadData}><RefreshCw className="w-3.5 h-3.5" /></Button>
            <Button size="sm" className="bg-black hover:bg-gray-800" onClick={() => { setEditFA(null); setFaForm({ name: "", description: "", spocName: "" }); setShowAddFA(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Add FA
            </Button>
 </div>
 </div>

        {loading ? (
          <div className="text-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Description</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">SPOC</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Mappings</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {functionalAreas.map((fa) => (
                  <tr key={fa.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 font-medium">{fa.name}</td>
                    <td className="py-2 text-muted-foreground">{fa.description || "—"}</td>
                    <td className="py-2 text-sm">{fa.spoc_name || <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">{fa.mapping_count}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button className="p-1 hover:bg-muted rounded" onClick={() => { setEditFA(fa); setFaForm({ name: fa.name, description: fa.description || "", spocName: fa.spoc_name || "" }); setShowAddFA(true) }}>
                          <Edit className="w-3.5 h-3.5" />
 </button>
                        <button className="p-1 hover:bg-destructive/10 hover:text-destructive rounded" onClick={() => handleDeleteFA(fa.id, fa.name)}>
                          <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unified Mappings & SPOC Table */}
      <div className="bg-card border rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">FA → Business Group Mappings & SPOC Assignment</h3>
          <Button size="sm" className="bg-black hover:bg-gray-800" onClick={() => { setMappingForm({ functionalAreaId: "", targetBusinessGroupId: "" }); setShowAddMapping(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Add Mapping
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No mappings found</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Functional Area</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground w-8">→</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Business Group</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Primary SPOC</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Secondary SPOC</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground w-16">Remove</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className={`border-b last:border-0 hover:bg-muted/30 ${mappingSaving === m.id ? "opacity-50" : ""}`}>
                    <td className="py-2">
                      <select
                        value={m.functional_area_id}
                        onChange={(e) => handleUpdateMapping(m.id, "fa", e.target.value, m)}
                        disabled={mappingSaving === m.id}
                        className="px-2 py-1 border rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer w-full bg-transparent"
                      >
                        {functionalAreas.map((fa) => (
                          <option key={fa.id} value={fa.id}>{fa.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 text-center"><ChevronRight className="w-4 h-4 text-muted-foreground mx-auto" /></td>
                    <td className="py-2">
                      <select
                        value={m.target_business_group_id}
                        onChange={(e) => handleUpdateMapping(m.id, "bg", e.target.value, m)}
                        disabled={mappingSaving === m.id}
                        className="px-2 py-1 border rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer w-full bg-transparent"
                      >
                        {businessGroups.map((bg) => (
                          <option key={bg.id} value={bg.id}>{bg.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      {spocSaving?.bgId === m.target_business_group_id && spocSaving?.type === "primary" ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <select
                          value={m.primary_spoc_name || m.spoc_name || ""}
                          onChange={(e) => handleSpocChange(m.target_business_group_id, m.business_group_name, e.target.value, "primary")}
                          className="px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer w-full bg-transparent"
                        >
                          <option value="">— None —</option>
                          {allUsers.map((u: any) => (
                            <option key={u.id} value={u.full_name || u.name}>{u.full_name || u.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2">
                      {spocSaving?.bgId === m.target_business_group_id && spocSaving?.type === "secondary" ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <select
                          value={m.secondary_spoc_name || ""}
                          onChange={(e) => handleSpocChange(m.target_business_group_id, m.business_group_name, e.target.value, "secondary")}
                          disabled={!isPrimarySpoc(m) && !isSuperAdmin && !isAdmin}
                          className={`px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary appearance-none w-full bg-transparent ${
                            !isPrimarySpoc(m) && !isSuperAdmin && !isAdmin 
                              ? "cursor-not-allowed opacity-50" 
                              : "cursor-pointer"
                          }`}
                          title={
                            !isPrimarySpoc(m) && !isSuperAdmin && !isAdmin
                              ? "Only Primary SPOC, Admin, or Super Admin can update Secondary SPOC"
                              : ""
                          }
                        >
                          <option value="">— None —</option>
                          {allUsers.map((u: any) => (
                            <option key={u.id} value={u.full_name || u.name}>{u.full_name || u.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2">
                      <button className="p-1 hover:bg-destructive/10 hover:text-destructive rounded" onClick={() => handleRemoveMapping(m.id)} disabled={mappingSaving === m.id}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
 </div>
        )}
 </div>

      {/* Add/Edit FA Modal */}
      {showAddFA && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{editFA ? "Edit Functional Area" : "Add Functional Area"}</h3>
              <button onClick={() => { setShowAddFA(false); setEditFA(null) }}><X className="w-5 h-5" /></button>
 </div>
            <form onSubmit={handleSaveFA} className="space-y-4">
 <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={faForm.name} onChange={(e) => setFaForm({ ...faForm, name: e.target.value })} required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
 </div>
 <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input type="text" value={faForm.description} onChange={(e) => setFaForm({ ...faForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
 </div>
 <div>
                <label className="block text-sm font-medium mb-1">SPOC (Single Point of Contact)</label>
                <select
                  value={faForm.spocName}
                  onChange={(e) => setFaForm({ ...faForm, spocName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select SPOC --</option>
                  {allUsers
                    .filter(user => user.full_name) // Only show users with full names
                    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
                    .map(user => (
                      <option key={user.id} value={user.full_name}>
                        {user.full_name} ({user.email})
                      </option>
                    ))
                  }
                </select>
                <p className="text-xs text-muted-foreground mt-1">Select the person responsible for this functional area</p>
 </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" type="button" onClick={() => { setShowAddFA(false); setEditFA(null) }}>Cancel</Button>
                <Button type="submit" disabled={saving || !faForm.name.trim()} className="bg-black hover:bg-gray-800">
                  {saving ? "Saving..." : editFA ? "Update" : "Create"}
 </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Mapping Modal */}
      {showAddMapping && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Add FA Mapping</h3>
              <button onClick={() => setShowAddMapping(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddMapping} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Functional Area *</label>
                <select value={mappingForm.functionalAreaId} onChange={(e) => setMappingForm({ ...mappingForm, functionalAreaId: e.target.value })} required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                  <option value="">Select...</option>
                  {functionalAreas.map((fa) => <option key={fa.id} value={fa.id}>{fa.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Business Group *</label>
                <select value={mappingForm.targetBusinessGroupId} onChange={(e) => setMappingForm({ ...mappingForm, targetBusinessGroupId: e.target.value })} required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                  <option value="">Select...</option>
                  {businessGroups.map((bg) => <option key={bg.id} value={bg.id}>{bg.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" type="button" onClick={() => setShowAddMapping(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !mappingForm.functionalAreaId || !mappingForm.targetBusinessGroupId} className="bg-black hover:bg-gray-800">
                  {saving ? "Saving..." : "Add Mapping"}
 </Button>
 </div>
 </form>
 </div>
 </div>
 )}
    </div>
  )
}

// ==================== SYSTEM MANAGEMENT TAB (SUPERADMIN ONLY) ====================
function ImportCategoriesSection() {
  const [file, setFile] = useState<File | null>(null)
  const [businessGroupId, setBusinessGroupId] = useState<string>('')
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadBusinessGroups()
  }, [])

  const loadBusinessGroups = async () => {
    try {
      const { getBusinessUnitGroups } = await import('@/lib/actions/master-data')
      const result = await getBusinessUnitGroups()
      if (result.success && result.data) {
        setBusinessGroups(result.data)
      }
    } catch (error) {
      console.error('Error loading business groups:', error)
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
      toast.error('Please select both a file and a business group')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('businessGroupId', businessGroupId)

      const response = await fetch('/api/import/categories-excel', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(`Import successful! Created ${result.summary.categoriesCreated} categories, ${result.summary.subcategoriesCreated} subcategories, ${result.summary.mappingsCreated} mappings`)
        setFile(null)
        setBusinessGroupId('')
        // Reset file input
        const fileInput = document.getElementById('excel-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        toast.error(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import categories')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Business Group Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Business Group
          </label>
          <select
            value={businessGroupId}
            onChange={(e) => setBusinessGroupId(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
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

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Excel File
          </label>
          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            disabled={uploading}
          />
        </div>
      </div>

      {/* Import Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleImport}
          disabled={!file || !businessGroupId || uploading}
          className="bg-blue-600 hover:bg-blue-700"
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
          <span className="text-sm text-muted-foreground">
            Selected: {file.name}
          </span>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <strong>Excel Format:</strong> Category | Sub Category | Input (Description) | Estimated hrs
        </p>
        <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
          See <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">docs/IMPORT_TD_BM_CATEGORIES.md</code> for detailed instructions.
        </p>
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
    <div className="bg-card border rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-red-500" />
          System Management
          <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded">
            DANGER ZONE
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Bulk delete operations for system data. These actions are irreversible and should be used with extreme caution.
        </p>
      </div>

      {/* Import Section */}
      <div className="border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              Import Categories from Excel
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Upload an Excel file to import categories and subcategories for a specific Business Group.
            </p>
          </div>
        </div>
        <ImportCategoriesSection />
      </div>

      <div className="space-y-4">
        {/* Delete All Users */}
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                Delete All Users
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete all users except yourself. This will remove all user accounts and their associated data.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmDelete(
                "users",
                "Delete All Users",
                "This will permanently delete ALL users except yourself. This action cannot be undone.",
                bulkDeleteAllUsers
              )}
              disabled={loading}
              className="ml-4"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete All Users
            </Button>
          </div>
        </div>

        {/* Delete All Tickets */}
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-red-600" />
                Delete All Tickets
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete all tickets, comments, attachments, and audit logs. This will clear the entire ticket history.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmDelete(
                "tickets",
                "Delete All Tickets",
                "This will permanently delete ALL tickets and all related data (comments, attachments, audit logs). This action cannot be undone.",
                bulkDeleteAllTickets
              )}
              disabled={loading}
              className="ml-4"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete All Tickets
            </Button>
          </div>
        </div>

        {/* Delete All Business Groups */}
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-600" />
                Delete All Business Groups
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete all business groups and related mappings. User and ticket references will be set to NULL.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmDelete(
                "business-groups",
                "Delete All Business Groups",
                "This will permanently delete ALL business groups, classification mappings, and functional area mappings. User and ticket references will be cleared. This action cannot be undone.",
                bulkDeleteAllBusinessGroups
              )}
              disabled={loading}
              className="ml-4"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete All Groups
            </Button>
          </div>
        </div>

        {/* Delete All Functional Areas */}
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-red-600" />
                Delete All Functional Areas
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete all functional areas (organizations) and their business group mappings.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmDelete(
                "functional-areas",
                "Delete All Functional Areas",
                "This will permanently delete ALL functional areas and their business group mappings. This action cannot be undone.",
                bulkDeleteAllFunctionalAreas
              )}
              disabled={loading}
              className="ml-4"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete All FAs
            </Button>
          </div>
        </div>

        {/* Delete All Master Data (Categories & Subcategories) */}
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-red-600" />
                Delete All Categories & Subcategories
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete all categories, subcategories, and ticket classification mappings.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmDelete(
                "master-data",
                "Delete All Categories & Subcategories",
                "This will permanently delete ALL categories, subcategories, and ticket classification mappings. This action cannot be undone.",
                bulkDeleteAllMasterData
              )}
              disabled={loading}
              className="ml-4"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete All Master Data
            </Button>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Important Warning
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              All bulk delete operations are <strong>permanent and irreversible</strong>. Make sure you have a database backup before performing any of these operations. These actions will be logged in the audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && deleteAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
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
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Yes, Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== AUDIT LOGS TAB (SUPERADMIN ONLY) ====================
function AuditLogsTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ entityType: "", actionType: "", limit: 50, offset: 0 })

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const result = await getSystemAuditLogs(filters)
    if (result.success) {
      setLogs(result.data || [])
      setTotal(result.total || 0)
    }
    setLoading(false)
  }, [filters])

  useEffect(() => { loadLogs() }, [loadLogs])

  const entityTypes = ["user", "functional_area", "fa_mapping", "business_group", "category", "subcategory", "mapping"]
  const actionTypes = ["create", "update", "delete", "role_change", "spoc_update"]

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
    } catch { return dateStr }
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Super Admin Only</strong> — System-wide audit trail of all admin actions.
        </p>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h3 className="font-semibold">System Audit Logs</h3>
          <div className="flex gap-2 ml-auto">
            <select
              value={filters.entityType}
              onChange={(e) => setFilters((p) => ({ ...p, entityType: e.target.value, offset: 0 }))}
              className="px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="">All Entities</option>
              {entityTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <select
              value={filters.actionType}
              onChange={(e) => setFilters((p) => ({ ...p, actionType: e.target.value, offset: 0 }))}
              className="px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="">All Actions</option>
              {actionTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={loadLogs}><RefreshCw className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <ScrollText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left">
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Time</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Action</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Entity</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Old Value</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">New Value</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">By</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          log.action_type === "create" ? "bg-green-100 text-green-800" :
                          log.action_type === "delete" ? "bg-red-100 text-red-800" :
                          log.action_type === "role_change" ? "bg-amber-100 text-amber-800" :
                          "bg-blue-100 text-blue-800"
                        }`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-2 text-xs">{log.entity_type?.replace(/_/g, " ") || "—"}</td>
                      <td className="py-2 text-xs text-muted-foreground max-w-[120px] truncate">{log.old_value || "—"}</td>
                      <td className="py-2 text-xs max-w-[120px] truncate">{log.new_value || "—"}</td>
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{log.performed_by_name || log.performer_email || "—"}</td>
                      <td className="py-2 text-xs text-muted-foreground max-w-[150px] truncate">{log.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {filters.offset + 1}–{Math.min(filters.offset + filters.limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={filters.offset === 0}
                  onClick={() => setFilters((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={filters.offset + filters.limit >= total}
                  onClick={() => setFilters((p) => ({ ...p, offset: p.offset + p.limit }))}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
 )
}
