"use client"

import React, { useState, useEffect, useRef } from "react"
import { Link2, ExternalLink } from "lucide-react"
import { getTicketReferences } from "@/lib/actions/tickets"
import { useRouter } from "next/navigation"

interface TicketReferencesTooltipProps {
  ticketId: number
  ticketNumber: number
  children: React.ReactNode
}

interface RefTicket {
  id: number
  ticket_number: number
  ticket_id: string
  title: string
  ticket_type: string
  status: string
  creator_name: string | null
}

export default function TicketReferencesTooltip({
  ticketId,
  ticketNumber,
  children,
}: TicketReferencesTooltipProps) {
  const router = useRouter()
  const [references, setReferences] = useState<RefTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Update position on scroll/resize and handle Escape key
  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const updatePosition = () => {
        if (!buttonRef.current) return

        const rect = buttonRef.current.getBoundingClientRect()
        const tooltipWidth = 320
        const tooltipHeight = 300
        const spacing = 12
        const padding = 16

        let left = rect.right + spacing
        let top = rect.top

        if (left + tooltipWidth > window.innerWidth - padding) {
          left = rect.left - tooltipWidth - spacing
        }

        if (left < padding) {
          left = Math.max(padding, (window.innerWidth - tooltipWidth) / 2)
        }

        if (top + tooltipHeight > window.innerHeight - padding) {
          top = Math.max(padding, window.innerHeight - tooltipHeight - padding)
        }

        if (top < padding) {
          top = padding
        }

        if (top + tooltipHeight <= window.innerHeight - padding) {
          top = Math.max(padding, rect.top)
        }

        setPosition({ top, left })
      }

      window.addEventListener("scroll", updatePosition, true)
      window.addEventListener("resize", updatePosition)

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsVisible(false)
        }
      }
      window.addEventListener("keydown", handleEscape)

      return () => {
        window.removeEventListener("scroll", updatePosition, true)
        window.removeEventListener("resize", updatePosition)
        window.removeEventListener("keydown", handleEscape)
      }
    }
  }, [isVisible])

  const loadReferences = async () => {
    if (hasLoaded) return
    setLoading(true)
    const result = await getTicketReferences(ticketId)
    if (result.success && result.data) {
      setReferences(result.data as RefTicket[])
      setHasLoaded(true)
    }
    setLoading(false)
  }

  const calculatePosition = () => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const tooltipWidth = 320
    const tooltipHeight = 300
    const spacing = 12
    const padding = 16

    let left = rect.right + spacing
    let top = rect.top

    if (left + tooltipWidth > window.innerWidth - padding) {
      left = rect.left - tooltipWidth - spacing
    }

    if (left < padding) {
      left = Math.max(padding, (window.innerWidth - tooltipWidth) / 2)
    }

    if (top + tooltipHeight > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - tooltipHeight - padding)
    }

    if (top < padding) {
      top = padding
    }

    if (top + tooltipHeight <= window.innerHeight - padding) {
      top = Math.max(padding, rect.top)
    }

    setPosition({ top, left })
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    calculatePosition()
    setIsVisible(true)
    if (!hasLoaded) {
      loadReferences()
    }
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (
      tooltipRef.current &&
      relatedTarget &&
      relatedTarget instanceof Node &&
      tooltipRef.current.contains(relatedTarget)
    ) {
      return
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 200)
  }

  const handleTooltipMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handleTooltipMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 200)
  }

  const handleNavigate = (refTicketId: number) => {
    setIsVisible(false)
    router.push(`/tickets/${refTicketId}/edit`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "resolved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "closed":
        return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
      case "on-hold":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
    }
  }

  return (
    <>
      <div
        ref={buttonRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible && (position.top > 0 || position.left > 0) && (
        <div
          ref={tooltipRef}
          className="fixed z-[99999] w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-border p-4 max-h-[60vh] overflow-y-auto"
          style={{
            top: `${Math.max(16, position.top)}px`,
            left: `${Math.max(16, position.left)}px`,
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4 text-foreground-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border pr-6">
            <Link2 className="w-4 h-4 text-blue-500" />
            <h4 className="font-semibold text-sm text-foreground">
              References
            </h4>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-4 text-sm text-foreground-secondary">
              Loading references...
            </div>
          ) : references.length === 0 ? (
            <div className="text-center py-4 text-sm text-foreground-secondary">
              No reference tickets linked.
            </div>
          ) : (
            <div className="space-y-1.5">
              {references.map((ref) => (
                <button
                  key={ref.id}
                  onClick={() => handleNavigate(ref.id)}
                  className="w-full text-left p-2 rounded-md border border-border hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">
                          {ref.ticket_id
                            ? ref.ticket_id.replace(/^TKT-\d{6}-/, "")
                            : `#${ref.ticket_number}`}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${getStatusColor(ref.status)}`}
                        >
                          {ref.status}
                        </span>
                      </div>
                      <p className="text-xs text-foreground mt-0.5 truncate">
                        {ref.title}
                      </p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-500 shrink-0 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
