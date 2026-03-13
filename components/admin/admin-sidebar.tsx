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
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-2 border-primary/30 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300 hover:scale-110 group"
        aria-label="Toggle menu"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
        <Settings className="w-5 h-5 text-primary relative z-10 group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`w-64 bg-gradient-to-br from-card/98 via-card/95 to-card/98 backdrop-blur-xl border-r-2 border-border/50 h-full overflow-y-auto fixed lg:static z-40 transition-all duration-300 shadow-2xl lg:shadow-lg custom-scrollbar ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none"></div>
        
        {/* Floating gradient orbs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-2xl opacity-50"></div>
        
        <div className="relative z-10 p-3 border-b-2 border-border/50 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent backdrop-blur-sm relative overflow-hidden group">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:shadow-primary/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border-2 border-primary/30">
                  <Settings className="w-4.5 h-4.5 text-primary-foreground drop-shadow-sm" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card shadow-sm animate-pulse"></div>
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-foreground bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">Admin Panel</h2>
                <p className="text-[10px] text-muted-foreground font-semibold">Control Center</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 hover:bg-muted/80 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md border border-transparent hover:border-border/50"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="p-2.5 space-y-1 relative z-10">
        {filteredSections.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          const hasActiveItem = section.items.some((item) => item.id === activeSection)

          return (
            <div key={section.id} className="space-y-0.5">
              <button
                onClick={() => toggleSection(section.id)}
                className={`group relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-300 overflow-hidden ${
                  hasActiveItem
                    ? "bg-gradient-to-r from-primary/25 via-primary/20 to-primary/15 text-primary shadow-lg shadow-primary/20 border-2 border-primary/30"
                    : "text-foreground hover:bg-gradient-to-r hover:from-muted/70 hover:via-muted/60 hover:to-muted/70 hover:shadow-md border-2 border-transparent hover:border-border/60"
                }`}
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Hover shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                
                {/* Left accent bar */}
                {hasActiveItem && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary via-primary/80 to-primary rounded-l-xl shadow-lg shadow-primary/50"></div>
                )}
                
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                    hasActiveItem 
                      ? "bg-primary/20 text-primary shadow-sm" 
                      : "text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  } group-hover:scale-110 group-hover:rotate-3`}>
                    {section.icon}
                  </div>
                  <span className={hasActiveItem ? "bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent" : ""}>{section.label}</span>
                </div>
                <div className={`transition-transform duration-300 relative z-10 ${isExpanded ? "rotate-0" : "-rotate-90"}`}>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="ml-4 space-y-1 mt-1.5 border-l-2 border-primary/20 pl-3 relative">
                  {/* Animated line glow */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/60 to-primary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {section.items.map((item) => {
                    const isActive = item.id === activeSection
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className={`group/item relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-300 overflow-hidden ${
                          isActive
                            ? "bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground font-extrabold shadow-lg shadow-primary/40 border-2 border-primary/40"
                            : "text-muted-foreground hover:bg-gradient-to-r hover:from-muted/70 hover:via-muted/60 hover:to-muted/70 hover:text-foreground hover:shadow-md border-2 border-transparent hover:border-border/60"
                        }`}
                      >
                        {/* Animated background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500"></div>
                        
                        {/* Hover shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover/item:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                        
                        {/* Left accent bar for active */}
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary-foreground via-primary-foreground/90 to-primary-foreground rounded-l-lg shadow-lg shadow-primary-foreground/50"></div>
                        )}
                        
                        <div className={`p-1 rounded-md transition-all duration-300 relative z-10 ${
                          isActive 
                            ? "bg-primary-foreground/20 text-primary-foreground shadow-sm" 
                            : "text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary"
                        } group-hover/item:scale-110 group-hover/item:rotate-3`}>
                          {item.icon}
                        </div>
                        <span className="relative z-10 font-bold flex-1 text-left">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full shadow-md shadow-primary-foreground/60 relative z-10 animate-pulse"></div>
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
