-- Add barcode column to inventory_items for barcode scanning during supply receive
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Create index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items (barcode) WHERE barcode IS NOT NULL;
