-- Task photos table for cleaner before/after documentation
CREATE TABLE IF NOT EXISTS task_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_entry_id UUID REFERENCES schedule_entries(id) ON DELETE CASCADE,
  uri TEXT NOT NULL,
  storage_path TEXT,
  category TEXT CHECK (category IN ('before', 'after')) NOT NULL DEFAULT 'before',
  description TEXT,
  cleaner_name TEXT,
  client_name TEXT,
  building_name TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  status TEXT CHECK (status IN ('pending', 'approved', 'flagged')) NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by schedule entry and status
CREATE INDEX IF NOT EXISTS idx_task_photos_schedule_entry ON task_photos(schedule_entry_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_status ON task_photos(status);
CREATE INDEX IF NOT EXISTS idx_task_photos_created_at ON task_photos(created_at);

-- Allow all operations (RLS disabled for simplicity, matching existing tables)
ALTER TABLE task_photos DISABLE ROW LEVEL SECURITY;
