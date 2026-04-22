-- Add missing payment fields to schedule_entries for payroll calculations
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL DEFAULT 1.5;
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL DEFAULT 0;
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS deductions DECIMAL DEFAULT 0;
