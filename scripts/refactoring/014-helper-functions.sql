-- =====================================================
-- HELPER FUNCTIONS FOR NEW ENTITY STRUCTURE
-- =====================================================
-- Purpose: Create database functions to simplify common queries
-- =====================================================

-- =====================================================
-- FUNCTION: Get Active Primary SPOC for Business Group
-- =====================================================

CREATE OR REPLACE FUNCTION get_primary_spoc(p_business_group_id INTEGER)
RETURNS TABLE (
  user_id INTEGER,
  full_name VARCHAR,
  email VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.email
  FROM business_group_spocs bgs
  JOIN users u ON u.id = bgs.user_id
  WHERE 
    bgs.business_group_id = p_business_group_id
    AND bgs.spoc_type = 'primary'
    AND bgs.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_primary_spoc IS 'Returns the active primary SPOC for a business group';

-- =====================================================
-- FUNCTION: Get All Active SPOCs for Business Group
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_spocs(p_business_group_id INTEGER)
RETURNS TABLE (
  user_id INTEGER,
  full_name VARCHAR,
  email VARCHAR,
  spoc_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.email,
    bgs.spoc_type::VARCHAR
  FROM business_group_spocs bgs
  JOIN users u ON u.id = bgs.user_id
  WHERE 
    bgs.business_group_id = p_business_group_id
    AND bgs.is_active = true
  ORDER BY 
    CASE bgs.spoc_type
      WHEN 'primary' THEN 1
      WHEN 'secondary' THEN 2
      WHEN 'functional_area' THEN 3
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_all_spocs IS 'Returns all active SPOCs for a business group, ordered by type';

-- =====================================================
-- FUNCTION: Check if User is SPOC for Business Group
-- =====================================================

CREATE OR REPLACE FUNCTION is_user_spoc(p_user_id INTEGER, p_business_group_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM business_group_spocs
    WHERE 
      user_id = p_user_id
      AND business_group_id = p_business_group_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_user_spoc IS 'Checks if a user is an active SPOC (any type) for a business group';

-- =====================================================
-- FUNCTION: Check if User is Primary SPOC
-- =====================================================

CREATE OR REPLACE FUNCTION is_user_primary_spoc(p_user_id INTEGER, p_business_group_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM business_group_spocs
    WHERE 
      user_id = p_user_id
      AND business_group_id = p_business_group_id
      AND spoc_type = 'primary'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_user_primary_spoc IS 'Checks if a user is the active primary SPOC for a business group';

-- =====================================================
-- FUNCTION: Get Ticket Audit Timeline
-- =====================================================

CREATE OR REPLACE FUNCTION get_ticket_audit_timeline(p_ticket_id INTEGER)
RETURNS TABLE (
  event_id INTEGER,
  event_type VARCHAR,
  performed_by_name VARCHAR,
  performed_by_email VARCHAR,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tae.id,
    tae.event_type::VARCHAR,
    u.full_name,
    u.email,
    tae.old_value,
    tae.new_value,
    tae.notes,
    tae.created_at
  FROM ticket_audit_events tae
  JOIN users u ON u.id = tae.performed_by
  WHERE tae.ticket_id = p_ticket_id
  ORDER BY tae.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ticket_audit_timeline IS 'Returns complete audit timeline for a ticket with user details';

-- =====================================================
-- FUNCTION: Get Ticket Redirection Chain
-- =====================================================

CREATE OR REPLACE FUNCTION get_ticket_redirection_chain(p_ticket_id INTEGER)
RETURNS TABLE (
  redirection_id INTEGER,
  from_group_name VARCHAR,
  to_group_name VARCHAR,
  from_spoc_name VARCHAR,
  to_spoc_name VARCHAR,
  remarks TEXT,
  redirected_by_name VARCHAR,
  redirected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    bg_from.name,
    bg_to.name,
    u_from.full_name,
    u_to.full_name,
    tr.remarks,
    u_by.full_name,
    tr.redirected_at
  FROM ticket_redirections tr
  JOIN business_unit_groups bg_from ON bg_from.id = tr.from_business_group_id
  JOIN business_unit_groups bg_to ON bg_to.id = tr.to_business_group_id
  LEFT JOIN users u_from ON u_from.id = tr.from_spoc_user_id
  LEFT JOIN users u_to ON u_to.id = tr.to_spoc_user_id
  JOIN users u_by ON u_by.id = tr.redirected_by
  WHERE tr.ticket_id = p_ticket_id
  ORDER BY tr.redirected_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ticket_redirection_chain IS 'Returns complete redirection history for a ticket';

-- =====================================================
-- FUNCTION: Get Ticket Children (Hierarchy)
-- =====================================================

CREATE OR REPLACE FUNCTION get_ticket_children(p_parent_ticket_id INTEGER)
RETURNS TABLE (
  child_id INTEGER,
  child_ticket_number VARCHAR,
  child_title VARCHAR,
  relationship_type VARCHAR,
  child_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.ticket_id,
    t.title,
    th.relationship_type,
    ts.name
  FROM ticket_hierarchy th
  JOIN tickets t ON t.id = th.child_ticket_id
  JOIN ticket_statuses ts ON ts.id = t.status_id
  WHERE th.parent_ticket_id = p_parent_ticket_id
  ORDER BY th.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ticket_children IS 'Returns all child tickets for a parent ticket';

-- =====================================================
-- FUNCTION: Get User's Highest Role Level
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_highest_role_level(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_max_level INTEGER;
BEGIN
  SELECT MAX(ur.level) INTO v_max_level
  FROM user_role_assignments ura
  JOIN user_roles ur ON ur.id = ura.role_id
  WHERE 
    ura.user_id = p_user_id
    AND ura.is_active = true;
  
  RETURN COALESCE(v_max_level, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_highest_role_level IS 'Returns the highest role level for a user (for permission checks)';

-- =====================================================
-- FUNCTION: Create Ticket Audit Event (Helper)
-- =====================================================

CREATE OR REPLACE FUNCTION create_ticket_audit_event(
  p_ticket_id INTEGER,
  p_event_type ticket_event_type,
  p_performed_by INTEGER,
  p_old_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_event_id INTEGER;
BEGIN
  INSERT INTO ticket_audit_events (
    ticket_id,
    event_type,
    performed_by,
    old_value,
    new_value,
    notes
  ) VALUES (
    p_ticket_id,
    p_event_type,
    p_performed_by,
    p_old_value,
    p_new_value,
    p_notes
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_ticket_audit_event IS 'Helper function to create audit events with simplified parameters';

-- =====================================================
-- TRIGGER: Auto-create audit event on ticket status change
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_ticket_status_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    INSERT INTO ticket_audit_events (
      ticket_id,
      event_type,
      performed_by,
      old_value,
      new_value,
      notes
    ) VALUES (
      NEW.id,
      'status_changed',
      COALESCE(NEW.assigned_to, NEW.created_by),
      (SELECT code FROM ticket_statuses WHERE id = OLD.status_id),
      (SELECT code FROM ticket_statuses WHERE id = NEW.status_id),
      'Status changed'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS ticket_status_change_audit ON tickets;
CREATE TRIGGER ticket_status_change_audit
  AFTER UPDATE ON tickets
  FOR EACH ROW
  WHEN (NEW.status_id IS DISTINCT FROM OLD.status_id)
  EXECUTE FUNCTION trigger_ticket_status_audit();

COMMENT ON FUNCTION trigger_ticket_status_audit IS 'Automatically creates audit event when ticket status changes';

-- =====================================================
-- VIEW: Tickets with Full Details
-- =====================================================

CREATE OR REPLACE VIEW tickets_with_full_details AS
SELECT 
  t.*,
  
  -- Status, Priority, Type
  ts.code as status_code,
  ts.name as status_name,
  ts.color as status_color,
  tp.code as priority_code,
  tp.name as priority_name,
  tp.color as priority_color,
  tt.code as type_code,
  tt.name as type_name,
  
  -- Users
  creator.full_name as creator_name,
  creator.email as creator_email,
  assignee.full_name as assignee_name,
  assignee.email as assignee_email,
  spoc.full_name as spoc_name,
  spoc.email as spoc_email,
  
  -- Business Groups
  bg.name as group_name,
  target_bg.name as target_group_name,
  
  -- Categories
  cat.name as category_name,
  subcat.name as subcategory_name,
  
  -- Counts
  (SELECT COUNT(*) FROM attachments WHERE ticket_id = t.id) as attachment_count,
  (SELECT COUNT(*) FROM comments WHERE ticket_id = t.id) as comment_count,
  (SELECT COUNT(*) FROM ticket_hierarchy WHERE parent_ticket_id = t.id) as child_count
  
FROM tickets t
LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
LEFT JOIN ticket_priorities tp ON tp.id = t.priority_id
LEFT JOIN ticket_types tt ON tt.id = t.type_id
LEFT JOIN users creator ON creator.id = t.created_by
LEFT JOIN users assignee ON assignee.id = t.assigned_to
LEFT JOIN users spoc ON spoc.id = t.spoc_user_id
LEFT JOIN business_unit_groups bg ON bg.id = t.business_unit_group_id
LEFT JOIN business_unit_groups target_bg ON target_bg.id = t.target_business_group_id
LEFT JOIN categories cat ON cat.id = t.category_id
LEFT JOIN subcategories subcat ON subcat.id = t.subcategory_id;

COMMENT ON VIEW tickets_with_full_details IS 'Comprehensive view of tickets with all related entity details';

-- =====================================================
-- VIEW: Business Groups with SPOCs
-- =====================================================

CREATE OR REPLACE VIEW business_groups_with_spocs AS
SELECT 
  bg.id,
  bg.name,
  bg.description,
  bg.created_at,
  bg.updated_at,
  primary_spoc.user_id as primary_spoc_id,
  primary_spoc.full_name as primary_spoc_name,
  primary_spoc.email as primary_spoc_email,
  (
    SELECT json_agg(
      json_build_object(
        'user_id', u.id,
        'full_name', u.full_name,
        'email', u.email
      )
    )
    FROM business_group_spocs bgs
    JOIN users u ON u.id = bgs.user_id
    WHERE bgs.business_group_id = bg.id
      AND bgs.spoc_type = 'secondary'
      AND bgs.is_active = true
  ) as secondary_spocs
FROM business_unit_groups bg
LEFT JOIN LATERAL (
  SELECT u.id as user_id, u.full_name, u.email
  FROM business_group_spocs bgs
  JOIN users u ON u.id = bgs.user_id
  WHERE bgs.business_group_id = bg.id
    AND bgs.spoc_type = 'primary'
    AND bgs.is_active = true
  LIMIT 1
) primary_spoc ON true;

COMMENT ON VIEW business_groups_with_spocs IS 'Business groups with primary and secondary SPOC details';

-- =====================================================
-- FUNCTION: Get User's Active Roles
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_roles(p_user_id INTEGER)
RETURNS TABLE (
  role_id INTEGER,
  role_code VARCHAR,
  role_name VARCHAR,
  role_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.id,
    ur.code,
    ur.name,
    ur.level
  FROM user_role_assignments ura
  JOIN user_roles ur ON ur.id = ura.role_id
  WHERE 
    ura.user_id = p_user_id
    AND ura.is_active = true
  ORDER BY ur.level DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_roles IS 'Returns all active roles for a user, ordered by level (highest first)';

-- =====================================================
-- FUNCTION: Log Ticket Event (Simplified API)
-- =====================================================

CREATE OR REPLACE FUNCTION log_ticket_event(
  p_ticket_id INTEGER,
  p_event_type VARCHAR,
  p_performed_by INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_event_id INTEGER;
BEGIN
  INSERT INTO ticket_audit_events (
    ticket_id,
    event_type,
    performed_by,
    notes
  ) VALUES (
    p_ticket_id,
    p_event_type::ticket_event_type,
    p_performed_by,
    p_notes
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_ticket_event IS 'Simplified function to log ticket events';

-- =====================================================
-- EXAMPLES
-- =====================================================

-- Example 1: Get primary SPOC for Dev group
-- SELECT * FROM get_primary_spoc(1);

-- Example 2: Get all SPOCs for Dev group
-- SELECT * FROM get_all_spocs(1);

-- Example 3: Check if user 5 is SPOC for group 1
-- SELECT is_user_spoc(5, 1);

-- Example 4: Get all roles for user 10
-- SELECT * FROM get_user_roles(10);

-- Example 5: Log a ticket event
-- SELECT log_ticket_event(123, 'assigned', 5, 'Assigned to John Doe');

-- Example 6: Query tickets with full details
-- SELECT * FROM tickets_with_full_details WHERE status_code = 'open' LIMIT 10;

-- Example 7: Query business groups with SPOCs
-- SELECT * FROM business_groups_with_spocs ORDER BY name;
