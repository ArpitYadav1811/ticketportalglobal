"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { 
  Save, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Ticket,
  BarChart3,
  Settings,
  Building2,
  Check,
  X,
  Shield,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  ArrowRightLeft,
  CircleDot,
  MessageSquare,
  Paperclip,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRolePermissions, updateRolePermissions, getDefaultPermissions } from "@/lib/actions/permissions"
import { getUserRoles } from "@/lib/actions/users"

export default function RolePermissionsManager() {
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([])
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [permissions, setPermissions] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tickets: true,
    analytics: false,
    features: false,
    businessGroups: false
  })

  useEffect(() => {
    loadRoles()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      loadPermissions()
    }
  }, [selectedRole])

  const loadRoles = async () => {
    const result = await getUserRoles(true)
    if (result.success && result.data) {
      setRoles(result.data)
      if (result.data.length > 0 && !selectedRole) {
        setSelectedRole(result.data[0].value)
      }
    }
  }

  const loadPermissions = async () => {
    if (!selectedRole) return
    setLoading(true)
    const result = await getRolePermissions(selectedRole)
    if (result.success) {
      if (Object.keys(result.data).length === 0) {
        const defaults = await getDefaultPermissions(selectedRole)
        setPermissions(defaults)
      } else {
        setPermissions(result.data)
      }
    } else {
      toast.error("Failed to load permissions")
    }
    setLoading(false)
  }

  const handlePermissionChange = (key: string, value: any) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setSaving(true)
    const result = await updateRolePermissions(selectedRole, permissions)
    if (result.success) {
      toast.success("Permissions saved successfully")
    } else {
      toast.error(result.error || "Failed to save permissions")
    }
    setSaving(false)
  }

  const handleReset = async () => {
    if (!selectedRole) return
    const defaults = await getDefaultPermissions(selectedRole)
    setPermissions(defaults)
    toast.info("Reset to default permissions")
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getBooleanValue = (key: string): boolean => {
    const value = permissions[key]
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
    return false
  }

  const getStringValue = (key: string, defaultValue: string = ""): string => {
    const value = permissions[key]
    if (typeof value === 'string') return value
    return defaultValue
  }

  const ticketScopeOptions = [
    { value: "own", label: "Own" },
    { value: "own_group", label: "Own Group" },
    { value: "all_groups", label: "All Groups" },
    { value: "all", label: "All" }
  ]

  const analyticsScopeOptions = [
    { value: "own_group", label: "Own Group" },
    { value: "spoc_groups", label: "SPOC Groups" },
    { value: "initiator_groups", label: "Initiator Groups" },
    { value: "spoc_or_initiator", label: "SPOC or Initiator" },
    { value: "team_member_groups", label: "Team Member Groups" },
    { value: "team_spoc_groups", label: "Team SPOC Groups" },
    { value: "combined", label: "Combined" },
    { value: "selected_groups", label: "Selected Groups" },
    { value: "all_groups", label: "All Groups" }
  ]

  const statusOptions = ["open", "on-hold", "resolved", "closed", "deleted"]

  return (
    <div className="space-y-3">
      {/* Header with Role Selector and Actions */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Shield className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                disabled={loading}
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-6">
            <Button 
              onClick={handleSave} 
              disabled={saving || loading} 
              size="sm"
              className="bg-black hover:bg-gray-800 text-white h-8 px-3"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button 
              onClick={handleReset} 
              variant="outline" 
              disabled={loading}
              size="sm"
              className="h-8 px-3"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm">Loading permissions...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Ticket Permissions */}
          <PermissionSection
            title="Ticket Permissions"
            icon={<Ticket className="w-4 h-4" />}
            isExpanded={expandedSections.tickets}
            onToggle={() => toggleSection("tickets")}
          >
            <div className="space-y-3">
              {/* View Scope */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-2.5">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">View Scope</label>
                <select
                  value={getStringValue("tickets.view_scope", "own")}
                  onChange={(e) => handlePermissionChange("tickets.view_scope", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ticketScopeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Permission Groups */}
              <div className="grid grid-cols-3 gap-2">
                <PermissionGroup title="View" icon={<Eye className="w-3.5 h-3.5" />}>
                  <CompactCheckbox label="Own Created" checked={getBooleanValue("tickets.view_own_created")} onChange={(v) => handlePermissionChange("tickets.view_own_created", v)} />
                  <CompactCheckbox label="Own Assigned" checked={getBooleanValue("tickets.view_own_assigned")} onChange={(v) => handlePermissionChange("tickets.view_own_assigned", v)} />
                  <CompactCheckbox label="Group Tickets" checked={getBooleanValue("tickets.view_group_tickets")} onChange={(v) => handlePermissionChange("tickets.view_group_tickets", v)} />
                  <CompactCheckbox label="All Tickets" checked={getBooleanValue("tickets.view_all_tickets")} onChange={(v) => handlePermissionChange("tickets.view_all_tickets", v)} />
                </PermissionGroup>

                <PermissionGroup title="Edit" icon={<Edit className="w-3.5 h-3.5" />}>
                  <CompactCheckbox label="Own" checked={getBooleanValue("tickets.edit_own")} onChange={(v) => handlePermissionChange("tickets.edit_own", v)} />
                  <CompactCheckbox label="Group" checked={getBooleanValue("tickets.edit_group")} onChange={(v) => handlePermissionChange("tickets.edit_group", v)} />
                  <CompactCheckbox label="All" checked={getBooleanValue("tickets.edit_all")} onChange={(v) => handlePermissionChange("tickets.edit_all", v)} />
                  <CompactCheckbox label="Title" checked={getBooleanValue("tickets.edit_title")} onChange={(v) => handlePermissionChange("tickets.edit_title", v)} />
                  <CompactCheckbox label="Description" checked={getBooleanValue("tickets.edit_description")} onChange={(v) => handlePermissionChange("tickets.edit_description", v)} />
                  <CompactCheckbox label="Category" checked={getBooleanValue("tickets.edit_category")} onChange={(v) => handlePermissionChange("tickets.edit_category", v)} />
                  <CompactCheckbox label="Project" checked={getBooleanValue("tickets.edit_project")} onChange={(v) => handlePermissionChange("tickets.edit_project", v)} />
                </PermissionGroup>

                <PermissionGroup title="Delete" icon={<Trash2 className="w-3.5 h-3.5" />}>
                  <CompactCheckbox label="Own" checked={getBooleanValue("tickets.delete_own")} onChange={(v) => handlePermissionChange("tickets.delete_own", v)} />
                  <CompactCheckbox label="Group" checked={getBooleanValue("tickets.delete_group")} onChange={(v) => handlePermissionChange("tickets.delete_group", v)} />
                  <CompactCheckbox label="All" checked={getBooleanValue("tickets.delete_all")} onChange={(v) => handlePermissionChange("tickets.delete_all", v)} />
                  <CompactCheckbox label="Soft Delete" checked={getBooleanValue("tickets.soft_delete")} onChange={(v) => handlePermissionChange("tickets.soft_delete", v)} />
                  <CompactCheckbox label="Hard Delete" checked={getBooleanValue("tickets.hard_delete")} onChange={(v) => handlePermissionChange("tickets.hard_delete", v)} />
                </PermissionGroup>
              </div>

              {/* Assignment & Redirection */}
              <div className="grid grid-cols-2 gap-2">
                <PermissionGroup title="Assignment" icon={<UserPlus className="w-3.5 h-3.5" />}>
                  <CompactCheckbox label="Assign Tickets" checked={getBooleanValue("tickets.assign_tickets")} onChange={(v) => handlePermissionChange("tickets.assign_tickets", v)} />
                  <CompactCheckbox label="To Own Group" checked={getBooleanValue("tickets.assign_to_own_group")} onChange={(v) => handlePermissionChange("tickets.assign_to_own_group", v)} />
                  <CompactCheckbox label="To Any Group" checked={getBooleanValue("tickets.assign_to_any_group")} onChange={(v) => handlePermissionChange("tickets.assign_to_any_group", v)} />
                  <CompactCheckbox label="To Self" checked={getBooleanValue("tickets.assign_to_self")} onChange={(v) => handlePermissionChange("tickets.assign_to_self", v)} />
                  <CompactCheckbox label="Reassign" checked={getBooleanValue("tickets.reassign_tickets")} onChange={(v) => handlePermissionChange("tickets.reassign_tickets", v)} />
                  <CompactCheckbox label="Unassign" checked={getBooleanValue("tickets.unassign_tickets")} onChange={(v) => handlePermissionChange("tickets.unassign_tickets", v)} />
                </PermissionGroup>

                <PermissionGroup title="Redirection" icon={<ArrowRightLeft className="w-3.5 h-3.5" />}>
                  <CompactCheckbox label="Redirect Tickets" checked={getBooleanValue("tickets.redirect_tickets")} onChange={(v) => handlePermissionChange("tickets.redirect_tickets", v)} />
                  <CompactCheckbox label="To Own Group" checked={getBooleanValue("tickets.redirect_to_own_group")} onChange={(v) => handlePermissionChange("tickets.redirect_to_own_group", v)} />
                  <CompactCheckbox label="To Any Group" checked={getBooleanValue("tickets.redirect_to_any_group")} onChange={(v) => handlePermissionChange("tickets.redirect_to_any_group", v)} />
                  <CompactCheckbox label="From Own Group" checked={getBooleanValue("tickets.redirect_from_own_group")} onChange={(v) => handlePermissionChange("tickets.redirect_from_own_group", v)} />
                  <CompactCheckbox label="From Any Group" checked={getBooleanValue("tickets.redirect_from_any_group")} onChange={(v) => handlePermissionChange("tickets.redirect_from_any_group", v)} />
                </PermissionGroup>
              </div>

              {/* Status Changes */}
              <PermissionGroup title="Status Changes" icon={<CircleDot className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-3 gap-1.5">
                  {statusOptions.map(status => (
                    <CompactCheckbox
                      key={status}
                      label={status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                      checked={getBooleanValue(`tickets.change_to_${status.replace('-', '_')}`)}
                      onChange={(v) => handlePermissionChange(`tickets.change_to_${status.replace('-', '_')}`, v)}
                    />
                  ))}
                  <CompactCheckbox label="Reopen" checked={getBooleanValue("tickets.reopen_tickets")} onChange={(v) => handlePermissionChange("tickets.reopen_tickets", v)} />
                </div>
              </PermissionGroup>

              {/* Comments & Attachments */}
              <div className="grid grid-cols-2 gap-2">
                <PermissionGroup title="Comments" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                  <CompactCheckbox label="Add Comments" checked={getBooleanValue("tickets.add_comments")} onChange={(v) => handlePermissionChange("tickets.add_comments", v)} />
                  <CompactCheckbox label="Edit Own" checked={getBooleanValue("tickets.edit_comments")} onChange={(v) => handlePermissionChange("tickets.edit_comments", v)} />
                  <CompactCheckbox label="Delete Own" checked={getBooleanValue("tickets.delete_comments")} onChange={(v) => handlePermissionChange("tickets.delete_comments", v)} />
                  <CompactCheckbox label="Delete Any" checked={getBooleanValue("tickets.delete_any_comment")} onChange={(v) => handlePermissionChange("tickets.delete_any_comment", v)} />
                </PermissionGroup>

                <PermissionGroup title="Attachments" icon={<Paperclip className="w-3.5 h-3.5" />}>
                  <CompactCheckbox label="Upload" checked={getBooleanValue("tickets.upload_attachments")} onChange={(v) => handlePermissionChange("tickets.upload_attachments", v)} />
                  <CompactCheckbox label="Delete Own" checked={getBooleanValue("tickets.delete_attachments")} onChange={(v) => handlePermissionChange("tickets.delete_attachments", v)} />
                  <CompactCheckbox label="Delete Any" checked={getBooleanValue("tickets.delete_any_attachment")} onChange={(v) => handlePermissionChange("tickets.delete_any_attachment", v)} />
                </PermissionGroup>
              </div>

              {/* Other Ticket Permissions */}
              <PermissionGroup title="Other" icon={<FileText className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-3 gap-1.5">
                  <CompactCheckbox label="Create Tickets" checked={getBooleanValue("tickets.create_tickets")} onChange={(v) => handlePermissionChange("tickets.create_tickets", v)} />
                  <CompactCheckbox label="Create Internal" checked={getBooleanValue("tickets.create_internal_tickets")} onChange={(v) => handlePermissionChange("tickets.create_internal_tickets", v)} />
                  <CompactCheckbox label="Create Customer" checked={getBooleanValue("tickets.create_customer_tickets")} onChange={(v) => handlePermissionChange("tickets.create_customer_tickets", v)} />
                  <CompactCheckbox label="View Audit Log" checked={getBooleanValue("tickets.view_audit_log")} onChange={(v) => handlePermissionChange("tickets.view_audit_log", v)} />
                  <CompactCheckbox label="Export Tickets" checked={getBooleanValue("tickets.export_tickets")} onChange={(v) => handlePermissionChange("tickets.export_tickets", v)} />
                </div>
              </PermissionGroup>
            </div>
          </PermissionSection>

          {/* Analytics Permissions */}
          <PermissionSection
            title="Analytics Permissions"
            icon={<BarChart3 className="w-4 h-4" />}
            isExpanded={expandedSections.analytics}
            onToggle={() => toggleSection("analytics")}
          >
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-2.5">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">View Scope</label>
                <select
                  value={getStringValue("analytics.view_scope", "own_group")}
                  onChange={(e) => handlePermissionChange("analytics.view_scope", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {analyticsScopeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CompactCheckbox label="Own Group" checked={getBooleanValue("analytics.view_own_group")} onChange={(v) => handlePermissionChange("analytics.view_own_group", v)} />
                <CompactCheckbox label="SPOC Groups" checked={getBooleanValue("analytics.view_spoc_groups")} onChange={(v) => handlePermissionChange("analytics.view_spoc_groups", v)} />
                <CompactCheckbox label="Initiator Groups" checked={getBooleanValue("analytics.view_initiator_groups")} onChange={(v) => handlePermissionChange("analytics.view_initiator_groups", v)} />
                <CompactCheckbox label="SPOC or Initiator" checked={getBooleanValue("analytics.view_spoc_or_initiator")} onChange={(v) => handlePermissionChange("analytics.view_spoc_or_initiator", v)} />
                <CompactCheckbox label="Team Member Groups" checked={getBooleanValue("analytics.view_team_member_groups")} onChange={(v) => handlePermissionChange("analytics.view_team_member_groups", v)} />
                <CompactCheckbox label="Team SPOC Groups" checked={getBooleanValue("analytics.view_team_spoc_groups")} onChange={(v) => handlePermissionChange("analytics.view_team_spoc_groups", v)} />
                <CompactCheckbox label="Combined" checked={getBooleanValue("analytics.view_combined")} onChange={(v) => handlePermissionChange("analytics.view_combined", v)} />
                <CompactCheckbox label="All Groups" checked={getBooleanValue("analytics.view_all_groups")} onChange={(v) => handlePermissionChange("analytics.view_all_groups", v)} />
                <CompactCheckbox label="Export Data" checked={getBooleanValue("analytics.export_data")} onChange={(v) => handlePermissionChange("analytics.export_data", v)} />
                <CompactCheckbox label="Group Selector" checked={getBooleanValue("analytics.group_selector_enabled")} onChange={(v) => handlePermissionChange("analytics.group_selector_enabled", v)} />
              </div>
            </div>
          </PermissionSection>

          {/* Feature Access */}
          <PermissionSection
            title="Feature Access"
            icon={<Settings className="w-4 h-4" />}
            isExpanded={expandedSections.features}
            onToggle={() => toggleSection("features")}
          >
            <div className="grid grid-cols-4 gap-2">
              <CompactCheckbox label="Admin Dashboard" checked={getBooleanValue("features.admin_dashboard")} onChange={(v) => handlePermissionChange("features.admin_dashboard", v)} />
              <CompactCheckbox label="User Management" checked={getBooleanValue("features.user_management")} onChange={(v) => handlePermissionChange("features.user_management", v)} />
              <CompactCheckbox label="Master Data" checked={getBooleanValue("features.master_data")} onChange={(v) => handlePermissionChange("features.master_data", v)} />
              <CompactCheckbox label="Teams" checked={getBooleanValue("features.teams")} onChange={(v) => handlePermissionChange("features.teams", v)} />
              <CompactCheckbox label="Analytics" checked={getBooleanValue("features.analytics")} onChange={(v) => handlePermissionChange("features.analytics", v)} />
              <CompactCheckbox label="Settings" checked={getBooleanValue("features.settings")} onChange={(v) => handlePermissionChange("features.settings", v)} />
              <CompactCheckbox label="Audit Logs" checked={getBooleanValue("features.audit_logs")} onChange={(v) => handlePermissionChange("features.audit_logs", v)} />
            </div>
          </PermissionSection>

          {/* Business Groups */}
          <PermissionSection
            title="Business Group Permissions"
            icon={<Building2 className="w-4 h-4" />}
            isExpanded={expandedSections.businessGroups}
            onToggle={() => toggleSection("businessGroups")}
          >
            <div className="grid grid-cols-2 gap-2">
              <CompactCheckbox label="View Own" checked={getBooleanValue("business_groups.view_own")} onChange={(v) => handlePermissionChange("business_groups.view_own", v)} />
              <CompactCheckbox label="View All" checked={getBooleanValue("business_groups.view_all")} onChange={(v) => handlePermissionChange("business_groups.view_all", v)} />
              <CompactCheckbox label="Manage Own" checked={getBooleanValue("business_groups.manage_own")} onChange={(v) => handlePermissionChange("business_groups.manage_own", v)} />
              <CompactCheckbox label="Manage All" checked={getBooleanValue("business_groups.manage_all")} onChange={(v) => handlePermissionChange("business_groups.manage_all", v)} />
            </div>
          </PermissionSection>
        </div>
      )}
    </div>
  )
}

function PermissionSection({ 
  title, 
  icon, 
  isExpanded, 
  onToggle, 
  children 
}: { 
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode 
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="text-primary">{icon}</div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/50">
          {children}
        </div>
      )}
    </div>
  )
}

function PermissionGroup({ 
  title, 
  icon, 
  children 
}: { 
  title: string
  icon: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2">
      <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-700">
        <div className="text-primary">{icon}</div>
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function CompactCheckbox({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string
  checked: boolean
  onChange: (val: boolean) => void 
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-1.5 py-1 transition-colors">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`
          w-4 h-4 rounded border-2 flex items-center justify-center transition-all
          ${checked 
            ? "bg-primary border-primary text-white" 
            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-primary/50"
          }
        `}>
          {checked && <Check className="w-3 h-3" />}
        </div>
      </div>
      <span className="text-xs text-foreground font-medium">{label}</span>
    </label>
  )
}
