-- Fix RLS policies for schedule_change_logs to allow both authenticated and anon users
-- Run this in your Supabase SQL Editor if the activity log isn't working

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read change logs" ON schedule_change_logs;
DROP POLICY IF EXISTS "Allow service role to insert change logs" ON schedule_change_logs;

-- Create new permissive policies that work with both anon and authenticated users
CREATE POLICY "Allow all users to read change logs"
  ON schedule_change_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all users to insert change logs"
  ON schedule_change_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all users to delete change logs"
  ON schedule_change_logs
  FOR DELETE
  USING (true);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'schedule_change_logs';
