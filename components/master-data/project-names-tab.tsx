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

export default function ProjectNamesTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<any>(null)
  const [businessGroups, setBusinessGroups] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    const [projectsResult, bgResult] = await Promise.all([
      getProjectNames(),
      getBusinessUnitGroups(),
    ])

    if (projectsResult.success && projectsResult.data) {
      setData(projectsResult.data)
    } else {
      // If projects fail to load, just show empty state
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

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-poppins font-bold text-foreground">Project Names</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setEditItem({ id: null, name: "", estimated_release_date: "" })}
            className="bg-black hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface/50 dark:bg-slate-700/50">
              <th className="text-left py-3 px-4 font-semibold text-foreground">Project Name</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Group</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Estimated Release Date</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? (
              data.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-surface dark:hover:bg-slate-700">
                  <td className="py-3 px-4">{item.name}</td>
                  <td className="py-3 px-4 text-foreground-secondary">
                    {item.business_group_name || "Not mapped"}
                  </td>
                  <td className="py-3 px-4 text-foreground-secondary">
                    {formatDateForDisplay(item.estimated_release_date)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditItem({
                        ...item,
                        estimated_release_date: formatDateForInput(item.estimated_release_date)
                      })}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-foreground-secondary">
                  No projects found. Click "Add New" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editItem && (
          <EditDialog
            title={editItem.id ? "Edit Project" : "Add Project"}
            fields={[
              { name: "name", label: "Project Name", type: "text", required: true },
              {
                name: "business_unit_group_id",
                label: "Group",
                type: "select",
                options: businessGroups.map((bg) => ({ value: bg.id, label: bg.name })),
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
    </div>
  )
}
