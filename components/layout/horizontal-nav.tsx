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
  Shield,
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

  const userRole = user?.role?.toLowerCase()
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/tickets", label: "Tickets", icon: TicketIcon },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/master-data", label: "Master Settings", icon: Database, minRole: "manager" },
    { href: "/admin", label: "Admin Dashboard", icon: Shield, minRole: "superadmin" },
  ]

  const allowedRoles: Record<string, string[]> = {
    manager: ["manager", "admin", "superadmin"],
    admin: ["admin", "superadmin"],
    superadmin: ["superadmin"],
  }

  const filteredNavItems = navItems.filter((item) => {
    if (!item.minRole) return true
    const rolesAllowed = allowedRoles[item.minRole] || []
    return rolesAllowed.includes(userRole || "")
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
    <header className="bg-white dark:bg-slate-900 border-b-2 dark:border-slate-800  sticky top-0 z-50">
      <div className="px-1 lg:px-1">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Nav Items - Left Aligned */}
          <div className="ml-5 flex items-center gap-4">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <Image
                src="/mfilterit-logo.png"
                alt="Company Logo"
                width={24}
                height={24}
                className="w-8 h-8"
              />
              <h1 className="hidden sm:block font-poppins font-bold text-slate-900 dark:text-white text-lg leading-none">
                Ticket Portal
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {filteredNavItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Section - User Info */}
          {/* <div className="hidden sm:block">
              <ThemeToggle />
            </div> */}
          <div className=" mr-5 flex items-center gap-3">
            {/* Theme Toggle */}
            

            {/* Notifications */}
            {/* <NotificationsDropdown /> */}

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
                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-tight">
                    {user?.group_name || user?.email || ""}
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
                  <div className="absolute right-0 mt-0 bg-popover text-popover-foreground overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md w-48 z-50">
                    {/* User Info Header */}
                    <div className="px-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {user?.full_name || "User"}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {user?.email || ""}
                      </p>
                      {user?.group_name && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                          {user.group_name}
                        </p>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="focus:bg-accent data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        User Settings
                      </Link>
                      
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                      
                      <button
                        onClick={handleLogout}
                        className="focus:bg-accent data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer gap-2 text-red-600 focus:text-red-600 w-full"
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
              {filteredNavItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              ))}
              
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
