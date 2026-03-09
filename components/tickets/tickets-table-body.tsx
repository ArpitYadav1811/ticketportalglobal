"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Edit, Paperclip, UserPlus, History, Copy, Check, Link2 } from "lucide-react"
import { FolderKanban } from "lucide-react"
import TicketHistoryTooltip from "./ticket-history-tooltip"
import TicketReferencesTooltip from "./ticket-references-tooltip"
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
 startIndex?: number
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
 startIndex = 0,
}: TicketsTableBodyProps) {
 const router = useRouter()

 return (
  <div className="overflow-auto flex-1 min-h-0">
   <table className="w-full table-fixed">
    <colgroup>
     <col className="w-[4%]" />
     <col className="w-[9%]" />
     <col className="w-[7%]" />
     <col className="w-[8%]" />
     <col className="w-[12%]" />
     <col className="w-[16%]" />
     <col className="w-[8%]" />
     {filters?.isInternal && <col className="w-[7%]" />}
     <col className="w-[8%]" />
     <col className="w-[7%]" />
     <col className="w-[9%]" />
     <col className="w-[12%]" />
    </colgroup>
    <thead className="bg-surface dark:bg-slate-700 border-b border-border sticky top-0 z-10">
     <tr>
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       S.No
      </th>
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Initiator
      </th>
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Date
      </th>
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Type
      </th>
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Title / Category
      </th>
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Description
      </th>
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       SPOC
      </th>
      {filters?.isInternal && (
       <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
        Group
       </th>
      )}
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Assignee
      </th>
      <th className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
       Status
      </th>
      <th className="px-2 py-2 text-center text-xs font-semibold text-foreground whitespace-nowrap">
       Project
      </th>
      <th className="px-2 py-2 text-center text-xs font-semibold text-foreground whitespace-nowrap">
       Actions
      </th>
     </tr>
    </thead>
    <tbody className="divide-y divide-border">
     {tickets.map((ticket, index) => (
      <tr
       key={ticket.id}
       className={`hover:bg-surface dark:hover:bg-slate-700 transition-colors ${
        ticket.is_deleted ? "opacity-50 bg-slate-50 dark:bg-slate-900/50" : ""
       }`}
      >
       {/* S.No */}
       <td className="px-2 py-2 whitespace-nowrap">
        <div className="text-xs font-medium text-foreground">{startIndex + index + 1}</div>
       </td>

       {/* Initiator Name and Group */}
       <td className="px-2 py-2">
        <div className="text-xs font-medium text-foreground truncate">{ticket.creator_name || "Unknown"}</div>
        <div className="text-[11px] text-foreground-secondary truncate">{ticket.initiator_group_name || "No Group"}</div>
       </td>

       {/* Date - Compact format */}
       <td className="px-2 py-2 whitespace-nowrap">
        <div className="text-xs text-foreground">{format(new Date(ticket.created_at), "dd MMM yy")}</div>
        <div className="text-[11px] text-foreground-secondary">{format(new Date(ticket.created_at), "hh:mm a")}</div>
       </td>

       {/* Type + Ticket ID */}
       <td className="px-2 py-2 whitespace-nowrap">
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
         ticket.ticket_type === "requirement"
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700"
        }`}>
         {ticket.ticket_type === "requirement" ? "Requirement" : "Support"}
        </span>
        {ticket.ticket_id && (
         <div className="flex items-center gap-1.5 mt-0.5">
          <div className="text-[11px] text-foreground-secondary">
           {ticket.ticket_id.split('-').pop()}
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
         <div className="text-[11px] text-foreground-secondary mt-0.5">{ticket.ticket_number}</div>
        )}
       </td>

       {/* Title (for Requirements) or Category/Subcategory (for Support) */}
       <td className="px-2 py-2">
        {ticket.ticket_type === "requirement" ? (
         <div className="text-xs font-medium text-foreground truncate" title={ticket.title || "Untitled"}>{ticket.title || "Untitled"}</div>
        ) : (
         <>
          <div className="text-xs font-medium text-foreground truncate" title={ticket.category_name || "N/A"}>{ticket.category_name || "N/A"}</div>
          {ticket.subcategory_name && (
           <div
            className="text-[11px] text-foreground-secondary truncate"
            title={ticket.subcategory_name}
           >
            {ticket.subcategory_name}
           </div>
          )}
         </>
        )}
       </td>

       {/* Description Truncated */}
       <td className="px-2 py-2">
        <p
         className="text-xs text-foreground truncate"
         title={ticket.description || ticket.title}
        >
         {ticket.description || ticket.title || "-"}
        </p>
       </td>

       {/* SPOC */}
       <td className="px-2 py-2">
        <div className="text-xs text-foreground truncate">{ticket.spoc_name || "-"}</div>
        {ticket.target_business_group_name && (
         <div className="text-[11px] text-foreground-secondary truncate">{ticket.target_business_group_name}</div>
        )}
       </td>

       {/* Target Business Group (Internal Tickets Only) */}
       {filters?.isInternal && (
        <td className="px-2 py-2">
         <span className="text-xs text-foreground truncate">{ticket.group_name || "-"}</span>
        </td>
       )}

       {/* Assignee */}
       <td className="px-2 py-2">
        {ticket.assignee_name ? (
         <div>
          <span
           className={`text-xs font-medium text-foreground truncate ${canEditAssignee(ticket) ? "cursor-pointer hover:text-primary" : ""}`}
           onClick={() => canEditAssignee(ticket) && onOpenAssigneeModal(ticket)}
          >
           {ticket.assignee_name}
           {canEditAssignee(ticket) && <Edit className="w-3 h-3 inline ml-1 opacity-50" />}
          </span>
          {ticket.assignee_group_name && (
           <div className="text-[11px] text-foreground-secondary truncate">{ticket.assignee_group_name}</div>
          )}
         </div>
        ) : canEditAssignee(ticket) ? (
         <button
          onClick={() => onOpenAssigneeModal(ticket)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[11px] font-medium hover:bg-amber-200"
         >
          <UserPlus className="w-3 h-3" />
          Assign
         </button>
        ) : (
         <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
       </td>

       {/* Status */}
       <td className="px-2 py-2 whitespace-nowrap">
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
       <td className="px-2 py-2 whitespace-nowrap">
        {ticket.ticket_type === "requirement" ? (
         <button
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 group border-2 border-transparent ${
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
           <span className={`text-xs font-medium truncate ${
            canEditProject(ticket) ? "text-purple-600 dark:text-purple-400" : "text-purple-400 dark:text-purple-500"
           }`}>
            {ticket.project_name}
           </span>
          ) : (
           <span className="text-[11px] text-muted-foreground">Not assigned</span>
          )}
         </button>
        ) : (
         <span className="text-[11px] text-muted-foreground px-2">N/A</span>
        )}
       </td>

       {/* Actions */}
       <td className="px-2 py-2">
        <div className="flex items-center justify-center gap-0.5">
         {/* Files/Attachments - Always visible */}
         <button
          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-all duration-200 group border border-transparent hover:border-blue-200 dark:hover:border-blue-900"
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
           className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-all duration-200 group border border-transparent hover:border-blue-200 dark:hover:border-blue-900"
           title="Activity History (Hover to view)"
          >
           <History className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </button>
         </TicketHistoryTooltip>

         {/* References - Always visible */}
         <TicketReferencesTooltip ticketId={ticket.id} ticketNumber={ticket.ticket_number}>
          <button
           className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-all duration-200 group border border-transparent hover:border-blue-200 dark:hover:border-blue-900"
           title={ticket.reference_count > 0 ? `${ticket.reference_count} reference(s) - Hover to view` : "No references"}
          >
           <div className="relative">
            <Link2 className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            {ticket.reference_count > 0 && (
             <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-blue-600 rounded-full">
              {ticket.reference_count}
             </span>
            )}
           </div>
          </button>
         </TicketReferencesTooltip>

         {/* Edit - Always visible */}
         <button
          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-all duration-200 group border border-transparent hover:border-blue-200 dark:hover:border-blue-900"
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
