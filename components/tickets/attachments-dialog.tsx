"use client"

import { X, Download, FileText, Paperclip } from "lucide-react"

interface Attachment {
  id: number
  file_name: string
  file_size?: number
  file_url: string
  uploader_name?: string
  created_at?: string
}

interface AttachmentsDialogProps {
  isOpen: boolean
  onClose: () => void
  attachments: Attachment[]
  ticketNumber: number
}

export default function AttachmentsDialog({
  isOpen,
  onClose,
  attachments,
  ticketNumber,
}: AttachmentsDialogProps) {
  if (!isOpen) return null

  const getFileExtension = (filename: string) => {
    const parts = filename.split(".")
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE"
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    
    // You can customize icons based on file type
    const iconClass = "w-4 h-4 text-muted-foreground flex-shrink-0"
    
    return <FileText className={iconClass} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Attachments #{ticketNumber}
            </h2>
            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
              {attachments.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-foreground-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground-secondary mb-3">
              Files ({attachments.length})
            </p>

            {attachments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground-secondary">No attachments found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface dark:hover:bg-slate-700/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(attachment.file_name)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {attachment.file_name}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {attachment.file_size
                            ? `${(attachment.file_size / 1024).toFixed(1)} KB`
                            : "Unknown size"}
                        </p>
                      </div>
                    </div>

                    {/* Download Button */}
                    <a
                      href={attachment.file_url}
                      download={attachment.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-surface hover:bg-surface/80 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
