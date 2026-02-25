"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Trash2, Users, UserPlus } from "lucide-react"
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
  const [activeTab, setActiveTab] = useState("my-team")
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
      <div className="max-w-5xl mx-auto">
        {/* Simple Header - matching customer portal */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            User Settings
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage your team and groups for collaboration
          </p>
        </div>

        {/* Tabs - cleaner design */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="my-team">My Team</TabsTrigger>
            <TabsTrigger value="business-group">Business Group</TabsTrigger>
          </TabsList>

          {/* My Team Tab */}
          <TabsContent value="my-team" className="mt-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">My Team Members</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Members whose interactions appear when you use the "My Team" filter.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Select Members
                </button>
              </div>

              {teamMembers.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">No team members added yet.</p>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-medium mt-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add your first member
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{member.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveTeamMember(member.team_member_id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Business Group Tab */}
          <TabsContent value="business-group" className="mt-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Business Group</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Select a group to display in your profile. This will appear next to your name and department.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Business Group
                  </label>
                  <select
                    value={selectedBusinessGroup}
                    onChange={(e) => setSelectedBusinessGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                  >
                    <option value="">Select a business group</option>
                    {businessGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBusinessGroup && (
                  <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-white dark:bg-slate-800 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>
                      Your profile shows: Your Name • Department • {businessGroups.find(bg => bg.id === Number(selectedBusinessGroup))?.name}
                    </span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveBusinessGroup}
                    disabled={saving || !selectedBusinessGroup}
                    className="bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
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
