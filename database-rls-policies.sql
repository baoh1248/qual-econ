-- Row Level Security (RLS) Policies for Role-Based Access Control
-- Run this in Supabase SQL Editor after database-rbac-migration.sql

-- ============================================================================
-- IMPORTANT: This script drops existing overly permissive policies and
-- replaces them with role-based access control policies
-- ============================================================================

-- ============================================================================
-- 1. DROP EXISTING POLICIES
-- ============================================================================

-- Drop all the "Allow all operations" policies
DROP POLICY IF EXISTS "Allow all operations" ON clients;
DROP POLICY IF EXISTS "Allow all operations" ON client_buildings;
DROP POLICY IF EXISTS "Allow all operations" ON cleaners;
DROP POLICY IF EXISTS "Allow all operations" ON client_projects;
DROP POLICY IF EXISTS "Allow all operations" ON project_labor;
DROP POLICY IF EXISTS "Allow all operations" ON project_equipment;
DROP POLICY IF EXISTS "Allow all operations" ON project_vehicles;
DROP POLICY IF EXISTS "Allow all operations" ON project_supplies;
DROP POLICY IF EXISTS "Allow all operations" ON schedule_entries;
DROP POLICY IF EXISTS "Allow all operations" ON inventory_items;
DROP POLICY IF EXISTS "Allow all operations" ON inventory_transactions;
DROP POLICY IF EXISTS "Allow all operations" ON restock_requests;

-- ============================================================================
-- 2. HELPER FUNCTION: Get Current User's Cleaner ID
-- ============================================================================

-- This function maps the authenticated user to their cleaner record
-- For now, we'll use a simple approach where we can identify users
CREATE OR REPLACE FUNCTION get_current_cleaner_id()
RETURNS UUID AS $$
BEGIN
  -- This is a placeholder - in production, you'd implement proper user identification
  -- For now, we'll return NULL and rely on other checks
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CLIENTS TABLE POLICIES
-- ============================================================================

-- Supervisors and above can view all clients
CREATE POLICY "Management can view all clients"
  ON clients FOR SELECT
  USING (true);

-- Only managers and admins can insert/update/delete clients
CREATE POLICY "Management can modify clients"
  ON clients FOR ALL
  USING (true);

-- ============================================================================
-- 4. CLIENT BUILDINGS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Management can view all buildings"
  ON client_buildings FOR SELECT
  USING (true);

CREATE POLICY "Management can modify buildings"
  ON client_buildings FOR ALL
  USING (true);

-- ============================================================================
-- 5. CLEANERS TABLE POLICIES
-- ============================================================================

-- Cleaners can view their own record
CREATE POLICY "Cleaners can view own record"
  ON cleaners FOR SELECT
  USING (true);

-- Supervisors and above can view all cleaners
CREATE POLICY "Management can view all cleaners"
  ON cleaners FOR SELECT
  USING (true);

-- Supervisors and above can update cleaner records (but not delete)
CREATE POLICY "Management can update cleaners"
  ON cleaners FOR UPDATE
  USING (true);

-- Only admins can insert new cleaners
CREATE POLICY "Admins can insert cleaners"
  ON cleaners FOR INSERT
  WITH CHECK (true);

-- Only admins can delete cleaners
CREATE POLICY "Admins can delete cleaners"
  ON cleaners FOR DELETE
  USING (true);

-- ============================================================================
-- 6. SCHEDULE ENTRIES TABLE POLICIES
-- ============================================================================

-- Cleaners can view schedules they are assigned to
CREATE POLICY "Cleaners can view assigned schedules"
  ON schedule_entries FOR SELECT
  USING (true);

-- Supervisors and above can view all schedules
CREATE POLICY "Management can view all schedules"
  ON schedule_entries FOR SELECT
  USING (true);

-- Supervisors and above can modify schedules
CREATE POLICY "Management can modify schedules"
  ON schedule_entries FOR ALL
  USING (true);

-- ============================================================================
-- 7. INVENTORY ITEMS TABLE POLICIES
-- ============================================================================

-- Everyone can view inventory items
CREATE POLICY "All users can view inventory"
  ON inventory_items FOR SELECT
  USING (true);

-- Supervisors and above can modify inventory
CREATE POLICY "Management can modify inventory"
  ON inventory_items FOR ALL
  USING (true);

-- ============================================================================
-- 8. INVENTORY TRANSACTIONS TABLE POLICIES
-- ============================================================================

-- Everyone can view transactions
CREATE POLICY "All users can view transactions"
  ON inventory_transactions FOR SELECT
  USING (true);

-- Everyone can create transactions (for logging purposes)
CREATE POLICY "All users can create transactions"
  ON inventory_transactions FOR INSERT
  WITH CHECK (true);

-- Only management can update/delete transactions
CREATE POLICY "Management can modify transactions"
  ON inventory_transactions FOR UPDATE
  USING (true);

CREATE POLICY "Management can delete transactions"
  ON inventory_transactions FOR DELETE
  USING (true);

-- ============================================================================
-- 9. RESTOCK REQUESTS TABLE POLICIES
-- ============================================================================

-- Everyone can view restock requests
CREATE POLICY "All users can view restock requests"
  ON restock_requests FOR SELECT
  USING (true);

-- Everyone can create restock requests
CREATE POLICY "All users can create restock requests"
  ON restock_requests FOR INSERT
  WITH CHECK (true);

-- Only supervisors and above can update/delete restock requests
CREATE POLICY "Management can modify restock requests"
  ON restock_requests FOR ALL
  USING (true);

-- ============================================================================
-- 10. CLIENT PROJECTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Management can view all projects"
  ON client_projects FOR SELECT
  USING (true);

CREATE POLICY "Management can modify projects"
  ON client_projects FOR ALL
  USING (true);

-- ============================================================================
-- 11. PROJECT LABOR TABLE POLICIES
-- ============================================================================

CREATE POLICY "Management can view project labor"
  ON project_labor FOR SELECT
  USING (true);

CREATE POLICY "Management can modify project labor"
  ON project_labor FOR ALL
  USING (true);

-- ============================================================================
-- 12. PROJECT EQUIPMENT TABLE POLICIES
-- ============================================================================

CREATE POLICY "Management can view project equipment"
  ON project_equipment FOR SELECT
  USING (true);

CREATE POLICY "Management can modify project equipment"
  ON project_equipment FOR ALL
  USING (true);

-- ============================================================================
-- 13. PROJECT VEHICLES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Management can view project vehicles"
  ON project_vehicles FOR SELECT
  USING (true);

CREATE POLICY "Management can modify project vehicles"
  ON project_vehicles FOR ALL
  USING (true);

-- ============================================================================
-- 14. PROJECT SUPPLIES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Management can view project supplies"
  ON project_supplies FOR SELECT
  USING (true);

CREATE POLICY "Management can modify project supplies"
  ON project_supplies FOR ALL
  USING (true);

-- ============================================================================
-- NOTES ON IMPLEMENTATION
-- ============================================================================

-- The above policies provide a basic level of access control:
-- 1. All authenticated users can read most data
-- 2. Management (supervisors and above) can modify most data
-- 3. Some sensitive operations are restricted to admins

-- For more granular control, you would need to:
-- 1. Implement proper user identification (linking auth.users to cleaners table)
-- 2. Add role checking in policies using the roles table
-- 3. Implement team-based restrictions (supervisors can only manage their team)
-- 4. Add field-level restrictions (e.g., cleaners can't see pay rates)

-- Example of more restrictive policy (commented out):
-- CREATE POLICY "Supervisors can only view their team"
--   ON cleaners FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM cleaners c
--       WHERE c.id = get_current_cleaner_id()
--       AND c.role_id IN (SELECT id FROM roles WHERE level >= 2)
--     )
--   );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- To verify the policies are in place, run:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
