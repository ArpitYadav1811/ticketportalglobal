"use client"

import type React from "react"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, X, Paperclip, Link2, Loader2, Check, AlertCircle } from "lucide-react"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
import { createTicket, getUsers, addTicketReferences } from "@/lib/actions/tickets"
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
import { TicketSuccessDialog } from "@/components/tickets/ticket-success-dialog"

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
 const [isLoading, setIsLoading] = useState(false)
 const [showSuccessDialog, setShowSuccessDialog] = useState(false)
 const [createdTicketId, setCreatedTicketId] = useState<string | null>(null)
 const fileInputRefSupport = useRef<HTMLInputElement>(null)
 const fileInputRefRequirement = useRef<HTMLInputElement>(null)

 // Reference ticket state
 const [referenceInput, setReferenceInput] = useState("")
 const [referenceValidating, setReferenceValidating] = useState(false)
 const [referenceValidation, setReferenceValidation] = useState<{
  success: boolean
  message: string
  data?: { id: number; ticket_id: string; title: string; ticket_number: number; status: string }
 } | null>(null)
 const [referenceTickets, setReferenceTickets] = useState<
  { id: number; ticket_id: string; title: string; ticket_number: number; status: string }[]
 >([])
 const referenceTicketsRef = useRef<
  { id: number; ticket_id: string; title: string; ticket_number: number; status: string }[]
 >([])
 const referenceValidationRef = useRef<{
  success: boolean
  data?: { id: number; ticket_id: string; title: string; ticket_number: number; status: string }
 } | null>(null)
 const referenceDebounceRef = useRef<NodeJS.Timeout | null>(null)

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
 'CS Brand': 'TD Web',
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
 const [buResult, orgResult, usersResult] = await Promise.all([
 getBusinessUnitGroups(),
 getOrganizations(),
 getUsers(),
 ])

 console.log("[v0] Business Units:", buResult)
 console.log("[v0] Organizations:", orgResult)
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
 if (usersResult.success) setAssignees(usersResult.data || [])

 // Load target business groups based on selected functional area
 if (formData.organizationId) {
 const tbgResult = await getTargetBusinessGroupsByOrganization(Number(formData.organizationId))
 if (tbgResult.success) setTargetBusinessGroups(tbgResult.data || [])
 } else {
 setTargetBusinessGroups([])
 }

 // Load categories for selected business group (if any)
 if (formData.targetBusinessGroupId) {
 const catResult = await getCategories(Number(formData.targetBusinessGroupId))
 console.log("[v0] Categories for BG:", catResult)
 if (catResult.success) setCategories(catResult.data || [])
 }

 // If duplicating, load dependent data
 if (isDuplicate) {
 if (formData.categoryId) {
 loadSubcategories(Number(formData.categoryId))
 }
 }
 }

 // Load categories when business group changes
 useEffect(() => {
 if (formData.targetBusinessGroupId) {
 loadCategoriesForBusinessGroup(Number(formData.targetBusinessGroupId))
 } else {
 setCategories([])
 setFormData((prev) => ({ ...prev, categoryId: "", subcategoryId: "" }))
 }
 }, [formData.targetBusinessGroupId])

 useEffect(() => {
 if (formData.categoryId) {
 if (formData.categoryId === "others") {
 // Handle "Others" category - set "Others" subcategory directly
 setSubcategories([{ id: "others", name: "Others", description: "Other subcategory", category_id: 0 }])
 } else {
 loadSubcategories(Number(formData.categoryId))
 }
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

 const loadCategoriesForBusinessGroup = async (businessGroupId: number) => {
 console.log("[v0] Loading categories for business group:", businessGroupId)
 const result = await getCategories(businessGroupId)
 console.log("[v0] Categories result:", result)
 if (result.success) {
 setCategories(result.data || [])
 } else {
 setCategories([])
 }
 }

 const loadSubcategories = async (categoryId: number) => {
 console.log("[v0] Loading subcategories for category:", categoryId)
 const result = await getSubcategories(categoryId)
 console.log("[v0] Subcategories result:", result)
 if (result.success) {
 const loadedSubcategories = result.data || []
 // Always add "Others" subcategory option
 setSubcategories([
 ...loadedSubcategories,
 { id: "others", name: "Others", description: "Other subcategory", category_id: categoryId }
 ])
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
 'CS Brand': 'TD Web',
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
 const businessGroups = result.data || []
 setTargetBusinessGroups(businessGroups)
 
 // Auto-select Business Group if only one is available
 if (businessGroups.length === 1) {
 const autoSelectedGroup = businessGroups[0]
 // Auto-select SPOC as well
 const spocResult = await getSpocForTargetBusinessGroup(autoSelectedGroup.id)
 let spocId = ""
 if (spocResult.success && spocResult.data) {
 spocId = spocResult.data.id.toString()
 }
 setFormData((prev) => ({
 ...prev,
 targetBusinessGroupId: autoSelectedGroup.id.toString(),
 spocId,
 }))
 }
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
 
 // Convert minutes to hours (rounded up) for the numeric input field
 if (durationMinutes > 0) {
 const hours = Math.ceil(durationMinutes / 60)
 durationText = hours.toString()
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
 
 // Convert minutes to hours (rounded up) for the numeric input field
 if (durationMinutes > 0) {
 const hours = Math.ceil(durationMinutes / 60)
 durationText = hours.toString()
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
 // Convert minutes to hours (rounded up) for the numeric input field
 if (durationMinutes > 0) {
 const hours = Math.ceil(durationMinutes / 60)
 durationText = hours.toString()
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
 alert(`Files exceed 5MB limit: ${invalidFiles.join(", ")}`)
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

 // Reference ticket validation (real-time, debounced)
 const handleReferenceInputChange = (value: string) => {
  setReferenceInput(value)
  setReferenceValidation(null)

  if (referenceDebounceRef.current) {
   clearTimeout(referenceDebounceRef.current)
  }

  const trimmed = value.trim()
  if (!trimmed) return

  referenceDebounceRef.current = setTimeout(async () => {
   setReferenceValidating(true)
   try {
    const res = await fetch(`/api/tickets/validate?ticketId=${encodeURIComponent(trimmed)}`)
    const data = await res.json()
    if (data.success && data.data) {
     // Check if already added
     const alreadyAdded = referenceTicketsRef.current.some((t) => t.id === data.data.id)
     if (alreadyAdded) {
      setReferenceValidation({ success: false, message: "This ticket is already added" })
      referenceValidationRef.current = null
     } else {
      const validation = {
       success: true,
       message: `Ticket Found: ${data.data.title}`,
       data: data.data,
      }
      setReferenceValidation(validation)
      referenceValidationRef.current = validation
     }
    } else {
     setReferenceValidation({ success: false, message: "No ticket ID found" })
     referenceValidationRef.current = null
    }
   } catch {
    setReferenceValidation({ success: false, message: "Failed to validate ticket" })
    referenceValidationRef.current = null
   } finally {
    setReferenceValidating(false)
   }
  }, 500)
 }

 const addReferenceTicket = () => {
  if (referenceValidation?.success && referenceValidation.data) {
   const newRef = referenceValidation.data
   // Check not already added
   if (!referenceTicketsRef.current.some((t) => t.id === newRef.id)) {
    const updated = [...referenceTicketsRef.current, newRef]
    setReferenceTickets(updated)
    referenceTicketsRef.current = updated
   }
   setReferenceInput("")
   setReferenceValidation(null)
   referenceValidationRef.current = null
  }
 }

 const removeReferenceTicket = (ticketId: number) => {
  const updated = referenceTicketsRef.current.filter((t) => t.id !== ticketId)
  setReferenceTickets(updated)
  referenceTicketsRef.current = updated
 }

 const handleSubmit = async (e: FormEvent) => {
 e.preventDefault()
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
 alert(result.error || "Failed to create ticket")
 setIsLoading(false)
 return
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

 // Auto-add any validated-but-not-added reference before saving
 if (referenceValidationRef.current?.success && referenceValidationRef.current.data) {
  const pendingRef = referenceValidationRef.current.data
  if (!referenceTicketsRef.current.some((t) => t.id === pendingRef.id)) {
   referenceTicketsRef.current = [...referenceTicketsRef.current, pendingRef]
  }
  referenceValidationRef.current = null
 }

 // Save reference tickets if any (use ref for latest value)
 const refsToSave = referenceTicketsRef.current
 if (refsToSave.length > 0 && result.data) {
  try {
   const refResult = await addTicketReferences(
    result.data.id,
    refsToSave.map((t) => t.id)
   )
   if (!refResult.success) {
    alert(`Reference tickets failed to save: ${refResult.error}`)
   }
  } catch (err) {
   alert(`Reference tickets exception: ${err instanceof Error ? err.message : String(err)}`)
 }
 }

 // Show success dialog with ticket ID
 if (result.data) {
 setCreatedTicketId(result.data.ticket_id || null)
 setShowSuccessDialog(true)
 } else {
 setCreatedTicketId(null)
 setShowSuccessDialog(true)
 }
 } catch (err) {
 console.error("[v0] Error creating ticket:", err)
 alert(err instanceof Error ? err.message : "Failed to create ticket")
 } finally {
 setIsLoading(false)
 }
 }

 return (
 <>
 <form onSubmit={handleSubmit} className="space-y-1 w-full">

 {/* Row 1: Ticket Type */}
 <div className="px-4 pt-4" style={{ width: 'calc(33.333% - 0.34rem)' }}>
 <div className="space-y-1">
 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
 Ticket Type *
 </label>
 <div className="flex w-full">
 {["support", "requirement"].map((type) => (
 <label key={type} className="flex items-center gap-2 cursor-pointer flex-1">
 <input
 type="radio"
 name="ticketType"
 value={type}
 checked={formData.ticketType === type}
 onChange={handleInputChange}
 className="w-3 h-3 text-gray-900 border border-slate-300 focus:ring-2 focus:ring-gray-900/20"
 />
 <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
 {type === "support" ? "Support Issue" : "New Requirement"}
 </span>
 </label>
 ))}
 </div>
 </div>
 </div>

 {/* Row 2: Ticket Functional Area, Business Group, SPOC */}
 <div className="px-4 pt-4">
 <div className="grid grid-cols-3 gap-2">
 <div className="space-y-1 ">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Ticket Functional Area *
 </label>
 <Combobox
 options={organizations && organizations.length > 0 ? organizations.map((org) => ({
 value: org.id.toString(),
 label: org.name,
 })) : []}
 value={formData.organizationId}
 onChange={handleOrganizationChange}
 placeholder={organizations.length === 0 ? "Loading functional areas..." : "Select functional area..."}
 searchPlaceholder="Search functional areas..."
 emptyText={organizations.length === 0 ? "No functional areas available. Please ensure the organizations table is seeded." : "No functional areas found"}
 className="h-8 py-1.5 text-xs"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Business Group<span className="text-xs font-normal text-slate-500 dark:text-slate-400"></span>
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
 ? formData.targetBusinessGroupId
 ? "Business Group auto-selected"
 : "Select business group..."
 : "Select functional area first..."
 }
 searchPlaceholder="Search business groups..."
 emptyText="No business groups found"
 disabled={!formData.organizationId || !!formData.targetBusinessGroupId}
 className="h-8 py-1.5 text-xs"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 SPOC <span className="text-xs font-normal text-slate-500 dark:text-slate-400"></span>
 </label>
 <Combobox
 options={assignees.map((user) => ({
 value: user.id.toString(),
 label: user.full_name || user.name,
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
 className="h-8 py-1.5 text-xs"
 />
 {formData.targetBusinessGroupId && !formData.spocId && (
 <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
 ⚠️ No SPOC found for this Business Group. Please select a SPOC manually or configure one in Master Settings &gt; Groups.
 </p>
 )}
 </div>
 </div>
 </div>

 {/* Ticket Classification */}
 <div className="p-0">
 

 {formData.ticketType === "requirement" ? (
 <>
 {/* Row 3: Title (full width for requirement) */}
 <div className="space-y-1 px-4 pt-4">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Title *
 </label>
 <input
 type="text"
 name="title"
 value={formData.title}
 onChange={handleInputChange}
 placeholder="Enter a descriptive title for this requirement"
 className="w-full h-8 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-xs"
 />
 </div>

 {/* Row 4: Description (full width) */}
 <div className="space-y-1 px-4 pt-4">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Description
 </label>
 <textarea
 name="description"
 value={formData.description}
 onChange={handleInputChange}
 placeholder="Describe the requirement in detail..."
            rows={6}
 className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-xs resize-none"
 />
 </div>

 {/* Row 5: Estimated Hrs and Attachments (2-column grid) */}
 <div className="grid grid-cols-2 gap-2 px-4 pt-4">
 <div className="space-y-1">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Estimated Hrs 
 </label>
 <input
 type="number"
 name="estimatedDuration"
 value={formData.estimatedDuration}
 onChange={handleInputChange}
 min="1"
 step="1"
 className="w-full h-8 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-xs"
 placeholder="Enter estimated hours (e.g., 2, 8, 16)"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Attachments
 {formData.attachments.length > 0 && (
 <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-2">
 ({formData.attachments.length} file{formData.attachments.length > 1 ? "s" : ""})
 </span>
 )}
 </label>
  <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 p-2 min-h-[2rem]">
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
  className="w-full h-8 px-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-xs flex items-center justify-center gap-2"
 >
 <Paperclip className="w-3 h-3" />
 Choose files
 </button>
  {formData.attachments.length > 0 && (
  <div className="mt-2 space-y-1">
  {formData.attachments.map((file, idx) => (
  <div
  key={`req-${idx}`}
  className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md"
  >
  <div className="flex items-center gap-2 min-w-0 flex-1">
  <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
  <div className="min-w-0 flex-1">
  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
  <p className="text-[10px] text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
  </div>
  </div>
  <button
  type="button"
  onClick={() => removeAttachment(idx)}
  className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
  >
  <X className="w-3 h-3 text-danger" />
  </button>
  </div>
  ))}
  </div>
  )}
 </div>
 </div>
 </div>
 </>
 ) : (
 <>
 {/* Row 3: Category and Sub Category (2-column grid) */}
 <div className="grid grid-cols-2 gap-2 px-4 pt-4">
 <div className="space-y-1">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Category *
 </label>
 <Combobox
 options={[
 ...categories.map((cat) => ({
 value: cat.id.toString(),
 label: cat.name,
 })),
 { value: "others", label: "Others" }
 ]}
 value={formData.categoryId}
 onChange={handleCategoryChange}
 placeholder={formData.targetBusinessGroupId ? "Select a category..." : "Select a business group first"}
 searchPlaceholder="Search categories..."
 emptyText="No categories found"
 disabled={!formData.targetBusinessGroupId}
 className="h-8 py-1.5 text-xs"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Sub Category *
 </label>
 <Combobox
 options={
 subcategories.length > 0
 ? subcategories.map((sub) => ({
 value: sub.id === "others" ? "others" : sub.id.toString(),
 label: sub.name,
 }))
 : [{ value: "N/A", label: "N/A" }]
 }
 value={formData.subcategoryId || (subcategories.length === 0 && formData.categoryId ? "N/A" : "")}
 onChange={handleSubcategoryChange}
 placeholder={formData.categoryId ? "Select a sub-category..." : "Select a category first"}
 searchPlaceholder="Search sub-categories..."
 emptyText="No sub-categories available"
 disabled={!formData.categoryId}
 className="h-8 py-1.5 text-xs"
 />
 </div>
 </div>

 {/* Row 4: Description (full width) */}
 <div className="space-y-1 px-4 pt-4">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Description
 </label>
 <textarea
 name="description"
 value={formData.description}
 onChange={handleInputChange}
 placeholder="Auto-filled based on category and sub-category selection. You can edit this."
            rows={6}
 className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-xs resize-none"
 />
 </div>

 {/* Row 5: Estimated Hrs and Attachments (2-column grid) */}
 <div className="grid grid-cols-2 gap-2 px-4 pt-4">
 <div className="space-y-1">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Estimated Hours
 </label>
 <input
 type="number"
 name="estimatedDuration"
 value={formData.estimatedDuration}
 onChange={handleInputChange}
 min="1"
 step="1"
 className="w-full h-8 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-xs"
 placeholder="Enter estimated hours (e.g., 2, 8, 16)"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
 Attachments
 {formData.attachments.length > 0 && (
 <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-2">
 ({formData.attachments.length} file{formData.attachments.length > 1 ? "s" : ""})
 </span>
 )}
 </label>
  <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 p-2 min-h-[2rem]">
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
  className="w-full h-8 px-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-xs flex items-center justify-center gap-2"
 >
 <Paperclip className="w-3 h-3" />
 Choose files
 </button>
  {formData.attachments.length > 0 && (
  <div className="mt-2 space-y-1">
  {formData.attachments.map((file, idx) => (
  <div
  key={`sup-${idx}`}
  className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md"
  >
  <div className="flex items-center gap-2 min-w-0 flex-1">
  <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
  <div className="min-w-0 flex-1">
  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
  <p className="text-[10px] text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
  </div>
  </div>
  <button
  type="button"
  onClick={() => removeAttachment(idx)}
  className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
  >
  <X className="w-3 h-3 text-danger" />
  </button>
  </div>
  ))}
  </div>
  )}
 </div>
 </div>
 </div>
 </>
 )}
 </div>

 {/* Reference Tickets */}
 <div className="px-4 pt-4">
  <div className="space-y-1">
   <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
    Reference Tickets
    {referenceTickets.length > 0 && (
     <span className="text-xs text-slate-500 ml-2">({referenceTickets.length} linked)</span>
    )}
   </label>
   <div className="flex items-start gap-2">
    <div className="flex-1 space-y-1">
     <div className="flex items-center gap-2">
      <div className="relative flex-1">
       <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
       <input
        type="text"
        value={referenceInput}
        onChange={(e) => handleReferenceInputChange(e.target.value)}
        onKeyDown={(e) => {
         if (e.key === "Enter") {
          e.preventDefault()
          addReferenceTicket()
         }
        }}
        placeholder="Enter Ticket ID (e.g., 04821 or TKT-202603-04821)"
        className="w-full h-8 pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 transition-all duration-200 text-xs"
       />
       {referenceValidating && (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
       )}
      </div>
      <button
       type="button"
       onClick={addReferenceTicket}
       disabled={!referenceValidation?.success}
       className="h-8 px-3 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
      >
       <Link2 className="w-3 h-3" />
       Add
      </button>
     </div>
     {/* Validation feedback */}
     {referenceValidation && (
      <div className={`flex items-center gap-1.5 text-xs ${referenceValidation.success ? "text-emerald-600" : "text-red-500"}`}>
       {referenceValidation.success ? (
        <Check className="w-3 h-3" />
       ) : (
        <AlertCircle className="w-3 h-3" />
       )}
       <span>{referenceValidation.message}</span>
      </div>
     )}
    </div>
   </div>

   {/* List of added reference tickets */}
   {referenceTickets.length > 0 && (
    <div className="mt-2 space-y-1">
     {referenceTickets.map((ref) => (
      <div
       key={ref.id}
       className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md"
 >
 <div className="flex items-center gap-2 min-w-0 flex-1">
        <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
 <div className="min-w-0 flex-1">
         <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
          {ref.ticket_id ? ref.ticket_id.replace(/^TKT-\d{6}-/, '') : ref.ticket_number} — {ref.title}
         </p>
         <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Status: {ref.status}
 </p>
 </div>
 </div>
 <button
 type="button"
        onClick={() => removeReferenceTicket(ref.id)}
        className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
 >
        <X className="w-3 h-3 text-red-500" />
 </button>
 </div>
 ))}
 </div>
 )}
  </div>
 </div>

 {/* Submit Button */}
 <div className="w-full px-6 pb-6">
 <button
 type="submit"
 disabled={isLoading}
 className="w-full px-4 py-2 h-9 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-medium hover:transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <CheckCircle className="w-3 h-3" /><span>{isLoading ? "Creating..." : "Create Ticket"}</span>
 </button>
 </div>
 </form>

 <TicketSuccessDialog
 isOpen={showSuccessDialog}
 onClose={() => {
 setShowSuccessDialog(false)
 // Reset form after dialog closes
 setFormData({
 isInternal: false,
 ticketType: "support",
 organizationId: "",
 targetBusinessGroupId: "",
 projectId: "",
 estimatedReleaseDate: "",
 categoryId: "",
 subcategoryId: "",
 title: "",
 description: "",
 estimatedDuration: "",
 spocId: "",
 productReleaseName: "",
 attachments: [],
 })
 setReferenceTickets([])
 referenceTicketsRef.current = []
 setReferenceInput("")
 setReferenceValidation(null)
 referenceValidationRef.current = null
 setCreatedTicketId(null)
 }}
 ticketId={createdTicketId}
 />
 </>
 )
}


