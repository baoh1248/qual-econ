-- Tracks each individual delivery event against a purchase order.
-- Supports partial receipts: multiple rows per PO, one per delivery day.

CREATE TABLE IF NOT EXISTS purchase_order_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  items JSONB NOT NULL DEFAULT '[]',
  invoice_number TEXT,
  received_by TEXT NOT NULL DEFAULT 'Supervisor',
  total_value DECIMAL DEFAULT 0,
  total_tax DECIMAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_po_receipts_po_id ON purchase_order_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_po_receipts_received_at ON purchase_order_receipts(received_at);

ALTER TABLE purchase_order_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on po_receipts"
  ON purchase_order_receipts FOR ALL
  USING (true)
  WITH CHECK (true);
