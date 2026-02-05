-- Add associated_buildings column to inventory_items table
-- Stores an array of building destination strings (e.g. ["Client A - Building 1"])
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS associated_buildings JSONB DEFAULT '[]';
