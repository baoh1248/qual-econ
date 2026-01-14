-- Minimal Authentication Setup
-- This adds only the essential columns needed for authentication to work
-- Run this in your Supabase SQL Editor

-- Add password_hash column to cleaners table
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add role_id column (for basic role support)
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS role_id UUID;

-- Create a basic roles table with just one default role
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  level INTEGER NOT NULL
);

-- Insert a default 'cleaner' role
INSERT INTO roles (name, display_name, level)
VALUES ('cleaner', 'Cleaner', 1)
ON CONFLICT (name) DO NOTHING;

-- Set all existing cleaners to have the default cleaner role
UPDATE cleaners
SET role_id = (SELECT id FROM roles WHERE name = 'cleaner')
WHERE role_id IS NULL;

-- Add foreign key constraint
ALTER TABLE cleaners
ADD CONSTRAINT fk_cleaners_role
FOREIGN KEY (role_id)
REFERENCES roles(id)
ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cleaners_phone_number ON cleaners(phone_number);
CREATE INDEX IF NOT EXISTS idx_cleaners_role_id ON cleaners(role_id);

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read roles
CREATE POLICY "Allow read access to roles" ON roles FOR SELECT USING (true);
