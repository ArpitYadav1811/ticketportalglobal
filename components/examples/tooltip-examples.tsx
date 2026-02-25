"use client"

import React from "react"
import CustomTooltip from "@/components/ui/custom-tooltip"
import AdvancedTooltip from "@/components/ui/advanced-tooltip"
import { HelpCircle, Info, AlertCircle } from "lucide-react"

/**
 * Example component demonstrating various tooltip usages
 * This file serves as a reference for implementing tooltips across the application
 */
export default function TooltipExamples() {
  return (
    <div className="p-8 space-y-12 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold text-foreground mb-8">Tooltip Examples</h1>

      {/* Basic Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">1. Basic Tooltips</h2>
        
        <div className="flex flex-wrap gap-4">
          <CustomTooltip content="This is a simple tooltip">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Hover me
            </button>
          </CustomTooltip>

          <CustomTooltip content="Bottom positioned tooltip" position="bottom">
            <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              Bottom
            </button>
          </CustomTooltip>

          <CustomTooltip content="Left positioned tooltip" position="left">
            <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
              Left
            </button>
          </CustomTooltip>

          <CustomTooltip content="Right positioned tooltip" position="right">
            <button className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
              Right
            </button>
          </CustomTooltip>
        </div>
      </section>

      {/* Long Content with Truncation */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">2. Expandable Content</h2>
        
        <div className="flex flex-wrap gap-4">
          <CustomTooltip 
            content="This is a very long description that will be truncated after 100 characters by default. Users can click 'Show More' to see the full content. This demonstrates the expandable tooltip feature that helps keep the UI clean while still providing access to detailed information when needed."
            maxLength={80}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer hover:border-blue-500">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Long Description</span>
            </div>
          </CustomTooltip>

          <AdvancedTooltip
            title="Ticket Details"
            content="This ticket was created to address a critical bug in the authentication system. Multiple users reported being unable to log in after the recent deployment. The issue affects both mobile and desktop users across all browsers. Priority has been set to high due to the impact on user experience."
            maxLength={100}
            width="lg"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer hover:border-blue-500">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm">Ticket #12345</span>
            </div>
          </AdvancedTooltip>
        </div>
      </section>

      {/* Advanced Tooltips */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">3. Advanced Features</h2>
        
        <div className="flex flex-wrap gap-4">
          {/* Auto-positioning */}
          <AdvancedTooltip
            content="This tooltip automatically finds the best position"
            position="auto"
          >
            <button className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600">
              Auto Position
            </button>
          </AdvancedTooltip>

          {/* Click trigger */}
          <AdvancedTooltip
            title="Click Tooltip"
            content="This tooltip opens on click and has a close button"
            trigger="click"
            showCloseButton={true}
          >
            <button className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600">
              Click Me
            </button>
          </AdvancedTooltip>

          {/* Light variant */}
          <AdvancedTooltip
            content="This is a light-themed tooltip"
            variant="light"
          >
            <button className="px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300">
              Light Theme
            </button>
          </AdvancedTooltip>

          {/* Large width */}
          <AdvancedTooltip
            title="Large Tooltip"
            content="This tooltip is extra wide and can contain more detailed information. It's perfect for displaying comprehensive help text or detailed descriptions that need more space."
            width="xl"
            maxLength={150}
          >
            <button className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600">
              Large Width
            </button>
          </AdvancedTooltip>
        </div>
      </section>

      {/* Rich Content */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">4. Rich Content</h2>
        
        <div className="flex flex-wrap gap-4">
          <AdvancedTooltip
            title="User Information"
            content={
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                    JD
                  </div>
                  <div>
                    <p className="font-semibold">John Doe</p>
                    <p className="text-xs opacity-75">john.doe@example.com</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-600 dark:border-slate-300 space-y-1">
                  <p className="text-xs">Role: Developer</p>
                  <p className="text-xs">Department: Engineering</p>
                  <p className="text-xs">Joined: Jan 15, 2024</p>
                </div>
              </div>
            }
            showMoreButton={false}
            width="md"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer hover:border-blue-500">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                JD
              </div>
              <span className="text-sm font-medium">John Doe</span>
            </div>
          </AdvancedTooltip>

          <AdvancedTooltip
            title="Status History"
            content={
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Open</span>
                  <span className="opacity-75">Feb 20, 10:00</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>In Progress</span>
                  <span className="opacity-75">Feb 21, 14:30</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Resolved</span>
                  <span className="opacity-75">Feb 23, 16:45</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Closed</span>
                  <span className="opacity-75">Feb 24, 09:15</span>
                </div>
              </div>
            }
            showMoreButton={false}
            width="md"
          >
            <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-sm font-medium cursor-pointer">
              Closed
            </span>
          </AdvancedTooltip>
        </div>
      </section>

      {/* Help Icons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">5. Help Icons & Info Badges</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Email Address</label>
            <CustomTooltip content="Enter your work email address. This will be used for all notifications.">
              <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
            </CustomTooltip>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Priority Level</label>
            <AdvancedTooltip
              title="Priority Levels"
              content={
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-red-400">High:</span> Urgent issues affecting multiple users
                  </div>
                  <div>
                    <span className="font-semibold text-yellow-400">Medium:</span> Important but not critical
                  </div>
                  <div>
                    <span className="font-semibold text-green-400">Low:</span> Minor issues or enhancements
                  </div>
                </div>
              }
              showMoreButton={false}
              width="md"
            >
              <Info className="w-4 h-4 text-blue-500 cursor-help" />
            </AdvancedTooltip>
          </div>
        </div>
      </section>

      {/* Table Example */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">6. Table Cell Tooltips</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold">Ticket</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-300 dark:border-slate-600">
                <td className="px-4 py-3">
                  <AdvancedTooltip
                    title="Ticket #12345"
                    content="Created by John Doe on Feb 20, 2026. Assigned to Jane Smith. Priority: High"
                    width="md"
                  >
                    <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                      #12345
                    </span>
                  </AdvancedTooltip>
                </td>
                <td className="px-4 py-3">
                  <AdvancedTooltip
                    content="Login page not loading properly on mobile devices. Multiple users reported this issue across iOS and Android platforms. The issue seems to be related to the recent authentication update deployed last week."
                    maxLength={60}
                    width="lg"
                  >
                    <div className="truncate max-w-xs cursor-pointer hover:text-blue-600">
                      Login page not loading properly on mobile devices...
                    </div>
                  </AdvancedTooltip>
                </td>
                <td className="px-4 py-3">
                  <AdvancedTooltip
                    content="Status changed to 'In Progress' by Jane Smith on Feb 21, 2026 at 14:30"
                    position="top"
                  >
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded text-xs font-medium cursor-help">
                      In Progress
                    </span>
                  </AdvancedTooltip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
