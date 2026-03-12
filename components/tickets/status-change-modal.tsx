"use client"

import { useState, useEffect } from "react"
import { X, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, remarks: string) => void
  oldStatus: string
  newStatus: string
  ticketId?: string | null
  businessGroupName?: string | null
  loading?: boolean
  isSuperAdmin?: boolean
}

// Predefined reasons for each status
const STATUS_REASONS: Record<string, string[]> = {
  open: [
    "Needs rework",
    "Status correction",
    "Other"
  ],
  closed: [
    "Verified",
    "Other"
  ],
  deleted: [
    "Duplicate entry",
    "Created by mistake",
    "Other"
  ],
  resolved: [
    "Problems fixed",
    "Changes implemented",
    "Request completed",
    "Other"
  ],
  "on-hold": [
    "Additional inputs awaited",
    "Implementation dependencies",
    "Customer delays",
    "Other"
  ]
}

export default function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  oldStatus,
  newStatus,
  ticketId,
  businessGroupName,
  loading = false,
  isSuperAdmin = false,
}: StatusChangeModalProps) {
  const [reason, setReason] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isOtherSelected, setIsOtherSelected] = useState(false)

  // Get available reasons for the new status
  const availableReasons = STATUS_REASONS[newStatus] || []

  // Reset form when modal opens/closes or status changes
  useEffect(() => {
    if (isOpen) {
      setReason("")
      setRemarks("")
      setIsOtherSelected(false)
    }
  }, [isOpen, newStatus])

  // Check if "Other" is selected
  useEffect(() => {
    setIsOtherSelected(reason === "Other")
  }, [reason])

  const handleConfirm = () => {
    if (!reason.trim()) {
      return
    }
    // If "Other" is selected, remarks is mandatory
    if (reason === "Other" && !remarks.trim()) {
      return
    }
    onConfirm(reason.trim(), remarks.trim())
    // Reset form
    setReason("")
    setRemarks("")
    setIsOtherSelected(false)
  }

  const handleClose = () => {
    setReason("")
    setRemarks("")
    setIsOtherSelected(false)
    onClose()
  }

  if (!isOpen) return null

  const statusLabels: Record<string, string> = {
    open: "Open",
    "on-hold": "On Hold",
    resolved: "Resolved",
    closed: "Closed",
    deleted: "Delete",
    returned: "Returned",
  }

  const oldStatusLabel = statusLabels[oldStatus] || oldStatus
  const newStatusLabel = statusLabels[newStatus] || newStatus

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-foreground">Change Status</h2>
              {ticketId && (
                <span className="text-lg font-semibold text-foreground">
                  #{ticketId.replace(/^TKT-\d{6}-/, '')}
                </span>
              )}
            </div>
            {businessGroupName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {businessGroupName}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-surface dark:hover:bg-slate-700 rounded-md transition-colors"
            disabled={loading}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {newStatus === "deleted" && isSuperAdmin ? (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">
                ⚠️ PERMANENT DELETION
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                As Super Admin, this ticket will be <strong>permanently deleted</strong> from the database. 
                All related data (comments, attachments, audit logs) will also be permanently removed. 
                This action <strong>cannot be undone</strong>!
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Status will be changed from <span className="font-medium">{oldStatusLabel}</span> to{" "}
                <span className="font-medium">{newStatusLabel}</span>
                {newStatus === "deleted" && !isSuperAdmin && (
                  <span className="block mt-1">(Soft delete - can be restored)</span>
                )}
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Reason * <span className="text-xs text-muted-foreground">(Required)</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.25em 1.25em",
              }}
              autoFocus
              disabled={loading}
            >
              <option value="">Select a reason...</option>
              {availableReasons.map((reasonOption) => (
                <option key={reasonOption} value={reasonOption}>
                  {reasonOption}
                </option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Remarks {isOtherSelected && <span className="text-red-500">*</span>}
              <span className="text-xs text-muted-foreground ml-1">
                {isOtherSelected ? "(Required)" : "(Optional)"}
              </span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isOtherSelected ? "Please provide details for 'Other' reason..." : "Add any additional remarks..."}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm resize-none ${
                isOtherSelected && !remarks.trim() 
                  ? "border-red-300 dark:border-red-700 focus:ring-red-500" 
                  : "border-border"
              }`}
              disabled={loading}
            />
            {isOtherSelected && !remarks.trim() && (
              <p className="text-xs text-red-500 mt-1">Remarks are required when 'Other' is selected</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-border bg-surface/50 dark:bg-slate-700/50">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-surface dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || (isOtherSelected && !remarks.trim()) || loading}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Changing..." : "Confirm Change"}
          </Button>
        </div>
      </div>
    </div>
  )
}
