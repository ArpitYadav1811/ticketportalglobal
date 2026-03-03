"use client"

import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface TicketSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string | null
  onViewTicket?: () => void
}

export function TicketSuccessDialog({
  isOpen,
  onClose,
  ticketId,
  onViewTicket,
}: TicketSuccessDialogProps) {
  const router = useRouter()

  const handleViewTicket = () => {
    if (ticketId) {
      router.push(`/tickets?created=${ticketId}`)
    } else {
      router.push("/tickets")
    }
    onClose()
  }

  const handleClose = () => {
    onClose()
    if (ticketId) {
      router.push(`/tickets?created=${ticketId}`)
    } else {
      router.push("/tickets")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center space-y-3 py-2">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-lg font-bold text-green-800 dark:text-green-300">
              Ticket Created Successfully!
            </DialogTitle>
            {ticketId && (
              <DialogDescription className="text-xs">
                Your ticket has been created with ID: <span className="font-semibold text-slate-900 dark:text-slate-100">{ticketId}</span>
              </DialogDescription>
            )}
          </div>
        </DialogHeader>
        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="text-xs h-8"
          >
            Close
          </Button>
          <Button
            onClick={handleViewTicket}
            className="bg-black hover:bg-gray-800 text-white text-xs h-8"
          >
            View Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
