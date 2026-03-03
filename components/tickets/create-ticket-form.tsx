"use client"

import type React from "react"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle, Plus, X, Paperclip, Users, Building2, Tag, FileText, Calendar, Clock, User, Sparkles, Target, Layers } from "lucide-react"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
import { createTicket, getUsers } from "@/lib/actions/tickets"
import {
  getTargetBusinessGroups,
  getBusinessUnitGroups,
  getCategories,
  getSubcategories,
  getSpocForTargetBusinessGroup,
  getClassificationMappingByTargetBusinessGroup,
  getOrganizations,
  getTargetBusinessGroupsByOrganization,
} from "@/lib/actions/master-data"
import { Combobox } from "@/components/ui/combobox"

interface FormData {
  isInternal: boolean
  ticketType: "support" | "requirement"
  organizationId: string // New field for Functional Area
  targetBusinessGroupId: string
  projectId: string
  estimatedReleaseDate: string
  categoryId: string
  subcategoryId: string
  title: string
  description: string
  estimatedDuration: string // Will be converted to number before submission
  spocId: string
  productReleaseName: string
  attachments: File[]
}

export default function CreateTicketForm() {
 const router = useRouter()
 const searchParams = useSearchParams()
 const isDuplicate = searchParams.get("duplicate") === "true"

 const parentTicketId = searchParams.get("parentTicketId")
 const isSubTicket = !!parentTicketId

 const [formData, setFormData] = useState<FormData>({
 isInternal: searchParams.get("isInternal") === "true",
 ticketType: (searchParams.get("ticketType") as "support" | "requirement") || "support",
 organizationId: searchParams.get("organizationId") || "",
 targetBusinessGroupId: searchParams.get("targetBusinessGroupId") || "",
 projectId: searchParams.get("projectId") || "",
 estimatedReleaseDate: searchParams.get("estimatedReleaseDate") || "",
 categoryId: searchParams.get("categoryId") || "",
 subcategoryId: searchParams.get("subcategoryId") || "",
 title: searchParams.get("title") || "",
 description: searchParams.get("description") || "",
 estimatedDuration: searchParams.get("estimatedDuration") || "",
 spocId: searchParams.get("spocId") || "",
 productReleaseName: searchParams.get("productReleaseName") || "",
 attachments: [],
 })
 const [userGroupId, setUserGroupId] = useState<string | null>(null)

 const [targetBusinessGroups, setTargetBusinessGroups] = useState<any[]>([])
 const [businessUnitGroups, setBusinessUnitGroups] = useState<any[]>([])
 const [organizations, setOrganizations] = useState<any[]>([])
 const [categories, setCategories] = useState<any[]>([])
 const [subcategories, setSubcategories] = useState<any[]>([])
 const [assignees, setAssignees] = useState<any[]>([])
 const [error, setError] = useState("")
 const [isLoading, setIsLoading] = useState(false)
 const [success, setSuccess] = useState(false)
 const fileInputRefSupport = useRef<HTMLInputElement>(null)
 const fileInputRefRequirement = useRef<HTMLInputElement>(null)

 useEffect(() => {
 // Load user's group from localStorage
 try {
 const userData = localStorage.getItem("user")
 if (userData) {
 const user = JSON.parse(userData)
 if (user.business_unit_group_id) {
 setUserGroupId(user.business_unit_group_id.toString())
 }
 }
 } catch (e) {
 console.error("Failed to parse user data:", e)
 }
 loadInitialData()
 }, [])

 // Pre-select target business group based on user's business unit group (only for customer tickets)
 useEffect(() => {
 if (userGroupId && !formData.targetBusinessGroupId && !isDuplicate && !formData.isInternal) {
 const userBug = businessUnitGroups.find(bug => bug.id.toString() === userGroupId)
 if (userBug) {
 // Customer ticket mappings: CS Apps -> TD Apps, CS Web -> TD Web, etc.
 const customerMappings: Record<string, string> = {
 'CS Apps': 'TD Apps',
 'CS Web': 'TD Web',
 'CS Brand': 'TD Brand',
 'CS BM': 'TD BM',
 'CS RMN': 'TD RMN',
 }
 
 const mappedTargetGroupName = customerMappings[userBug.name]
 if (mappedTargetGroupName) {
 const matchingTbg = targetBusinessGroups.find(tbg => tbg.name === mappedTargetGroupName)
 if (matchingTbg) {
 setFormData((prev) => ({ ...prev, targetBusinessGroupId: matchingTbg.id.toString() }))
 }
 }
 // For Sales and Others, no pre-selection (user will see filtered list)
 }
 }
 }, [userGroupId, businessUnitGroups, targetBusinessGroups, formData.isInternal, formData.targetBusinessGroupId, isDuplicate])

 const loadInitialData = async () => {
 console.log("[v0] Loading initial data for create ticket form")
 const [buResult, orgResult, catResult, usersResult] = await Promise.all([
 getBusinessUnitGroups(),
 getOrganizations(),
 getCategories(),
 getUsers(),
 ])

 console.log("[v0] Business Units:", buResult)
 console.log("[v0] Organizations:", orgResult)
 console.log("[v0] Categories:", catResult)
 console.log("[v0] Users:", usersResult)

 if (buResult.success) setBusinessUnitGroups(buResult.data || [])
 if (orgResult.success) {
 const orgCount = orgResult.data?.length || 0
 console.log("[v0] Setting organizations:", orgCount, "items")
 setOrganizations(orgResult.data || [])
 
 // Show warning if table is empty or doesn't exist
 if (orgCount === 0 && orgResult.error) {
 console.warn("[v0] Organizations not available:", orgResult.error)
 // You could show a toast notification here if needed
 }
 } else {
 console.warn("[v0] Failed to load organizations:", orgResult.error)
 setOrganizations([])
 }
 if (catResult.success) setCategories(catResult.data || [])
 if (usersResult.success) setAssignees(usersResult.data || [])

 // Load target business groups based on selected functional area
 if (formData.organizationId) {
 const tbgResult = await getTargetBusinessGroupsByOrganization(Number(formData.organizationId))
 if (tbgResult.success) setTargetBusinessGroups(tbgResult.data || [])
 } else {
 setTargetBusinessGroups([])
 }

 // If duplicating, load dependent data
 if (isDuplicate) {
 if (formData.categoryId) {
 loadSubcategories(Number(formData.categoryId))
 }
 }
 }

 useEffect(() => {
 if (formData.categoryId) {
 loadSubcategories(Number(formData.categoryId))
 } else {
 setSubcategories([])
 // Don't reset spocId here - it's set by group selection
 setFormData((prev) => ({ ...prev, subcategoryId: "", description: "", estimatedDuration: "" }))
 }
 }, [formData.categoryId])

 // Auto-select N/A when no subcategories are available
 useEffect(() => {
 if (formData.categoryId && subcategories.length === 0 && !formData.subcategoryId) {
 setFormData((prev) => ({ ...prev, subcategoryId: "N/A" }))
 }
 }, [subcategories, formData.categoryId])

 const loadSubcategories = async (categoryId: number) => {
 console.log("[v0] Loading subcategories for category:", categoryId)
 const result = await getSubcategories(categoryId)
 console.log("[v0] Subcategories result:", result)
 if (result.success) {
 setSubcategories(result.data || [])
 }
 }

 // Note: Auto-fill is now handled directly in handleSubcategoryChange using subcategory data
 // SPOC is auto-filled from Business Unit Group selection in handleBusinessUnitChange

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
 const { name, value } = e.target
 setFormData((prev) => ({ ...prev, [name]: value }))
 }

const handleTargetBusinessGroupChange = async (value: string) => {
  const selectedGroup = targetBusinessGroups.find((tbg) => tbg.id.toString() === value)
  let spocId = ""

  if (selectedGroup) {
    // Get SPOC based only on Group configuration from Master Settings (Business Groups tab)
    const spocResult = await getSpocForTargetBusinessGroup(Number(value))
    console.log("[v0] SPOC result for group:", spocResult)
    if (spocResult.success && spocResult.data) {
      spocId = spocResult.data.id.toString()
      console.log("[v0] Auto-selected SPOC from group:", spocId, spocResult.data.full_name)
    } else {
      console.warn("[v0] No group-level SPOC found for target business group:", value, selectedGroup.name)
    }
  }

  setFormData((prev) => ({
    ...prev,
    targetBusinessGroupId: value,
    categoryId: "",
    subcategoryId: "",
    spocId,
  }))
}

 const handleInternalToggle = async (isInternal: boolean) => {
 setFormData((prev) => ({
 ...prev,
 isInternal,
 organizationId: "", // Reset functional area selection
 targetBusinessGroupId: "", // Reset target business group selection
 categoryId: "",
 subcategoryId: "",
 spocId: "",
 }))
 // Reset target business groups when toggling
 if (isInternal) {
 setTargetBusinessGroups([])
 } else {
 // Load filtered target business groups for customer tickets based on user's group
 const userBug = businessUnitGroups.find(bug => bug.id.toString() === userGroupId)
 const allTbgResult = await getTargetBusinessGroups()
 
 if (allTbgResult.success && allTbgResult.data) {
 const allTargetGroups = allTbgResult.data
 
 if (userBug) {
 const userGroupName = userBug.name
 const customerMappings: Record<string, string> = {
 'CS Apps': 'TD Apps',
 'CS Web': 'TD Web',
 'CS Brand': 'TD Brand',
 'CS BM': 'TD BM',
 'CS RMN': 'TD RMN',
 }
 const showAllGroups = ['Sales', 'Others']
 
 if (showAllGroups.includes(userGroupName)) {
 const allowedGroups = ['TD Apps', 'TD Web', 'TD Brand', 'TD BM', 'TD RMN']
 setTargetBusinessGroups(allTargetGroups.filter(tbg => allowedGroups.includes(tbg.name)))
 } else if (customerMappings[userGroupName]) {
 const mappedGroup = customerMappings[userGroupName]
 setTargetBusinessGroups(allTargetGroups.filter(tbg => tbg.name === mappedGroup))
 } else {
 const allowedGroups = ['TD Apps', 'TD Web', 'TD Brand', 'TD BM', 'TD RMN']
 setTargetBusinessGroups(allTargetGroups.filter(tbg => allowedGroups.includes(tbg.name)))
 }
 } else {
 const allowedGroups = ['TD Apps', 'TD Web', 'TD Brand', 'TD BM', 'TD RMN']
 setTargetBusinessGroups(allTargetGroups.filter(tbg => allowedGroups.includes(tbg.name)))
 }
 }
 }
 }

 const handleOrganizationChange = async (value: string) => {
 setFormData((prev) => ({
 ...prev,
 organizationId: value,
 targetBusinessGroupId: "", // Reset target business group when functional area changes
 categoryId: "",
 subcategoryId: "",
 spocId: "",
 }))

 // Load target business groups for the selected functional area
 if (value) {
 const result = await getTargetBusinessGroupsByOrganization(Number(value))
 if (result.success) {
 setTargetBusinessGroups(result.data || [])
 }
 } else {
 setTargetBusinessGroups([])
 }
 }

 const handleCategoryChange = async (value: string) => {
 setFormData((prev) => ({
 ...prev,
 categoryId: value,
 subcategoryId: "",
 }))
 }

 const handleSubcategoryChange = async (value: string) => {
 if (!formData.targetBusinessGroupId || !formData.categoryId) {
 setFormData((prev) => ({
 ...prev,
 subcategoryId: value,
 }))
 return
 }

 // Find the selected subcategory
 const selectedSubcat = subcategories.find((s) => s.id.toString() === value)
 if (!selectedSubcat) {
 setFormData((prev) => ({
 ...prev,
 subcategoryId: value,
 }))
 return
 }

 // Try to get classification mapping for the selected target business group, category, and subcategory
 const mappingResult = await getClassificationMappingByTargetBusinessGroup(
 Number(formData.targetBusinessGroupId),
 Number(formData.categoryId),
 Number(value)
 )

 let durationText = ""
 let descriptionText = ""
 // Preserve existing SPOC if already set, otherwise try to get from mapping
 let spocId = formData.spocId || ""

 if (mappingResult.success && mappingResult.data) {
 // Use mapping data for auto-fill
 const mapping = mappingResult.data
 const durationMinutes = mapping.estimated_duration || 0
 
 if (durationMinutes >= 60) {
 const hours = Math.floor(durationMinutes / 60)
 const mins = durationMinutes % 60
 durationText = mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`
 } else if (durationMinutes > 0) {
 durationText = `${durationMinutes} min`
 }

 descriptionText = mapping.description || selectedSubcat.input_template || ""
 // Only update SPOC from mapping if it's provided, otherwise keep existing
 if (mapping.spoc_user_id) {
 spocId = mapping.spoc_user_id.toString()
 console.log("[v0] SPOC from mapping:", spocId)
 } else if (!spocId) {
 console.warn("[v0] No SPOC in mapping and no existing SPOC")
 }
 } else {
 // No mapping found - check if "Others" category/subcategory exists and use it
 const othersCategory = categories.find((c) => c.name === "Others")
 const othersSubcategory = othersCategory
 ? subcategories.find((s) => s.category_id === othersCategory.id && s.name === "Others")
 : null

 if (othersCategory && othersSubcategory) {
 // Try to get "Others" mapping for this target business group
 const othersMappingResult = await getClassificationMappingByTargetBusinessGroup(
 Number(formData.targetBusinessGroupId),
 othersCategory.id,
 othersSubcategory.id
 )

 if (othersMappingResult.success && othersMappingResult.data) {
 const othersMapping = othersMappingResult.data
 const durationMinutes = othersMapping.estimated_duration || 0
 
 if (durationMinutes >= 60) {
 const hours = Math.floor(durationMinutes / 60)
 const mins = durationMinutes % 60
 durationText = mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`
 } else if (durationMinutes > 0) {
 durationText = `${durationMinutes} min`
 }

 descriptionText = othersMapping.description || ""
 // Only update SPOC from "Others" mapping if it's provided, otherwise keep existing
 if (othersMapping.spoc_user_id) {
 spocId = othersMapping.spoc_user_id.toString()
 console.log("[v0] SPOC from 'Others' mapping:", spocId)
 } else if (!spocId) {
 console.warn("[v0] No SPOC in 'Others' mapping and no existing SPOC")
 }
 }

 // Update form to use "Others" category/subcategory
 setFormData((prev) => ({
 ...prev,
 categoryId: othersCategory.id.toString(),
 subcategoryId: othersSubcategory.id.toString(),
 description: descriptionText,
 estimatedDuration: durationText,
 spocId: spocId,
 }))
 return
 } else {
 // Fallback to subcategory data if available
 const durationMinutes = selectedSubcat.estimated_duration_minutes || 0
 if (durationMinutes >= 60) {
 const hours = Math.floor(durationMinutes / 60)
 const mins = durationMinutes % 60
 durationText = mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`
 } else if (durationMinutes > 0) {
 durationText = `${durationMinutes} min`
 }
 descriptionText = selectedSubcat.input_template || ""
 }
 }

 setFormData((prev) => ({
 ...prev,
 subcategoryId: value,
 description: descriptionText,
 estimatedDuration: durationText,
 spocId: spocId,
 }))
 }

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = Array.from(e.target.files || [])
 const validFiles: File[] = []
 const invalidFiles: string[] = []

 files.forEach((file) => {
 if (file.size > MAX_FILE_SIZE) {
 invalidFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
 } else {
 validFiles.push(file)
 }
 })

 if (invalidFiles.length > 0) {
 setError(`Files exceed 5MB limit: ${invalidFiles.join(", ")}`)
 }

 if (validFiles.length > 0) {
 setFormData((prev) => ({
 ...prev,
 attachments: [...prev.attachments, ...validFiles],
 }))
 }

 // Reset the input
 e.target.value = ""
 }

 const removeAttachment = (index: number) => {
 setFormData((prev) => ({
 ...prev,
 attachments: prev.attachments.filter((_, i) => i !== index),
 }))
 }

 const handleSubmit = async (e: FormEvent) => {
 e.preventDefault()
 setError("")
 setIsLoading(true)

 try {
 console.log("[v0] Submitting ticket with data:", formData)

 // Validate based on ticket type
 console.log("[v0] Validation - formData:", {
 ticketType: formData.ticketType,
 isInternal: formData.isInternal,
 organizationId: formData.organizationId,
 targetBusinessGroupId: formData.targetBusinessGroupId,
 categoryId: formData.categoryId,
 subcategoryId: formData.subcategoryId,
 spocId: formData.spocId,
 title: formData.title,
 })

 if (formData.ticketType === "requirement") {
 if (!formData.organizationId) {
 throw new Error("Please select a Functional Area")
 }
 if (!formData.targetBusinessGroupId || !formData.title || !formData.spocId || formData.spocId === "") {
 throw new Error("Please fill in all required fields (Business Group, Title, SPOC)")
 }
 } else {
 if (!formData.organizationId) {
 throw new Error("Please select a Functional Area")
 }
 
 // Detailed validation with specific error messages
 const missingFields: string[] = []
 if (!formData.targetBusinessGroupId || formData.targetBusinessGroupId === "") {
 missingFields.push("Business Group")
 }
 if (!formData.categoryId || formData.categoryId === "") {
 missingFields.push("Category")
 }
 if (!formData.subcategoryId || formData.subcategoryId === "") {
 missingFields.push("Sub-Category")
 }
 if (!formData.spocId || formData.spocId === "") {
 missingFields.push("SPOC")
 }
 
 if (missingFields.length > 0) {
 console.error("[v0] Missing required fields:", missingFields)
 console.error("[v0] Current formData values:", {
 targetBusinessGroupId: formData.targetBusinessGroupId,
 categoryId: formData.categoryId,
 subcategoryId: formData.subcategoryId,
 spocId: formData.spocId,
 })
 throw new Error(`Please fill in all required fields: ${missingFields.join(", ")}`)
 }
 }

 // Generate or use title based on ticket type
 let ticketTitle: string
 if (formData.ticketType === "requirement") {
 ticketTitle = formData.title
 } else {
 const selectedCategory = categories.find((c) => c.id.toString() === formData.categoryId)
 const selectedSubcategory = subcategories.find((s) => s.id.toString() === formData.subcategoryId)
 ticketTitle = selectedSubcategory
 ? `${selectedCategory?.name} - ${selectedSubcategory?.name}`
 : selectedCategory?.name || "Untitled Ticket"
 }

 const result = await createTicket({
 ticketType: formData.ticketType,
 parentTicketId: isSubTicket && parentTicketId ? Number(parentTicketId) : null,
 targetBusinessGroupId: Number(formData.targetBusinessGroupId),
 projectId: formData.projectId ? Number(formData.projectId) : null,
 categoryId: formData.categoryId ? Number(formData.categoryId) : null,
 subcategoryId: formData.subcategoryId && formData.subcategoryId !== "N/A" ? Number(formData.subcategoryId) : null,
 title: ticketTitle,
 description: formData.description || "",
      estimatedDuration: Number(formData.estimatedDuration) || 0, // Convert string to number (hours)
 spocId: Number(formData.spocId),
 productReleaseName: formData.productReleaseName,
 estimatedReleaseDate: formData.estimatedReleaseDate || null,
 isInternal: formData.isInternal,
 })

 console.log("[v0] Create ticket result:", result)

 if (!result.success) {
 throw new Error(result.error || "Failed to create ticket")
 }

 // Upload attachments if any
 if (formData.attachments.length > 0 && result.data) {
 const ticketId = result.data.id
 const userId = JSON.parse(localStorage.getItem("user") || "{}").id
 const failedUploads: string[] = []

 for (const file of formData.attachments) {
 const uploadFormData = new FormData()
 uploadFormData.append("file", file)
 uploadFormData.append("ticketId", ticketId.toString())
 uploadFormData.append("uploadedBy", userId?.toString() || "")

 const uploadResponse = await fetch("/api/attachments", {
 method: "POST",
 body: uploadFormData,
 })

 if (!uploadResponse.ok) {
 console.error("Failed to upload attachment:", file.name)
 failedUploads.push(file.name)
 }
 }

 // Show warning if any uploads failed
 if (failedUploads.length > 0) {
 alert(`Ticket created but ${failedUploads.length} attachment(s) failed to upload: ${failedUploads.join(", ")}.\n\nNote: File uploads don't work on Vercel's free tier. Please use the Edit page to add attachments after deployment to a server with file storage.`)
 }
 }

 setSuccess(true)
 setTimeout(() => {
 if (result.data) {
 router.push(`/tickets?created=${result.data.ticket_id}`)
 } else {
 router.push("/tickets")
 }
 }, 2000)
 } catch (err) {
 console.error("[v0] Error creating ticket:", err)
 setError(err instanceof Error ? err.message : "Failed to create ticket")
 } finally {
 setIsLoading(false)
 }
 }

 if (success) {
 return (
 <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center animate-in zoom-in fade-in duration-500">
 <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4 animate-bounce">
 <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
 </div>
 <h3 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">Ticket Created Successfully!</h3>
 <p className="text-green-700 dark:text-green-400 font-medium">Redirecting you to the ticket list...</p>
 </div>
 )
 }

 return (
 <form onSubmit={handleSubmit} className="space-y-6 p-8">
 {error && (
 <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 animate-in slide-in-from-top-2 fade-in">
 <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
 <p className="text-red-800 dark:text-red-300 text-sm font-semibold">{error}</p>
 </div>
 )}

 {/* First Section: Ticket Functional Area, Business Group, Ticket Type, SPOC */}
 <div className="bg-white border border-border rounded-lg p-6 space-y-4 dark:bg-slate-800 dark:border-slate-600 dark:">
 {/* Row 1: Ticket Functional Area and Business Group */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Ticket Functional Area *
 </label>
 <Combobox
 options={organizations && organizations.length > 0 ? organizations.map((org) => ({
 value: org.id.toString(),
 label: org.name,
 subtitle: org.description,
 })) : []}
 value={formData.organizationId}
 onChange={handleOrganizationChange}
 placeholder={organizations.length === 0 ? "Loading functional areas..." : "Select functional area..."}
 searchPlaceholder="Search functional areas..."
 emptyText={organizations.length === 0 ? "No functional areas available. Please ensure the organizations table is seeded." : "No functional areas found"}
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Business Group *
 </label>
 <Combobox
 options={targetBusinessGroups.map((tbg) => ({
 value: tbg.id.toString(),
 label: tbg.name,
 subtitle: tbg.description,
 }))}
 value={formData.targetBusinessGroupId}
 onChange={handleTargetBusinessGroupChange}
 placeholder={
 formData.organizationId
 ? "Select business group..."
 : "Select functional area first..."
 }
 searchPlaceholder="Search business groups..."
 emptyText="No business groups found"
 disabled={!formData.organizationId}
 />
 </div>
 </div>

 {/* Row 2: Ticket Type and SPOC */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Ticket Type *
 </label>
 <Combobox
 options={[
 { value: "support", label: "Support Issue" },
 { value: "requirement", label: "New Requirement" },
 ]}
 value={formData.ticketType}
 onChange={(value) => setFormData((prev) => ({ ...prev, ticketType: value as "support" | "requirement" }))}
 placeholder="Select ticket type..."
 searchPlaceholder="Search ticket types..."
 emptyText="No ticket types found"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 SPOC * <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Auto-selected based on Group)</span>
 </label>
 <Combobox
 options={assignees.map((user) => ({
 value: user.id.toString(),
 label: user.full_name || user.name,
 subtitle: user.email,
 }))}
 value={formData.spocId}
 onChange={(value) => {
 console.log("[v0] SPOC manually changed to:", value)
 setFormData((prev) => ({ ...prev, spocId: value }))
 }}
 placeholder={
 formData.targetBusinessGroupId
 ? formData.spocId
 ? "SPOC auto-selected"
 : "No SPOC found - please select manually"
 : "Select Business Group first"
 }
 searchPlaceholder="Search team members..."
 emptyText="No team members found"
 disabled={!!formData.spocId && !!formData.targetBusinessGroupId}
 />
 {formData.targetBusinessGroupId && !formData.spocId && (
 <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
 ⚠️ No SPOC found for this Business Group. Please select a SPOC manually or configure one in Master Settings &gt; Groups.
 </p>
 )}
 </div>
 </div>
 </div>

 {/* Ticket Classification */}
 <div className="bg-white border border-border rounded-lg p-6 space-y-4 dark:bg-slate-800 dark:border-slate-600 dark:">
 <h3 className="font-inter font-semibold text-foreground">
 Ticket Classification
 </h3>

 {formData.ticketType === "requirement" ? (
 <>
 {/* Row 3: Title (full width for requirement) */}
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Title *
 </label>
 <input
 type="text"
 name="title"
 value={formData.title}
 onChange={handleInputChange}
 placeholder="Enter a descriptive title for this requirement"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-sm"
 />
 </div>

 {/* Row 4: Description (full width) */}
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Description
 </label>
 <textarea
 name="description"
 value={formData.description}
 onChange={handleInputChange}
 placeholder="Describe the requirement in detail..."
 rows={4}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-sm"
 />
 </div>

 {/* Row 5: Estimated Hrs and Attachments (2-column grid) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Estimated Hrs *
 </label>
 <input
 type="number"
 name="estimatedDuration"
 value={formData.estimatedDuration}
 onChange={handleInputChange}
 min="1"
 step="1"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-sm"
 placeholder="Enter estimated hours (e.g., 2, 8, 16)"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Attachments
 {formData.attachments.length > 0 && (
 <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-2">
 ({formData.attachments.length} file{formData.attachments.length > 1 ? "s" : ""})
 </span>
 )}
 </label>
 <div className="relative">
 <input
 type="file"
 multiple
 onChange={handleFileChange}
 ref={fileInputRefRequirement}
 className="hidden"
 />
 <button
 type="button"
 onClick={() => fileInputRefRequirement.current?.click()}
 className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 text-sm flex items-center justify-center gap-2"
 >
 <Paperclip className="w-4 h-4" />
 Choose files
 </button>
 </div>
 </div>
 </div>
 </>
 ) : (
 <>
 {/* Row 3: Category and Sub Category (2-column grid) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Category *</label>
 <Combobox
 options={categories.map((cat) => ({
 value: cat.id.toString(),
 label: cat.name,
 subtitle: cat.description,
 }))}
 value={formData.categoryId}
 onChange={handleCategoryChange}
 placeholder={formData.targetBusinessGroupId ? "Select a category..." : "Select a business group first"}
 searchPlaceholder="Search categories..."
 emptyText="No categories found"
 disabled={!formData.targetBusinessGroupId}
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Sub Category *
 </label>
 <Combobox
 options={
 subcategories.length > 0
 ? subcategories.map((sub) => ({
 value: sub.id.toString(),
 label: sub.name,
 subtitle: sub.description,
 }))
 : [{ value: "N/A", label: "N/A", subtitle: "No subcategories available" }]
 }
 value={formData.subcategoryId || (subcategories.length === 0 && formData.categoryId ? "N/A" : "")}
 onChange={handleSubcategoryChange}
 placeholder={formData.categoryId ? "Select a sub-category..." : "Select a category first"}
 searchPlaceholder="Search sub-categories..."
 emptyText="No sub-categories available"
 disabled={!formData.categoryId}
 />
 </div>
 </div>

 {/* Row 4: Description (full width) */}
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Description
 </label>
 <textarea
 name="description"
 value={formData.description}
 onChange={handleInputChange}
 placeholder="Auto-filled based on category and sub-category selection. You can edit this."
 rows={4}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-sm"
 />
 </div>

 {/* Row 5: Estimated Hrs and Attachments (2-column grid) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Estimated Hrs *
 </label>
 <input
 type="number"
 name="estimatedDuration"
 value={formData.estimatedDuration}
 onChange={handleInputChange}
 min="1"
 step="1"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-sm"
 placeholder="Enter estimated hours (e.g., 2, 8, 16)"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Attachments
 {formData.attachments.length > 0 && (
 <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-2">
 ({formData.attachments.length} file{formData.attachments.length > 1 ? "s" : ""})
 </span>
 )}
 </label>
 <div className="relative">
 <input
 type="file"
 multiple
 onChange={handleFileChange}
 ref={fileInputRefSupport}
 className="hidden"
 />
 <button
 type="button"
 onClick={() => fileInputRefSupport.current?.click()}
 className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 text-sm flex items-center justify-center gap-2"
 >
 <Paperclip className="w-4 h-4" />
 Choose files
 </button>
 </div>
 </div>
 </div>
 </>
 )}

 {/* File list display */}
 {formData.attachments.length > 0 && (
 <div className="mt-4 space-y-2">
 {formData.attachments.map((file, idx) => (
 <div
 key={idx}
 className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all duration-200 hover:border-gray-400 dark:hover:border-blue-600"
 >
 <div className="flex items-center gap-3 min-w-0 flex-1">
 <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
 <div className="min-w-0 flex-1">
 <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
 <p className="text-xs text-slate-600 dark:text-slate-400">
 {(file.size / 1024).toFixed(1)} KB
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => removeAttachment(idx)}
 className="p-1.5 hover:bg-red-50 rounded transition-colors flex-shrink-0"
 >
 <X className="w-4 h-4 text-danger" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Submit Button & Cancel Button */}
 <div className="flex gap-3 justify-end">
 <button
 type="button"
 onClick={() => router.back()}
 className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isLoading}
 className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold hover:transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <CheckCircle className="w-4 h-4" /><span>{isLoading ? "Creating..." : "Create Ticket"}</span>
 </button>
 </div>
 </form>
 )
}


