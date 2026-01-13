-- TEMPORARY: Disable RLS completely for testing
-- Run this if the fix_schedule_change_logs_permissions.sql doesn't work
-- This will help diagnose if RLS is the issue

-- Disable RLS on the table
ALTER TABLE schedule_change_logs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'schedule_change_logs';

-- Expected result: rowsecurity = false

-- Note: This makes the table accessible to everyone.
-- Use only for testing. Re-enable RLS after fixing the issue.
