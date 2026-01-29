-- Create inventory_transfers table to store transfer logs in Supabase
-- (previously stored in AsyncStorage/localStorage which was device-local)

CREATE TABLE IF NOT EXISTS inventory_transfers (
  id TEXT PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  destination TEXT NOT NULL DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferred_by TEXT NOT NULL DEFAULT '',
  notes TEXT,
  total_value DECIMAL DEFAULT 0,
  type TEXT CHECK (type IN ('outgoing', 'incoming')) NOT NULL DEFAULT 'outgoing',
  source TEXT,
  order_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matches existing pattern)
CREATE POLICY "Allow all operations" ON inventory_transfers FOR ALL USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_timestamp ON inventory_transfers(timestamp);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_type ON inventory_transfers(type);
