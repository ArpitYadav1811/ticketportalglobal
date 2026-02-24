"use client"

import React, { useState, useRef, useEffect } from "react"
import { Users, X } from "lucide-react"

interface TeamMember {
  id: number
  name: string
  email?: string
  group?: string
}

interface TeamTooltipProps {
  children: React.ReactNode
  teamMembers: TeamMember[]
  isActive?: boolean
}

export function TeamTooltip({ children, teamMembers, isActive = false }: TeamTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<"top" | "bottom">("bottom")
  const [horizontalAlign, setHorizontalAlign] = useState<"left" | "center" | "right">("center")
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top

      // Vertical positioning: Show tooltip above if not enough space below
      if (spaceBelow < tooltipRect.height + 10 && spaceAbove > tooltipRect.height + 10) {
        setPosition("top")
      } else {
        setPosition("bottom")
      }

      // Horizontal positioning: Check if tooltip goes off-screen
      const tooltipWidth = 300 // approximate width
      const triggerCenter = triggerRect.left + triggerRect.width / 2
      const spaceRight = window.innerWidth - triggerCenter
      const spaceLeft = triggerCenter

      if (spaceRight < tooltipWidth / 2 + 20) {
        // Not enough space on right, align to right edge
        setHorizontalAlign("right")
      } else if (spaceLeft < tooltipWidth / 2 + 20) {
        // Not enough space on left, align to left edge
        setHorizontalAlign("left")
      } else {
        // Enough space on both sides, center it
        setHorizontalAlign("center")
      }
    }
  }, [isVisible])

  const handleMouseEnter = () => {
    setIsVisible(true)
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (
      tooltipRef.current &&
      relatedTarget &&
      relatedTarget instanceof Node &&
      tooltipRef.current.contains(relatedTarget)
    ) {
      return // Mouse is moving to tooltip, don't close
    }
    setIsVisible(false)
  }

  const handleTooltipMouseLeave = () => {
    setIsVisible(false)
  }

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={handleTooltipMouseLeave}
          className={`absolute z-[9999] ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            horizontalAlign === "center"
              ? "left-1/2 -translate-x-1/2"
              : horizontalAlign === "left"
              ? "left-0"
              : "right-0"
          }`}
          style={{ minWidth: "280px", maxWidth: "320px" }}
        >
          {/* Arrow */}
          <div
            className={`absolute w-3 h-3 ${
              isActive
                ? "bg-primary dark:bg-primary"
                : "bg-white dark:bg-gray-800"
            } border ${
              isActive
                ? "border-primary dark:border-primary"
                : "border-border dark:border-gray-700"
            } rotate-45 ${
              position === "top" ? "bottom-[-6px]" : "top-[-6px]"
            } ${
              horizontalAlign === "center"
                ? "left-1/2 -translate-x-1/2"
                : horizontalAlign === "left"
                ? "left-6"
                : "right-6"
            }`}
          />

          {/* Tooltip Content */}
          <div
            className={`relative rounded-lg shadow-xl border ${
              isActive
                ? "bg-primary dark:bg-primary text-white border-primary dark:border-primary"
                : "bg-white dark:bg-gray-800 text-foreground border-border dark:border-gray-700"
            } overflow-hidden`}
          >
            {/* Header */}
            <div
              className={`px-4 py-3 border-b ${
                isActive
                  ? "border-white/20 dark:border-white/20"
                  : "border-border dark:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold text-sm">
                    My Team ({teamMembers.length})
                  </span>
                </div>
                <button
                  onClick={() => setIsVisible(false)}
                  className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                    isActive ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Team Members List */}
            <div className="max-h-[300px] overflow-y-auto">
              {teamMembers.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <Users className={`w-8 h-8 mx-auto mb-2 ${
                    isActive ? "text-white/50" : "text-muted-foreground"
                  }`} />
                  <p className={`text-sm ${
                    isActive ? "text-white/70" : "text-muted-foreground"
                  }`}>
                    No team members added yet
                  </p>
                  <p className={`text-xs mt-1 ${
                    isActive ? "text-white/50" : "text-muted-foreground"
                  }`}>
                    Add members in Settings
                  </p>
                </div>
              ) : (
                teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className={`px-4 py-2.5 ${
                      index !== teamMembers.length - 1
                        ? `border-b ${
                            isActive
                              ? "border-white/10 dark:border-white/10"
                              : "border-border dark:border-gray-700"
                          }`
                        : ""
                    } ${
                      isActive
                        ? "hover:bg-white/10 dark:hover:bg-white/10"
                        : "hover:bg-surface dark:hover:bg-gray-700"
                    } transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                          isActive
                            ? "bg-white/20 dark:bg-white/20 text-white"
                            : "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                        }`}
                      >
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? "text-white" : "text-foreground"
                          }`}
                        >
                          {member.name}
                        </p>
                        {member.email && (
                          <p
                            className={`text-xs truncate ${
                              isActive
                                ? "text-white/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {member.email}
                          </p>
                        )}
                        {member.group && (
                          <p
                            className={`text-xs truncate mt-0.5 ${
                              isActive
                                ? "text-white/60"
                                : "text-muted-foreground"
                            }`}
                          >
                            {member.group}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {teamMembers.length > 5 && (
              <div
                className={`px-4 py-2 text-center border-t ${
                  isActive
                    ? "border-white/20 dark:border-white/20 bg-white/5"
                    : "border-border dark:border-gray-700 bg-surface dark:bg-gray-700/50"
                }`}
              >
                <p
                  className={`text-xs ${
                    isActive
                      ? "text-white/70"
                      : "text-muted-foreground"
                  }`}
                >
                  Showing all {teamMembers.length} team members
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
