"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Eye, Edit, Download, Paperclip, FileDown, UserPlus, FileText, History, Search, Filter, RefreshCw, Loader2, AlertCircle } from "lucide-react"
import {
 getTickets,
 getTicketById,
 softDeleteTicket,
 updateTicketAssignee,
 updateTicketStatus,
 updateTicketProject,
 getUsers,
} from "@/lib/actions/tickets"
import { getMyTeamMembers } from "@/lib/actions/my-team"
import * as XLSX from "xlsx"
import AssigneeModal from "./assignee-modal"
import ProjectModal from "./project-modal"
import StatusChangeModal from "./status-change-modal"
import AttachmentsDialog from "./attachments-dialog"
import TicketsTableBody from "./tickets-table-body"
import { getStatusColor } from "@/lib/utils-colors"

export interface Ticket {
 id: number
 ticket_id: string
 ticket_number: number
 title: string
 description: string
 category_name: string | null
 subcategory_name: string | null
 ticket_type: "support" | "requirement"
 status: "open" | "on-hold" | "resolved" | "closed" | "returned" | "deleted"
 created_at: string
 created_by: number
 creator_name: string | null
 assignee_name: string | null
 assigned_to: number | null
 spoc_name: string | null
 spoc_user_id: number | null
  estimated_duration: number | null // Changed from string to number (hours)
 is_deleted: boolean
 attachment_count: number
 reference_count: number
 business_unit_group_id: number
 group_name: string | null
 target_business_group_name: string | null
 assignee_group_name: string | null
 initiator_group_name: string | null
 project_id: number | null
 project_name: string | null
 estimated_release_date: string | null
 closed_by_name: string | null
 closed_at: string | null
 hold_by_name: string | null
 hold_at: string | null
 // New fields for internal tickets and redirection
 is_internal: boolean
 redirected_from_business_unit_group_id: number | null
 redirected_from_spoc_user_id: number | null
 redirected_from_group_name: string | null
 redirected_from_spoc_name: string | null
 redirection_remarks: string | null
 redirected_at: string | null
}

interface User {
 id: number
 full_name: string
 email: string
}

interface TicketsTableProps {
 filters?: {
 status?: string
 assignee?: string
 type?: string
 search?: string
 dateFrom?: string
 dateTo?: string
 myTeam?: boolean
 userId?: number
 isInternal?: boolean
 targetBusinessGroup?: string
 initiator?: string
 initiatorGroup?: string
 project?: string
 [key: string]: any
 }
 onExportReady?: (exportFn: () => void) => void
 onTicketsChange?: (tickets: Ticket[]) => void
 onRefreshReady?: (refreshFn: () => void) => void
}

export default function TicketsTable({ filters, onExportReady, onTicketsChange, onRefreshReady }: TicketsTableProps) {
 const router = useRouter()
 const { data: session, status: sessionStatus } = useSession()
 const [tickets, setTickets] = useState<Ticket[]>([])
 const [users, setUsers] = useState<User[]>([])
 const [isLoading, setIsLoading] = useState(true)
 const [currentUser, setCurrentUser] = useState<any>(null)

 // Modal state for assignee selection
 const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false)
 const [selectedTicketForAssignment, setSelectedTicketForAssignment] = useState<Ticket | null>(null)

 // Modal state for project selection
 const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
 const [selectedTicketForProject, setSelectedTicketForProject] = useState<Ticket | null>(null)

 // Activity history is now shown in tooltip, no modal state needed

 // Modal state for status change
 const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false)
 const [selectedTicketForStatusChange, setSelectedTicketForStatusChange] = useState<Ticket | null>(null)
 const [selectedNewStatus, setSelectedNewStatus] = useState<string>("")
 const [changingStatus, setChangingStatus] = useState(false)

 // Attachments state
 const [attachmentsList, setAttachmentsList] = useState<any[]>([])
 const [loadingAttachments, setLoadingAttachments] = useState(false)
 
 // Attachments dialog state
 const [isAttachmentsDialogOpen, setIsAttachmentsDialogOpen] = useState(false)
 const [selectedTicketForAttachments, setSelectedTicketForAttachments] = useState<Ticket | null>(null)

 // Copy state
 const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null)

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1)
 const [pageSize, setPageSize] = useState(20)

 // Load current user from session or localStorage
 useEffect(() => {
 try {
 // Prioritize NextAuth session data (for SSO users)
 if (sessionStatus === "authenticated" && session?.user) {
 setCurrentUser({
 id: parseInt(session.user.id || "0"),
 email: session.user.email || "",
 full_name: session.user.name || "",
 role: session.user.role || "user",
 })
 } else {
 // Fallback to localStorage for email/password users
 const userData = localStorage.getItem("user")
 if (userData) {
 setCurrentUser(JSON.parse(userData))
 }
 }
 } catch (e) {
 console.error("Failed to parse user data:", e)
 }
 }, [sessionStatus, session])

 // Use refs to store latest values for interval callback (prevents stale closures)
 const filtersRef = useRef(filters)
 const currentUserRef = useRef(currentUser)
 
 // Update refs when values change
 useEffect(() => {
 filtersRef.current = filters
 currentUserRef.current = currentUser
 }, [filters, currentUser])

 // Memoize loadTickets to prevent unnecessary re-renders and ensure it uses latest filters
 const loadTicketsMemo = useCallback(async () => {
 const user = currentUserRef.current
 const currentFilters = filtersRef.current
 
 // Don't load tickets until current user is available
 if (!user) {
 setIsLoading(false)
 return
 }

 setIsLoading(true)
 const result = await getTickets(currentFilters)
 if (result.success && result.data) {
 let ticketsData = result.data as Ticket[]

 // Filter tickets based on user role and team settings
 if (user && user.role?.toLowerCase() !== "admin") {
 const userId = Number(user.id)

 // If "My Team" filter is active, include team members' tickets
 if (currentFilters?.myTeam) {
 // Fetch team members
 const teamResult = await getMyTeamMembers(userId)
 const teamMemberIds = teamResult.success && teamResult.data
 ? teamResult.data.map((m: any) => Number(m.id))
 : []

 // Include tickets where:
 // - User is SPOC, creator, or assignee
 // - OR team members are creator or assignee
 ticketsData = ticketsData.filter((ticket: Ticket) =>
 ticket.spoc_user_id === userId ||
 ticket.created_by === userId ||
 ticket.assigned_to === userId ||
 teamMemberIds.includes(ticket.created_by) ||
 teamMemberIds.includes(ticket.assigned_to || 0)
 )
 } else {
 // Default: show only user's own tickets
 ticketsData = ticketsData.filter((ticket: Ticket) =>
 ticket.spoc_user_id === userId ||
 ticket.created_by === userId ||
 ticket.assigned_to === userId
 )
 }
 }

 setTickets(ticketsData)
 if (onTicketsChange) {
 onTicketsChange(ticketsData)
 }
 } else {
 setTickets([])
 if (onTicketsChange) {
 onTicketsChange([])
 }
 }
 setIsLoading(false)
 }, [onTicketsChange])

 // Memoize filters key to prevent unnecessary re-fetches
 const filtersKey = useMemo(() => JSON.stringify(filters), [filters])

 // Reset to page 1 when filters change
 useEffect(() => {
 setCurrentPage(1)
 }, [filtersKey])

 // Load tickets when filters or user changes
 useEffect(() => {
 if (!currentUser) {
 setIsLoading(false)
 return
 }
 loadTicketsMemo()
 loadUsers()
 }, [filtersKey, currentUser?.id, loadTicketsMemo])

 // Expose refresh function to parent
 useEffect(() => {
 if (onRefreshReady) {
 onRefreshReady(() => loadTicketsMemo())
 }
 }, [onRefreshReady, loadTicketsMemo])

 // Expose export function to parent
 useEffect(() => {
 if (onExportReady) {
 onExportReady(handleExport)
 }
 }, [tickets])

 const canEditTicket = (ticket: Ticket) => {
 if (!currentUser) return false
 const isAdmin = currentUser.role?.toLowerCase() === "admin"
 const isInitiator = currentUser.id === ticket.created_by
 const isAssignee = currentUser.id === ticket.assigned_to
 const isSPOC = currentUser.id === ticket.spoc_user_id
 return isAdmin || isInitiator || isAssignee || isSPOC
 }


 const loadUsers = async () => {
 const result = await getUsers()
 if (result.success && result.data) {
 setUsers(result.data as User[])
 }
 }

 const handleDuplicate = async (ticketId: number) => {
 const result = await getTicketById(ticketId)
 if (result.success && result.data) {
 const ticket = result.data as any
 const params = new URLSearchParams({
 duplicate: "true",
 ticketType: ticket.ticket_type || "support",
 businessUnitGroupId: ticket.business_unit_group_id?.toString() || "",
 projectName: ticket.project_name || "",
 categoryId: ticket.category_id?.toString() || "",
 subcategoryId: ticket.subcategory_id?.toString() || "",
 title: ticket.title || "",
 description: ticket.description || "",
 estimatedDuration: ticket.estimated_duration || "",
 assigneeId: ticket.assigned_to?.toString() || "",
 productReleaseName: ticket.product_release_name || "",
 isInternal: ticket.is_internal ? "true" : "false",
 })
 router.push(`/tickets/create?${params.toString()}`)
 }
 }


 const handleCopyTicketId = async (ticketId: string, e: React.MouseEvent) => {
 e.stopPropagation()
 try {
 await navigator.clipboard.writeText(ticketId)
 setCopiedTicketId(ticketId)
 setTimeout(() => {
 setCopiedTicketId(null)
 }, 2000)
 } catch (err) {
 console.error("Failed to copy:", err)
 }
 }

 const handleAssigneeChange = async (ticketId: number, newAssigneeId: number | null) => {
 const result = await updateTicketAssignee(ticketId, newAssigneeId || 0)
 if (result.success) {
 loadTicketsMemo()
 } else {
 alert("Failed to update assignee")
 }
 }

 const openAssigneeModal = (ticket: Ticket) => {
 setSelectedTicketForAssignment(ticket)
 setIsAssigneeModalOpen(true)
 }

 const handleAssigneeSelect = (userId: number | null) => {
 if (selectedTicketForAssignment) {
 handleAssigneeChange(selectedTicketForAssignment.id, userId)
 }
 }

 const openProjectModal = (ticket: Ticket) => {
 setSelectedTicketForProject(ticket)
 setIsProjectModalOpen(true)
 }

 const handleProjectSelect = async (projectId: number | null) => {
 if (selectedTicketForProject) {
 const result = await updateTicketProject(selectedTicketForProject.id, projectId)
 if (result.success) {
 loadTicketsMemo()
 } else {
 alert("Failed to update project")
 }
 }
 }

 const canEditProject = (ticket: Ticket) => {
 // Only allow project selection for requirement tickets, not support tickets
 if (ticket.ticket_type !== "requirement") return false
 if (!currentUser) return false
 const userId = Number(currentUser.id)
 return (
 userId === ticket.spoc_user_id ||
 currentUser.role?.toLowerCase() === "admin"
 )
 }

 const canEditAssignee = (ticket: Ticket) => {
 if (!currentUser) return false
 const userId = Number(currentUser.id) // Ensure ID is a number for comparison
 return (
 userId === ticket.spoc_user_id ||
 currentUser.role?.toLowerCase() === "admin"
 )
 }

  const canEditStatus = (ticket: Ticket) => {
    if (!currentUser) return false
    if (ticket.is_deleted) return false // Soft deleted tickets cannot have status changed
 const userId = Number(currentUser.id)
 const isAdmin = currentUser.role?.toLowerCase() === "admin"
 const isInitiator = userId === ticket.created_by
 const isAssignee = userId === ticket.assigned_to
 const isSPOC = userId === ticket.spoc_user_id
 
 return isAdmin || isInitiator || isAssignee || isSPOC
 }

 // Get available status options based on user role and current status
 const getAvailableStatusOptions = (ticket: Ticket): string[] => {
 if (!currentUser) return []
 if (ticket.is_deleted || ticket.status === "deleted") return []
 
 const userId = Number(currentUser.id)
 const isAdmin = currentUser.role?.toLowerCase() === "admin"
 const isInitiator = userId === ticket.created_by
 const isAssignee = userId === ticket.assigned_to
 const isSPOC = userId === ticket.spoc_user_id
 const currentStatus = ticket.status

 const options: string[] = []

 if (isAdmin) {
 // Admins can set any status
 return ["open", "on-hold", "resolved", "closed", "returned", "deleted"]
 }

 // SPOC: Can change to On-hold, Resolved, or Open (if currently On-hold/Resolved)
 if (isSPOC) {
 options.push("on-hold", "resolved")
 if (currentStatus === "on-hold" || currentStatus === "resolved") {
 options.push("open")
 }
 }

 // Assignee: Can change to Resolved or Open (if currently Resolved)
 if (isAssignee) {
 options.push("resolved")
 if (currentStatus === "resolved") {
 options.push("open")
 }
 }

 // Initiator: Can change to Closed, Delete, or Open (if currently Resolved)
 if (isInitiator) {
 options.push("closed", "deleted")
 if (currentStatus === "resolved") {
 options.push("open")
 }
 }

 // Remove duplicates and ensure current status is included
 const uniqueOptions = Array.from(new Set(options))
 if (currentStatus && !uniqueOptions.includes(currentStatus)) {
 uniqueOptions.unshift(currentStatus)
 }

 return uniqueOptions
 }

 const openStatusChangeModal = (ticket: Ticket, newStatus: string) => {
 setSelectedTicketForStatusChange(ticket)
 setSelectedNewStatus(newStatus)
 setIsStatusChangeModalOpen(true)
 }

 const handleStatusChangeConfirm = async (reason: string, remarks: string) => {
 if (!selectedTicketForStatusChange) return

 setChangingStatus(true)
 const result = await updateTicketStatus(
 selectedTicketForStatusChange.id,
 selectedNewStatus,
 reason,
 remarks
 )
 setChangingStatus(false)

 if (result.success) {
 setIsStatusChangeModalOpen(false)
 setSelectedTicketForStatusChange(null)
 setSelectedNewStatus("")
 // Reload tickets to get updated status
 loadTicketsMemo()
 } else {
 alert("Failed to update status: " + (result.error || "Unknown error"))
 }
 }

 const handleDelete = async (ticket: Ticket) => {
 // Open status change modal for delete
 openStatusChangeModal(ticket, "deleted")
 }

 const openAttachmentsDialog = async (ticket: Ticket) => {
 setSelectedTicketForAttachments(ticket)
 setLoadingAttachments(true)
 
 // Load attachments if not already loaded
 const result = await getTicketById(ticket.id)
 if (result.success && result.data?.attachments) {
 setAttachmentsList(result.data.attachments)
 } else {
 setAttachmentsList([])
 }
 
 setLoadingAttachments(false)
 setIsAttachmentsDialogOpen(true)
 }

 // Helper function to get status color with dark mode support
 const getStatusColorWithDark = (status: string) => {
 const baseColor = getStatusColor(status)
 // Add dark mode variants for better visibility
 const darkModeMap: Record<string, string> = {
 "open": "dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
 "on-hold": "dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
 "resolved": "dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
 "closed": "dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-900",
 "returned": "dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900",
 "deleted": "dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
 }
 const normalizedStatus = status.toLowerCase().replace(/\s+/g, "-")
 return `${baseColor} ${darkModeMap[normalizedStatus] || "dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-900"}`
 }

 const handleExport = () => {
 // Prepare data for export
 const exportData = tickets.map((ticket) => ({
 "#": ticket.ticket_number,
 "Initiator": ticket.creator_name || "Unknown",
 "Initiator Group": ticket.initiator_group_name || "No Group",
 "Date": format(new Date(ticket.created_at), "MMM dd, yyyy"),
 "Time": format(new Date(ticket.created_at), "hh:mm a"),
 "Type": ticket.ticket_type,
 "Ticket ID": ticket.ticket_id,
 "Title": ticket.ticket_type === "requirement" ? (ticket.title || "Untitled") : "-",
 "Category": ticket.ticket_type === "support" ? (ticket.category_name || "N/A") : "-",
 "Subcategory": ticket.ticket_type === "support" ? (ticket.subcategory_name || "-") : "-",
 "Project": ticket.project_name || "-",
 "Release Date": ticket.estimated_release_date
 ? format(new Date(ticket.estimated_release_date), "MMM dd, yyyy")
 : "-",
 "Description": ticket.description || "",
 "Assignee": ticket.assignee_name || "Unassigned",
 "SPOC": ticket.spoc_name || "-",
 "Status": ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1),
 "Closed By": ticket.closed_by_name || "-",
 "Closed At": ticket.closed_at ? format(new Date(ticket.closed_at), "MMM dd, yyyy hh:mm a") : "-",
 "Hold By": ticket.hold_by_name || "-",
 "Hold At": ticket.hold_at ? format(new Date(ticket.hold_at), "MMM dd, yyyy hh:mm a") : "-",
 }))

 // Create workbook and worksheet
 const wb = XLSX.utils.book_new()
 const ws = XLSX.utils.json_to_sheet(exportData)

 // Set column widths
 ws["!cols"] = [
 { wch: 5 }, // #
 { wch: 20 }, // Initiator
 { wch: 15 }, // Group
 { wch: 15 }, // Date
 { wch: 10 }, // Time
 { wch: 12 }, // Type
 { wch: 15 }, // Ticket ID
 { wch: 30 }, // Title
 { wch: 20 }, // Category
 { wch: 20 }, // Subcategory
 { wch: 20 }, // Project
 { wch: 15 }, // Release Date
 { wch: 40 }, // Description
 { wch: 20 }, // Assignee
 { wch: 15 }, // SPOC
 { wch: 12 }, // Status
 { wch: 20 }, // Closed By
 { wch: 20 }, // Closed At
 { wch: 20 }, // Hold By
 { wch: 20 }, // Hold At
 ]

 XLSX.utils.book_append_sheet(wb, ws, "Tickets")

 // Generate filename with timestamp
 const filename = `tickets_${format(new Date(), "yyyy-MM-dd_HHmmss")}.xlsx`

 // Download file
 XLSX.writeFile(wb, filename)
 }

 if (isLoading) {
 return (
 <div className="bg-white dark:bg-slate-800 border border-border rounded-xl overflow-hidden">
 <div className="p-6 text-center text-foreground-secondary">Loading tickets...</div>
 </div>
 )
 }

 if (tickets.length === 0) {
 return (
 <div className="bg-white dark:bg-slate-800 border border-border rounded-xl overflow-hidden">
 <div className="p-6 text-center text-foreground-secondary">
 No tickets found. Try adjusting your filters or create a new ticket.
 </div>
 </div>
 )
 }

 // Pagination calculations
 const totalTickets = tickets.length
 const totalPages = Math.max(1, Math.ceil(totalTickets / pageSize))
 const safeCurrentPage = Math.min(currentPage, totalPages)
 const startIndex = (safeCurrentPage - 1) * pageSize
 const endIndex = Math.min(startIndex + pageSize, totalTickets)
 const paginatedTickets = tickets.slice(startIndex, endIndex)

 return (
 <div className="bg-white dark:bg-gray-800 border border-border rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
 <TicketsTableBody
  tickets={paginatedTickets}
  filters={filters}
  copiedTicketId={copiedTicketId}
  onCopyTicketId={handleCopyTicketId}
  canEditAssignee={canEditAssignee}
  canEditStatus={canEditStatus}
  canEditProject={canEditProject}
  onOpenAssigneeModal={openAssigneeModal}
  onOpenProjectModal={openProjectModal}
  onOpenStatusChangeModal={openStatusChangeModal}
  onOpenAttachmentsDialog={openAttachmentsDialog}
  getStatusColorWithDark={getStatusColorWithDark}
  getAvailableStatusOptions={getAvailableStatusOptions}
  startIndex={startIndex}
 />

 <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 shrink-0">
 <div className="flex items-center gap-2">
  <span className="text-xs text-slate-600 dark:text-slate-400">Rows per page:</span>
  <select
   value={pageSize}
   onChange={(e) => {
    setPageSize(Number(e.target.value))
    setCurrentPage(1)
   }}
   className="text-xs border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
  >
   {[10, 20, 50, 100].map((size) => (
    <option key={size} value={size}>{size}</option>
   ))}
  </select>
 </div>

 <p className="text-xs text-slate-600 dark:text-slate-400">
  {startIndex + 1}–{endIndex} of {totalTickets}
 </p>

 <div className="flex items-center gap-1">
  <button
   onClick={() => setCurrentPage(1)}
   disabled={safeCurrentPage <= 1}
   className="px-1.5 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
   title="First page"
  >
   ««
  </button>
  <button
   onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
   disabled={safeCurrentPage <= 1}
   className="px-1.5 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
   title="Previous page"
  >
   ‹
  </button>
  <span className="text-xs text-slate-600 dark:text-slate-400 px-2">
   Page {safeCurrentPage} of {totalPages}
  </span>
  <button
   onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
   disabled={safeCurrentPage >= totalPages}
   className="px-1.5 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
   title="Next page"
  >
   ›
  </button>
  <button
   onClick={() => setCurrentPage(totalPages)}
   disabled={safeCurrentPage >= totalPages}
   className="px-1.5 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
   title="Last page"
  >
   »»
  </button>
 </div>
 </div>

 {/* Assignee Modal */}
 <AssigneeModal
 isOpen={isAssigneeModalOpen}
 onClose={() => {
 setIsAssigneeModalOpen(false)
 setSelectedTicketForAssignment(null)
 }}
 onSelect={handleAssigneeSelect}
 currentAssigneeId={selectedTicketForAssignment?.assigned_to || null}
 ticketTitle={selectedTicketForAssignment?.title || ""}
 ticketBusinessUnitGroupId={selectedTicketForAssignment?.business_unit_group_id || null}
 />

  {/* Project Modal */}
  <ProjectModal
    isOpen={isProjectModalOpen}
    onClose={() => {
      setIsProjectModalOpen(false)
      setSelectedTicketForProject(null)
    }}
    onSelect={handleProjectSelect}
    currentProjectId={selectedTicketForProject?.project_id || null}
    ticketTitle={selectedTicketForProject?.title || ""}
    ticketBusinessUnitGroupId={selectedTicketForProject?.business_unit_group_id || null}
  />

 {/* Activity History is now shown in tooltip, no modal needed */}

 {/* Status Change Modal */}
 <StatusChangeModal
 isOpen={isStatusChangeModalOpen}
 onClose={() => {
 setIsStatusChangeModalOpen(false)
 setSelectedTicketForStatusChange(null)
 setSelectedNewStatus("")
 }}
 onConfirm={handleStatusChangeConfirm}
 oldStatus={selectedTicketForStatusChange?.status || ""}
 newStatus={selectedNewStatus}
 ticketNumber={selectedTicketForStatusChange?.ticket_number || 0}
 loading={changingStatus}
 />

 {/* Attachments Dialog */}
 <AttachmentsDialog
 isOpen={isAttachmentsDialogOpen}
 onClose={() => {
 setIsAttachmentsDialogOpen(false)
 setSelectedTicketForAttachments(null)
 }}
 attachments={attachmentsList}
 ticketNumber={selectedTicketForAttachments?.ticket_number || 0}
 />
 </div>
 )
}
