-- Create schedule_change_logs table to track all schedule modifications
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS schedule_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'shift_created',
    'shift_edited',
    'shift_deleted',
    'shift_unassigned_timeoff',
    'shift_assigned',
    'shift_status_changed',
    'cleaner_added',
    'cleaner_removed'
  )),
  description TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'Supervisor',
  client_name TEXT,
  building_name TEXT,
  cleaner_names TEXT[],
  shift_date DATE,
  shift_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_change_logs_created_at
  ON schedule_change_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_schedule_change_logs_shift_date
  ON schedule_change_logs(shift_date);

CREATE INDEX IF NOT EXISTS idx_schedule_change_logs_change_type
  ON schedule_change_logs(change_type);

CREATE INDEX IF NOT EXISTS idx_schedule_change_logs_shift_id
  ON schedule_change_logs(shift_id);

-- Add comment for documentation
COMMENT ON TABLE schedule_change_logs IS 'Tracks all changes to the schedule including shift creation, editing, deletion, and time off unassignments';

-- Grant permissions (adjust based on your RLS policies)
-- This example grants insert/select to authenticated users
-- Modify according to your security requirements
ALTER TABLE schedule_change_logs ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: Allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read change logs"
  ON schedule_change_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Example RLS policy: Allow service role to insert (for the app)
CREATE POLICY "Allow service role to insert change logs"
  ON schedule_change_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Note: Adjust the RLS policies based on your specific security requirements
-- You may want to restrict who can see or insert change logs
