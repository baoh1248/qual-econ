-- Add item_number column to inventory_items table
-- Stores a unique product/item identifier (e.g. "ITM-A1B2C3")
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS item_number TEXT;
