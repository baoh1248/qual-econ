-- Add columns to schedule_entries for cleaner-side task state
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS cleaner_notes TEXT;
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS checklist_state JSONB DEFAULT '[]'::jsonb;
