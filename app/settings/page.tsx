"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Settings, Plus, Trash2, Users, Eye, EyeOff, Check, UserPlus, Moon, Sun, Monitor } from "lucide-react"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { getUsers } from "@/lib/actions/tickets"
import {
  updateUserBusinessGroup,
  updateUserProfile,
  changeUserPassword,
} from "@/lib/actions/users"
import {
  getMyTeamMembers,
  addMyTeamMember,
  removeMyTeamMember,
} from "@/lib/actions/my-team"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AddTeamMemberModal from "@/components/settings/add-team-member-modal"

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("my-group")
  const [mounted, setMounted] = useState(false)
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Form states
  const [selectedBusinessGroup, setSelectedBusinessGroup] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load business groups once on mount
  useEffect(() => {
    const loadBusinessGroups = async () => {
      try {
        const buResult = await getBusinessUnitGroups()
        if (buResult.success) {
          setBusinessGroups(buResult.data || [])
        }
      } catch (error) {
        console.error("Failed to load business groups:", error)
      }
    }
    loadBusinessGroups()
  }, [])

  // Load initial user data and update when session changes
  useEffect(() => {
    // Handle loading state explicitly to prevent infinite loading during HMR
    if (status === "loading") {
      // Keep loading state true while NextAuth is initializing
      return
    }

    if (status === "authenticated" && session?.user) {
      const userFromSession = {
        id: parseInt(session.user.id || "0"),
        email: session.user.email || "",
        full_name: session.user.name || "",
        role: session.user.role || "user",
        business_unit_group_id: session.user.business_unit_group_id || null,
        group_name: session.user.group_name || "",
        auth_provider: session.user.auth_provider || "email",
      }
      setCurrentUser(userFromSession)
      setFullName(userFromSession.full_name || "")
      setSelectedBusinessGroup(userFromSession.business_unit_group_id?.toString() || "")
      localStorage.setItem("user", JSON.stringify(userFromSession))
      setLoading(false)
    } else if (status === "unauthenticated") {
      // Fallback to localStorage for email/password users
      const userData = localStorage.getItem("user")
      if (userData) {
        try {
          const user = JSON.parse(userData)
          setCurrentUser(user)
          setFullName(user.full_name || "")
          setSelectedBusinessGroup(user.business_unit_group_id || "")
        } catch (error) {
          console.error("Failed to parse user data:", error)
        }
      }
      setLoading(false)
    }
  }, [status, session])

  useEffect(() => {
    if (activeTab === "my-team" && currentUser?.id) {
      loadTeamMembers()
    }
  }, [activeTab, currentUser])

  const loadTeamMembers = async () => {
    if (!currentUser?.id) return

    try {
      const result = await getMyTeamMembers(currentUser.id)
      if (result.success && result.data) {
        // Group users by their business unit group
        const mappedMembers = result.data.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          group: user.group_name || "No Group",
          team_member_id: user.team_member_id,
        }))
        setTeamMembers(mappedMembers)
      }
    } catch (error) {
      console.error("Failed to load team members:", error)
    }
  }

  const handleAddTeamMember = async (userId: number) => {
    if (!currentUser?.id) return

    const result = await addMyTeamMember(currentUser.id, userId)
    if (result.success) {
      await loadTeamMembers()
    } else {
      alert(result.error || "Failed to add team member")
    }
  }

  const handleRemoveTeamMember = async (teamMemberId: number) => {
    if (!currentUser?.id) return

    if (!confirm("Are you sure you want to remove this team member?")) {
      return
    }

    const result = await removeMyTeamMember(currentUser.id, teamMemberId)
    if (result.success) {
      await loadTeamMembers()
    } else {
      alert(result.error || "Failed to remove team member")
    }
  }

  const handleSaveBusinessGroup = async () => {
    if (!currentUser?.id || !selectedBusinessGroup) {
      alert("Please select a business group")
      return
    }

    setSaving(true)
    try {
      const result = await updateUserBusinessGroup(currentUser.id, Number(selectedBusinessGroup))

      if (result.success) {
        // Update localStorage with new data
        const updatedUser = {
          ...currentUser,
          business_unit_group_id: Number(selectedBusinessGroup),
          group_name: businessGroups.find(bg => bg.id === Number(selectedBusinessGroup))?.name
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)
        
        // Refresh NextAuth session to sync changes
        if (status === "authenticated") {
          update().catch(console.error)
        }
        
        alert("Business group updated successfully!")
      } else {
        alert(result.error || "Failed to update business group")
      }
    } catch (error) {
      console.error("Error updating business group:", error)
      alert("Failed to update business group")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAccountInfo = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser?.id || !fullName || !selectedBusinessGroup) {
      alert("Please fill in all required fields")
      return
    }

    setSaving(true)
    try {
      const result = await updateUserProfile(currentUser.id, {
        fullName,
        businessGroupId: Number(selectedBusinessGroup)
      })

      if (result.success) {
        // Update localStorage with new data
        const updatedUser = {
          ...currentUser,
          full_name: fullName,
          business_unit_group_id: Number(selectedBusinessGroup),
          group_name: businessGroups.find(bg => bg.id === Number(selectedBusinessGroup))?.name
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)
        
        // Refresh NextAuth session to sync changes
        if (status === "authenticated") {
          update().catch(console.error)
        }
        
        alert("Account information updated successfully!")
      } else {
        alert(result.error || "Failed to update account information")
      }
    } catch (error) {
      console.error("Error updating account info:", error)
      alert("Failed to update account information")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser?.id) {
      alert("User not authenticated")
      return
    }

    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!")
      return
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long")
      return
    }

    setSaving(true)
    try {
      const result = await changeUserPassword(currentUser.id, currentPassword, newPassword)

      if (result.success) {
        alert("Password changed successfully!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setShowPasswordSection(false)
      } else {
        alert(result.error || "Failed to change password")
      }
    } catch (error) {
      console.error("Error changing password:", error)
      alert("Failed to change password")
    } finally {
      setSaving(false)
    }
  }

  const groupedTeamMembers = teamMembers.reduce((acc: any, member: any) => {
    if (!acc[member.group]) {
      acc[member.group] = []
    }
    acc[member.group].push(member)
    return acc
  }, {})

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-full">
        <div className="mb-2 bg-white dark:bg-gray-800 border border-border rounded-xl p-4 shadow-sm">
          <h1 className="text-3xl font-poppins font-bold text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full bg-white dark:bg-gray-800 border border-border rounded-xl p-2 shadow-sm">
          <TabsList className="grid w-full grid-cols-4 border-b ">
            <TabsTrigger value="my-group">My Group</TabsTrigger>
            <TabsTrigger value="my-team">My Team</TabsTrigger>
            <TabsTrigger value="account">Account Information</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          {/* My Group Tab */}
          <TabsContent value="my-group" className="mt-2">
            <div className="bg-card dark:bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-foreground">Business Group</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Select your business group</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Business Group <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBusinessGroup}
                    onChange={(e) => setSelectedBusinessGroup(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-card dark:bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">Select a business group</option>
                    {businessGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveBusinessGroup}
                    disabled={saving || !selectedBusinessGroup}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* My Team Tab */}
          <TabsContent value="my-team" className="mt-6">
            <div className="bg-card dark:bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-lg text-foreground">My Team</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage your team members</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowAddMemberModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

              {Object.keys(groupedTeamMembers).length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground font-medium mb-1">No team members yet</p>
                  <p className="text-sm text-muted-foreground">Add users to start building your team</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedTeamMembers).map(([groupName, members]: [string, any]) => (
                    <div key={groupName} className="border border-border rounded-lg">
                      <div className="bg-surface px-4 py-3 border-b border-border">
                        <h4 className="font-semibold text-foreground">{groupName}</h4>
                      </div>
                      <div className="p-2">
                        {members.map((member: any) => (
                          <div
                            key={member.id}
                            className="flex justify-between items-center p-3 rounded-lg hover:bg-surface group"
                          >
                            <div>
                              <p className="font-medium text-foreground">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTeamMember(member.team_member_id)}
                              className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Account Information Tab */}
          <TabsContent value="account" className="mt-6">
            <div className="bg-card dark:bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="font-poppins font-semibold text-foreground text-lg mb-6">Account Information</h3>

              <form onSubmit={handleSaveAccountInfo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-card dark:bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                  <input
                    type="email"
                    value={currentUser?.email || ""}
                    readOnly
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-foreground cursor-not-allowed text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Business Group</label>
                  <select
                    value={selectedBusinessGroup}
                    onChange={(e) => setSelectedBusinessGroup(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-card dark:bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">Select a business group</option>
                    {businessGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <input
                    type="text"
                    value={currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1) || "User"}
                    readOnly
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-foreground cursor-not-allowed text-sm"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>

              {/* Password Change Section */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Change Password</h4>
                    <p className="text-sm text-muted-foreground">Update your password</p>
                  </div>
                  {!showPasswordSection && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordSection(true)}
                    >
                      Change Password
                    </Button>
                  )}
                </div>

                {showPasswordSection && (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Current Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Confirm New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordSection(false)
                          setCurrentPassword("")
                          setNewPassword("")
                          setConfirmPassword("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-gradient-to-r from-primary to-secondary"
                      >
                        {saving ? "Changing..." : "Change Password"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-6">
            <div className="bg-card dark:bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-foreground">Theme Preferences</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Customize your visual experience</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-4">
                    Choose your theme
                  </label>
                  
                  {mounted ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Light Theme Option */}
                      <button
                        onClick={() => setTheme("light")}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          theme === "light"
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 flex items-center justify-center">
                            <Sun className="w-6 h-6 text-yellow-700" />
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-foreground">Light</div>
                            <div className="text-xs text-muted-foreground mt-1">Bright and clear</div>
                          </div>
                          {theme === "light" && (
                            <div className="absolute top-2 right-2">
                              <Check className="w-5 h-5 text-primary" />
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Dark Theme Option */}
                      <button
                        onClick={() => setTheme("dark")}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          theme === "dark"
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                            <Moon className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-foreground">Dark</div>
                            <div className="text-xs text-muted-foreground mt-1">Easy on the eyes</div>
                          </div>
                          {theme === "dark" && (
                            <div className="absolute top-2 right-2">
                              <Check className="w-5 h-5 text-primary" />
                            </div>
                          )}
                        </div>
                      </button>

                      {/* System Theme Option */}
                      <button
                        onClick={() => setTheme("system")}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          theme === "system"
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                            <Monitor className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-foreground">System</div>
                            <div className="text-xs text-muted-foreground mt-1">Match your device</div>
                          </div>
                          {theme === "system" && (
                            <div className="absolute top-2 right-2">
                              <Check className="w-5 h-5 text-primary" />
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 rounded-lg border-2 border-border bg-card">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                            <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                            <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-start gap-3 p-4 bg-muted/50 dark:bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground mt-0.5">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium mb-1">Theme Preference</p>
                      <p className="text-xs text-muted-foreground">
                        Your theme preference is saved locally and will persist across sessions. 
                        The System option automatically switches between light and dark based on your device settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Team Member Modal */}
      <AddTeamMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onAdd={handleAddTeamMember}
        currentUserId={currentUser?.id || 0}
      />
    </DashboardLayout>
  )
}
