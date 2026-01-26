-- Database Migration: Geofence Clock-In/Out Feature
-- This migration adds support for geofenced clock-in/out functionality

-- Add latitude and longitude to client_buildings for geofencing
ALTER TABLE client_buildings
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geofence_radius_ft INTEGER DEFAULT 300;

-- Create clock_records table for tracking clock-in/out
CREATE TABLE IF NOT EXISTS clock_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id UUID REFERENCES cleaners(id) ON DELETE CASCADE,
  cleaner_name TEXT NOT NULL,
  schedule_entry_id UUID REFERENCES schedule_entries(id) ON DELETE SET NULL,
  building_id UUID REFERENCES client_buildings(id) ON DELETE SET NULL,
  building_name TEXT NOT NULL,
  client_name TEXT NOT NULL,

  -- Clock-in details
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_in_latitude DECIMAL(10, 8),
  clock_in_longitude DECIMAL(11, 8),
  clock_in_distance_ft DECIMAL(10, 2),

  -- Clock-out details
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_out_latitude DECIMAL(10, 8),
  clock_out_longitude DECIMAL(11, 8),
  clock_out_distance_ft DECIMAL(10, 2),
  clock_out_reason TEXT CHECK (clock_out_reason IN ('manual', 'auto_geofence', 'shift_ended', 'admin')) DEFAULT 'manual',

  -- Calculated fields
  total_minutes INTEGER,

  -- Status
  status TEXT CHECK (status IN ('clocked_in', 'clocked_out', 'auto_clocked_out')) DEFAULT 'clocked_in',

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clock_records_cleaner_id ON clock_records(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_clock_records_schedule_entry_id ON clock_records(schedule_entry_id);
CREATE INDEX IF NOT EXISTS idx_clock_records_building_id ON clock_records(building_id);
CREATE INDEX IF NOT EXISTS idx_clock_records_status ON clock_records(status);
CREATE INDEX IF NOT EXISTS idx_clock_records_clock_in_time ON clock_records(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_client_buildings_coordinates ON client_buildings(latitude, longitude);

-- Add trigger for updated_at
CREATE TRIGGER update_clock_records_updated_at
  BEFORE UPDATE ON clock_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE clock_records ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy (allow all for now - customize based on auth requirements)
CREATE POLICY "Allow all operations" ON clock_records FOR ALL USING (true);

-- Add address field to schedule_entries if it doesn't exist
ALTER TABLE schedule_entries
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS building_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS building_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geofence_radius_ft INTEGER DEFAULT 300;
