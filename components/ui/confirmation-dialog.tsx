"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Plus, Trash2, Edit, ArrowRight } from "lucide-react"

export interface ChangeDetail {
  label: string
  oldValue?: string | number | null
  newValue?: string | number | null
  type?: "add" | "delete" | "update"
}

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description?: string
  actionType: "add" | "delete" | "update" | "remove"
  changes?: ChangeDetail[]
  loading?: boolean
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

export default function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  actionType,
  changes = [],
  loading = false,
  confirmText,
  cancelText = "Cancel",
  destructive = false,
}: ConfirmationDialogProps) {
  const getActionIcon = () => {
    switch (actionType) {
      case "add":
        return <Plus className="w-5 h-5 text-green-600" />
      case "delete":
      case "remove":
        return <Trash2 className="w-5 h-5 text-red-600" />
      case "update":
        return <Edit className="w-5 h-5 text-blue-600" />
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-600" />
    }
  }

  const getActionColor = () => {
    if (destructive || actionType === "delete" || actionType === "remove") {
      return "text-red-600"
    }
    switch (actionType) {
      case "add":
        return "text-green-600"
      case "update":
        return "text-blue-600"
      default:
        return "text-amber-600"
    }
  }

  const getDefaultConfirmText = () => {
    if (confirmText) return confirmText
    switch (actionType) {
      case "add":
        return "Add"
      case "delete":
        return "Delete"
      case "remove":
        return "Remove"
      case "update":
        return "Update"
      default:
        return "Confirm"
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getActionIcon()}
            <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          </div>
          {description && (
            <AlertDialogDescription className="text-base mt-2">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {changes.length > 0 && (
          <div className="my-4 space-y-3">
            <div className="text-sm font-semibold text-foreground mb-2">
              Changes Summary:
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3 border border-border">
              {changes.map((change, index) => (
                <div key={index} className="space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    {change.label}
                  </div>
                  {change.type === "add" && (
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Adding:</span>
                      <span>{String(change.newValue || "N/A")}</span>
                    </div>
                  )}
                  {change.type === "delete" && (
                    <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                      <Trash2 className="w-4 h-4" />
                      <span className="font-medium">Deleting:</span>
                      <span>{String(change.oldValue || "N/A")}</span>
                    </div>
                  )}
                  {change.type === "update" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">From:</span>
                        <span className="line-through">{String(change.oldValue || "N/A")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                        <ArrowRight className="w-4 h-4" />
                        <span className="font-medium">To:</span>
                        <span>{String(change.newValue || "N/A")}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive || actionType === "delete" || actionType === "remove"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : ""
            }
          >
            {loading ? "Processing..." : getDefaultConfirmText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
