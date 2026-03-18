"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getTargetBusinessGroups,
  getBusinessUnitGroups,
  getCategories,
  getSubcategories,
  getTicketClassificationMappings,
  createBusinessUnitGroup,
  updateBusinessUnitGroup,
  deleteBusinessUnitGroup,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  createTicketClassificationMapping,
  updateTicketClassificationMapping,
  deleteTicketClassificationMapping,
  getBusinessGroupsForSpoc,
  getBusinessGroupsForPrimarySpoc,
  isUserPrimarySpoc,
} from "@/lib/actions/master-data"
import { getUsers } from "@/lib/actions/tickets"
import { getMasterDataPermissions } from "@/lib/actions/permissions"
import EditDialog from "./edit-dialog"
import ProjectNamesTab from "./project-names-tab"
import ConfirmationDialog, { ChangeDetail } from "@/components/ui/confirmation-dialog"

interface UnifiedMasterDataV2Props {
  userId?: number
  userRole?: string
  hideCardWrapper?: boolean
  selectedGroupId?: number | "all" | null
}

export default function UnifiedMasterDataV2({ userId, userRole, hideCardWrapper = false, selectedGroupId }: UnifiedMasterDataV2Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("business-groups")
  const [spocBusinessGroups, setSpocBusinessGroups] = useState<number[]>([])
  const [userBusinessGroupId, setUserBusinessGroupId] = useState<number | null>(null)
  const [primarySpocBusinessGroups, setPrimarySpocBusinessGroups] = useState<number[]>([])
  const [isPrimarySpoc, setIsPrimarySpoc] = useState(false)
  const isAdmin = userRole === "admin" || userRole === "superadmin"
  const isSuperAdmin = userRole === "superadmin"
  
  // Master data permissions
  const [permissions, setPermissions] = useState<{
    categories: { view: boolean; create: boolean; edit: boolean; delete: boolean }
    subcategories: { view: boolean; create: boolean; edit: boolean; delete: boolean }
    businessGroups: { view: boolean; create: boolean; edit: boolean; delete: boolean; manageScope: string; filterScope: string }
  } | null>(null)

  // Data states
  const [targetBusinessGroups, setTargetBusinessGroups] = useState<any[]>([])
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Expansion states for categories tab
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())

  // Edit dialogs
  const [editBG, setEditBG] = useState<any>(null)
  const [editCategory, setEditCategory] = useState<any>(null)
  const [editSubcategory, setEditSubcategory] = useState<any>(null)
  const [editMapping, setEditMapping] = useState<any>(null)
  
  // Confirmation dialog state
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

  const loadData = async () => {
    setLoading(true)
    const [tbgResult, bgResult, catResult, subcatResult, mappingResult, usersResult, permsResult] = await Promise.all([
      getTargetBusinessGroups(),
      getBusinessUnitGroups(),
      getCategories(),
      getSubcategories(),
      getTicketClassificationMappings(),
      getUsers(),
      userId ? getMasterDataPermissions(userId) : Promise.resolve({ success: false, data: null })
    ])

    if (tbgResult.success) setTargetBusinessGroups(tbgResult.data || [])
    if (bgResult.success) setBusinessGroups(bgResult.data || [])
    if (catResult.success) {
      console.log('Categories loaded:', catResult.data?.length, 'categories')
      console.log('Sample category:', catResult.data?.[0])
      setCategories(catResult.data || [])
    }
    if (subcatResult.success) setSubcategories(subcatResult.data || [])
    if (mappingResult.success) setMappings(mappingResult.data || [])
    if (usersResult.success) setUsers(usersResult.data || [])
    if (permsResult.success && permsResult.data) {
      setPermissions(permsResult.data)
    } else {
      // Default permissions if not available
      setPermissions({
        categories: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
        subcategories: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
        businessGroups: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin, manageScope: isAdmin ? "all" : "none", filterScope: isAdmin ? "all" : "own" }
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
    if (userId && !isAdmin) {
      loadSpocBusinessGroups()
      loadPrimarySpocBusinessGroups()
    }
    // Get user's business group ID from localStorage
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        if (user.business_unit_group_id) {
          setUserBusinessGroupId(user.business_unit_group_id)
        }
      }
    } catch (e) {
      console.error("Failed to parse user data:", e)
    }
  }, [userId, isAdmin])

  const loadPrimarySpocBusinessGroups = async () => {
    if (!userId) return
    const result = await getBusinessGroupsForPrimarySpoc(userId)
    if (result.success) {
      const bgIds = result.data.map((bg: any) => bg.id)
      setPrimarySpocBusinessGroups(bgIds)
      setIsPrimarySpoc(bgIds.length > 0)
    }
  }

  const loadSpocBusinessGroups = async () => {
    if (!userId) return
    const result = await getBusinessGroupsForSpoc(userId)
    if (result.success) {
      setSpocBusinessGroups(result.data.map((bg: any) => bg.id))
    }
  }

  const toggleCategory = (catId: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(catId)) {
      newExpanded.delete(catId)
    } else {
      newExpanded.add(catId)
    }
    setExpandedCategories(newExpanded)
  }

  const getSubcategoriesForCategory = (categoryId: number) => {
    return subcategories.filter((sub) => sub.category_id === categoryId)
  }

  const getMappingsForSubcategory = (subcategoryId: number) => {
    return mappings.filter((m) => m.subcategory_id === subcategoryId)
  }

  // Filter categories based on SPOC permissions and top-level business group filter
  const getFilteredCategories = () => {
    let filtered = categories

    // If filter scope is "own", only show categories for user's business group
    if (permissions?.businessGroups.filterScope === "own" && userBusinessGroupId) {
      filtered = filtered.filter((cat) => cat.business_unit_group_id === userBusinessGroupId)
      return filtered
    }

    // If user is SPOC (not admin), filter to categories linked to their business groups
    if (!isAdmin && spocBusinessGroups.length > 0 && permissions?.businessGroups.filterScope !== "all") {
      filtered = filtered.filter((cat) => 
        cat.business_unit_group_id && spocBusinessGroups.includes(cat.business_unit_group_id)
      )
    }

    // Apply top-level business group filter from header (for Super Admin)
    if (isSuperAdmin && selectedGroupId && selectedGroupId !== "all") {
      filtered = filtered.filter((cat) => cat.business_unit_group_id === selectedGroupId)
    }

    return filtered
  }

  // Filter business groups based on selected group and permissions
  const getFilteredBusinessGroups = () => {
    let filtered = businessGroups

    // For Super Admin with specific group selected, filter to that group
    if (isSuperAdmin && selectedGroupId && selectedGroupId !== "all") {
      filtered = filtered.filter((bg) => bg.id === selectedGroupId)
      return filtered
    }

    // For Primary SPOC, show only their assigned groups
    if (isPrimarySpoc) {
      filtered = filtered.filter((bg) => primarySpocBusinessGroups.includes(bg.id))
      return filtered
    }

    // For regular SPOC (not admin), show only their assigned groups
    if (!isAdmin && spocBusinessGroups.length > 0) {
      filtered = filtered.filter((bg) => spocBusinessGroups.includes(bg.id))
      return filtered
    }

    // For users with specific group assignment
    if (!isAdmin && userBusinessGroupId) {
      filtered = filtered.filter((bg) => bg.id === userBusinessGroupId)
      return filtered
    }

    return filtered
  }

  // Helper function to check if SPOC has access to a business group
  const spocHasAccess = (businessGroupId: number) => {
    if (isAdmin) return true
    return spocBusinessGroups.includes(businessGroupId)
  }

  // Helper function to check if SPOC has access to a mapping
  const spocHasAccessToMapping = (mapping: any) => {
    if (isAdmin) return true
    return spocBusinessGroups.includes(mapping.target_business_group_id)
  }

  // Business Group handlers
  const handleCreateBG = async (name: string, description?: string, spocName?: string) => {
    const result = await createBusinessUnitGroup(name, description, spocName)
    if (result.success) {
      await loadData()
      setEditBG(null)
      return true
    }
    return false
  }

  const handleUpdateBG = async (id: number, name: string, description?: string, spocName?: string) => {
    const result = await updateBusinessUnitGroup(id, name, description, spocName)
    if (result.success) {
      await loadData()
      setEditBG(null)
      return true
    }
    return false
  }

  const handleUpdateSecondarySpoc = async (businessGroupId: number, secondarySpocName: string) => {
    const { updateBusinessGroupSpoc } = await import("@/lib/actions/admin")
    const result = await updateBusinessGroupSpoc(businessGroupId, secondarySpocName, "secondary")
    if (result.success) {
      await loadData()
      setEditBG(null)
      toast.success("Secondary SPOC updated successfully")
      return true
    } else {
      toast.error(result.error || "Failed to update Secondary SPOC")
      return false
    }
  }

  const handleDeleteBG = async (id: number) => {
    const bg = businessGroups.find(b => b.id === id)
    if (!bg) return
    
    const isSuperAdmin = userRole === "superadmin"
    const relatedMappings = mappings.filter(m => m.business_unit_group_id === id || m.target_business_group_id === id)
    const changes: ChangeDetail[] = [{
      label: "Business Group",
      oldValue: bg.name,
      type: "delete"
    }]
    if (relatedMappings.length > 0) {
      changes.push({
        label: "Related Mappings",
        oldValue: `${relatedMappings.length} mapping(s) will be ${isSuperAdmin ? 'permanently deleted' : 'affected'}`,
        type: "delete"
      })
    }

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        const result = await deleteBusinessUnitGroup(id)
        if (result.success) {
          // Force refresh to clear any cached data
          router.refresh()
          await loadData()
          if (result.message) {
            toast.success(result.message)
          } else {
            toast.success("Business Group deleted successfully")
          }
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "delete" })
        } else {
          toast.error(result.error || "Failed to delete business group")
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
      },
      title: "Delete Business Group",
      description: isSuperAdmin 
        ? "⚠️ PERMANENT DELETION: This will permanently delete the Business Group and ALL related data (tickets, users, mappings). This action cannot be undone!"
        : "Are you sure? This will affect related mappings.",
      actionType: "delete",
      changes
    })
  }

  // Category handlers
  const handleCreateCategory = async (name: string, description?: string) => {
    const result = await createCategory(name, description)
    if (result.success) {
      await loadData()
      setEditCategory(null)
      return true
    }
    return false
  }

  const handleUpdateCategory = async (id: number, name: string, description?: string) => {
    const result = await updateCategory(id, name, description)
    if (result.success) {
      await loadData()
      setEditCategory(null)
      return true
    }
    return false
  }

  const handleDeleteCategory = async (id: number) => {
    const category = categories.find(c => c.id === id)
    if (!category) return
    
    const isSuperAdmin = userRole === "superadmin"
    const relatedSubcategories = subcategories.filter(s => s.category_id === id)
    const relatedMappings = mappings.filter(m => m.category_id === id)
    const changes: ChangeDetail[] = [{
      label: "Category",
      oldValue: category.name,
      type: "delete"
    }]
    if (relatedSubcategories.length > 0) {
      changes.push({
        label: "Related Subcategories",
        oldValue: `${relatedSubcategories.length} subcategory(ies) will be ${isSuperAdmin ? 'permanently deleted' : 'deleted'}`,
        type: "delete"
      })
    }
    if (relatedMappings.length > 0) {
      changes.push({
        label: "Related Mappings",
        oldValue: `${relatedMappings.length} mapping(s) will be ${isSuperAdmin ? 'permanently deleted' : 'deleted'}`,
        type: "delete"
      })
    }

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        const result = await deleteCategory(id)
        if (result.success) {
          await loadData()
          if (result.message) {
            toast.success(result.message)
          } else {
            toast.success("Category deleted successfully")
          }
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "delete" })
        } else {
          toast.error(result.error || "Failed to delete category")
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
      },
      title: "Delete Category",
      description: isSuperAdmin
        ? "⚠️ PERMANENT DELETION: This will permanently delete the Category and ALL related data (subcategories, tickets, mappings). This action cannot be undone!"
        : "Are you sure? This will delete all related subcategories and mappings.",
      actionType: "delete",
      changes
    })
  }

  // Subcategory handlers
  const handleCreateSubcategory = async (categoryId: number, name: string, description?: string, estimatedHours?: number) => {
    const result = await createSubcategory(categoryId, name, description, estimatedHours)
    if (result.success) {
      await loadData()
      setEditSubcategory(null)
      return true
    }
    return false
  }

  const handleUpdateSubcategory = async (id: number, name: string, description?: string, estimatedHours?: number) => {
    const result = await updateSubcategory(id, name, description, estimatedHours)
    if (result.success) {
      await loadData()
      setEditSubcategory(null)
      return true
    }
    return false
  }

  const handleDeleteSubcategory = async (id: number) => {
    const subcategory = subcategories.find(s => s.id === id)
    if (!subcategory) return
    
    const isSuperAdmin = userRole === "superadmin"
    const relatedMappings = mappings.filter(m => m.subcategory_id === id)
    const changes: ChangeDetail[] = [{
      label: "Subcategory",
      oldValue: subcategory.name,
      type: "delete"
    }]
    if (relatedMappings.length > 0) {
      changes.push({
        label: "Related Mappings",
        oldValue: `${relatedMappings.length} mapping(s) will be ${isSuperAdmin ? 'permanently deleted' : 'deleted'}`,
        type: "delete"
      })
    }

    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        const result = await deleteSubcategory(id)
        if (result.success) {
          await loadData()
          if (result.message) {
            toast.success(result.message)
          } else {
            toast.success("Subcategory deleted successfully")
          }
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "delete" })
        } else {
          toast.error(result.error || "Failed to delete subcategory")
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
      },
      title: "Delete Subcategory",
      description: isSuperAdmin
        ? "⚠️ PERMANENT DELETION: This will permanently delete the Subcategory and ALL related data (tickets, mappings). This action cannot be undone!"
        : "Are you sure? This will delete all related mappings.",
      actionType: "delete",
      changes
    })
  }

  // Mapping handlers
  const handleCreateMapping = async (formData: any) => {
    const result = await createTicketClassificationMapping(
      Number(formData.target_business_group_id),
      Number(formData.category_id),
      Number(formData.subcategory_id),
      Number(formData.estimated_duration),
      formData.spoc_user_id ? Number(formData.spoc_user_id) : undefined,
      formData.auto_title_template,
      formData.description
    )
    if (result.success) {
      await loadData()
      setEditMapping(null)
      return true
    }
    return false
  }

  const handleUpdateMapping = async (id: number, formData: any) => {
    const result = await updateTicketClassificationMapping(
      id,
      Number(formData.estimated_duration),
      formData.spoc_user_id ? Number(formData.spoc_user_id) : undefined,
      formData.auto_title_template
    )
    if (result.success) {
      await loadData()
      setEditMapping(null)
      return true
    }
    return false
  }

  const handleDeleteMapping = async (id: number) => {
    const mapping = mappings.find(m => m.id === id)
    if (!mapping) return
    
    const isSuperAdmin = userRole === "superadmin"
    const bgName = targetBusinessGroups.find(bg => bg.id === mapping.target_business_group_id)?.name || "Unknown"
    const catName = categories.find(c => c.id === mapping.category_id)?.name || "Unknown"
    const subcatName = subcategories.find(s => s.id === mapping.subcategory_id)?.name || "Unknown"
    
    setConfirmDialog({
      open: true,
      action: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }))
        const result = await deleteTicketClassificationMapping(id)
        if (result.success) {
          await loadData()
          if (result.message) {
            toast.success(result.message)
          } else {
            toast.success("Mapping deleted successfully")
          }
          setConfirmDialog({ open: false, action: () => {}, title: "", actionType: "delete" })
        } else {
          toast.error(result.error || "Failed to delete mapping")
          setConfirmDialog(prev => ({ ...prev, loading: false }))
        }
      },
      title: "Delete Ticket Classification Mapping",
      description: isSuperAdmin
        ? "⚠️ PERMANENT DELETION: This mapping will be permanently deleted. This action cannot be undone!"
        : "Are you sure you want to delete this mapping?",
      actionType: "delete",
      changes: [{
        label: "Mapping",
        oldValue: `${bgName} → ${catName} → ${subcatName}`,
        type: "delete"
      }]
    })
  }

  if (loading) {
    return <div className="p-6 text-center">Loading master data...</div>
  }

  return (
    <>
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
    <div className={hideCardWrapper ? "bg-transparent border-0 rounded-xl p-0" : "bg-white dark:bg-slate-800 border border-border rounded-xl p-6"}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="business-groups">Business Groups</TabsTrigger>
          <TabsTrigger value="categories">Categories & Sub categories</TabsTrigger>
          <TabsTrigger value="project-names">Project Names</TabsTrigger>
        </TabsList>

        {/* Business Groups Tab */}
        <TabsContent value="business-groups" className="mt-6">
          {!permissions?.businessGroups.view ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <p className="text-foreground-secondary">You don't have permission to view business groups.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-poppins font-bold text-foreground text-lg">Business Groups</h2>
                  <p className="text-sm text-foreground-secondary mt-1">
                    Manage functional area business groups
                  </p>
                </div>
                {!isPrimarySpoc && (
                  <Button
                    size="sm"
                    onClick={() => setEditBG({ id: null, name: "", description: "", spoc_name: "" })}
                    className="bg-black hover:bg-gray-800"
                    disabled={!permissions?.businessGroups.create}
                    title={!permissions?.businessGroups.create ? "You don't have permission to create business groups" : ""}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Business Group
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {getFilteredBusinessGroups().length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <p className="text-foreground-secondary">
                      {isPrimarySpoc 
                        ? "You are not assigned as Primary SPOC for any business group." 
                        : isSuperAdmin && selectedGroupId && selectedGroupId !== "all"
                          ? "No business groups found for the selected filter."
                          : "No business groups yet. Click \"Add Business Group\" to create one."}
                    </p>
                  </div>
                ) : (
                  getFilteredBusinessGroups().map((bg) => (
                    <div
                      key={bg.id}
                      className="flex justify-between items-center p-3 border border-border rounded-lg hover:border-primary/50 dark:hover:border-primary transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <h3 className="font-semibold text-foreground">{bg.name}</h3>
                          {bg.spoc_name && (
                            <span className="text-sm text-primary">
                              <span className="text-foreground-secondary">Primary SPOC:</span> {bg.spoc_name}
                            </span>
                          )}
                          {bg.secondary_spoc_name && (
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                              <span className="text-foreground-secondary">Secondary SPOC:</span> {bg.secondary_spoc_name}
                            </span>
                          )}
                        </div>
                        {bg.description && <p className="text-xs text-foreground-secondary mt-1">{bg.description}</p>}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {isPrimarySpoc ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditBG({ ...bg, isSpocEdit: true })}
                            title="Edit Secondary SPOC"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setEditBG(bg)}
                              disabled={!permissions?.businessGroups.edit}
                              title={!permissions?.businessGroups.edit ? "You don't have permission to edit business groups" : "Edit Business Group"}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteBG(bg.id)}
                              disabled={!permissions?.businessGroups.delete}
                              title={!permissions?.businessGroups.delete ? "You don't have permission to delete business groups" : "Delete Business Group"}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          {!permissions?.categories.view ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <p className="text-foreground-secondary">You don't have permission to view categories.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-poppins font-bold text-foreground text-lg">Categories & Sub categories</h2>
                  <p className="text-sm text-foreground-secondary mt-1">
                    Manage categories, subcategories, and ticket classification mappings
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setEditCategory({ id: null, name: "", description: "" })}
                  className="bg-black hover:bg-gray-800"
                  disabled={!permissions?.categories.create}
                  title={!permissions?.categories.create ? "You don't have permission to create categories" : ""}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

          <div className="space-y-2">
            {getFilteredCategories().length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                <p className="text-foreground-secondary">No categories found. {isAdmin ? 'Click "Add Category" to create one.' : 'No categories available for your assigned business groups.'}</p>
              </div>
            ) : (
              getFilteredCategories().map((category) => {
                const subcats = getSubcategoriesForCategory(category.id)

                return (
                  <div key={category.id} className="border border-border rounded-lg">
                    {/* Category Header */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="hover:bg-white dark:hover:bg-slate-600 rounded p-1"
                        >
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex items-center gap-3 flex-1 flex-wrap">
                          <h3 className="font-semibold text-foreground">{category.name}</h3>
                          {category.description && (
                            <span className="text-xs text-foreground-secondary">- {category.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditCategory(category)} 
                          title={!permissions?.categories.edit ? "You don't have permission to edit categories" : "Edit Category"}
                          disabled={!permissions?.categories.edit}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteCategory(category.id)} 
                          title={!permissions?.categories.delete ? "You don't have permission to delete categories" : "Delete Category"}
                          disabled={!permissions?.categories.delete}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Subcategories */}
                    {expandedCategories.has(category.id) && (
                      <div className="p-3 space-y-2">
                        {subcats.length > 0 ? (
                          subcats.map((subcat) => (
                            <div
                              key={subcat.id}
                              className="flex justify-between items-center p-2 ml-6 border border-border rounded-lg hover:border-primary/50 dark:hover:border-primary transition-all bg-white dark:bg-slate-800"
                            >
                              <div className="flex items-center gap-3 flex-1 flex-wrap">
                                <span className="font-medium text-sm">{subcat.name}</span>
                                {subcat.estimated_hours && (
                                  <span className="text-xs text-primary font-medium">
                                    {subcat.estimated_hours}h
                                  </span>
                                )}
                                {subcat.description && (
                                  <span className="text-xs text-foreground-secondary">- {subcat.description}</span>
                                )}
                              </div>
                              <div className="flex gap-1 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title={!permissions?.subcategories.edit ? "You don't have permission to edit subcategories" : "Edit Subcategory"}
                                  onClick={() => setEditSubcategory({ ...subcat, category_name: category.name })}
                                  disabled={!permissions?.subcategories.edit}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title={!permissions?.subcategories.delete ? "You don't have permission to delete subcategories" : "Delete Subcategory"}
                                  onClick={() => handleDeleteSubcategory(subcat.id)}
                                  disabled={!permissions?.subcategories.delete}
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : null}

                        {/* Add Subcategory Button */}
                        <div className="ml-6 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditSubcategory({
                                id: null,
                                category_id: category.id,
                                category_name: category.name,
                                name: "",
                                description: "",
                              })
                            }
                            disabled={!permissions?.subcategories.create}
                            title={!permissions?.subcategories.create ? "You don't have permission to create subcategories" : "Add Subcategory"}
                            className="text-xs h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Subcategory
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
            </>
          )}
        </TabsContent>

        {/* Project Names Tab */}
        <TabsContent value="project-names" className="mt-6">
          <ProjectNamesTab 
            selectedGroupId={selectedGroupId}
            userRole={userRole}
            spocBusinessGroups={spocBusinessGroups}
            userBusinessGroupId={userBusinessGroupId}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialogs */}
      {editBG && (
        <EditDialog
          title={editBG.isSpocEdit ? "Edit Secondary SPOC" : (editBG.id ? "Edit Business Group" : "Add Business Group")}
          fields={editBG.isSpocEdit ? [
            {
              name: "secondary_spoc_name",
              label: "Secondary SPOC Name",
              type: "select",
              options: [{ value: "", label: "None" }, ...users.map(user => ({ value: user.full_name, label: user.full_name }))]
            },
          ] : [
            { name: "name", label: "Name", type: "text", required: true, disabled: editBG.isSpocEdit },
            { name: "description", label: "Description", type: "textarea", disabled: editBG.isSpocEdit },
            {
              name: "spoc_name",
              label: "Primary SPOC Name",
              type: "select",
              options: users.map(user => ({ value: user.full_name, label: user.full_name })),
              disabled: editBG.isSpocEdit
            },
            {
              name: "secondary_spoc_name",
              label: "Secondary SPOC Name",
              type: "select",
              options: [{ value: "", label: "None" }, ...users.map(user => ({ value: user.full_name, label: user.full_name }))]
            },
          ]}
          initialData={editBG.isSpocEdit ? { secondary_spoc_name: editBG.secondary_spoc_name || "" } : editBG}
          onSave={(data) => {
            if (editBG.isSpocEdit) {
              return handleUpdateSecondarySpoc(editBG.id, data.secondary_spoc_name || "")
            } else {
              return editBG.id 
                ? handleUpdateBG(editBG.id, data.name, data.description, data.spoc_name) 
                : handleCreateBG(data.name, data.description, data.spoc_name)
            }
          }}
          onClose={() => setEditBG(null)}
        />
      )}

      {editCategory && (
        <EditDialog
          title={editCategory.id ? "Edit Category" : "Add Category"}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "description", label: "Description", type: "textarea" },
          ]}
          initialData={editCategory}
          onSave={(data) =>
            editCategory.id
              ? handleUpdateCategory(editCategory.id, data.name, data.description)
              : handleCreateCategory(data.name, data.description)
          }
          onClose={() => setEditCategory(null)}
        />
      )}

      {editSubcategory && (
        <EditDialog
          title={editSubcategory.id ? "Edit Sub category" : "Add Sub category"}
          fields={[
            {
              name: "category_name",
              label: "Category",
              type: "text",
              disabled: true,
            },
            { name: "name", label: "Sub category", type: "text", required: true },
            { name: "estimated_hours", label: "Estimated Hours", type: "number", required: true },
            { name: "description", label: "Description", type: "textarea" },
          ]}
          initialData={editSubcategory}
          onSave={(data) =>
            editSubcategory.id
              ? handleUpdateSubcategory(editSubcategory.id, data.name, data.description, data.estimated_hours ? Number(data.estimated_hours) : undefined)
              : handleCreateSubcategory(Number(editSubcategory.category_id), data.name, data.description, data.estimated_hours ? Number(data.estimated_hours) : undefined)
          }
          onClose={() => setEditSubcategory(null)}
        />
      )}

      {editMapping && (
        <EditDialog
          title={editMapping.id ? "Edit Classification Mapping" : "Add Classification Mapping"}
          fields={[
            {
              name: "target_business_group_id",
              label: "Target Business Group",
              type: "select",
              required: true,
              options: isAdmin 
                ? targetBusinessGroups.map((tbg) => ({ value: tbg.id, label: tbg.name }))
                : targetBusinessGroups
                    .filter((tbg) => spocBusinessGroups.includes(tbg.id))
                    .map((tbg) => ({ value: tbg.id, label: tbg.name })),
              disabled: !!editMapping.id || (!isAdmin && !editMapping.id),
            },
            {
              name: "category_id",
              label: "Category",
              type: "select",
              required: true,
              options: categories.map((cat) => ({ value: cat.id, label: cat.name })),
              disabled: !!editMapping.id,
            },
            {
              name: "subcategory_id",
              label: "Subcategory",
              type: "select",
              required: true,
              options: subcategories.map((sub) => ({ value: sub.id, label: sub.name })),
              disabled: !!editMapping.id,
            },
            {
              name: "estimated_duration",
              label: "Estimated Duration (minutes)",
              type: "number",
              required: true,
            },
            {
              name: "spoc_user_id",
              label: "SPOC (Assign To)",
              type: "select",
              options: users.map((user) => ({ value: user.id, label: user.name })),
            },
            { name: "auto_title_template", label: "Auto Title Template", type: "text" },
            { name: "description", label: "Description", type: "textarea" },
          ]}
          initialData={editMapping}
          onSave={(data) =>
            editMapping.id ? handleUpdateMapping(editMapping.id, data) : handleCreateMapping(data)
          }
          onClose={() => setEditMapping(null)}
        />
      )}
    </div>
    </>
  )
}
