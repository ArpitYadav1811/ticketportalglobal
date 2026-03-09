"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TicketSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string | null
}

export function TicketSuccessDialog({
  isOpen,
  onClose,
  ticketId,
}: TicketSuccessDialogProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (isOpen) {
      setCountdown(3)

      // Countdown every second
      const intervalId = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)

      // Auto-close after 3 seconds
      timerRef.current = setTimeout(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        onClose()
      }, 3000)

      return () => {
        clearInterval(intervalId)
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      if (timerRef.current) clearTimeout(timerRef.current)
      onClose()
    }}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex flex-col items-center text-center space-y-3 py-4">
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
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Closing in {countdown}s...
            </p>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
