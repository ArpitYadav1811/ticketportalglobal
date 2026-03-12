"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Link2,
  Building2,
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Download,
  ChevronRight,
  Users,
  X,
  Save,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import ConfirmationDialog, { ChangeDetail } from "@/components/ui/confirmation-dialog"
import {
  getFunctionalAreas,
  getFunctionalAreaMappings,
  createFunctionalArea,
  updateFunctionalArea,
  deleteFunctionalArea,
  addFunctionalAreaMapping,
  removeFunctionalAreaMapping,
  updateBusinessGroupSpoc,
  updateFunctionalAreaMapping,
} from "@/lib/actions/admin"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { getUsers } from "@/lib/actions/tickets"

interface FAMappingsVisualProps {
  currentUser: any
}

export default function FAMappingsVisual({ currentUser }: FAMappingsVisualProps) {
  const [functionalAreas, setFunctionalAreas] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFA, setSelectedFA] = useState<number | null>(null)
  const [selectedBG, setSelectedBG] = useState<number | null>(null)

  // Modal states
  const [showAddFA, setShowAddFA] = useState(false)
  const [showAddMapping, setShowAddMapping] = useState(false)
  const [editFA, setEditFA] = useState<any>(null)
  const [faForm, setFaForm] = useState({ name: "", description: "", spocName: "" })
  const [mappingForm, setMappingForm] = useState({ functionalAreaId: "", targetBusinessGroupId: "" })
  const [saving, setSaving] = useState(false)

  // Confirmation dialog
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

  useEffect(() => {
    loadData()
  }, [])

  // Filter data based on search
  const filteredFAs = functionalAreas.filter((fa) =>
    fa.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fa.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredBGs = businessGroups.filter((bg) =>
    bg.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredMappings = mappings.filter((m) => {
    if (selectedFA && m.functional_area_id !== selectedFA) return false
    if (selectedBG && m.target_business_group_id !== selectedBG) return false
    return (
      m.functional_area_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.business_group_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleSaveFA = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const result = editFA
      ? await updateFunctionalArea(editFA.id, faForm.name, faForm.description, faForm.spocName)
      : await createFunctionalArea(faForm.name, faForm.description, faForm.spocName)
    if (result.success) {
      await loadData()
      setShowAddFA(false)
      setEditFA(null)
      setFaForm({ name: "", description: "", spocName: "" })
      toast.success("Functional Area saved successfully")
    } else {
      toast.error(result.error || "Failed to save")
    }
    setSaving(false)
  }

  const handleDeleteFA = async (id: number, name: string) => {
    const relatedMappings = mappings.filter((m) => m.functional_area_id === id)
    const changes: ChangeDetail[] = [
      {
        label: "Functional Area",
        oldValue: name,
        type: "delete",
      },
    ]
    if (relatedMappings.length > 0) {
      changes.push({
        label: "Related Mappings",
        oldValue: `${relatedMappings.length} mapping(s) will be deleted`,
        type: "delete",
      })
    }

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }))
        const result = await deleteFunctionalArea(id)
        if (result.success) {
          await loadData()
          toast.success("Functional Area deleted successfully")
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "delete" })
        } else {
          toast.error(result.error || "Failed to delete")
          setConfirmDialog((prev) => ({ ...prev, loading: false }))
        }
      },
      title: "Delete Functional Area",
      description: `Delete functional area "${name}" and all its mappings? This action cannot be undone.`,
      actionType: "delete",
      changes,
    })
  }

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault()
    const faName = functionalAreas.find((f) => f.id === Number(mappingForm.functionalAreaId))?.name
    const bgName = businessGroups.find((b) => b.id === Number(mappingForm.targetBusinessGroupId))?.name

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }))
        setSaving(true)
        const result = await addFunctionalAreaMapping(
          Number(mappingForm.functionalAreaId),
          Number(mappingForm.targetBusinessGroupId)
        )
        if (result.success) {
          await loadData()
          setShowAddMapping(false)
          setMappingForm({ functionalAreaId: "", targetBusinessGroupId: "" })
          toast.success("Mapping added successfully")
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "add" })
        } else {
          toast.error(result.error || "Failed to add mapping")
          setConfirmDialog((prev) => ({ ...prev, loading: false }))
        }
        setSaving(false)
      },
      title: "Add Functional Area Mapping",
      description: `Add mapping between "${faName}" and "${bgName}"?`,
      actionType: "add",
      changes: [
        {
          label: "New Mapping",
          newValue: `${faName} → ${bgName}`,
          type: "add",
        },
      ],
    })
  }

  const handleRemoveMapping = async (id: number) => {
    const mapping = mappings.find((m) => m.id === id)
    if (!mapping) return

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }))
        const result = await removeFunctionalAreaMapping(id)
        if (result.success) {
          await loadData()
          toast.success("Mapping removed successfully")
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "remove" })
        } else {
          toast.error(result.error || "Failed to remove")
          setConfirmDialog((prev) => ({ ...prev, loading: false }))
        }
      },
      title: "Remove Functional Area Mapping",
      description: "Remove this mapping?",
      actionType: "remove",
      changes: [
        {
          label: "Mapping",
          oldValue: `${mapping.functional_area_name} → ${mapping.business_group_name}`,
          type: "delete",
        },
      ],
    })
  }

  const handleSpocChange = async (bgId: number, bgName: string, newSpocName: string, spocType: "primary" | "secondary") => {
    const spocLabel = spocType === "primary" ? "Primary SPOC" : "Secondary SPOC"
    const currentMapping = mappings.find((m) => m.target_business_group_id === bgId)
    const oldSpocName =
      spocType === "primary"
        ? currentMapping?.primary_spoc_name || currentMapping?.spoc_name || "None"
        : currentMapping?.secondary_spoc_name || "None"

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }))
        const result = await updateBusinessGroupSpoc(bgId, newSpocName, spocType)
        if (result.success) {
          await loadData()
          toast.success(`${spocLabel} updated successfully`)
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "update" })
        } else {
          toast.error(result.error || `Failed to update ${spocLabel}`)
          setConfirmDialog((prev) => ({ ...prev, loading: false }))
        }
      },
      title: `Update ${spocLabel}`,
      description: `Change ${spocLabel} for "${bgName}"?`,
      actionType: "update",
      changes: [
        {
          label: `${spocLabel} for ${bgName}`,
          oldValue: oldSpocName,
          newValue: newSpocName || "None",
          type: "update",
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.description}
        actionType={confirmDialog.actionType}
        changes={confirmDialog.changes}
        loading={confirmDialog.loading}
        destructive={confirmDialog.actionType === "delete" || confirmDialog.actionType === "remove"}
      />

      {/* Enhanced Header */}
      <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-5 overflow-hidden group mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-3 mb-1">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg shadow-md">
                <Link2 className="w-6 h-6 text-purple-600" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Functional Area Mappings
              </span>
            </h2>
            <p className="text-sm text-muted-foreground font-medium ml-11">
              Manage relationships between Functional Areas and Business Groups
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData} 
              disabled={loading}
              className="border-2 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105" 
              onClick={() => {
                setEditFA(null)
                setFaForm({ name: "", description: "", spocName: "" })
                setShowAddFA(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add FA
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 overflow-hidden group mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search FAs, BGs, or mappings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-border/50 rounded-lg bg-background/90 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 font-medium shadow-sm hover:shadow-md transition-all duration-300"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedFA || ""}
              onChange={(e) => setSelectedFA(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2.5 border-2 border-border/50 rounded-lg bg-background/90 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 font-medium shadow-sm hover:shadow-md transition-all duration-300"
            >
              <option value="">All Functional Areas</option>
              {functionalAreas.map((fa) => (
                <option key={fa.id} value={fa.id}>
                  {fa.name}
                </option>
              ))}
            </select>
            <select
              value={selectedBG || ""}
              onChange={(e) => setSelectedBG(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2.5 border-2 border-border/50 rounded-lg bg-background/90 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 font-medium shadow-sm hover:shadow-md transition-all duration-300"
            >
              <option value="">All Business Groups</option>
              {businessGroups.map((bg) => (
                <option key={bg.id} value={bg.id}>
                  {bg.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Enhanced Visual Mappings View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Enhanced Functional Areas */}
        <div className="relative bg-card/90 backdrop-blur-md border-2 border-border/50 rounded-xl shadow-lg p-4 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/20 rounded-lg">
                  <FolderTree className="w-4 h-4 text-purple-600" />
                </div>
                Functional Areas ({filteredFAs.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-lg"></div>
                  <p className="text-sm font-semibold text-muted-foreground">Loading...</p>
                </div>
              ) : filteredFAs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderTree className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">No functional areas found</p>
                  <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                filteredFAs.map((fa, idx) => {
                  const faMappings = mappings.filter((m) => m.functional_area_id === fa.id)
                  return (
                    <div
                      key={fa.id}
                      className="relative bg-card/80 backdrop-blur-sm border-2 border-border/50 rounded-xl p-3 hover:shadow-lg transition-all duration-300 overflow-hidden group/fa"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover/fa:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-sm text-foreground group-hover/fa:text-purple-600 transition-colors">{fa.name}</h4>
                            <span className="px-2 py-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full border border-purple-300 dark:border-purple-700 shadow-sm">
                              {faMappings.length} mapping{faMappings.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {fa.description && (
                            <p className="text-xs text-muted-foreground font-medium mt-1">{fa.description}</p>
                          )}
                          {fa.spoc_name && (
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                              SPOC: <span className="font-bold text-foreground">{fa.spoc_name}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover/fa:opacity-100 transition-opacity duration-300">
                          <button
                            className="p-1.5 hover:bg-primary/10 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md"
                            onClick={() => {
                              setEditFA(fa)
                              setFaForm({
                                name: fa.name,
                                description: fa.description || "",
                                spocName: fa.spoc_name || "",
                              })
                              setShowAddFA(true)
                            }}
                          >
                            <Edit className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-red-500/10 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md"
                            onClick={() => handleDeleteFA(fa.id, fa.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Mappings */}
        <div className="bg-card border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Mappings ({filteredMappings.length})
            </h3>
            <Button
              size="sm"
              className="bg-black hover:bg-gray-800"
              onClick={() => {
                setMappingForm({ functionalAreaId: "", targetBusinessGroupId: "" })
                setShowAddMapping(true)
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Mapping
            </Button>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : filteredMappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No mappings found</div>
            ) : (
              filteredMappings.map((m) => (
                <div
                  key={m.id}
                  className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{m.functional_area_name}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{m.business_group_name}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Primary SPOC:</span>
                          <select
                            value={m.primary_spoc_name || m.spoc_name || ""}
                            onChange={(e) =>
                              handleSpocChange(m.target_business_group_id, m.business_group_name, e.target.value, "primary")
                            }
                            className="px-2 py-0.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                          >
                            <option value="">— None —</option>
                            {allUsers.map((u: any) => (
                              <option key={u.id} value={u.full_name || u.name}>
                                {u.full_name || u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Secondary SPOC:</span>
                          <select
                            value={m.secondary_spoc_name || ""}
                            onChange={(e) =>
                              handleSpocChange(m.target_business_group_id, m.business_group_name, e.target.value, "secondary")
                            }
                            className="px-2 py-0.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                          >
                            <option value="">— None —</option>
                            {allUsers.map((u: any) => (
                              <option key={u.id} value={u.full_name || u.name}>
                                {u.full_name || u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                      onClick={() => handleRemoveMapping(m.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit FA Modal */}
      {showAddFA && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{editFA ? "Edit Functional Area" : "Add Functional Area"}</h3>
              <button onClick={() => { setShowAddFA(false); setEditFA(null) }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFA} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={faForm.name}
                  onChange={(e) => setFaForm({ ...faForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={faForm.description}
                  onChange={(e) => setFaForm({ ...faForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SPOC</label>
                <select
                  value={faForm.spocName}
                  onChange={(e) => setFaForm({ ...faForm, spocName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select SPOC --</option>
                  {allUsers
                    .filter((user) => user.full_name)
                    .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
                    .map((user) => (
                      <option key={user.id} value={user.full_name}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" type="button" onClick={() => { setShowAddFA(false); setEditFA(null) }}>
                  Cancel
                </Button>
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
          <div className="bg-card border rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Add FA Mapping</h3>
              <button onClick={() => setShowAddMapping(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMapping} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Functional Area *</label>
                <select
                  value={mappingForm.functionalAreaId}
                  onChange={(e) => setMappingForm({ ...mappingForm, functionalAreaId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select...</option>
                  {functionalAreas.map((fa) => (
                    <option key={fa.id} value={fa.id}>
                      {fa.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Business Group *</label>
                <select
                  value={mappingForm.targetBusinessGroupId}
                  onChange={(e) => setMappingForm({ ...mappingForm, targetBusinessGroupId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select...</option>
                  {businessGroups.map((bg) => (
                    <option key={bg.id} value={bg.id}>
                      {bg.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" type="button" onClick={() => setShowAddMapping(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !mappingForm.functionalAreaId || !mappingForm.targetBusinessGroupId}
                  className="bg-black hover:bg-gray-800"
                >
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
