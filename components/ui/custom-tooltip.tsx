"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CustomTooltipProps {
  children: React.ReactNode
  content: string | React.ReactNode
  maxLength?: number // Maximum characters to show before truncating
  position?: "top" | "bottom" | "left" | "right"
  showMoreButton?: boolean // Whether to show "More" button for long content
  className?: string
  delay?: number // Delay before showing tooltip (ms)
}

export default function CustomTooltip({
  children,
  content,
  maxLength = 100,
  position = "top",
  showMoreButton = true,
  className = "",
  delay = 300,
}: CustomTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Convert content to string for length checking
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

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const spacing = 8
    const padding = 16

    let top = 0
    let left = 0

    switch (position) {
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

    // Adjust if tooltip goes off screen
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

    setTooltipPosition({ top, left })
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (tooltipRef.current && relatedTarget && relatedTarget instanceof Node && tooltipRef.current.contains(relatedTarget)) {
      return // Mouse is moving to tooltip, don't close
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setIsExpanded(false)
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
      setIsExpanded(false)
    }, 200)
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[99999] max-w-4xl bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-xl border border-gray-700 dark:border-gray-600 transition-all duration-200"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            maxWidth: isExpanded ? "64rem" : "48rem",
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="p-3 max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-500 hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500">
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {displayContent}
            </div>

            {shouldTruncate && (
              <button
                onClick={toggleExpand}
                className="flex items-center gap-1 mt-2 text-xs text-blue-300 hover:text-blue-200 transition-colors font-medium"
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
            className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 border-gray-700 dark:border-gray-600 transform rotate-45 ${
              position === "top"
                ? "bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r"
                : position === "bottom"
                ? "top-[-4px] left-1/2 -translate-x-1/2 border-t border-l"
                : position === "left"
                ? "right-[-4px] top-1/2 -translate-y-1/2 border-r border-t"
                : "left-[-4px] top-1/2 -translate-y-1/2 border-l border-b"
            }`}
          />
        </div>
      )}
    </>
  )
}
