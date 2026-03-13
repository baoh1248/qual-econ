-- Stores saved supplier names for quick selection in PO and receive supply forms.

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on suppliers"
  ON suppliers FOR ALL
  USING (true)
  WITH CHECK (true);
