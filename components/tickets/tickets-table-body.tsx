"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Edit, Paperclip, UserPlus, History, Copy, Check } from "lucide-react"
import { FolderKanban } from "lucide-react"
import TicketHistoryTooltip from "./ticket-history-tooltip"
import type { Ticket } from "./tickets-table"

interface TicketsTableBodyProps {
 tickets: Ticket[]
 filters?: {
  isInternal?: boolean
  [key: string]: any
 }
 copiedTicketId: string | null
 onCopyTicketId: (ticketId: string, e: React.MouseEvent) => void
 canEditAssignee: (ticket: Ticket) => boolean
 canEditStatus: (ticket: Ticket) => boolean
 canEditProject: (ticket: Ticket) => boolean
 onOpenAssigneeModal: (ticket: Ticket) => void
 onOpenProjectModal: (ticket: Ticket) => void
 onOpenStatusChangeModal: (ticket: Ticket, newStatus: string) => void
 onOpenAttachmentsDialog: (ticket: Ticket) => void | Promise<void>
 getStatusColorWithDark: (status: string) => string
 getAvailableStatusOptions: (ticket: Ticket) => string[]
}

export default function TicketsTableBody({
 tickets,
 filters,
 copiedTicketId,
 onCopyTicketId,
 canEditAssignee,
 canEditStatus,
 canEditProject,
 onOpenAssigneeModal,
 onOpenProjectModal,
 onOpenStatusChangeModal,
 onOpenAttachmentsDialog,
 getStatusColorWithDark,
 getAvailableStatusOptions,
}: TicketsTableBodyProps) {
 const router = useRouter()

 return (
  <div className="overflow-x-auto">
   <table className="w-full">
    <thead className="bg-surface dark:bg-slate-700 border-b border-border">
     <tr>
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       S.No
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Initiator
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Date
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Type
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Title / Category
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap max-w-xs">
       Description
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       SPOC
      </th>
      {filters?.isInternal && (
       <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
        Group
       </th>
      )}
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Assignee
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Status
      </th>
      <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground whitespace-nowrap">
       Project
      </th>
      <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground whitespace-nowrap w-24">
       Actions
      </th>
     </tr>
    </thead>
    <tbody className="divide-y divide-border">
     {tickets.map((ticket) => (
      <tr
       key={ticket.id}
       className={`hover:bg-surface dark:hover:bg-slate-700 transition-colors ${
        ticket.is_deleted ? "opacity-50 bg-slate-50 dark:bg-slate-900/50" : ""
       }`}
      >
       {/* Ticket ID */}
       <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="text-sm font-medium text-foreground font-mono">#{ticket.ticket_number || ticket.id}</div>
       </td>

       {/* Initiator Name and Group */}
       <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="text-sm font-medium text-foreground">{ticket.creator_name || "Unknown"}</div>
        <div className="text-xs text-foreground-secondary">{ticket.initiator_group_name || "No Group"}</div>
       </td>

       {/* Date - Compact format */}
       <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="text-sm text-foreground">{format(new Date(ticket.created_at), "dd MMM yyyy")}</div>
        <div className="text-xs text-foreground-secondary">{format(new Date(ticket.created_at), "hh:mm a")}</div>
       </td>

       {/* Type + Ticket ID */}
       <td className="px-3 py-2.5 whitespace-nowrap">
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
         ticket.ticket_type === "requirement"
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700"
        }`}>
         {ticket.ticket_type === "requirement" ? "Requirement" : "Support"}
        </span>
        {ticket.ticket_id && (
         <div className="flex items-center gap-1.5 mt-0.5">
          <div className="text-xs text-foreground-secondary font-mono">
           {ticket.ticket_id.replace(/^TKT-/, '').replace(/-/g, '')}
          </div>
          <button
           onClick={(e) => onCopyTicketId(ticket.ticket_id, e)}
           className="p-0.5 hover:bg-surface dark:hover:bg-slate-600 rounded transition-colors"
           title="Copy ticket ID"
          >
           {copiedTicketId === ticket.ticket_id ? (
            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
           ) : (
            <Copy className="w-3 h-3 text-purple-600 hover:text-foreground cursor-pointer" />
           )}
          </button>
         </div>
        )}
        {!ticket.ticket_id && (
         <div className="text-xs text-foreground-secondary mt-0.5 font-mono">#{ticket.ticket_number}</div>
        )}
       </td>

       {/* Title (for Requirements) or Category/Subcategory (for Support) */}
       <td className="px-3 py-2.5">
        {ticket.ticket_type === "requirement" ? (
         <div className="text-sm font-medium text-foreground">{ticket.title || "Untitled"}</div>
        ) : (
         <>
          <div className="text-sm font-medium text-foreground">{ticket.category_name || "N/A"}</div>
          {ticket.subcategory_name && (
           <div
            className="text-xs text-foreground-secondary max-w-[150px] truncate"
            title={ticket.subcategory_name}
           >
            {ticket.subcategory_name}
           </div>
          )}
         </>
        )}
       </td>

       {/* Description Truncated */}
       <td className="px-3 py-2.5">
        <p
         className="text-sm text-foreground max-w-[200px] truncate"
         title={ticket.description || ticket.title}
        >
         {ticket.description || ticket.title || "-"}
        </p>
       </td>

       {/* SPOC */}
       <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="text-sm text-foreground">{ticket.spoc_name || "-"}</div>
        {ticket.target_business_group_name && (
         <div className="text-xs text-foreground-secondary">{ticket.target_business_group_name}</div>
        )}
       </td>

       {/* Target Business Group (Internal Tickets Only) */}
       {filters?.isInternal && (
        <td className="px-3 py-2.5 whitespace-nowrap">
         <span className="text-sm text-foreground">{ticket.group_name || "-"}</span>
        </td>
       )}

       {/* Assignee */}
       <td className="px-3 py-2.5 whitespace-nowrap">
        {ticket.assignee_name ? (
         <div>
          <span
           className={`text-sm font-medium text-foreground ${canEditAssignee(ticket) ? "cursor-pointer hover:text-primary" : ""}`}
           onClick={() => canEditAssignee(ticket) && onOpenAssigneeModal(ticket)}
          >
           {ticket.assignee_name}
           {canEditAssignee(ticket) && <Edit className="w-3 h-3 inline ml-1 opacity-50" />}
          </span>
          {ticket.assignee_group_name && (
           <div className="text-xs text-foreground-secondary">{ticket.assignee_group_name}</div>
          )}
         </div>
        ) : canEditAssignee(ticket) ? (
         <button
          onClick={() => onOpenAssigneeModal(ticket)}
          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium hover:bg-amber-200"
         >
          <UserPlus className="w-3 h-3" />
          Assign
         </button>
        ) : (
         <span className="text-sm text-muted-foreground">Unassigned</span>
        )}
       </td>

       {/* Status */}
       <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex flex-col gap-1">
         {canEditStatus(ticket) ? (
          <select
           value={ticket.status}
           onChange={(e) => {
            const newStatus = e.target.value
            if (newStatus !== ticket.status) {
             onOpenStatusChangeModal(ticket, newStatus)
            }
           }}
           className={`px-2 py-1 rounded text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer ${getStatusColorWithDark(ticket.status)}`}
           disabled={ticket.is_deleted}
          >
           {getAvailableStatusOptions(ticket).map((status) => (
            <option key={status} value={status}>
             {status === "on-hold" ? "On-Hold" : status === "deleted" ? "Delete" : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
           ))}
          </select>
         ) : (
          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColorWithDark(ticket.status)}`}>
           {ticket.status === "on-hold" ? "On-Hold" : ticket.status === "deleted" ? "Deleted" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
          </span>
         )}
         {ticket.is_deleted && (
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">(Deleted)</span>
         )}
        </div>
       </td>

       {/* Project */}
       <td className="px-3 py-2.5 whitespace-nowrap">
        {ticket.ticket_type === "requirement" ? (
         <button
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 group border-2 border-transparent ${
           canEditProject(ticket)
            ? "hover:bg-purple-50 dark:hover:bg-purple-950/30 cursor-pointer hover:border-purple-200 dark:hover:border-purple-900"
            : "cursor-not-allowed opacity-50"
          }`}
          onClick={() => {
           if (canEditProject(ticket)) {
            onOpenProjectModal(ticket)
           }
          }}
          title={
           ticket.project_name
            ? `Project: ${ticket.project_name}${ticket.estimated_release_date ? `\nRelease: ${format(new Date(ticket.estimated_release_date), "dd MMM yyyy")}` : ""}`
            : canEditProject(ticket)
            ? "Assign to Project"
            : "No permission to assign project"
          }
         >
          <FolderKanban className={`w-4 h-4 flex-shrink-0 ${
           ticket.project_name
            ? canEditProject(ticket) ? "text-purple-600 group-hover:text-purple-700" : "text-purple-400"
            : "text-muted-foreground"
          }`} />
          {ticket.project_name ? (
           <span className={`text-sm font-medium ${
            canEditProject(ticket) ? "text-purple-600 dark:text-purple-400" : "text-purple-400 dark:text-purple-500"
           }`}>
            {ticket.project_name}
           </span>
          ) : (
           <span className="text-xs text-muted-foreground">Not assigned</span>
          )}
         </button>
        ) : (
         <span className="text-xs text-muted-foreground px-3">N/A</span>
        )}
       </td>

       {/* Actions */}
       <td className="px-3 py-2.5">
        <div className="flex items-center justify-center gap-1">
         {/* Files/Attachments - Always visible */}
         <button
          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all duration-200 group hover:scale-110 hover: border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-900"
          onClick={() => onOpenAttachmentsDialog(ticket)}
          title={ticket.attachment_count > 0 ? `${ticket.attachment_count} attachment(s) - Click to view` : "No attachments"}
         >
          <div className="relative">
           <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
           {ticket.attachment_count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-blue-600 rounded-full">
             {ticket.attachment_count}
            </span>
           )}
          </div>
         </button>

         {/* Activity History - Always visible */}
         <TicketHistoryTooltip ticketId={ticket.id} ticketNumber={ticket.ticket_number}>
          <button
           className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all duration-200 group hover:scale-110 hover: border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-900"
           title="Activity History (Hover to view)"
          >
           <History className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </button>
         </TicketHistoryTooltip>

         {/* Edit - Always visible */}
         <button
          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all duration-200 group hover:scale-110 hover: border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-900"
          title="Edit"
          onClick={() => router.push(`/tickets/${ticket.id}/edit`)}
         >
          <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
         </button>
        </div>
       </td>
      </tr>
     ))}
    </tbody>
   </table>
  </div>
 )
}
