"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
import { format } from "date-fns"
import {
  getProjectNames,
  createProjectName,
  updateProjectName,
  deleteProjectName,
  getBusinessUnitGroups,
} from "@/lib/actions/master-data"
import EditDialog from "./edit-dialog"

// Helper to format date for display
const formatDateForDisplay = (date: any): string => {
  if (!date) return "-"
  try {
    const d = new Date(date)
    return format(d, "MMM dd, yyyy")
  } catch {
    return "-"
  }
}

// Helper to format date for input (YYYY-MM-DD)
const formatDateForInput = (date: any): string => {
  if (!date) return ""
  try {
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  } catch {
    return ""
  }
}

interface ProjectNamesTabProps {
  selectedGroupId?: number | "all" | null
  userRole?: string
  spocBusinessGroups?: number[]
  userBusinessGroupId?: number | null
}

export default function ProjectNamesTab({ 
  selectedGroupId, 
  userRole, 
  spocBusinessGroups = [], 
  userBusinessGroupId 
}: ProjectNamesTabProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<any>(null)
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const isSuperAdmin = userRole === "superadmin"
  const isAdmin = userRole === "admin" || isSuperAdmin

  const loadData = async () => {
    setLoading(true)
    const [projectsResult, bgResult] = await Promise.all([
      getProjectNames(),
      getBusinessUnitGroups(),
    ])

    if (projectsResult.success && projectsResult.data) {
      setData(projectsResult.data)
    } else {
      setData([])
    }

    if (bgResult.success && bgResult.data) {
      setBusinessGroups(bgResult.data)
    } else {
      setBusinessGroups([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (name: string, estimatedReleaseDate?: string, businessUnitGroupId?: number | null) => {
    const result = await createProjectName(name, estimatedReleaseDate, businessUnitGroupId)
    if (result.success) {
      await loadData()
      return true
    }
    return false
  }

  const handleUpdate = async (id: number, name: string, estimatedReleaseDate?: string, businessUnitGroupId?: number | null) => {
    const result = await updateProjectName(id, name, estimatedReleaseDate, businessUnitGroupId)
    if (result.success) {
      await loadData()
      setEditItem(null)
      return true
    }
    return false
  }

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      const result = await deleteProjectName(id)
      if (result.success) {
        await loadData()
      }
    }
  }

  // Filter projects based on selected group and permissions
  const getFilteredProjects = () => {
    let filtered = data

    // For Super Admin with specific group selected, filter to that group
    if (isSuperAdmin && selectedGroupId && selectedGroupId !== "all") {
      filtered = filtered.filter((project) => project.business_unit_group_id === selectedGroupId)
      return filtered
    }

    // For SPOC (not admin), show only projects for their assigned groups
    if (!isAdmin && spocBusinessGroups.length > 0) {
      filtered = filtered.filter((project) => 
        project.business_unit_group_id && spocBusinessGroups.includes(project.business_unit_group_id)
      )
      return filtered
    }

    // For users with specific group assignment
    if (!isAdmin && userBusinessGroupId) {
      filtered = filtered.filter((project) => project.business_unit_group_id === userBusinessGroupId)
      return filtered
    }

    return filtered
  }

  // Filter business groups for dropdown based on permissions
  const getFilteredBusinessGroupsForDropdown = () => {
    if (isAdmin) return businessGroups
    if (spocBusinessGroups.length > 0) {
      return businessGroups.filter((bg) => spocBusinessGroups.includes(bg.id))
    }
    if (userBusinessGroupId) {
      return businessGroups.filter((bg) => bg.id === userBusinessGroupId)
    }
    return businessGroups
  }

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  const filteredProjects = getFilteredProjects()

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-poppins font-bold text-foreground text-lg">Project Names</h2>
          <p className="text-sm text-foreground-secondary mt-1">
            Manage project names and release planning
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditItem({ id: null, name: "", estimated_release_date: "", business_unit_group_id: "" })}
          className="bg-black hover:bg-gray-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      <div className="space-y-2">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
            <p className="text-foreground-secondary">
              {isSuperAdmin && selectedGroupId && selectedGroupId !== "all"
                ? "No projects found for the selected business group."
                : "No projects yet. Click \"Add Project\" to create one."}
            </p>
          </div>
        ) : (
          filteredProjects.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center p-3 border border-border rounded-lg hover:border-primary/50 dark:hover:border-primary transition-all"
            >
              <div className="flex items-center gap-4 flex-wrap flex-1">
                <h3 className="font-semibold text-foreground">{item.name}</h3>
                <span className="text-sm text-foreground-secondary">
                  <span className="text-foreground-secondary">Group:</span> <span className="font-medium">{item.business_group_name || "Not mapped"}</span>
                </span>
                {item.estimated_release_date && (
                  <span className="text-sm text-foreground-secondary">
                    <span className="text-foreground-secondary">Release:</span> <span className="font-medium">{formatDateForDisplay(item.estimated_release_date)}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEditItem({
                    ...item,
                    estimated_release_date: formatDateForInput(item.estimated_release_date)
                  })}
                  title="Edit Project"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(item.id)}
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {editItem && (
        <EditDialog
          title={editItem.id ? "Edit Project" : "Add Project"}
          fields={[
            { name: "name", label: "Project Name", type: "text", required: true },
            {
              name: "business_unit_group_id",
              label: "Business Group",
              type: "select",
              options: getFilteredBusinessGroupsForDropdown().map((bg) => ({ value: bg.id, label: bg.name })),
              required: true,
            },
            { name: "estimated_release_date", label: "Estimated Release Date", type: "date" },
          ]}
          initialData={editItem}
          onSave={(data) =>
            editItem.id
              ? handleUpdate(
                  editItem.id,
                  data.name,
                  data.estimated_release_date,
                  data.business_unit_group_id ? Number(data.business_unit_group_id) : null,
                )
              : handleCreate(
                  data.name,
                  data.estimated_release_date,
                  data.business_unit_group_id ? Number(data.business_unit_group_id) : null,
                )
          }
          onClose={() => setEditItem(null)}
        />
      )}
    </>
  )
}
