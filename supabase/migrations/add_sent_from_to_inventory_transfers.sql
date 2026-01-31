-- Add sent_from column to inventory_transfers table
-- Tracks where items were sent from (e.g. "Company Warehouse", "Client C - Building D")
ALTER TABLE inventory_transfers ADD COLUMN IF NOT EXISTS sent_from TEXT;
