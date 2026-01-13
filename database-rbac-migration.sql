-- Role-Based Access Control (RBAC) Migration Script
-- Run this in your Supabase SQL Editor after the initial database-setup.sql

-- ============================================================================
-- 1. CREATE ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  level INTEGER NOT NULL, -- Hierarchy: 1=Cleaner, 2=Supervisor, 3=Manager, 4=Admin
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL, -- Feature/Module name (e.g., 'job_viewing', 'job_creation')
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. CREATE ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL, -- The specific permission level (e.g., 'view_assigned', 'full_access')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- ============================================================================
-- 4. UPDATE CLEANERS TABLE
-- ============================================================================
-- Add role_id and password_hash columns
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cleaners_phone_number ON cleaners(phone_number);
CREATE INDEX IF NOT EXISTS idx_cleaners_role_id ON cleaners(role_id);

-- ============================================================================
-- 5. INSERT ROLES (Based on provided hierarchy)
-- ============================================================================
INSERT INTO roles (name, display_name, level, description) VALUES
  ('cleaner', 'Cleaner', 1, 'Field worker with limited access to assigned tasks'),
  ('supervisor', 'Supervisor', 2, 'Team leader with access to manage cleaners and review work'),
  ('manager', 'Manager', 3, 'Manager with access to payroll, clients, and company-wide operations'),
  ('admin', 'Admin/Owner', 4, 'Full system access and control')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. INSERT PERMISSIONS (Based on provided permission matrix)
-- ============================================================================
INSERT INTO permissions (module, display_name, description) VALUES
  -- Job Management
  ('job_viewing', 'Job Viewing', 'View jobs in the system'),
  ('job_creation', 'Job Creation/Editing', 'Create, edit, or delete jobs'),
  ('job_completion', 'Job Completion Reporting', 'Submit and review job completion forms'),

  -- Time & Attendance
  ('clock_in_out', 'Clock In/Out', 'Clock in and out of shifts'),
  ('time_sheets', 'Time Sheets', 'View and manage time sheets'),

  -- Scheduling
  ('scheduling_board', 'Scheduling Board', 'View and manage schedules'),

  -- GPS & Tracking
  ('gps_tracking', 'GPS Tracking', 'View GPS locations and routes'),

  -- Payroll
  ('payroll_view', 'Payroll View', 'View payroll information'),
  ('payroll_edit', 'Payroll Edit', 'Edit payroll information'),

  -- Pay Rate Management
  ('pay_rate_management', 'Pay Rate Management', 'Manage employee pay rates'),

  -- Client Management
  ('client_list_access', 'Client List Access', 'Access client information'),
  ('client_contract', 'Client Contract Management', 'Manage client contracts'),

  -- Equipment & Inventory
  ('equipment_tracking', 'Equipment/Supply Tracking', 'Track equipment and supplies'),

  -- Cleaner Management
  ('cleaner_management', 'Cleaner Management', 'Manage cleaner accounts'),

  -- Reports & Analytics
  ('reports_analytics', 'Reports & Analytics', 'View reports and analytics'),

  -- Messaging
  ('messaging', 'Messaging/Chat', 'Send and receive messages'),

  -- Announcements
  ('announcements', 'Announcements', 'View and send announcements'),

  -- Profile Management
  ('profile_management', 'Profile Management', 'Edit user profiles'),

  -- Time Off
  ('time_off_request', 'Request Time Off/Availability', 'Request time off'),

  -- Job Notes
  ('job_notes', 'Job Notes & Attachments', 'Add notes to jobs'),

  -- Shift Attendance
  ('shift_attendance', 'Shift & Attendance Tracking', 'Track attendance'),

  -- Data Import/Export
  ('data_import_export', 'Data Import/Export', 'Import and export data'),

  -- Role/Permission Editing
  ('role_permission_edit', 'Role/Permission Editing', 'Edit roles and permissions'),

  -- Billing
  ('billing_rates', 'Billing/Select Billing Rates', 'Manage billing rates'),

  -- Delete Operations
  ('delete_data_users', 'Delete Data/Users', 'Delete data and user accounts')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. INSERT ROLE_PERMISSIONS MAPPING (Based on provided matrix)
-- ============================================================================

-- Get role IDs for easier insertion
DO $$
DECLARE
  cleaner_role_id UUID;
  supervisor_role_id UUID;
  manager_role_id UUID;
  admin_role_id UUID;
BEGIN
  SELECT id INTO cleaner_role_id FROM roles WHERE name = 'cleaner';
  SELECT id INTO supervisor_role_id FROM roles WHERE name = 'supervisor';
  SELECT id INTO manager_role_id FROM roles WHERE name = 'manager';
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

  -- ===== CLEANER PERMISSIONS =====
  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'view_assigned' FROM permissions WHERE module = 'job_viewing'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'job_creation'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'submit_own' FROM permissions WHERE module = 'job_completion'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'can_clock_self' FROM permissions WHERE module = 'clock_in_out'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'view_own' FROM permissions WHERE module = 'scheduling_board'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'view_own_route' FROM permissions WHERE module = 'gps_tracking'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'view_own' FROM permissions WHERE module = 'payroll_view'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'payroll_edit'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'pay_rate_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'client_list_access'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'client_contract'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'equipment_tracking'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'cleaner_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'view_personal' FROM permissions WHERE module = 'reports_analytics'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'team_messages' FROM permissions WHERE module = 'messaging'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'receive_only' FROM permissions WHERE module = 'announcements'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'edit_own' FROM permissions WHERE module = 'profile_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'can_request' FROM permissions WHERE module = 'time_off_request'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'add_to_own' FROM permissions WHERE module = 'job_notes'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'view_self' FROM permissions WHERE module = 'shift_attendance'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'data_import_export'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'role_permission_edit'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'billing_rates'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT cleaner_role_id, id, 'none' FROM permissions WHERE module = 'delete_data_users'
  ON CONFLICT DO NOTHING;

  -- ===== SUPERVISOR PERMISSIONS =====
  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'view_team' FROM permissions WHERE module = 'job_viewing'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'create_edit_delete_team' FROM permissions WHERE module = 'job_creation'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'review_approve' FROM permissions WHERE module = 'job_completion'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'teams_time_sheets' FROM permissions WHERE module = 'time_sheets'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'manage_team' FROM permissions WHERE module = 'scheduling_board'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'view_all_team' FROM permissions WHERE module = 'gps_tracking'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'none' FROM permissions WHERE module = 'payroll_view'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'none' FROM permissions WHERE module = 'payroll_edit'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'none' FROM permissions WHERE module = 'pay_rate_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'view_assigned_only' FROM permissions WHERE module = 'client_list_access'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'none' FROM permissions WHERE module = 'client_contract'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'view_edit_inventory' FROM permissions WHERE module = 'equipment_tracking'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'manage_all' FROM permissions WHERE module = 'cleaner_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'all_reports' FROM permissions WHERE module = 'reports_analytics'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'team_and_manager' FROM permissions WHERE module = 'messaging'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'send_to_employees' FROM permissions WHERE module = 'announcements'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'edit_any_employee' FROM permissions WHERE module = 'profile_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'approve_team' FROM permissions WHERE module = 'time_off_request'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'add_review_notes' FROM permissions WHERE module = 'job_notes'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'view_all' FROM permissions WHERE module = 'shift_attendance'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'none' FROM permissions WHERE module = 'data_import_export'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'none' FROM permissions WHERE module = 'role_permission_edit'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'none' FROM permissions WHERE module = 'billing_rates'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT supervisor_role_id, id, 'none' FROM permissions WHERE module = 'delete_data_users'
  ON CONFLICT DO NOTHING;

  -- ===== MANAGER PERMISSIONS (inherits supervisor + adds more) =====
  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'view_company_wide' FROM permissions WHERE module = 'job_viewing'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'job_creation'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'job_completion'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'view_everyone' FROM permissions WHERE module = 'time_sheets'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'scheduling_board'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'gps_tracking'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'view_all' FROM permissions WHERE module = 'payroll_view'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'none' FROM permissions WHERE module = 'payroll_edit'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'none' FROM permissions WHERE module = 'pay_rate_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'view_edit_clients' FROM permissions WHERE module = 'client_list_access'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'view_only' FROM permissions WHERE module = 'client_contract'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'equipment_tracking'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'cleaner_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'reports_analytics'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'company_broadcast' FROM permissions WHERE module = 'messaging'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'announcements'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'profile_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'approve_company_wide' FROM permissions WHERE module = 'time_off_request'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'add_edit_all' FROM permissions WHERE module = 'job_notes'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'shift_attendance'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'full_access' FROM permissions WHERE module = 'data_import_export'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'none' FROM permissions WHERE module = 'role_permission_edit'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'none' FROM permissions WHERE module = 'billing_rates'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT manager_role_id, id, 'none' FROM permissions WHERE module = 'delete_data_users'
  ON CONFLICT DO NOTHING;

  -- ===== ADMIN/OWNER PERMISSIONS (full access to everything) =====
  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'job_viewing'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'job_creation'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'job_completion'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'clock_in_out'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'time_sheets'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'scheduling_board'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'gps_tracking'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'payroll_view'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'payroll_edit'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'pay_rate_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'client_list_access'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'client_contract'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'equipment_tracking'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'cleaner_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'reports_analytics'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'messaging'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'announcements'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'profile_management'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'time_off_request'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'job_notes'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'shift_attendance'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'data_import_export'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'role_permission_edit'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'billing_rates'
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id, access_level)
  SELECT admin_role_id, id, 'full_control' FROM permissions WHERE module = 'delete_data_users'
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 8. ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- ============================================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read roles and permissions
CREATE POLICY "Allow read access to roles" ON roles FOR SELECT USING (true);
CREATE POLICY "Allow read access to permissions" ON permissions FOR SELECT USING (true);
CREATE POLICY "Allow read access to role_permissions" ON role_permissions FOR SELECT USING (true);

-- ============================================================================
-- 9. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(
  user_role_id UUID,
  permission_module TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = user_role_id
      AND p.module = permission_module
      AND rp.access_level != 'none'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's permission level for a module
CREATE OR REPLACE FUNCTION get_permission_level(
  user_role_id UUID,
  permission_module TEXT
)
RETURNS TEXT AS $$
DECLARE
  access_level TEXT;
BEGIN
  SELECT rp.access_level INTO access_level
  FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  WHERE rp.role_id = user_role_id
    AND p.module = permission_module;

  RETURN COALESCE(access_level, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role information
CREATE OR REPLACE FUNCTION get_user_role(cleaner_id UUID)
RETURNS TABLE (
  role_name TEXT,
  role_level INTEGER,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, r.level, r.display_name
  FROM cleaners c
  JOIN roles r ON r.id = c.role_id
  WHERE c.id = cleaner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. CREATE UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. SET DEFAULT ROLE FOR EXISTING CLEANERS
-- ============================================================================
-- Set all existing cleaners to 'cleaner' role by default
UPDATE cleaners
SET role_id = (SELECT id FROM roles WHERE name = 'cleaner')
WHERE role_id IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Create admin/supervisor/manager accounts manually or via admin panel
-- 3. Update RLS policies to use role-based checks
-- 4. Implement frontend permission checks using has_permission() function
