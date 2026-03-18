/**
 * CLEAN ENTITY TYPE DEFINITIONS
 * 
 * This file contains properly separated entity types matching the refactored database schema.
 * These types replace the bloated, mixed-concern types in the old structure.
 */

// =====================================================
// MASTER DATA ENTITIES
// =====================================================

export interface TicketStatus {
  id: number
  code: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  is_closed_state: boolean
  created_at: Date | string
  updated_at: Date | string
}

export interface TicketPriority {
  id: number
  code: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  sort_order: number
  sla_hours: number | null
  is_active: boolean
  created_at: Date | string
  updated_at: Date | string
}

export interface TicketType {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  created_at: Date | string
  updated_at: Date | string
}

export interface UserRole {
  id: number
  code: string
  name: string
  description: string | null
  level: number
  is_active: boolean
  created_at: Date | string
  updated_at: Date | string
}

// =====================================================
// USER ENTITY
// =====================================================

export interface User {
  id: number
  email: string
  password_hash: string
  full_name: string
  role: string // Legacy VARCHAR column (will eventually be removed)
  avatar_url: string | null
  business_unit_group_id: number | null
  auth_provider: string | null
  microsoft_id: string | null
  email_verified: boolean
  created_at: Date | string
  updated_at: Date | string
}

export interface UserWithRole extends User {
  role_id: number
  role_code: string
  role_name: string
  role_level: number
}

export interface UserRoleAssignment {
  id: number
  user_id: number
  role_id: number
  assigned_by: number | null
  assigned_at: Date | string
  is_active: boolean
}

// =====================================================
// BUSINESS GROUP ENTITIES
// =====================================================

export interface BusinessUnitGroup {
  id: number
  name: string
  description: string | null
  created_at: Date | string
  updated_at: Date | string
  // Legacy SPOC columns (will be removed after migration)
  spoc_name?: string | null
  primary_spoc_name?: string | null
  secondary_spoc_name?: string | null
}

export interface BusinessGroupSpoc {
  id: number
  business_group_id: number
  user_id: number
  spoc_type: 'primary' | 'secondary' | 'functional_area'
  assigned_at: Date | string
  assigned_by: number | null
  is_active: boolean
}

export interface BusinessGroupWithSpocs extends BusinessUnitGroup {
  primary_spoc?: User | null
  secondary_spocs?: User[]
  functional_area_spocs?: User[]
}

// =====================================================
// CATEGORY ENTITIES
// =====================================================

export interface Category {
  id: number
  name: string
  description: string | null
  business_unit_group_id: number | null
  created_at: Date | string
  updated_at: Date | string
}

export interface Subcategory {
  id: number
  category_id: number
  name: string
  description: string | null
  created_at: Date | string
  updated_at: Date | string
}

export interface TicketClassificationMapping {
  id: number
  business_group_id: number // Consolidated from target_business_group_id
  category_id: number
  subcategory_id: number
  estimated_duration: number
  spoc_user_id: number | null
  auto_title_template: string | null
  description: string | null
  created_at: Date | string
  updated_at: Date | string
}

// =====================================================
// CORE TICKET ENTITY (CLEANED)
// =====================================================

export interface Ticket {
  // Primary identifiers
  id: number
  ticket_id: string
  ticket_number: number

  // Basic information
  title: string
  description: string
  
  // Foreign keys to master data
  type_id: number
  status_id: number
  priority_id: number

  // Classification (all FKs, no VARCHAR duplicates)
  business_unit_group_id: number | null // Initiator's group
  target_business_group_id: number | null // Target group
  category_id: number | null
  subcategory_id: number | null

  // Assignment
  assigned_to: number | null
  created_by: number
  spoc_user_id: number | null

  // Timing
  estimated_duration: number | null // Hours
  created_at: Date | string
  updated_at: Date | string
  resolved_at: Date | string | null

  // Flags
  is_internal: boolean
  is_deleted: boolean
  has_attachments: boolean
  
  // Legacy columns (will be removed after migration)
  category?: string | null
  subcategory?: string | null
  initiator_group?: string | null
  status?: string
  priority?: string
  ticket_type?: string
  closed_by?: number | null
  closed_at?: Date | string | null
  hold_by?: number | null
  hold_at?: Date | string | null
  deleted_at?: Date | string | null
  redirected_from_business_unit_group_id?: number | null
  redirected_from_spoc_user_id?: number | null
  redirection_remarks?: string | null
  redirected_at?: Date | string | null
  parent_ticket_id?: number | null
  project_id?: number | null
  project_name?: string | null
  product_release_name?: string | null
  estimated_release_date?: string | null
  assignee_group_id?: number | null
}

export interface TicketWithDetails extends Ticket {
  // Joined user names
  creator_name: string | null
  creator_email?: string | null
  assignee_name: string | null
  assignee_email?: string | null
  spoc_name: string | null
  
  // Joined classification names
  type_name: string | null
  status_name: string | null
  priority_name: string | null
  category_name: string | null
  subcategory_name: string | null
  group_name: string | null
  target_group_name: string | null
  
  // Counts and metadata
  attachment_count: number
  
  // Related entities (optional)
  project?: TicketProject | null
  redirections?: TicketRedirection[]
  audit_events?: TicketAuditEvent[]
  children?: TicketHierarchy[]
}

// =====================================================
// TICKET AUDIT EVENTS
// =====================================================

export type TicketEventType = 
  | 'created'
  | 'assigned'
  | 'reassigned'
  | 'status_changed'
  | 'priority_changed'
  | 'held'
  | 'unheld'
  | 'closed'
  | 'reopened'
  | 'redirected'
  | 'updated'
  | 'deleted'
  | 'restored'

export interface TicketAuditEvent {
  id: number
  ticket_id: number
  event_type: TicketEventType
  performed_by: number
  old_value: string | null
  new_value: string | null
  notes: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date | string
}

export interface TicketAuditEventWithUser extends TicketAuditEvent {
  performer_name: string
  performer_email: string
}

// =====================================================
// TICKET PROJECTS
// =====================================================

export interface TicketProject {
  id: number
  ticket_id: number
  project_id: number | null
  product_release_id: number | null
  estimated_release_date: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  created_by: number | null
}

export interface TicketProjectWithDetails extends TicketProject {
  project_name: string | null
  product_name: string | null
  release_number: string | null
  release_date: Date | string | null
}

// =====================================================
// TICKET REDIRECTIONS
// =====================================================

export interface TicketRedirection {
  id: number
  ticket_id: number
  from_business_group_id: number
  from_spoc_user_id: number | null
  to_business_group_id: number
  to_spoc_user_id: number | null
  remarks: string
  redirected_by: number
  redirected_at: Date | string
  created_at: Date | string
}

export interface TicketRedirectionWithDetails extends TicketRedirection {
  from_group_name: string
  to_group_name: string
  from_spoc_name: string | null
  to_spoc_name: string | null
  redirected_by_name: string
}

// =====================================================
// TICKET HIERARCHY
// =====================================================

export type TicketRelationshipType = 
  | 'subtask'
  | 'related'
  | 'blocks'
  | 'blocked_by'
  | 'duplicates'

export interface TicketHierarchy {
  id: number
  parent_ticket_id: number
  child_ticket_id: number
  relationship_type: TicketRelationshipType
  created_by: number | null
  created_at: Date | string
}

export interface TicketHierarchyWithDetails extends TicketHierarchy {
  parent_ticket_number: string
  parent_title: string
  child_ticket_number: string
  child_title: string
  created_by_name: string | null
}

// =====================================================
// PROJECT ENTITIES
// =====================================================

export interface Project {
  id: number
  name: string
  estimated_release_date: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

export interface ProductRelease {
  id: number
  product_name: string
  package_name: string | null
  release_number: string
  release_date: Date | string | null
  description: string | null
  is_active: boolean
  created_at: Date | string
  updated_at: Date | string
}

// =====================================================
// FUNCTIONAL AREA ENTITIES
// =====================================================

export interface FunctionalArea {
  id: number
  name: string
  description: string | null
  spoc_name: string | null // Legacy (will be removed)
  created_at: Date | string
  updated_at: Date | string
}

export interface FunctionalAreaBusinessGroupMapping {
  id: number
  functional_area_id: number
  target_business_group_id: number
  created_at: Date | string
}

// =====================================================
// OTHER ENTITIES
// =====================================================

export interface Comment {
  id: number
  ticket_id: number
  user_id: number
  content: string
  created_at: Date | string
  updated_at: Date | string
  is_edited: boolean
  edited_by: number | null
}

export interface Attachment {
  id: number
  ticket_id: number
  file_name: string
  file_url: string
  file_size: number | null
  uploaded_by: number
  created_at: Date | string
}

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: string
  is_read: boolean
  related_ticket_id: number | null
  created_at: Date | string
}

export interface TicketReference {
  id: number
  source_ticket_id: number
  reference_ticket_id: number
  created_at: Date | string
  created_by: number
}

export interface MyTeamMember {
  id: number
  lead_user_id: number
  member_user_id: number
  role: 'lead' | 'member'
  created_at: Date | string
}

// =====================================================
// INPUT TYPES
// =====================================================

export interface CreateTicketInput {
  typeId: number
  targetBusinessGroupId: number
  categoryId: number | null
  subcategoryId: number | null
  title: string
  description: string
  estimatedDuration: number
  spocId: number
  priorityId?: number
  projectId?: number | null
  productReleaseId?: number | null
  estimatedReleaseDate?: string | null
  isInternal?: boolean
}

export interface UpdateTicketInput {
  ticketId: number
  title?: string
  description?: string
  statusId?: number
  priorityId?: number
  assignedTo?: number | null
  estimatedDuration?: number
}

export interface RedirectTicketInput {
  ticketId: number
  newBusinessUnitGroupId: number
  newSpocUserId: number
  remarks: string
}
