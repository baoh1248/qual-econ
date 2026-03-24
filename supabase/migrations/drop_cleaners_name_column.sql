-- The name column has already been dropped; this is a no-op kept for reference.
-- legal_name is the single name column going forward.
ALTER TABLE cleaners DROP COLUMN IF EXISTS name;
