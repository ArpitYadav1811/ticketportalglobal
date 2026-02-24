"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"

interface AdvancedTooltipProps {
  children: React.ReactNode
  title?: string
  content: string | React.ReactNode
  maxLength?: number
  position?: "top" | "bottom" | "left" | "right" | "auto"
  showMoreButton?: boolean
  showCloseButton?: boolean
  className?: string
  tooltipClassName?: string
  delay?: number
  trigger?: "hover" | "click"
  width?: "sm" | "md" | "lg" | "xl" | "auto"
  variant?: "dark" | "light"
}

const widthClasses = {
  sm: "max-w-xs",
  md: "max-w-sm",
  lg: "max-w-md",
  xl: "max-w-lg",
  auto: "max-w-2xl",
}

export default function AdvancedTooltip({
  children,
  title,
  content,
  maxLength = 150,
  position = "auto",
  showMoreButton = true,
  showCloseButton = false,
  className = "",
  tooltipClassName = "",
  delay = 300,
  trigger = "hover",
  width = "md",
  variant = "dark",
}: AdvancedTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [calculatedPosition, setCalculatedPosition] = useState<"top" | "bottom" | "left" | "right">("top")
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const contentString = typeof content === "string" ? content : ""
  const shouldTruncate = showMoreButton && contentString.length > maxLength
  const displayContent = shouldTruncate && !isExpanded 
    ? contentString.slice(0, maxLength) + "..." 
    : content

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      calculatePosition()
    }
  }, [isVisible, isExpanded, position])

  useEffect(() => {
    if (trigger === "click" && isVisible) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          triggerRef.current &&
          tooltipRef.current &&
          !triggerRef.current.contains(event.target as Node) &&
          !tooltipRef.current.contains(event.target as Node)
        ) {
          setIsVisible(false)
          setIsExpanded(false)
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [trigger, isVisible])

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const spacing = 12
    const padding = 16

    let finalPosition = position === "auto" ? "top" : position
    let top = 0
    let left = 0

    // Auto-detect best position if set to "auto"
    if (position === "auto") {
      const spaceTop = triggerRect.top
      const spaceBottom = window.innerHeight - triggerRect.bottom
      const spaceLeft = triggerRect.left
      const spaceRight = window.innerWidth - triggerRect.right

      if (spaceTop > tooltipRect.height + spacing) {
        finalPosition = "top"
      } else if (spaceBottom > tooltipRect.height + spacing) {
        finalPosition = "bottom"
      } else if (spaceRight > tooltipRect.width + spacing) {
        finalPosition = "right"
      } else if (spaceLeft > tooltipRect.width + spacing) {
        finalPosition = "left"
      } else {
        finalPosition = "bottom" // Default fallback
      }
    }

    switch (finalPosition) {
      case "top":
        top = triggerRect.top - tooltipRect.height - spacing
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case "bottom":
        top = triggerRect.bottom + spacing
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case "left":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.left - tooltipRect.width - spacing
        break
      case "right":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.right + spacing
        break
    }

    // Boundary adjustments
    if (left < padding) {
      left = padding
    } else if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding
    }

    if (top < padding) {
      top = padding
    } else if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding
    }

    setCalculatedPosition(finalPosition)
    setTooltipPosition({ top, left })
  }

  const handleMouseEnter = () => {
    if (trigger !== "hover") return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (trigger !== "hover") return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (tooltipRef.current && relatedTarget && relatedTarget instanceof Node && tooltipRef.current.contains(relatedTarget)) {
      return
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setIsExpanded(false)
    }, 200)
  }

  const handleClick = () => {
    if (trigger !== "click") return
    setIsVisible(!isVisible)
    if (!isVisible) {
      setIsExpanded(false)
    }
  }

  const handleTooltipMouseEnter = () => {
    if (trigger !== "hover") return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handleTooltipMouseLeave = () => {
    if (trigger !== "hover") return
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setIsExpanded(false)
    }, 200)
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsVisible(false)
    setIsExpanded(false)
  }

  const bgClass = variant === "dark" 
    ? "bg-gray-900 dark:bg-gray-700 text-white border-gray-700 dark:border-gray-600"
    : "bg-white dark:bg-gray-100 text-gray-900 dark:text-gray-800 border-gray-200 dark:border-gray-300 shadow-xl"

  const arrowBgClass = variant === "dark"
    ? "bg-gray-900 dark:bg-gray-700 border-gray-700 dark:border-gray-600"
    : "bg-white dark:bg-gray-100 border-gray-200 dark:border-gray-300"

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-[99999] ${widthClasses[width]} ${bgClass} rounded-lg border transition-all duration-200 ${tooltipClassName}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="p-3">
            {/* Header with title and close button */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700 dark:border-gray-300">
                {title && (
                  <h4 className="text-sm font-semibold">{title}</h4>
                )}
                {showCloseButton && (
                  <button
                    onClick={handleClose}
                    className="ml-auto p-0.5 hover:bg-gray-800 dark:hover:bg-gray-200 rounded transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {displayContent}
            </div>

            {/* Show More/Less button */}
            {shouldTruncate && (
              <button
                onClick={toggleExpand}
                className={`flex items-center gap-1 mt-2 text-xs font-medium transition-colors ${
                  variant === "dark"
                    ? "text-blue-300 hover:text-blue-200"
                    : "text-blue-600 hover:text-blue-700"
                }`}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show More
                  </>
                )}
              </button>
            )}
          </div>

          {/* Arrow indicator */}
          <div
            className={`absolute w-2 h-2 ${arrowBgClass} transform rotate-45 ${
              calculatedPosition === "top"
                ? "bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r"
                : calculatedPosition === "bottom"
                ? "top-[-4px] left-1/2 -translate-x-1/2 border-t border-l"
                : calculatedPosition === "left"
                ? "right-[-4px] top-1/2 -translate-y-1/2 border-r border-t"
                : "left-[-4px] top-1/2 -translate-y-1/2 border-l border-b"
            }`}
          />
        </div>
      )}
    </>
  )
}
