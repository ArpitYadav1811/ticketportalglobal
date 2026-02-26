"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import {
  Home,
  TicketIcon,
  BarChart3,
  Database,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Settings,
  User,
} from "lucide-react"
import NotificationsDropdown from "./notifications-dropdown"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserAvatar } from "@/components/ui/user-avatar"

interface UserData {
  id: number
  email: string
  full_name: string
  role: string
  business_unit_group_id?: number
  group_name?: string
}

export default function HorizontalNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [user, setUser] = useState<UserData | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load user data from session or localStorage
  useEffect(() => {
    try {
      // Prioritize NextAuth session data (for SSO users)
      if (status === "authenticated" && session?.user) {
        setUser({
          id: parseInt(session.user.id || "0"),
          email: session.user.email || "",
          full_name: session.user.name || "",
          role: session.user.role || "user",
          business_unit_group_id: session.user.business_unit_group_id || undefined,
          group_name: session.user.group_name || undefined,
        })
      } else {
        // Fallback to localStorage for email/password users
        const userData = localStorage.getItem("user")
        if (userData) {
          setUser(JSON.parse(userData))
        }
      }
    } catch (error) {
      console.error("Failed to parse user data:", error)
    }
  }, [status, session])

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/tickets", label: "Tickets", icon: TicketIcon },
    { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
    { href: "/master-data", label: "Master Settings", icon: Database, adminOnly: true },
  ]

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role?.toLowerCase() !== "admin") {
      return false
    }
    return true
  })

  const handleLogout = async () => {
    try {
      // Sign out from NextAuth (for SSO users)
      await signOut({ redirect: false, callbackUrl: "/login" })
    } catch (error) {
      console.error("NextAuth signOut error:", error)
    }

    // Clear localStorage (for email/password users)
    localStorage.removeItem("user")
    localStorage.removeItem("isLoggedIn")

    // Clear the authentication cookie
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

    // Redirect to login page
    router.push("/login")
    router.refresh()
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  return (
    <header className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-50">
      <div className="px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Nav Items - Left Aligned */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div>
                <Image
                  src="/mfilterit-logo.png"
                  alt="Company Logo"
                  width={24}
                  height={24}
                  className="w-12 h-12"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-poppins font-bold text-slate-900 dark:text-white text-2xl leading-tight">
                  Ticket Portal
                </h1>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {filteredNavItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-black text-white shadow-md"
                        : "text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Section - User Info */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Notifications */}
            <NotificationsDropdown />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                {/* Avatar */}
                <UserAvatar 
                  userName={user?.full_name || "User"} 
                  userEmail={user?.email}
                  size="md"
                  className="shadow-sm"
                />
                
                {/* User Info */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                    {user?.full_name || "User"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                    {user?.email || ""}
                  </p>
                </div>
                
                <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 hidden md:block transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border-2 border-slate-200 dark:border-slate-700 py-2 z-50 overflow-hidden">
                    {/* User Info Header (Mobile) */}
                    <div className="px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700 md:hidden bg-slate-50 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{initials}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {user?.full_name || "User"}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {user?.email || ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-4.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        User Settings
                      </Link>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-4.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              ) : (
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t-2 border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-2">
              {filteredNavItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-black text-white shadow-md"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                )
              })}
              
              {/* Theme Toggle in Mobile Menu */}
              <div className="sm:hidden px-4 py-3 border-t-2 border-slate-200 dark:border-slate-800 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
