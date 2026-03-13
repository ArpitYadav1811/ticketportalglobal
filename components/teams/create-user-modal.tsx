"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserRoles } from "@/lib/actions/users"

interface CreateUserModalProps {
 isOpen: boolean
 onClose: () => void
 onSuccess: () => void
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "user",
    password: "",
    confirmPassword: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [tempPassword, setTempPassword] = useState("")
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])
  const [useCustomPassword, setUseCustomPassword] = useState(false)

  useEffect(() => {
    const loadRoles = async () => {
      const result = await getUserRoles(false) // Don't include superadmin for user creation
      if (result.success && result.data) {
        setRoleOptions(result.data)
        // Set default role to first available role
        if (result.data.length > 0 && !formData.role) {
          setFormData(prev => ({ ...prev, role: result.data[0].value }))
        }
      }
    }
    if (isOpen) {
      loadRoles()
    }
  }, [isOpen])

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setSaving(true)
 setError("")

 try {
 if (!formData.full_name.trim() || !formData.email.trim()) {
 setError("Name and email are required")
 setSaving(false)
 return
 }

 // Validate password if custom password is enabled
 if (useCustomPassword) {
   if (!formData.password || formData.password.length < 6) {
     setError("Password must be at least 6 characters long")
     setSaving(false)
     return
   }
   if (formData.password !== formData.confirmPassword) {
     setError("Passwords do not match")
     setSaving(false)
     return
   }
 }

 const requestBody: any = {
   full_name: formData.full_name,
   email: formData.email,
   role: formData.role,
 }

 // Only include password if custom password is enabled
 if (useCustomPassword && formData.password) {
   requestBody.password = formData.password
 }

 const response = await fetch("/api/users/create", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(requestBody),
 })

 const data = await response.json()

 if (!response.ok) {
 setError(data.error || "Failed to create user")
 setSaving(false)
 return
 }

 if (data.tempPassword) {
   setTempPassword(data.tempPassword)
   navigator.clipboard.writeText(`Email: ${formData.email}\nTemporary Password: ${data.tempPassword}`)
 } else if (useCustomPassword) {
   // Set a flag to show success message even without temp password
   setTempPassword("custom")
 }

    setFormData({ full_name: "", email: "", role: roleOptions[0]?.value || "user", password: "", confirmPassword: "" })
    setUseCustomPassword(false)
 onSuccess()
 setTimeout(() => {
 onClose()
 setTempPassword("")
 }, 3000)
 } catch (err) {
 setError("An error occurred")
 } finally {
 setSaving(false)
 }
 }

 if (!isOpen) return null

 return (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl p-6 max-w-lg w-full">
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-sans font-bold text-xl text-foreground">Create New User</h3>
 <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-5">
 {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

 {tempPassword && (
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <p className="text-sm font-semibold text-green-800 mb-2">User Created Successfully!</p>
 {tempPassword !== "custom" ? (
   <>
     <p className="text-sm text-green-700 mb-3">Temporary credentials (copied to clipboard):</p>
     <div className="bg-white p-2 rounded border border-green-200 text-xs font-mono text-green-900 break-all">
       Email: {formData.email}
       <br />
       Password: {tempPassword}
     </div>
     <p className="text-xs text-green-700 mt-2">User should change password on first login</p>
   </>
 ) : (
   <p className="text-sm text-green-700">User created with custom password.</p>
 )}
 </div>
 )}

 {!tempPassword && (
 <>
 <div>
 <label className="block text-sm font-semibold text-foreground mb-2">
 Full Name <span className="text-destructive">*</span>
 </label>
 <input
 type="text"
 value={formData.full_name}
 onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
 placeholder="John Doe"
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-foreground mb-2">
 Email <span className="text-destructive">*</span>
 </label>
 <input
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 placeholder="user@company.com"
 className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-foreground mb-2">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            {roleOptions.length === 0 ? (
              <option value="">Loading roles...</option>
            ) : (
              roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))
            )}
          </select>
 </div>

 <div className="flex items-center gap-2">
   <input
     type="checkbox"
     id="useCustomPassword"
     checked={useCustomPassword}
     onChange={(e) => {
       setUseCustomPassword(e.target.checked)
       if (!e.target.checked) {
         setFormData({ ...formData, password: "", confirmPassword: "" })
       }
     }}
     className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
   />
   <label htmlFor="useCustomPassword" className="text-sm font-semibold text-foreground cursor-pointer">
     Set custom password
   </label>
 </div>

 {useCustomPassword && (
   <>
     <div>
       <label className="block text-sm font-semibold text-foreground mb-2">
         Password <span className="text-destructive">*</span>
       </label>
       <input
         type="password"
         value={formData.password}
         onChange={(e) => setFormData({ ...formData, password: e.target.value })}
         placeholder="Enter password (min 6 characters)"
         className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
         required={useCustomPassword}
       />
     </div>

     <div>
       <label className="block text-sm font-semibold text-foreground mb-2">
         Confirm Password <span className="text-destructive">*</span>
       </label>
       <input
         type="password"
         value={formData.confirmPassword}
         onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
         placeholder="Confirm password"
         className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
         required={useCustomPassword}
       />
     </div>
   </>
 )}

 <div className="flex gap-3 justify-end pt-6 border-t border-border">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 disabled={saving}
 className="px-6 bg-transparent"
 >
 Cancel
 </Button>
 <Button type="submit" disabled={saving} className="bg-black hover:bg-gray-800 px-6">
 {saving ? "Creating..." : "Create User"}
 </Button>
 </div>
 </>
 )}

 {tempPassword && (
 <div className="flex gap-3 justify-end pt-6 border-t border-border">
 <Button
 type="button"
 onClick={() => {
 onClose()
 setTempPassword("")
 }}
 className="bg-black hover:bg-gray-800 px-6"
 >
 Close
 </Button>
 </div>
 )}
 </form>
 </div>
 </div>
 )
}
