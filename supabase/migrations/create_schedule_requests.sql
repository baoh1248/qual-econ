-- Create schedule_requests table for cleaner shift swap and schedule change requests
CREATE TABLE IF NOT EXISTS schedule_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id TEXT NOT NULL,
  cleaner_name TEXT NOT NULL,
  request_type TEXT CHECK (request_type IN ('shift_swap', 'schedule_change', 'extra_shift')) NOT NULL,
  description TEXT NOT NULL,
  target_date TEXT,
  swap_with_cleaner TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'declined')) DEFAULT 'pending',
  supervisor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_requests_cleaner ON schedule_requests (cleaner_id);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON schedule_requests (status);

ALTER TABLE schedule_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to schedule_requests" ON schedule_requests FOR ALL USING (true) WITH CHECK (true);
