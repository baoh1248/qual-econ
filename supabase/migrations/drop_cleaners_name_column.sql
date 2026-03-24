-- Consolidate cleaners.name into legal_name.
-- legal_name now serves as the single name column.
-- Backfill legal_name from name where it was NULL, then drop name.

UPDATE cleaners
SET legal_name = name
WHERE legal_name IS NULL AND name IS NOT NULL;

ALTER TABLE cleaners
  DROP COLUMN IF EXISTS name;
