-- Add total_tax to inventory_transfers to store the order-level tax amount
ALTER TABLE inventory_transfers ADD COLUMN IF NOT EXISTS total_tax DECIMAL DEFAULT 0;

-- Add tax_per_unit to inventory_items to store the per-unit tax from the most recent receipt
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tax_per_unit DECIMAL DEFAULT 0;
