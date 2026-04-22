-- Create payroll_records table for saving generated payroll data
CREATE TABLE IF NOT EXISTS payroll_records (
  id TEXT PRIMARY KEY,
  cleaner_id TEXT NOT NULL,
  cleaner_name TEXT NOT NULL,
  week_id TEXT NOT NULL,
  total_hours DECIMAL NOT NULL DEFAULT 0,
  regular_hours DECIMAL NOT NULL DEFAULT 0,
  overtime_hours DECIMAL NOT NULL DEFAULT 0,
  hourly_rate DECIMAL NOT NULL DEFAULT 0,
  regular_pay DECIMAL NOT NULL DEFAULT 0,
  overtime_pay DECIMAL NOT NULL DEFAULT 0,
  flat_rate_pay DECIMAL NOT NULL DEFAULT 0,
  total_pay DECIMAL NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'approved', 'paid')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by week and cleaner
CREATE INDEX IF NOT EXISTS idx_payroll_records_week_id ON payroll_records (week_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_cleaner_week ON payroll_records (cleaner_id, week_id);

-- Disable RLS so the app can read/write without policy issues
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to payroll_records" ON payroll_records FOR ALL USING (true) WITH CHECK (true);
