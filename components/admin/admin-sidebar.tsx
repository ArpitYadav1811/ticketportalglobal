"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Key,
  Building2,
  FolderTree,
  Link2,
  Database,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Upload,
  Download,
  AlertTriangle,
  X,
} from "lucide-react"

interface AdminSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isSuperAdmin: boolean
}

interface NavSection {
  id: string
  label: string
  icon: React.ReactNode
  items: NavItem[]
  superAdminOnly?: boolean
}

interface NavItem {
  id: string
  label: string
  icon?: React.ReactNode
}

const navSections: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="w-4 h-4" />,
    items: [{ id: "overview", label: "Dashboard" }],
  },
  {
    id: "users",
    label: "User Management",
    icon: <Users className="w-4 h-4" />,
    items: [
      { id: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" /> },
      { id: "roles", label: "Roles & Permissions", icon: <Key className="w-3.5 h-3.5" /> },
      { id: "bulk-users", label: "Bulk Operations", icon: <Upload className="w-3.5 h-3.5" /> },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    icon: <Building2 className="w-4 h-4" />,
    items: [
      { id: "business-groups", label: "Business Groups", icon: <Building2 className="w-3.5 h-3.5" /> },
      { id: "functional-areas", label: "Functional Areas", icon: <FolderTree className="w-3.5 h-3.5" /> },
      { id: "fa-mappings", label: "FA → BG Mappings", icon: <Link2 className="w-3.5 h-3.5" /> },
      { id: "teams", label: "Teams", icon: <FolderTree className="w-3.5 h-3.5" /> },
    ],
    superAdminOnly: true,
  },
  {
    id: "master-data",
    label: "Master Data",
    icon: <FileText className="w-4 h-4" />,
    items: [
      { id: "categories", label: "Categories & Subcategories", icon: <FileText className="w-3.5 h-3.5" /> },
      { id: "projects", label: "Projects", icon: <Database className="w-3.5 h-3.5" /> },
      { id: "import-export", label: "Import/Export", icon: <Download className="w-3.5 h-3.5" /> },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: <Settings className="w-4 h-4" />,
    items: [
      { id: "system-management", label: "System Management", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
      { id: "audit-logs", label: "Audit Logs", icon: <ScrollText className="w-3.5 h-3.5" /> },
    ],
    superAdminOnly: true,
  },
]

export default function AdminSidebar({ activeSection, onSectionChange, isSuperAdmin }: AdminSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview", "users", "organization", "master-data", "system"])
  )
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile menu when section changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [activeSection])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleItemClick = (itemId: string) => {
    onSectionChange(itemId)
    setIsMobileOpen(false) // Close mobile menu on navigation
  }

  const filteredSections = navSections.filter(
    (section) => !section.superAdminOnly || isSuperAdmin
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`w-64 bg-card/95 backdrop-blur-md border-r border-border/50 h-full overflow-y-auto fixed lg:static z-40 transition-all duration-300 shadow-xl lg:shadow-none ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-3 border-b-2 border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm relative overflow-hidden group">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <Settings className="w-4 h-4 text-primary-foreground drop-shadow-sm" />
              </div>
              <div>
                <h2 className="font-extrabold text-xs text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Admin Panel</h2>
                <p className="text-xs text-muted-foreground font-medium">Control Center</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 hover:bg-muted/80 rounded-md transition-all duration-300 hover:scale-110 hover:shadow-sm"
              aria-label="Close menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <nav className="p-2 space-y-0.5">
        {filteredSections.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          const hasActiveItem = section.items.some((item) => item.id === activeSection)

          return (
            <div key={section.id} className="space-y-0.5">
              <button
                onClick={() => toggleSection(section.id)}
                className={`group relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 overflow-hidden ${
                  hasActiveItem
                    ? "bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 text-primary shadow-md border border-primary/20"
                    : "text-foreground hover:bg-muted/60 hover:shadow-sm border border-transparent hover:border-border/50"
                }`}
              >
                {/* Hover shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                
                {/* Left accent bar */}
                {hasActiveItem && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-l-lg"></div>
                )}
                
                <div className="flex items-center gap-2 relative z-10">
                  <div className={`${hasActiveItem ? "text-primary" : "text-muted-foreground"} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    {section.icon}
                  </div>
                  <span className={hasActiveItem ? "bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent" : ""}>{section.label}</span>
                </div>
                <div className={`transition-transform duration-300 relative z-10 ${isExpanded ? "rotate-0" : ""}`}>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="ml-3 space-y-0.5 mt-0.5 border-l-2 border-border/30 pl-3">
                  {section.items.map((item) => {
                    const isActive = item.id === activeSection
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className={`group/item relative w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all duration-300 overflow-hidden ${
                          isActive
                            ? "bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/30 border border-primary/30"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:shadow-sm border border-transparent hover:border-border/50"
                        }`}
                      >
                        {/* Hover shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover/item:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                        
                        {/* Left accent bar for active */}
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-foreground to-primary-foreground/70 rounded-l-md"></div>
                        )}
                        
                        <div className={`${isActive ? "text-primary-foreground" : "text-muted-foreground"} group-hover/item:scale-110 group-hover/item:rotate-3 transition-all duration-300 relative z-10`}>
                          {item.icon}
                        </div>
                        <span className="relative z-10 font-semibold">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 bg-primary-foreground rounded-full shadow-sm shadow-primary-foreground/50 relative z-10"></div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        </nav>
      </div>
    </>
  )
}
