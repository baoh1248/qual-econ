-- Migration: Add cleaner_hours column to schedule_entries table
-- This adds support for individual hours per cleaner in a shift

-- Add cleaner_hours column as JSONB to store individual hours per cleaner
ALTER TABLE schedule_entries
ADD COLUMN IF NOT EXISTS cleaner_hours JSONB DEFAULT '{}'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN schedule_entries.cleaner_hours IS 'Individual hours per cleaner, stored as {"cleanerName": hours}';

-- Add the same column to recurring_shifts table if it exists
ALTER TABLE recurring_shifts
ADD COLUMN IF NOT EXISTS cleaner_hours JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN recurring_shifts.cleaner_hours IS 'Individual hours per cleaner for recurring patterns, stored as {"cleanerName": hours}';
